let map;
let allDorms = [];
let markersLayer;
let roadmapLayer, satelliteLayer;
let isSatellite = false;
let favorites = JSON.parse(localStorage.getItem('elite_favorites') || '[]');
let showFavsOnly = false;
let selectedZone = 'ทั้งหมด';

window.addEventListener('DOMContentLoaded', () => {
    Transition.init();
    Nav.init('maps');
    Reveal.init();
    initFullMap();
    loadMapData();

    // Setup Filter Listeners
    document.getElementById('mapSearchInput')?.addEventListener('input', renderMapMarkers);
    document.getElementById('mapMinPrice')?.addEventListener('input', renderMapMarkers);
    document.getElementById('mapMaxPrice')?.addEventListener('input', renderMapMarkers);
    
    document.getElementById('mapFavFilter')?.addEventListener('click', function() {
        showFavsOnly = !showFavsOnly;
        this.classList.toggle('active', showFavsOnly);
        renderMapMarkers();
    });

    document.getElementById('mapModeToggle')?.addEventListener('click', toggleMapMode);

    // Zone Filter Setup
    document.querySelectorAll('#mapZoneFilter .zone-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('#mapZoneFilter .zone-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedZone = this.getAttribute('data-zone');
            renderMapMarkers();
        });
    });

    // Fix Leaflet sizing issue
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 500);

    // Listen for live updates
    LiveSync.init((data) => {
        allDorms = data;
        renderMapMarkers();
    });
    
    // Listen for favorite updates
    window.addEventListener('favoritesUpdated', (e) => {
        favorites = e.detail.favorites;
        renderMapMarkers();
    });
});

function initFullMap() {
    map = L.map('fullMap', {
        zoomControl: true,
        scrollWheelZoom: true,
        minZoom: 13,
        maxZoom: 21
    }).setView([TARGET_COORDS.lat, TARGET_COORDS.lng], 15);

    roadmapLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
    }).addTo(map);

    satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
    });

    markersLayer = L.layerGroup().addTo(map);

    // University Marker
    const uniIcon = L.divIcon({
        html: '<div style="width:44px;height:44px;background:var(--brand-500);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;border:4px solid white;box-shadow:0 10px 30px rgba(255, 45, 85, 0.4);"><i class="fas fa-graduation-cap" style="font-size:20px"></i></div>',
        className: '',
        iconSize: [44, 44]
    });
    L.marker([TARGET_COORDS.lat, TARGET_COORDS.lng], { icon: uniIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<div style="font-family:Sarabun;font-weight:900;text-align:center;padding:5px">มหาวิทยาลัยขอนแก่น</div>');
}

function toggleMapMode() {
    isSatellite = !isSatellite;
    const btn = document.getElementById('mapModeToggle');
    if (isSatellite) {
        map.removeLayer(roadmapLayer);
        satelliteLayer.addTo(map);
        btn.classList.add('active');
        btn.style.background = 'var(--neutral-900)';
    } else {
        map.removeLayer(satelliteLayer);
        roadmapLayer.addTo(map);
        btn.classList.remove('active');
        btn.style.background = 'white';
    }
}

async function loadMapData() {
    allDorms = await fetchDorms();
    renderMapMarkers();
}

let currentPolyline = null;

function renderMapMarkers() {
    if (!markersLayer) return;
    markersLayer.clearLayers();

    const query = (document.getElementById('mapSearchInput')?.value || '').toLowerCase();
    const minPrice = parseInt((document.getElementById('mapMinPrice')?.value || '').replace(/,/g, '')) || 0;
    const maxPrice = parseInt((document.getElementById('mapMaxPrice')?.value || '').replace(/,/g, '')) || Infinity;

    const filtered = allDorms.filter(d => {
        if (!d.coords || !d.coords.lat) return false;
        const searchOk = d.name.toLowerCase().includes(query);
        const p = parseInt(d.priceMin || d.price) || 0;
        const priceOk = p >= minPrice && p <= maxPrice;
        const favOk = !showFavsOnly || favorites.includes(d.id);
        const zoneOk = selectedZone === 'ทั้งหมด' || d.zone === selectedZone || (selectedZone === 'อื่นๆ' && !['กังสดาล', 'โคลัมโบ', 'หลังมอ'].includes(d.zone));
        return searchOk && priceOk && favOk && zoneOk;
    });

    filtered.forEach(dorm => {
        const dist = calcDistance(dorm.coords.lat, dorm.coords.lng);
        const travelTime = Math.ceil((dist * 1.3 / 25) * 60); 
        const isFav = favorites.includes(dorm.id);
        const mainImg = (dorm.images && dorm.images[0]) || '/kku_dorm_elite_logo_1777569958199.png';

        const iconHtml = isFav 
            ? `<div style="width:40px;height:40px;background:var(--brand-500);color:white;border-radius:12px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 8px 25px rgba(244,63,94,0.4);font-size:14px;cursor:pointer"><i class="fas fa-heart"></i></div>`
            : `<div style="width:36px;height:36px;background:var(--neutral-900);color:white;border-radius:10px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 5px 15px rgba(0,0,0,0.2);font-size:12px;cursor:pointer"><i class="fas fa-house"></i></div>`;

        const marker = L.marker([dorm.coords.lat, dorm.coords.lng], { 
            icon: L.divIcon({ html: iconHtml, className: '', iconSize: isFav ? [40, 40] : [36, 36] }),
            zIndexOffset: isFav ? 500 : 0
        }).addTo(markersLayer);

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
                <div style="position:absolute;top:0.75rem;right:0.75rem;z-index:10">
                    <button onclick="toggleFavorite('${dorm.id}', (added) => { renderMapMarkers(); })" style="width:32px;height:32px;border-radius:50%;background:white;border:none;box-shadow:0 4px 10px rgba(0,0,0,0.2);cursor:pointer;color:${isFav ? '#ef4444' : 'var(--neutral-300)'};display:flex;align-items:center;justify-content:center;font-size:12px">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <img src="${mainImg}" class="popup-img" onerror="this.src='/kku_dorm_elite_logo_1777569958199.png'">
                <div class="popup-info">
                    <h4 class="popup-title">${dorm.name}</h4>
                    <div style="display:flex;gap:1rem;font-size:10px;font-weight:900;color:var(--neutral-400);margin-bottom:1rem">
                        <span><i class="fas fa-motorcycle" style="color:var(--brand-500)"></i> ~${travelTime} นาที</span>
                        <span><i class="fas fa-location-arrow" style="color:var(--brand-500)"></i> ${dist.toFixed(2)} กม.</span>
                    </div>
                    <div class="popup-meta">
                        <span class="popup-price">${formatRange(dorm.priceMin || dorm.price, dorm.priceMax)}</span>
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

