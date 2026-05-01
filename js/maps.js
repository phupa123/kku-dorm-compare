/**
 * EliteDorm - Dedicated Maps Logic
 */
let map;
let allDorms = [];

window.addEventListener('DOMContentLoaded', () => {
    Transition.init();
    Nav.init('maps');
    Reveal.init(); // Make content visible
    initFullMap();
    loadMapData();

    // Fix Leaflet sizing issue with flex layouts
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 500);

    // Listen for live updates
    LiveSync.init((data) => {
        allDorms = data;
        renderMapMarkers();
    });
});

function initFullMap() {
    map = L.map('fullMap', {
        zoomControl: true,
        scrollWheelZoom: true,
        minZoom: 13,
        maxZoom: 18
    }).setView([TARGET_COORDS.lat, TARGET_COORDS.lng], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    // University Marker (Center Point)
    const uniIcon = L.divIcon({
        html: '<div style="width:44px;height:44px;background:var(--brand-500);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;border:4px solid white;box-shadow:0 10px 30px rgba(255, 45, 85, 0.4);"><i class="fas fa-graduation-cap" style="font-size:20px"></i></div>',
        className: '',
        iconSize: [44, 44]
    });
    L.marker([TARGET_COORDS.lat, TARGET_COORDS.lng], { icon: uniIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<div style="font-family:Sarabun;font-weight:900;text-align:center;padding:5px">มหาวิทยาลัยขอนแก่น</div>');
}

async function loadMapData() {
    allDorms = await fetchDorms();
    renderMapMarkers();
}

let currentPolyline = null;

function renderMapMarkers() {
    allDorms.forEach(dorm => {
        if (!dorm.coords || !dorm.coords.lat) return;

        const dist = calcDistance(dorm.coords.lat, dorm.coords.lng);
        const travelTime = Math.ceil((dist * 1.3 / 25) * 60); 
        const mainImg = (dorm.images && dorm.images[0]) || '/kku_dorm_elite_logo_1777569958199.png';

        const dormIcon = L.divIcon({
            html: `<div style="width:36px;height:36px;background:var(--neutral-900);color:white;border-radius:12px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 8px 20px rgba(0,0,0,0.25);font-size:12px;cursor:pointer"><i class="fas fa-house"></i></div>`,
            className: '',
            iconSize: [36, 36]
        });

        const marker = L.marker([dorm.coords.lat, dorm.coords.lng], { icon: dormIcon }).addTo(map);

        marker.on('popupopen', () => {
            if (currentPolyline) map.removeLayer(currentPolyline);
            currentPolyline = L.polyline([
                [dorm.coords.lat, dorm.coords.lng],
                [TARGET_COORDS.lat, TARGET_COORDS.lng]
            ], {
                color: 'var(--brand-500)',
                weight: 4,
                opacity: 0.6,
                dashArray: '10, 15',
                lineJoin: 'round'
            }).addTo(map);
        });

        marker.on('popupclose', () => {
            if (currentPolyline) {
                map.removeLayer(currentPolyline);
                currentPolyline = null;
            }
        });

        marker.bindPopup(`
            <div class="popup-card">
                <img src="${mainImg}" class="popup-img" onerror="this.src='/kku_dorm_elite_logo_1777569958199.png'">
                <div class="popup-info">
                    <h4 class="popup-title">${dorm.name}</h4>
                    <div style="display:flex;gap:1rem;font-size:10px;font-weight:900;color:var(--neutral-400);margin-bottom:1rem">
                        <span><i class="fas fa-motorcycle" style="color:var(--brand-500)"></i> ~${travelTime} นาที</span>
                        <span><i class="fas fa-location-arrow" style="color:var(--brand-500)"></i> ${dist.toFixed(2)} กม.</span>
                    </div>
                    <div class="popup-meta">
                        <span class="popup-price">฿${dorm.priceMin || dorm.price}</span>
                        <span class="popup-dist">${dorm.zone}</span>
                    </div>
                    <div class="popup-actions">
                        <a href="/explorer?id=${dorm.id}" class="popup-btn popup-btn-primary">View Details</a>
                        <a href="https://www.google.com/maps/dir/?api=1&destination=${dorm.coords.lat},${dorm.coords.lng}" target="_blank" class="popup-btn popup-btn-ghost">Google Maps</a>
                    </div>
                </div>
            </div>
        `, {
            className: 'elite-map-popup'
        });
    });
}
