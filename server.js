require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

// ===== Database Connection =====
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
    mongoose.connect(MONGODB_URI)
        .then(() => console.log('✅ Connected to MongoDB Atlas'))
        .catch(err => console.error('❌ MongoDB Connection Error:', err));
} else {
    console.warn('⚠️ MONGODB_URI not found. Running in local mode with dorms.json');
}

// ===== Cloudinary Config =====
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const storage = process.env.CLOUDINARY_NAME ? new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'elitedorm',
        allowed_formats: ['jpg', 'png', 'webp'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
    },
}) : multer.diskStorage({
    destination: (req, file, cb) => {
        const subfolder = req.query.folder || 'misc';
        const targetDir = path.join(__dirname, 'uploads', subfolder);
        fs.ensureDirSync(targetDir);
        cb(null, targetDir);
    },
    filename: (req, file, cb) => {
        cb(null, `img-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

// ===== Mongoose Model =====
const dormSchema = new mongoose.Schema({
    id: String,
    name: { type: String, required: true },
    zone: String,
    price: Number,
    priceMin: Number,
    priceMax: Number,
    deposit: Number,
    depositMin: Number,
    depositMax: Number,
    coords: {
        lat: Number,
        lng: Number
    },
    features: [String],
    images: [String],
    description: String,
    contact: String,
    reference: String,
    roomTypes: [{
        id: String,
        type: String,
        price: Number,
        status: String,
        images: [String]
    }]
}, { timestamps: true });

const Dorm = mongoose.model('Dorm', dormSchema);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== Page Routes =====
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/explorer', (req, res) => res.sendFile(path.join(__dirname, 'explorer.html')));
app.get('/maps', (req, res) => res.sendFile(path.join(__dirname, 'maps.html')));
app.get('/compare', (req, res) => res.sendFile(path.join(__dirname, 'compare.html')));

// ===== API =====

app.get('/api/dorms', async (req, res) => {
    try {
        if (MONGODB_URI) {
            const dorms = await Dorm.find().sort({ createdAt: -1 });
            res.json(dorms);
        } else {
            const data = await fs.readJson(path.join(__dirname, 'dorms.json'));
            res.json(data);
        }
    } catch (err) { res.status(500).json({ error: 'Failed to fetch dorms' }); }
});

app.post('/api/upload', upload.array('images', 20), (req, res) => {
    try {
        const filePaths = req.files.map(file => {
            if (process.env.CLOUDINARY_NAME) {
                return file.path; // Cloudinary URL
            } else {
                const subfolder = req.query.folder || 'misc';
                return `/uploads/${subfolder}/${file.filename}`.replace(/\/+/g, '/');
            }
        });
        res.json({ paths: filePaths });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

app.post('/api/dorms', async (req, res) => {
    try {
        const dormData = req.body;
        if (MONGODB_URI) {
            if (dormData.id) {
                const updated = await Dorm.findOneAndUpdate({ id: dormData.id }, dormData, { upsert: true, new: true });
                io.emit('dormsUpdated', await Dorm.find());
                res.json(updated);
            } else {
                dormData.id = Date.now().toString();
                const newDorm = new Dorm(dormData);
                await newDorm.save();
                io.emit('dormsUpdated', await Dorm.find());
                res.json(newDorm);
            }
        } else {
            // Fallback to local
            const DATA_FILE = path.join(__dirname, 'dorms.json');
            const data = await fs.readJson(DATA_FILE);
            if (dormData.id) {
                const index = data.findIndex(d => d.id === dormData.id);
                if (index !== -1) data[index] = dormData;
                else data.push(dormData);
            } else {
                dormData.id = Date.now().toString();
                data.push(dormData);
            }
            await fs.writeJson(DATA_FILE, data, { spaces: 4 });
            io.emit('dormsUpdated', data);
            res.json(dormData);
        }
    } catch (err) { res.status(500).json({ error: 'Failed to save dorm' }); }
});

app.delete('/api/dorms/:id', async (req, res) => {
    try {
        const dormId = req.params.id;
        if (MONGODB_URI) {
            await Dorm.findOneAndDelete({ id: dormId });
            io.emit('dormsUpdated', await Dorm.find());
            res.json({ success: true });
        } else {
            const DATA_FILE = path.join(__dirname, 'dorms.json');
            let data = await fs.readJson(DATA_FILE);
            data = data.filter(d => d.id !== dormId);
            await fs.writeJson(DATA_FILE, data, { spaces: 4 });
            io.emit('dormsUpdated', data);
            res.json({ success: true });
        }
    } catch (err) { res.status(500).json({ error: 'Failed to delete dorm' }); }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  🚀 EliteDorm Cloud-Ready Server`);
    console.log(`  ─────────────────────────`);
    console.log(`  Port: ${PORT}`);
    console.log(`  Mode: ${MONGODB_URI ? 'MongoDB Atlas' : 'Local JSON'}`);
    console.log(`  ─────────────────────────\n`);
});
