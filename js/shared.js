/**
 * EliteDorm Shared Module v3.0
 * Navigation, Page Transitions, Socket, Utilities
 */

const TARGET_COORDS = { lat: 16.4731226, lng: 102.827211 };
const API_URL = '/api/dorms';

// ===== Page Transition System =====
const Transition = {
    overlay: null,

    init() {
        // Create overlay with 5 bars
        this.overlay = document.createElement('div');
        this.overlay.className = 'page-transition-overlay';
        for (let i = 0; i < 5; i++) {
            const bar = document.createElement('div');
            bar.className = 'bar';
            this.overlay.appendChild(bar);
        }
        document.body.appendChild(this.overlay);

        // Play leave animation on page load
        this.overlay.classList.add('leaving');
        setTimeout(() => this.overlay.classList.remove('leaving'), 1000);
    },

    goTo(url) {
        if (window.location.pathname === url) return;
        this.overlay.classList.add('entering');
        setTimeout(() => {
            window.location.href = url;
        }, 700);
    }
};

// ===== Splash Screen =====
const Splash = {
    run(callback) {
        const splash = document.getElementById('splashScreen');
        if (!splash) { callback(); return; }

        const bar = splash.querySelector('.splash-loader-bar');
        gsap.to(bar, { width: '100%', duration: 1.8, ease: 'power4.inOut', onComplete: () => {
            gsap.to(splash, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'power4.inOut', onComplete: () => {
                splash.style.display = 'none';
                callback();
            }});
        }});
    }
};

// ===== Navigation =====
const Nav = {
    init(activePage) {
        const nav = document.querySelector('.glass-nav');
        if (nav) {
            setTimeout(() => nav.classList.add('visible'), 300);
            // Mark active link
            nav.querySelectorAll('.nav-link').forEach(link => {
                if (link.dataset.page === activePage) link.classList.add('active');
            });
        }
        // Intercept nav clicks for transition
        document.querySelectorAll('[data-navigate]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                Transition.goTo(el.getAttribute('data-navigate'));
            });
        });
    }
};

// ===== Socket.io (Real-time) =====
const LiveSync = {
    socket: null,
    init(onUpdate) {
        if (typeof io === 'undefined') {
            console.warn('⚠️ EliteDorm: Socket.io not available. Open via http://localhost:3000');
            return;
        }
        this.socket = io();
        this.socket.on('dormsUpdated', (data) => { if (onUpdate) onUpdate(data); });
        this.socket.on('codeChange', () => location.reload());
    }
};

// ===== Scroll Reveal =====
const Reveal = {
    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal-up').forEach(el => observer.observe(el));
    }
};

// ===== Utilities =====
function calcDistance(lat, lng) {
    const R = 6371;
    const dLat = (lat - TARGET_COORDS.lat) * Math.PI / 180;
    const dLon = (lng - TARGET_COORDS.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(TARGET_COORDS.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchDorms() {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('EliteDorm: Failed to fetch dorms:', e);
        return [];
    }
}

function copyToClipboard(text) {
    if (!navigator.clipboard) {
        // Fallback for non-HTTPS or older browsers
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('คัดลอกข้อมูลลง Clipboard แล้ว');
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
        }
        document.body.removeChild(textArea);
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast('คัดลอกข้อมูลลง Clipboard แล้ว');
    }, (err) => {
        console.error('Async: Could not copy text: ', err);
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:var(--neutral-900);color:white;padding:1rem 2rem;border-radius:1rem;font-weight:900;z-index:10000;box-shadow:var(--shadow-heavy);font-size:12px;letter-spacing:0.02em;pointer-events:none;opacity:0';
    toast.innerHTML = `<i class="fas fa-check-circle" style="color:var(--brand-500);margin-right:0.5rem"></i> ${message}`;
    document.body.appendChild(toast);
    
    gsap.to(toast, { opacity: 1, y: -20, duration: 0.4 });
    setTimeout(() => {
        gsap.to(toast, { opacity: 0, y: 0, duration: 0.4, onComplete: () => toast.remove() });
    }, 2500);
}

// ===== Shared Head HTML (for generating consistent templates) =====
function getSharedHead() {
    return `
    <link rel="icon" type="image/png" href="/kku_dorm_elite_logo_1777569958199.png">
    <script src="https://cdn.tailwindcss.com"><\/script>
    <script src="/socket.io/socket.io.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js"><\/script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
    <script src="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.js"><\/script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"><\/script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Public+Sans:wght@800;900&family=Sarabun:wght@400;600;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet-routing-machine@latest/dist/leaflet-routing-machine.css" />
    <link rel="stylesheet" href="/style.css">
    `;
}

// ===== Shared Nav HTML =====
function getNavHTML(activePage) {
    const links = [
        { page: 'home', label: 'Dashboard', url: '/', icon: 'fa-house' },
        { page: 'explorer', label: 'Explorer', url: '/explorer', icon: 'fa-compass' },
        { page: 'compare', label: 'VS Mode', url: '/compare', icon: 'fa-bolt-lightning' }
    ];
    
    // Attach event listeners after a short delay to ensure elements are in DOM
    setTimeout(() => {
        document.querySelectorAll('[data-navigate]').forEach(el => {
            el.onclick = (e) => {
                e.preventDefault();
                Transition.goTo(el.getAttribute('data-navigate'));
            };
        });
    }, 100);

    return `
    <nav class="mobile-nav">
        ${links.map(l => `<a href="${l.url}" data-navigate="${l.url}" data-label="${l.label}" class="${l.page === activePage ? 'active' : ''}"><i class="fas ${l.icon}"></i></a>`).join('')}
        <a href="#" onclick="openDormModal();return false" class="fab" data-label="Register"><i class="fas fa-plus"></i></a>
    </nav>
    `;
}

// ===== Helpers =====
function formatRange(min, max, prefix = '฿') {
    if (!min && !max) return 'N/A';
    if (!max || min === max) return `${prefix}${min || max}`;
    if (!min) return `${prefix}${max}`;
    return `${prefix}${min} - ${max}`;
}

function toggleCustomZone(val) {
    const container = document.getElementById('customZoneContainer');
    if (container) container.style.display = (val === 'อื่นๆ') ? 'block' : 'none';
}

// ===== Shared Modal HTML =====
function getModalHTML() {
    return `
    <style>
        .modal-body {
            will-change: transform, opacity;
            transform: translateZ(0);
            backface-visibility: hidden;
            contain: content;
        }
        .modal-body.animating {
            box-shadow: none !important;
        }
        .facility-checkbox {
            position: relative;
            padding: 1.25rem 0.5rem;
            background: var(--neutral-50);
            border-radius: 1.25rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1.5px solid transparent;
        }
        .facility-checkbox:hover {
            background: white;
            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            transform: translateY(-3px);
            border-color: var(--neutral-100);
        }
        .facility-checkbox input {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            width: 16px;
            height: 16px;
            accent-color: var(--brand-500);
            cursor: pointer;
            z-index: 2;
        }
        .facility-checkbox i {
            font-size: 1.5rem;
            color: var(--neutral-300);
            transition: all 0.3s;
        }
        .facility-checkbox input:checked ~ i {
            color: var(--brand-500);
            transform: scale(1.1);
        }
        .facility-checkbox input:checked ~ span {
            color: var(--neutral-900);
        }
        .facility-checkbox span {
            font-size: 10px;
            font-weight: 900;
            color: var(--neutral-400);
            transition: all 0.3s;
        }
        .facility-checkbox:has(input:checked) {
            background: white;
            border-color: var(--brand-200);
            box-shadow: 0 10px 30px rgba(255, 45, 85, 0.1);
        }

        /* Interactive Map Styles */
        .map-container-premium {
            position: relative;
            border-radius: 2.5rem;
            overflow: hidden;
            border: 8px solid white;
            box-shadow: var(--shadow-2xl);
            background: white;
        }
        .map-floating-badge {
            position: absolute;
            bottom: 1.5rem;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            background: white;
            padding: 0.75rem 2rem;
            border-radius: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 12px;
            font-weight: 900;
            color: var(--neutral-400);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            pointer-events: none;
            white-space: nowrap;
        }
        .map-floating-badge i {
            color: var(--brand-500);
        }

        /* Loading Spinner */
        .upload-loading {
            position: absolute;
            inset: 0;
            background: rgba(255,255,255,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
        .spinner-mini {
            width: 16px;
            height: 16px;
            border: 2px solid var(--neutral-200);
            border-top-color: var(--brand-500);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
    <div id="dormModal" class="modal-overlay">
        <div class="modal-body custom-scrollbar">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem">
                <h2 style="font-family:'Public Sans',sans-serif;font-size:2rem;font-weight:900;letter-spacing:-0.05em">Elite <span style="color:var(--brand-500)">Form</span></h2>
                <button type="button" onclick="closeDormModal(false)" style="width:40px;height:40px;border-radius:50%;border:none;background:var(--neutral-100);cursor:pointer;font-size:16px"><i class="fas fa-times"></i></button>
            </div>
            <form id="dormForm" style="display:flex;flex-direction:column;gap:1.5rem">
                <input type="hidden" id="dormId">
                
                <!-- Basic Info -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                    <div><label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">ชื่อหอพัก</label><input type="text" id="dormName" placeholder="..." required class="form-input"></div>
                    <div>
                        <label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">โซน</label>
                        <select id="dormZone" class="form-input" style="appearance:none" onchange="toggleCustomZone(this.value)">
                            <option value="หลังมอ">หลังมอ</option>
                            <option value="กังสดาล">กังสดาล</option>
                            <option value="โคลัมโบ">โคลัมโบ</option>
                            <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
                        </select>
                        <div id="customZoneContainer" style="display:none;margin-top:0.5rem">
                            <input type="text" id="dormCustomZone" placeholder="ระบุโซนอื่นๆ..." class="form-input" style="background:var(--brand-50);border-color:var(--brand-200)">
                        </div>
                    </div>
                </div>
                
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">
                    <div>
                        <label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">ราคา (Min)</label>
                        <input type="number" id="dormPriceMin" placeholder="2000" min="0" inputmode="numeric" required class="form-input">
                    </div>
                    <div>
                        <label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">ราคา (Max)</label>
                        <input type="number" id="dormPriceMax" placeholder="3000" min="0" inputmode="numeric" class="form-input">
                    </div>
                    <div style="position:relative">
                        <label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">พิกัด (Lat, Lng)</label>
                        <div style="display:flex;gap:0.5rem">
                            <input type="text" id="dormCoords" placeholder="วางลิงก์ Google Maps หรือจิ้มแผนที่" required class="form-input" style="flex:1" oninput="handleSmartCoordsPaste(this.value)">
                            <button type="button" onclick="toggleMapPicker()" style="width:40px;height:40px;border-radius:12px;border:none;background:var(--brand-100);color:var(--brand-600);cursor:pointer;display:flex;align-items:center;justify-content:center"><i class="fas fa-location-dot"></i></button>
                        </div>
                    </div>
                </div>

                <!-- Map Picker Container -->
                <div id="mapPickerContainer" style="display:none;margin-bottom:1rem">
                    <div id="registerMap" style="height:200px;border-radius:1.5rem;border:1px solid var(--neutral-200);overflow:hidden"></div>
                    <p style="font-size:9px;color:var(--neutral-400);margin-top:0.5rem;text-align:center"><i class="fas fa-info-circle"></i> คลิกบนแผนที่เพื่อเลือกตำแหน่งหอพัก</p>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                    <div>
                        <label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">ค่ามัดจำ (Min)</label>
                        <input type="number" id="dormDepositMin" placeholder="2000" min="0" inputmode="numeric" class="form-input">
                    </div>
                    <div>
                        <label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">ค่ามัดจำ (Max)</label>
                        <input type="number" id="dormDepositMax" placeholder="5000" min="0" inputmode="numeric" class="form-input">
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">
                    <div><label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">ค่าน้ำ (หน่วย/เหมา)</label><input type="text" id="dormWater" placeholder="..." class="form-input"></div>
                    <div><label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">ค่าไฟ (หน่วย)</label><input type="number" id="dormElectric" placeholder="..." min="0" class="form-input"></div>
                    <div><label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">ขนาดห้อง (ตร.ม.)</label><input type="number" id="dormSize" placeholder="..." min="0" class="form-input"></div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                    <div><label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">ช่องทางติดต่อ</label><input type="text" id="dormContact" placeholder="..." class="form-input"></div>
                    <div><label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">จำนวนชั้น</label><input type="number" id="dormFloors" placeholder="..." min="1" class="form-input"></div>
                </div>

                <!-- Facilities -->
                <div>
                    <label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px;display:block;margin-bottom:0.5rem">สิ่งอำนวยความสะดวก</label>
                    <div id="facilityCheckboxes" style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem">
                        <label class="facility-checkbox"><input type="checkbox" value="แอร์"><i class="fas fa-wind"></i><span>แอร์</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="พัดลม"><i class="fas fa-fan"></i><span>พัดลม</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="น้ำอุ่น"><i class="fas fa-droplet"></i><span>น้ำอุ่น</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="Wi-Fi"><i class="fas fa-wifi"></i><span>Wi-Fi</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="ตู้เย็น"><i class="fas fa-cube"></i><span>ตู้เย็น</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="ทีวี"><i class="fas fa-tv"></i><span>ทีวี</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="เฟอร์นิเจอร์"><i class="fas fa-chair"></i><span>เฟอร์ฯ</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="ฟิตเนส"><i class="fas fa-dumbbell"></i><span>ฟิตเนส</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="ลิฟต์"><i class="fas fa-elevator"></i><span>ลิฟต์</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="ที่จอดรถ"><i class="fas fa-car"></i><span>ที่จอดรถ</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="CCTV"><i class="fas fa-video"></i><span>CCTV</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="คีย์การ์ด"><i class="fas fa-key"></i><span>คีย์การ์ด</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="เครื่องซักผ้า"><i class="fas fa-tshirt"></i><span>เครื่องซักผ้า</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="ร้านอาหาร"><i class="fas fa-utensils"></i><span>ร้านอาหาร</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="ร้านสะดวกซื้อ"><i class="fas fa-store"></i><span>มินิมาร์ท</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="รปภ. 24 ชม."><i class="fas fa-shield-halved"></i><span>รปภ.</span></label>
                        <label class="facility-checkbox"><input type="checkbox" value="เลี้ยงสัตว์ได้"><i class="fas fa-dog"></i><span>เลี้ยงสัตว์</span></label>
                    </div>
                </div>

                <!-- Room Types -->
                <div>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem"><label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">รายละเอียดห้อง</label><button type="button" onclick="addRoomTypeRow()" style="font-size:10px;font-weight:900;color:var(--brand-500);background:none;border:none;cursor:pointer">+ Add Room</button></div>
                    <div id="roomTypesList" style="display:flex;flex-direction:column;gap:0.5rem"></div>
                </div>

                <!-- Images -->
                <div>
                    <div style="padding:2rem;border:2px dashed var(--neutral-200);border-radius:1.5rem;text-align:center;position:relative;cursor:pointer;transition:border-color 0.3s" onmouseover="this.style.borderColor='var(--brand-500)'" onmouseout="this.style.borderColor='var(--neutral-200)'">
                        <i class="fas fa-images" style="font-size:1.5rem;color:var(--neutral-300)"></i>
                        <p style="font-size:10px;font-weight:900;color:var(--neutral-400);margin-top:0.5rem">อัปโหลดรูปภาพ</p>
                        <input type="file" id="imageUpload" multiple accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer">
                    </div>
                    <div id="imagePreview" style="display:flex;gap:0.5rem;overflow-x:auto;padding:0.5rem 0"></div>
                </div>

                <div style="display:grid;grid-template-columns:1fr;gap:1rem">
                    <div><label style="font-size:9px;font-weight:900;text-transform:uppercase;color:var(--neutral-400);margin-left:12px">แหล่งอ้างอิง / ลิงก์ต้นทาง</label><input type="url" id="dormRef" placeholder="https://..." class="form-input"></div>
                </div>

                <textarea id="dormDesc" rows="3" placeholder="รายละเอียดเพิ่มเติม หรือโปรโมชั่น..." class="form-input" style="border-radius:1.5rem"></textarea>
                
                <div style="display:flex;gap:1rem;padding-top:1rem;flex-direction:column">
                    <div style="display:flex;gap:1rem">
                        <button type="submit" style="flex:2;padding:1.25rem;border-radius:1.25rem;border:none;background:var(--neutral-900);color:white;font-weight:900;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer;transition:all 0.3s" onmouseover="this.style.background='var(--brand-500)'" onmouseout="this.style.background='var(--neutral-900)'">บันทึกข้อมูล</button>
                        <button type="button" onclick="closeDormModal(false)" style="flex:1;padding:1.25rem;border-radius:1.25rem;border:1px solid var(--neutral-200);background:white;color:var(--neutral-500);font-weight:900;font-size:11px;text-transform:uppercase;letter-spacing:0.1em;cursor:pointer">ยกเลิก</button>
                    </div>
                    <button type="button" id="deleteDormBtn" onclick="deleteCurrentDorm()" style="display:none; padding:1.25rem; border-radius:1.25rem; border:none; background:#fee2e2; color:#ef4444; font-weight:900; font-size:11px; text-transform:uppercase; letter-spacing:0.1em; cursor:pointer">ลบหอพักนี้</button>
                </div>
            </form>
        </div>
    </div>
    `;
}

// ===== Shared Form Logic =====
let uploadedImages = [];
let sessionUploadedImages = []; // Track images uploaded in this specific modal session

function openDormModal() {
    const form = document.getElementById('dormForm');
    if (form) form.reset();
    document.getElementById('dormId').value = '';
    document.getElementById('roomTypesList').innerHTML = '';
    uploadedImages = [];
    sessionUploadedImages = [];
    renderImagePreview();
    
    // Hide delete button on new registration
    const deleteBtn = document.getElementById('deleteDormBtn');
    if (deleteBtn) deleteBtn.style.display = 'none';

    // Reset Map Picker
    const mapContainer = document.getElementById('mapPickerContainer');
    if (mapContainer) mapContainer.style.display = 'none';
    if (registerMap) {
        registerMap.remove();
        registerMap = null;
        registerMarker = null;
    }

    const modal = document.getElementById('dormModal');
    const modalBody = modal.querySelector('.modal-body');
    modal.classList.add('open');
    modalBody.classList.add('animating');
    
    // Reset GSAP state before animating to ensure visibility
    gsap.set(modalBody, { scale: 1, opacity: 1, clearProps: 'all' });
    // Faster, smoother animation for mobile performance
    gsap.fromTo(modalBody, 
        { scale: 0.98, opacity: 0, y: 10 },
        { 
            scale: 1, opacity: 1, y: 0, 
            duration: 0.25, 
            ease: 'power2.out',
            onComplete: () => {
                modalBody.classList.remove('animating');
                // If there's pending data (from edit), render it NOW
                if (window._pendingDormData) {
                    renderEditData(window._pendingDormData.dorm);
                    delete window._pendingDormData;
                }
            }
        }
    );
}

async function closeDormModal(saved = false) {
    if (!saved && sessionUploadedImages.length > 0) {
        showToast('กำลังยกเลิกและคืนค่ารูปภาพ...', 'info');
        for (const path of sessionUploadedImages) {
            await deleteImageFromServer(path);
        }
        sessionUploadedImages = [];
    }

    gsap.to('.modal-body', { 
        scale: 0.95, 
        opacity: 0, 
        y: 10,
        duration: 0.25, 
        ease: 'power2.in',
        onComplete: () => {
            document.getElementById('dormModal').classList.remove('open');
        }
    });
}

function openEditModal(id, allDorms) {
    const dorm = allDorms.find(d => d.id === id);
    if (!dorm) return;
    
    // Store data to render AFTER animation finishes for maximum smoothness
    window._pendingDormData = { dorm };
    openDormModal();
    sessionUploadedImages = [];

    // Show delete button immediately as it's a simple toggle
    const deleteBtn = document.getElementById('deleteDormBtn');
    if (deleteBtn) deleteBtn.style.display = 'block';
}

function renderEditData(dorm) {
    document.getElementById('dormId').value = dorm.id;
    document.getElementById('dormName').value = dorm.name;
    const standardZones = ['หลังมอ', 'กังสดาล', 'โคลัมโบ'];
    if (standardZones.includes(dorm.zone)) {
        document.getElementById('dormZone').value = dorm.zone;
        toggleCustomZone(dorm.zone);
    } else {
        document.getElementById('dormZone').value = 'อื่นๆ';
        document.getElementById('dormCustomZone').value = dorm.zone;
        toggleCustomZone('อื่นๆ');
    }
    document.getElementById('dormPriceMin').value = dorm.priceMin || dorm.price || '';
    document.getElementById('dormPriceMax').value = dorm.priceMax || '';
    document.getElementById('dormDepositMin').value = dorm.depositMin || dorm.deposit || '';
    document.getElementById('dormDepositMax').value = dorm.depositMax || '';
    document.getElementById('dormCoords').value = `${dorm.coords.lat}, ${dorm.coords.lng}`;
    
    document.getElementById('dormFloors').value = dorm.floors || '';
    document.getElementById('dormWater').value = dorm.water || '';
    document.getElementById('dormElectric').value = dorm.electric || '';
    document.getElementById('dormSize').value = dorm.size || '';
    document.getElementById('dormRef').value = dorm.reference || '';
    document.getElementById('dormDesc').value = dorm.description || '';

    const contactInput = document.getElementById('dormContact');
    if (contactInput) contactInput.value = dorm.contact || '';

    uploadedImages = dorm.images || [];
    renderImagePreview();
    
    document.querySelectorAll('#facilityCheckboxes input').forEach(cb => cb.checked = (dorm.features || []).includes(cb.value));
    
    // Render room types
    document.getElementById('roomTypesList').innerHTML = '';
    if (dorm.roomTypes) dorm.roomTypes.forEach(rt => addRoomTypeRow(rt.type, rt.price, rt.images || rt.image, rt.status));
}

// ===== Smart Map Picker & Link Parsing =====
let registerMap = null;
let registerMarker = null;

function handleSmartCoordsPaste(value) {
    if (!value || value.length < 3) return;
    
    // 1. Check for coordinates in URLs or raw strings first (Fastest)
    const coordRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)|q=(-?\d+\.\d+),(-?\d+\.\d+)|ll=(-?\d+\.\d+),(-?\d+\.\d+)|^(\s*-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/;
    const match = value.match(coordRegex);
    
    if (match) {
        let lat, lng;
        // Search through groups to find which one matched
        for (let i = 1; i < match.length; i += 2) {
            if (match[i] && match[i+1]) {
                lat = match[i];
                lng = match[i+1];
                break;
            }
        }
        
        if (lat && lng) {
            applyFoundCoords(lat, lng, 'ดึงพิกัดจากข้อมูลที่ระบุเรียบร้อย!');
            return;
        }
    }

    // 2. If it's a URL but no coords found (like shortened links) or it's an address/name
    // Treat as a search query using Nominatim (OpenStreetMap)
    searchLocation(value);
}

async function searchLocation(query) {
    // If it's a shortened google maps link, we can't resolve it easily due to CORS,
    // but we can try to extract keywords if it has any, or just treat as query.
    let searchQuery = query;
    if (query.includes('maps.app.goo.gl') || query.includes('google.com/maps')) {
        // Try to extract name from place name in URL if possible
        const placeMatch = query.match(/place\/([^\/]+)/);
        if (placeMatch) searchQuery = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }

    showToast('กำลังค้นหาตำแหน่ง...', 'info');
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const result = data[0];
            applyFoundCoords(result.lat, result.lng, `พบตำแหน่ง: ${result.display_name.split(',')[0]}`);
        } else {
            // No results found
            if (!query.includes(',')) { // Don't warn if it's just a half-typed coord
                console.warn('Location search returned no results for:', searchQuery);
            }
        }
    } catch (err) {
        console.error('Geocoding error:', err);
    }
}

function applyFoundCoords(lat, lng, message) {
    const coordsStr = `${parseFloat(lat).toFixed(6)}, ${parseFloat(lng).toFixed(6)}`;
    document.getElementById('dormCoords').value = coordsStr;
    
    // Auto-open and update map picker for verification
    const container = document.getElementById('mapPickerContainer');
    if (container.style.display !== 'block') {
        container.style.display = 'block';
        initRegisterMap();
    } else {
        const pos = [parseFloat(lat), parseFloat(lng)];
        updateRegisterMarker(pos);
        registerMap.setView(pos, 16);
    }
    
    showToast(message, 'success');
}

function toggleMapPicker() {
    const container = document.getElementById('mapPickerContainer');
    const isVisible = container.style.display === 'block';
    
    if (isVisible) {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
        initRegisterMap();
    }
}

function initRegisterMap() {
    if (registerMap) return;

    let initialPos = [16.4831, 102.8227];
    const currentCoords = document.getElementById('dormCoords').value;
    if (currentCoords && currentCoords.includes(',')) {
        const parts = currentCoords.split(',').map(p => parseFloat(p.trim()));
        if (!isNaN(parts[0]) && !isNaN(parts[1])) {
            initialPos = [parts[0], parts[1]];
        }
    }

    registerMap = L.map('registerMap').setView(initialPos, 15);
    // Use Google Maps Tiles for registration map too
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
    }).addTo(registerMap);

    registerMarker = L.marker(initialPos, { draggable: true }).addTo(registerMap);

    registerMap.on('click', function(e) {
        updateRegisterMarker([e.latlng.lat, e.latlng.lng]);
    });

    registerMarker.on('dragend', function(e) {
        const pos = e.target.getLatLng();
        updateRegisterMarker([pos.lat, pos.lng]);
    });

    setTimeout(() => {
        registerMap.invalidateSize();
    }, 100);
}

function updateRegisterMarker(pos) {
    if (!registerMarker) return;
    registerMarker.setLatLng(pos);
    document.getElementById('dormCoords').value = `${pos[0].toFixed(6)}, ${pos[1].toFixed(6)}`;
}

function addRoomTypeRow(type = '', price = '', images = [], status = 'ว่าง') {
    const list = document.getElementById('roomTypesList');
    const dormId = document.getElementById('dormId').value || 'temp';
    const rowId = 'rt-' + Date.now() + Math.random().toString(36).substr(2, 5);
    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'room-type-row';
    row.style.cssText = 'display:flex;flex-direction:column;gap:1rem;background:var(--neutral-50);padding:1.25rem;border-radius:1.5rem;border:1px solid var(--neutral-100)';
    
    // Normalize images to array
    const imgList = Array.isArray(images) ? images : (images ? [images] : []);

    row.innerHTML = `
        <div style="display:flex;gap:0.75rem;align-items:center">
            <input type="text" placeholder="ประเภทห้อง" value="${type}" class="form-input room-type-name" style="flex:1;padding:0.5rem 1rem;background:white;font-size:12px">
            <input type="number" placeholder="ราคา" value="${price}" min="0" inputmode="numeric" class="form-input room-type-price" style="width:80px;padding:0.5rem 1rem;background:white;color:var(--brand-500);font-weight:900;font-size:12px">
            <select class="form-input room-type-status" style="width:80px;padding:0.5rem;font-size:11px;font-weight:900;appearance:none;text-align:center;border-radius:0.75rem">
                <option value="ว่าง" ${status === 'ว่าง' ? 'selected' : ''}>ว่าง</option>
                <option value="เต็ม" ${status === 'เต็ม' ? 'selected' : ''}>เต็ม</option>
            </select>
            <button type="button" onclick="deleteRoomTypeRow('${rowId}')" style="color:#ef4444;background:none;border:none;cursor:pointer;width:30px"><i class="fas fa-trash-alt"></i></button>
        </div>
        
        <div class="rt-images-container" style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <div class="rt-thumbnails" style="display:flex;gap:0.5rem;flex-wrap:wrap">
                ${imgList.map((img, idx) => `
                    <div class="rt-thumb" data-path="${img}" style="position:relative;width:50px;height:50px;border-radius:10px;overflow:hidden">
                        <img src="${img}" style="width:100%;height:100%;object-fit:cover">
                        <button type="button" onclick="removeRoomTypeImage(this, '${rowId}')" style="position:absolute;top:0;right:0;background:rgba(239,68,68,0.8);color:white;border:none;width:18px;height:18px;font-size:8px;cursor:pointer"><i class="fas fa-times"></i></button>
                    </div>
                `).join('')}
            </div>
            <div class="rt-add-btn" onclick="document.getElementById('${rowId}-input').click()" style="width:50px;height:50px;border-radius:10px;background:var(--neutral-200);border:2px dashed var(--neutral-300);display:flex;align-items:center;justify-content:center;color:var(--neutral-500);cursor:pointer;transition:all 0.2s">
                <i class="fas fa-plus"></i>
                <input type="file" id="${rowId}-input" style="display:none" multiple accept="image/*" onchange="handleRoomTypeImageUpload(this, '${rowId}')">
            </div>
        </div>
    `;
    list.appendChild(row);
}

async function deleteRoomTypeRow(rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;
    const images = Array.from(row.querySelectorAll('.rt-thumb')).map(t => t.dataset.path);
    for (const img of images) {
        await deleteImageFromServer(img);
    }
    row.remove();
}

async function removeRoomTypeImage(btn, rowId) {
    const thumb = btn.parentElement;
    const path = thumb.dataset.path;
    await deleteImageFromServer(path);
    // Remove from session tracking if it was there
    sessionUploadedImages = sessionUploadedImages.filter(p => p !== path);
    thumb.remove();
}

async function deleteImageFromServer(imagePath) {
    if (!imagePath) return;
    try {
        await fetch('/api/delete-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagePath })
        });
    } catch (err) { console.error('Failed to delete image:', err); }
}

async function handleRoomTypeImageUpload(input, rowId) {
    if (!input.files || input.files.length === 0) return;
    
    const row = document.getElementById(rowId);
    const thumbContainer = row.querySelector('.rt-thumbnails');
    const dormId = document.getElementById('dormId').value || 'temp';
    
    // Create placeholders
    const placeholders = [];
    for (let i = 0; i < input.files.length; i++) {
        const p = document.createElement('div');
        p.className = 'rt-thumb loading';
        p.style.cssText = 'position:relative;width:50px;height:50px;border-radius:10px;overflow:hidden;background:var(--neutral-100)';
        p.innerHTML = `<div class="upload-loading"><div class="spinner-mini"></div></div>`;
        thumbContainer.appendChild(p);
        placeholders.push(p);
    }

    const fd = new FormData();
    for (let f of input.files) fd.append('images', f);
    
    try {
        const res = await fetch(`/api/upload?folder=${dormId}/rooms/${rowId}`, { method: 'POST', body: fd });
        const data = await res.json();
        
        // Remove placeholders
        placeholders.forEach(p => p.remove());

        if (data.paths && data.paths.length > 0) {
            sessionUploadedImages.push(...data.paths);
            data.paths.forEach(path => {
                const thumb = document.createElement('div');
                thumb.className = 'rt-thumb';
                thumb.dataset.path = path;
                thumb.style.cssText = 'position:relative;width:50px;height:50px;border-radius:10px;overflow:hidden';
                thumb.innerHTML = `
                    <img src="${path}" style="width:100%;height:100%;object-fit:cover">
                    <button type="button" onclick="removeRoomTypeImage(this, '${rowId}')" style="position:absolute;top:0;right:0;background:rgba(239,68,68,0.8);color:white;border:none;width:18px;height:18px;font-size:8px;cursor:pointer"><i class="fas fa-times"></i></button>
                `;
                thumbContainer.appendChild(thumb);
            });
        }
    } catch (err) {
        placeholders.forEach(p => p.remove());
        showToast('อัปโหลดล้มเหลว', 'error');
    }
}

function setupFormSubmit() {
    document.getElementById('dormForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cb = Array.from(document.querySelectorAll('#facilityCheckboxes input:checked')).map(c => c.value);
        const coordsRaw = document.getElementById('dormCoords').value.split(',');
        const roomTypes = Array.from(document.querySelectorAll('#roomTypesList > .room-type-row')).map(row => ({ 
            type: row.querySelector('.room-type-name').value, 
            price: row.querySelector('.room-type-price').value,
            status: row.querySelector('.room-type-status').value,
            images: Array.from(row.querySelectorAll('.rt-thumb')).map(t => t.dataset.path)
        }));
        const contact = document.getElementById('dormContact')?.value || '';
        
        let finalZone = document.getElementById('dormZone').value;
        if (finalZone === 'อื่นๆ') {
            finalZone = document.getElementById('dormCustomZone').value.trim() || 'อื่นๆ';
        }

        const data = { 
            id: document.getElementById('dormId').value || null, 
            name: document.getElementById('dormName').value, 
            zone: finalZone, 
            priceMin: document.getElementById('dormPriceMin').value, 
            priceMax: document.getElementById('dormPriceMax').value, 
            // Keep 'price' for backward compatibility (using priceMin)
            price: document.getElementById('dormPriceMin').value,
            depositMin: document.getElementById('dormDepositMin').value,
            depositMax: document.getElementById('dormDepositMax').value,
            // Keep 'deposit' for backward compatibility
            deposit: document.getElementById('dormDepositMin').value,
            water: document.getElementById('dormWater').value,
            electric: document.getElementById('dormElectric').value,
            size: document.getElementById('dormSize').value,
            floors: document.getElementById('dormFloors').value,
            contact: contact,
            images: uploadedImages, 
            features: cb, 
            roomTypes, 
            coords: { lat: parseFloat(coordsRaw[0]?.trim()), lng: parseFloat(coordsRaw[1]?.trim()) }, 
            reference: document.getElementById('dormRef').value,
            description: document.getElementById('dormDesc').value || '' 
        };
        await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        sessionUploadedImages = []; // Clear session since we saved
        showToast('บันทึกข้อมูลเรียบร้อยแล้ว');
        closeDormModal(true);
    });
    document.getElementById('imageUpload')?.addEventListener('change', async (e) => {
        if (!e.target.files.length) return;
        const dormId = document.getElementById('dormId').value || 'temp';
        const previewContainer = document.getElementById('imagePreview');
        
        // Show placeholders
        const placeholders = [];
        for (let i = 0; i < e.target.files.length; i++) {
            const p = document.createElement('div');
            p.style.cssText = 'position:relative; width:80px; height:80px; flex-shrink:0; border-radius:12px; overflow:hidden; background:var(--neutral-100); display:flex; align-items:center; justify-content:center;';
            p.innerHTML = `<div class="spinner-mini"></div>`;
            previewContainer.appendChild(p);
            placeholders.push(p);
        }

        const fd = new FormData();
        for (let f of e.target.files) fd.append('images', f);
        
        try {
            const res = await fetch(`/api/upload?folder=${dormId}/gallery`, { method: 'POST', body: fd });
            const data = await res.json();
            
            // Remove placeholders
            placeholders.forEach(p => p.remove());

            sessionUploadedImages.push(...data.paths); // Track for cleanup
            uploadedImages = [...uploadedImages, ...data.paths];
            renderImagePreview();
        } catch (err) {
            placeholders.forEach(p => p.remove());
            showToast('อัปโหลดล้มเหลว', 'error');
        }
    });
}

// ===== Image Management Logic =====
function renderImagePreview() {
    const previewContainer = document.getElementById('imagePreview');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = uploadedImages.map((img, index) => `
        <div style="position:relative; width:80px; height:80px; flex-shrink:0; border-radius:12px; overflow:hidden; box-shadow:var(--shadow-card)">
            <img src="${img}" style="width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; flex-direction:column; justify-content:space-between; opacity:0; transition:opacity 0.2s" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                <button type="button" onclick="removeUploadedImage(${index})" style="align-self:flex-end; background:#ef4444; color:white; border:none; width:24px; height:24px; border-bottom-left-radius:8px; cursor:pointer; font-size:10px;"><i class="fas fa-times"></i></button>
                <div style="display:flex; justify-content:space-between; background:rgba(0,0,0,0.6); padding:4px;">
                    <button type="button" onclick="moveUploadedImage(${index}, -1)" style="background:none; border:none; color:white; cursor:pointer; font-size:12px;" ${index === 0 ? 'disabled style="opacity:0.3;cursor:not-allowed"' : ''}><i class="fas fa-chevron-left"></i></button>
                    <button type="button" onclick="moveUploadedImage(${index}, 1)" style="background:none; border:none; color:white; cursor:pointer; font-size:12px;" ${index === uploadedImages.length - 1 ? 'disabled style="opacity:0.3;cursor:not-allowed"' : ''}><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
        </div>
    `).join('');
}

async function removeUploadedImage(index) {
    const path = uploadedImages[index];
    await deleteImageFromServer(path);
    // Remove from session tracking if it was there
    sessionUploadedImages = sessionUploadedImages.filter(p => p !== path);
    uploadedImages.splice(index, 1);
    renderImagePreview();
}

function moveUploadedImage(index, direction) {
    if (index + direction < 0 || index + direction >= uploadedImages.length) return;
    const temp = uploadedImages[index];
    uploadedImages[index] = uploadedImages[index + direction];
    uploadedImages[index + direction] = temp;
    renderImagePreview();
}

let fullPreviewSwiper = null;

function viewFullImage(images, index = 0) {
    if (!images) return;
    const imgList = Array.isArray(images) ? images : [images];
    if (imgList.length === 0) return;

    let overlay = document.getElementById('imageGalleryOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'imageGalleryOverlay';
        overlay.className = 'image-preview-overlay'; // Use class for base styles
        overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.95);display:none;backdrop-filter:blur(20px);';
        overlay.innerHTML = `
            <button onclick="closeFullImage()" style="position:absolute;top:2rem;right:2rem;z-index:10001;background:white;border:none;width:50px;height:50px;border-radius:50%;cursor:pointer;font-size:20px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,0.3);transition:transform 0.2s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                <i class="fas fa-times" style="color:var(--neutral-500)"></i>
            </button>
            <div class="swiper swiper-gallery" style="width:100%;height:100%">
                <div class="swiper-wrapper"></div>
                <div class="swiper-pagination" style="color:white;font-weight:900"></div>
                <div class="swiper-button-next" style="color:white"></div>
                <div class="swiper-button-prev" style="color:white"></div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    const wrapper = overlay.querySelector('.swiper-wrapper');
    wrapper.innerHTML = imgList.map(img => `
        <div class="swiper-slide" style="display:flex;align-items:center;justify-content:center;padding:2rem">
            <div class="swiper-zoom-container">
                <img src="${img}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:1.5rem;box-shadow:0 30px 60px rgba(0,0,0,0.5)" onerror="this.src='/kku_dorm_elite_logo_1777569958199.png'">
            </div>
        </div>
    `).join('');

    overlay.style.display = 'block';
    if (window._gallerySwiper) window._gallerySwiper.destroy();
    window._gallerySwiper = new Swiper('.swiper-gallery', {
        initialSlide: index,
        zoom: true, // Enable zooming on desktop
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        pagination: { el: '.swiper-pagination', type: 'fraction' },
        keyboard: true,
        grabCursor: true
    });

    gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.4 });
}

function closeFullImage() {
    const overlay = document.getElementById('imageGalleryOverlay');
    if (!overlay) return;
    gsap.to(overlay, { 
        opacity: 0, 
        duration: 0.3, 
        onComplete: () => {
            overlay.style.display = 'none';
            if (window._gallerySwiper) {
                window._gallerySwiper.destroy();
                window._gallerySwiper = null;
            }
        }
    });
}

async function deleteDorm(id) {
    if (!id || !confirm('ยืนยันการลบหอพักนี้ใช่หรือไม่? ข้อมูลทั้งหมดรวมถึงรูปภาพจะถูกลบทิ้งถาวร')) return;
    
    try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('ลบข้อมูลเรียบร้อยแล้ว', 'error');
            setTimeout(() => {
                if (typeof loadDorms === 'function') loadDorms(); // Reload for explorer
                else location.reload(); // Reload for dashboard
            }, 1000);
            if (typeof closeDormModal === 'function') closeDormModal();
        } else {
            showToast('เกิดข้อผิดพลาดในการลบข้อมูล', 'error');
        }
    } catch (err) {
        showToast('ไม่สามารถติดต่อเซิร์ฟเวอร์ได้', 'error');
    }
}

function deleteCurrentDorm() {
    const id = document.getElementById('dormId').value;
    if (id) deleteDorm(id);
}

// ===== Auto-Inject Shared Elements =====
document.addEventListener('DOMContentLoaded', () => {
    // Remove old hardcoded modals if they exist
    const oldModal = document.getElementById('dormModal');
    if (oldModal) oldModal.remove();
    const oldPreview = document.getElementById('imagePreviewOverlay');
    if (oldPreview) oldPreview.remove();

    // Inject the new dynamic modal
    document.body.insertAdjacentHTML('beforeend', getModalHTML());
    
    // Re-bind form events if setupFormSubmit is available
    if (typeof setupFormSubmit === 'function') {
        setupFormSubmit();
    }

    // Global Numeric Input Guard
    document.addEventListener('keydown', (e) => {
        if (e.target.type === 'number' && e.target.inputMode === 'numeric') {
            if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                e.preventDefault();
            }
        }
    });
});


function getIconForFeature(f) {
    const icons = {
        'แอร์': 'fa-wind',
        'พัดลม': 'fa-fan',
        'น้ำอุ่น': 'fa-droplet',
        'Wi-Fi': 'fa-wifi',
        'ตู้เย็น': 'fa-cube',
        'ทีวี': 'fa-tv',
        'เฟอร์นิเจอร์': 'fa-chair',
        'ฟิตเนส': 'fa-dumbbell',
        'ลิฟต์': 'fa-elevator',
        'ที่จอดรถ': 'fa-car',
        'CCTV': 'fa-video',
        'คีย์การ์ด': 'fa-key',
        'เครื่องซักผ้า': 'fa-tshirt',
        'ร้านอาหาร': 'fa-utensils',
        'ร้านสะดวกซื้อ': 'fa-store',
        'รปภ. 24 ชม.': 'fa-shield-halved',
        'เลี้ยงสัตว์ได้': 'fa-dog'
    };
    return icons[f] || 'fa-check-circle';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `elite-toast ${type}`;
    toast.style.cssText = `
        position: fixed; top: 2rem; left: 50%; transform: translateX(-50%);
        padding: 1rem 2rem; border-radius: 1.25rem; background: var(--neutral-900);
        color: white; font-weight: 900; font-size: 13px; z-index: 10000;
        box-shadow: 0 20px 50px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 0.75rem;
        pointer-events: none;
    `;
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    const color = type === 'success' ? '#10b981' : (type === 'error' ? '#ef4444' : '#3b82f6');
    
    toast.innerHTML = `<i class="fas ${icon}" style="color:${color}"></i> ${message}`;
    document.body.appendChild(toast);
    
    gsap.fromTo(toast, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
    setTimeout(() => {
        gsap.to(toast, { y: -20, opacity: 0, duration: 0.3, onComplete: () => toast.remove() });
    }, 3000);
}
