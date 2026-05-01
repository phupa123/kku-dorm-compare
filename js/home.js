window.addEventListener('DOMContentLoaded', () => {
    Transition.init();
    Splash.run(() => {
        Nav.init('home');
        Reveal.init();
    });

    // Init Map with Zoom enabled for Desktop
    const map = L.map('mainMap', { 
        zoomControl: true, 
        scrollWheelZoom: true, // Enabled for desktop as requested
        minZoom: 12, 
        maxZoom: 18 
    }).setView([TARGET_COORDS.lat, TARGET_COORDS.lng], 15);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);

    // University Marker (The "Target")
    L.marker([TARGET_COORDS.lat, TARGET_COORDS.lng], {
        icon: L.divIcon({ 
            html: '<div style="width:40px;height:40px;background:var(--brand-500);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;border:4px solid white;box-shadow:0 10px 20px rgba(255, 45, 85, 0.3);"><i class="fas fa-graduation-cap"></i></div>', 
            className: '', 
            iconSize: [40, 40] 
        })
    }).addTo(map).bindPopup('<div style="font-family:Sarabun;font-weight:900;text-align:center">มหาวิทยาลัยขอนแก่น</div>');

    // Load dorms for stats + markers
    fetchDorms().then(dorms => {
        document.getElementById('totalDorms').innerText = dorms.length;
        const near = dorms.filter(d => calcDistance(d.coords.lat, d.coords.lng) < 1).length;
        document.getElementById('nearCount').innerText = near;

        dorms.forEach(d => {
            const dist = calcDistance(d.coords.lat, d.coords.lng);
            const mainImg = (d.images && d.images[0]) || '/kku_dorm_elite_logo_1777569958199.png';
            
            const marker = L.marker([d.coords.lat, d.coords.lng], {
                icon: L.divIcon({ 
                    html: `<div style="width:32px;height:32px;background:#1f2937;color:white;border-radius:10px;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.15);font-size:10px;cursor:pointer"><i class="fas fa-house"></i></div>`, 
                    className: '', 
                    iconSize: [32, 32] 
                })
            }).addTo(map);

            // Rich Popup Design
            marker.bindPopup(`
                <div style="width:200px;font-family:Sarabun;padding:5px">
                    <img src="${mainImg}" style="width:100%;height:100px;object-fit:cover;border-radius:12px;margin-bottom:8px">
                    <h4 style="margin:0;font-weight:900;color:var(--neutral-900);font-size:14px">${d.name}</h4>
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:5px">
                        <span style="color:var(--brand-500);font-weight:900;font-size:13px">฿${d.priceMin || d.price}</span>
                        <span style="font-size:10px;color:var(--neutral-400);font-weight:700"><i class="fas fa-location-arrow"></i> ${dist.toFixed(2)} กม.</span>
                    </div>
                    <a href="/explorer?id=${d.id}" style="display:block;margin-top:10px;text-align:center;background:var(--neutral-900);color:white;text-decoration:none;padding:8px;border-radius:8px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px">ดูรายละเอียด</a>
                </div>
            `, {
                className: 'elite-map-popup'
            });
        });
    });

    // Socket
    LiveSync.init((data) => {
        document.getElementById('totalDorms').innerText = data.length;
        const near = data.filter(d => calcDistance(d.coords.lat, d.coords.lng) < 1).length;
        document.getElementById('nearCount').innerText = near;
    });
});
