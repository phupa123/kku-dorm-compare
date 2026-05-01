/**
 * EliteDorm Core Engine v2.0
 * Professional Modular Architecture
 */

const TARGET_COORDS = { lat: 16.4731226, lng: 102.827211 };
const API_URL = '/api/dorms';

// --- State Management ---
const State = {
    allDorms: [],
    filteredDorms: [],
    currentZone: 'all',
    searchQuery: '',
    currentView: 'home',
    uploadedImages: []
};

// --- View Manager (UI Logic) ---
const UI = {
    views: {
        home: document.getElementById('homeView'),
        explorer: document.getElementById('explorerView'),
        compare: document.getElementById('compareView'),
        detail: document.getElementById('detailView')
    },

    init() {
        this.startEntranceAnimation();
        this.bindEvents();
    },

    startEntranceAnimation() {
        const tl = gsap.timeline();
        const progress = document.getElementById('loaderProgress');

        tl.to(progress, { width: '100%', duration: 1.5, ease: "power4.inOut" })
          .to("#splashLogo", { scale: 0.9, opacity: 0, duration: 0.6, ease: "power4.in" }, "-=0.2")
          .to("#splashText", { y: 20, opacity: 0, duration: 0.6, ease: "power4.in" }, "-=0.4")
          .add(() => document.getElementById('splashScreen').classList.add('exit'))
          .to("#globalNav", { opacity: 1, pointerEvents: 'auto', duration: 1, ease: "power2.out" }, "-=0.5")
          .from("#homeHero > *", { y: 50, opacity: 0, stagger: 0.2, duration: 1.2, ease: "expo.out" }, "-=0.8")
          .from("#homeMapContainer", { scale: 0.9, opacity: 0, duration: 1.5, ease: "expo.out" }, "-=1.2");
    },

    navigateTo(viewId) {
        if (viewId === State.currentView && viewId !== 'detail') return;

        const prevView = this.views[State.currentView];
        const nextView = this.views[viewId];

        gsap.to(prevView, { opacity: 0, x: -30, duration: 0.4, ease: "power2.in", onComplete: () => {
            prevView.classList.remove('page-active');
            nextView.classList.add('page-active');
            gsap.fromTo(nextView, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" });
            
            if (viewId === 'home') MapManager.invalidate();
            if (viewId === 'compare') this.renderComparisonMatrix();
            if (viewId === 'explorer') {
                gsap.from(".dorm-card", { opacity: 0, y: 30, stagger: 0.05, duration: 0.8, ease: "power4.out" });
            }
        }});

        State.currentView = viewId;
    },

    renderDormGrid() {
        const grid = document.getElementById('dormGrid');
        grid.innerHTML = '';
        State.filteredDorms.forEach(dorm => {
            const dist = DataManager.calculateDistance(dorm.coords.lat, dorm.coords.lng);
            const imgs = Array.isArray(dorm.images) && dorm.images.length > 0 ? dorm.images : [null];
            const card = document.createElement('div');
            card.className = "dorm-card v-card overflow-hidden flex flex-col group";
            card.innerHTML = `
                <div class="relative h-72 overflow-hidden cursor-pointer" onclick="UI.showDetail('${dorm.id}')">
                    <div class="swiper swiper-${dorm.id} h-full">
                        <div class="swiper-wrapper">${imgs.map(img => `<div class="swiper-slide h-full">${img ? `<img src="${img}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000">` : `<div class="w-full h-full bg-neutral-100 flex items-center justify-center text-slate-300"><i class="fas fa-image text-4xl"></i></div>`}</div>`).join('')}</div>
                    </div>
                    <div class="absolute top-6 right-6 z-20"><span class="bg-neutral-900/90 backdrop-blur-xl text-white text-[8px] font-black px-5 py-2 rounded-full uppercase tracking-widest">${dorm.zone}</span></div>
                </div>
                <div class="p-8 flex-1 flex flex-col">
                    <div class="flex justify-between items-start mb-6">
                        <h3 class="text-xl font-black text-neutral-800 tracking-tighter leading-tight">${dorm.name}</h3>
                        <div class="text-right"><span class="text-2xl font-black text-brand-500 tracking-tighter">฿${dorm.price}</span></div>
                    </div>
                    <div class="flex gap-3 mb-8">${(dorm.features || []).slice(0, 3).map(f => `<span class="px-3 py-1 bg-neutral-50 text-[8px] font-black uppercase text-slate-400 rounded-lg border border-neutral-100">${f}</span>`).join('')}</div>
                    <div class="mt-auto flex gap-2">
                        <button onclick="UI.showDetail('${dorm.id}')" class="v-btn-primary flex-1 py-4 text-[9px]">Analysis</button>
                        <button onclick="UI.openEditModal('${dorm.id}', event)" class="w-12 h-12 bg-neutral-50 rounded-xl flex items-center justify-center text-slate-300 hover:text-brand-500 transition-all"><i class="fas fa-edit"></i></button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
            new Swiper(`.swiper-${dorm.id}`, { loop: imgs.length > 1, autoplay: { delay: 4000 }, speed: 1000 });
        });
    },

    renderComparisonMatrix() {
        const body = document.getElementById('sheetBody');
        const stdFeatures = ["แอร์", "พัดลม", "น้ำอุ่น", "Wi-Fi"];
        body.innerHTML = State.allDorms.map(dorm => {
            const dist = DataManager.calculateDistance(dorm.coords.lat, dorm.coords.lng);
            return `
                <tr class="hover:bg-neutral-50/50 transition-colors border-b border-neutral-50">
                    <td class="p-10 text-left"><div class="flex items-center gap-6"><img src="${dorm.images?.[0] || ''}" class="w-14 h-14 rounded-2xl object-cover bg-neutral-100 shadow-sm border-2 border-white"><div class="leading-tight"><p class="text-lg font-black tracking-tighter text-neutral-800">${dorm.name}</p><p class="text-[9px] font-bold text-brand-500 uppercase tracking-widest mt-1">${dorm.zone}</p></div></div></td>
                    <td class="p-10 font-black text-xl tracking-tighter">฿${dorm.price}</td>
                    <td class="p-10 font-black text-slate-400">${dist.toFixed(2)}km</td>
                    <td class="p-10 font-black text-slate-400">~${Math.ceil((dist/30)*60)}m</td>
                    <td class="p-10">
                        <div class="flex justify-center gap-1.5 flex-wrap max-w-[180px] mx-auto">
                            ${(dorm.features || []).map(f => `
                                <div class="w-7 h-7 rounded-lg flex items-center justify-center bg-green-50 text-green-500 text-[10px]" title="${f}">
                                    <i class="fas ${getIconForFeature(f)}"></i>
                                </div>
                            `).join('') || '<span class="text-[10px] text-slate-300">ไม่มีข้อมูล</span>'}
                        </div>
                    </td>
                    <td class="p-10"><div class="flex gap-2 justify-center"><button onclick="UI.showDetail('${dorm.id}')" class="w-12 h-12 bg-neutral-800 text-white rounded-xl flex items-center justify-center hover:bg-brand-500 transition-all"><i class="fas fa-eye"></i></button><button onclick="DataManager.deleteDorm('${dorm.id}')" class="w-12 h-12 bg-neutral-50 text-slate-300 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i class="fas fa-trash-alt"></i></button></div></td>
                </tr>
            `;
        }).join('');
    },

    showDetail(id) {
        const dorm = State.allDorms.find(d => d.id === id);
        if (!dorm) return;
        const dist = DataManager.calculateDistance(dorm.coords.lat, dorm.coords.lng);
        const imgs = (dorm.images && dorm.images.length > 0) ? dorm.images : [null];
        
        document.getElementById('detailView').innerHTML = `
            <div class="min-h-screen bg-neutral-50 relative pb-32">
                <button onclick="UI.navigateTo('explorer')" class="fixed top-10 left-10 z-back-btn w-14 h-14 bg-white rounded-2xl shadow-2xl flex items-center justify-center active:scale-95 transition-all hover:bg-brand-500 hover:text-white"><i class="fas fa-arrow-left"></i></button>
                <div class="grid grid-cols-1 lg:grid-cols-2">
                    <div class="h-[60vh] lg:h-screen lg:sticky lg:top-0">
                        <div class="swiper swiper-detail h-full"><div class="swiper-wrapper">${imgs.map(img => `<div class="swiper-slide h-full">${img ? `<img src="${img}" class="w-full h-full object-cover">` : `<div class="w-full h-full bg-neutral-200"></div>`}</div>`).join('')}</div><div class="swiper-pagination"></div></div>
                    </div>
                    <div class="p-10 lg:p-24 space-y-20">
                        <div class="space-y-6"><span class="bg-brand-50 text-brand-500 px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest">${dorm.zone}</span><h2 class="text-7xl font-display font-black leading-[0.9] tracking-tighter text-neutral-800">${dorm.name}</h2><div class="text-5xl font-black text-brand-500 tracking-tighter">฿${dorm.price} <span class="text-sm text-slate-300 font-bold ml-1">/ mo</span></div></div>
                        <div class="grid grid-cols-2 gap-8"><div class="p-10 bg-white rounded-[3.5rem] shadow-sm border border-neutral-100 text-center"><div class="w-16 h-16 bg-brand-50 text-brand-500 rounded-3xl flex items-center justify-center text-xl mx-auto mb-6"><i class="fas fa-location-arrow"></i></div><p class="text-4xl font-black tracking-tighter">${dist.toFixed(2)}km</p></div><div class="p-10 bg-white rounded-[3.5rem] shadow-sm border border-neutral-100 text-center"><div class="w-16 h-16 bg-neutral-900 text-white rounded-3xl flex items-center justify-center text-xl mx-auto mb-6"><i class="fas fa-motorcycle"></i></div><p class="text-4xl font-black tracking-tighter">~${Math.ceil((dist/25)*60)}m</p></div></div>
                        <div class="space-y-8"><h4 class="text-2xl font-black text-neutral-800 flex items-center gap-4"><span class="w-2 h-8 bg-brand-500 rounded-full"></span>Pricing</h4><div class="bg-white rounded-[3rem] border border-neutral-100 overflow-hidden shadow-sm"><table class="w-full"><thead class="bg-neutral-50"><tr class="text-left text-[10px] font-black uppercase text-slate-400 tracking-widest"><th class="p-6">Type</th><th class="p-6 text-right">Rate</th></tr></thead><tbody>${(dorm.roomTypes || []).map(rt => `<tr class="border-t border-neutral-50"><td class="p-6 font-bold text-neutral-700">${rt.type}</td><td class="p-6 font-black text-brand-500 text-right text-xl">฿${rt.price}</td></tr>`).join('') || '<tr><td colspan="2" class="p-10 text-center text-slate-300">No data</td></tr>'}</tbody></table></div></div>
                        <div class="space-y-8"><h4 class="text-2xl font-black text-neutral-800 flex items-center gap-4"><span class="w-2 h-8 bg-neutral-900 rounded-full"></span>Atmosphere</h4><div class="grid grid-cols-2 md:grid-cols-3 gap-4">${imgs.map(img => `<div class="aspect-square rounded-[2rem] overflow-hidden shadow-sm border border-neutral-50 group cursor-zoom-in" onclick="UI.viewFullImage('${img}')">${img ? `<img src="${img}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700">` : `<div class="w-full h-full bg-neutral-100"></div>`}</div>`).join('')}</div></div>
                        <div class="p-10 bg-white rounded-[3.5rem] border border-neutral-100 text-xl text-slate-500 font-medium">${dorm.description || ''}</div>
                        <div id="detailMap" class="h-[450px] rounded-[4rem] shadow-2xl border-8 border-white"></div>
                    </div>
                </div>
            </div>
        `;
        this.navigateTo('detail');
        setTimeout(() => MapManager.initDetailMap(dorm), 600);
    },

    openModal() {
        document.getElementById('dormForm').reset();
        document.getElementById('dormId').value = '';
        document.getElementById('roomTypesList').innerHTML = '';
        State.uploadedImages = [];
        document.getElementById('imagePreview').innerHTML = '';
        document.getElementById('dormModal').classList.remove('hidden');
        document.getElementById('dormModal').classList.add('flex');
        gsap.from("#dormModal > div", { scale: 0.9, opacity: 0, duration: 0.5, ease: "back.out(1.7)" });
    },

    closeModal() {
        gsap.to("#dormModal > div", { scale: 0.9, opacity: 0, duration: 0.3, onComplete: () => document.getElementById('dormModal').classList.add('hidden') });
    },

    openEditModal(id, e) {
        if (e) e.stopPropagation();
        const dorm = State.allDorms.find(d => d.id === id);
        if (!dorm) return;
        this.openModal();
        document.getElementById('dormId').value = dorm.id;
        document.getElementById('dormName').value = dorm.name;
        document.getElementById('dormZone').value = dorm.zone;
        document.getElementById('dormPrice').value = dorm.price;
        document.getElementById('dormCoords').value = `${dorm.coords.lat}, ${dorm.coords.lng}`;
        document.getElementById('dormDesc').value = dorm.description || '';
        State.uploadedImages = dorm.images || [];
        this.updateImagePreview();
        const cbContainer = document.getElementById('facilityCheckboxes');
        if (cbContainer) cbContainer.querySelectorAll('input').forEach(cb => cb.checked = (dorm.features || []).includes(cb.value));
        if (dorm.roomTypes) dorm.roomTypes.forEach(rt => this.addRoomTypeRow(rt.type, rt.price));
    },

    addRoomTypeRow(type = '', price = '') {
        const list = document.getElementById('roomTypesList');
        const row = document.createElement('div');
        row.className = "flex gap-3 items-center";
        row.innerHTML = `<input type="text" placeholder="Type" value="${type}" class="flex-1 p-4 bg-neutral-50 rounded-xl outline-none font-bold room-type-name"><input type="number" placeholder="Price" value="${price}" min="0" inputmode="numeric" class="w-28 p-4 bg-neutral-50 rounded-xl outline-none font-black text-brand-500 room-type-price"><button type="button" onclick="this.parentElement.remove()" class="text-red-500 px-2"><i class="fas fa-trash-alt"></i></button>`;
        list.appendChild(row);
    },

    updateImagePreview() {
        document.getElementById('imagePreview').innerHTML = State.uploadedImages.map(img => `<img src="${img}" class="w-16 h-16 rounded-xl object-cover">`).join('');
    },

    viewFullImage(src) {
        const img = document.getElementById('fullPreviewImage');
        img.src = src;
        document.getElementById('imagePreviewOverlay').classList.remove('hidden');
        document.getElementById('imagePreviewOverlay').classList.add('flex');
        gsap.fromTo(img, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "power4.out" });
    },

    closeFullImage() {
        gsap.to("#fullPreviewImage", { scale: 0.8, opacity: 0, duration: 0.3, onComplete: () => document.getElementById('imagePreviewOverlay').classList.add('hidden') });
    },

    setZoneFilter(zone) {
        State.currentZone = zone;
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('tab-active', btn.innerText.includes(zone) || (zone==='all' && btn.innerText==='ทั้งหมด')));
        DataManager.applyFilters();
    },

    bindEvents() {
        document.getElementById('searchInput')?.addEventListener('input', (e) => {
            State.searchQuery = e.target.value;
            DataManager.applyFilters();
        });

        document.getElementById('dormForm')?.addEventListener('submit', (e) => DataManager.handleFormSubmit(e));

        document.getElementById('imageUpload')?.addEventListener('change', (e) => DataManager.handleImageUpload(e));
    }
};

// --- Map Manager ---
const MapManager = {
    mainMap: null,
    markersLayer: null,

    initMain() {
        try {
            this.mainMap = L.map('mainMap', { zoomControl: false, scrollWheelZoom: false, minZoom: 12, maxZoom: 18 }).setView([TARGET_COORDS.lat, TARGET_COORDS.lng], 15);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(this.mainMap);
            this.markersLayer = L.layerGroup().addTo(this.mainMap);
            this.addFacultyMarker();
        } catch (e) { console.error("Map error", e); }
    },

    addFacultyMarker() {
        L.marker([TARGET_COORDS.lat, TARGET_COORDS.lng], {
            icon: L.divIcon({
                html: '<div class="w-12 h-12 bg-brand-500 text-white rounded-2xl flex items-center justify-center border-4 border-white shadow-2xl rotate-45 scale-110"><div class="-rotate-45"><i class="fas fa-graduation-cap"></i></div></div>',
                className: '', iconSize: [48, 48]
            })
        }).addTo(this.mainMap);
    },

    updateMarkers(dorms) {
        if (!this.markersLayer) return;
        this.markersLayer.clearLayers();
        dorms.forEach(dorm => {
            const marker = L.marker([dorm.coords.lat, dorm.coords.lng], {
                icon: L.divIcon({
                    html: `<div class="w-10 h-10 bg-neutral-900 text-white rounded-2xl flex items-center justify-center border-2 border-white shadow-xl hover:bg-brand-500 transition-all scale-90 hover:scale-110"><i class="fas fa-house text-xs"></i></div>`,
                    className: '', iconSize: [40, 40]
                })
            }).addTo(this.markersLayer);
            marker.on('click', () => UI.showDetail(dorm.id));
        });
    },

    initDetailMap(dorm) {
        const detailMap = L.map('detailMap', { zoomControl: false }).setView([dorm.coords.lat, dorm.coords.lng], 16);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(detailMap);
        L.marker([dorm.coords.lat, dorm.coords.lng]).addTo(detailMap).bindPopup(dorm.name).openPopup();
    },

    invalidate() {
        if (this.mainMap) setTimeout(() => this.mainMap.invalidateSize(), 100);
    }
};

// --- Data Manager ---
const DataManager = {
    async fetchDorms() {
        try {
            const res = await fetch(API_URL);
            State.allDorms = await res.json();
            this.updateStats();
            this.applyFilters();
        } catch (err) { console.error("Fetch error", err); }
    },

    applyFilters() {
        State.filteredDorms = State.allDorms.filter(dorm => {
            const zoneMatch = State.currentZone === 'all' || dorm.zone === State.currentZone;
            const searchMatch = dorm.name.toLowerCase().includes(State.searchQuery.toLowerCase());
            return zoneMatch && searchMatch;
        });
        UI.renderDormGrid();
        MapManager.updateMarkers(State.filteredDorms);
    },

    updateStats() {
        document.getElementById('totalDorms').innerText = State.allDorms.length;
    },

    async handleFormSubmit(e) {
        e.preventDefault();
        const cb = Array.from(document.querySelectorAll('#facilityCheckboxes input:checked')).map(c => c.value);
        const coordsRaw = document.getElementById('dormCoords').value.split(',');
        const roomTypes = Array.from(document.querySelectorAll('#roomTypesList > div')).map(row => ({
            type: row.querySelector('.room-type-name').value,
            price: row.querySelector('.room-type-price').value
        }));

        const dormData = {
            id: document.getElementById('dormId').value || null,
            name: document.getElementById('dormName').value,
            zone: document.getElementById('dormZone').value,
            price: document.getElementById('dormPrice').value,
            images: State.uploadedImages,
            features: cb,
            roomTypes: roomTypes,
            coords: { lat: parseFloat(coordsRaw[0]?.trim()), lng: parseFloat(coordsRaw[1]?.trim()) },
            description: document.getElementById('dormDesc')?.value || ''
        };

        await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dormData) });
        UI.closeModal();
    },

    async handleImageUpload(e) {
        const formData = new FormData();
        for (let f of e.target.files) formData.append('images', f);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        State.uploadedImages = [...State.uploadedImages, ...data.paths];
        UI.updateImagePreview();
    },

    async deleteDorm(id) {
        if (!confirm('Confirm Delete?')) return;
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (State.currentView === 'detail') UI.navigateTo('explorer');
    },

    calculateDistance(lat, lng) {
        const R = 6371;
        const dLat = (lat - TARGET_COORDS.lat) * Math.PI / 180;
        const dLon = (lng - TARGET_COORDS.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(TARGET_COORDS.lat*Math.PI/180)*Math.cos(lat*Math.PI/180)*Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
};

// --- App Entry Point ---
const socketConnection = () => {
    if (typeof io === 'undefined') {
        console.warn("⚠️ EliteDorm: Socket.io library not detected. Real-time sync disabled.");
        return;
    }
    const socket = io();
    socket.on('dormsUpdated', (data) => {
        State.allDorms = data;
        DataManager.updateStats();
        DataManager.applyFilters();
        if (State.currentView === 'compare') UI.renderComparisonMatrix();
    });
    socket.on('codeChange', () => location.reload());
};

window.addEventListener('DOMContentLoaded', () => {
    UI.init();
    MapManager.initMain();
    DataManager.fetchDorms();
    socketConnection();
});
