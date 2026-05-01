/**
 * EliteDorm - Comparison Page Logic
 */
let allDorms = [];

window.addEventListener('DOMContentLoaded', () => {
    Transition.init();
    Nav.init('compare');
    Reveal.init();
    loadDorms();

    LiveSync.init((data) => { allDorms = data; renderTable(); });
});

async function loadDorms() {
    allDorms = await fetchDorms();
    renderTable();
}

function renderTable() {
    const body = document.getElementById('sheetBody');
    const stdFeatures = ['แอร์', 'พัดลม', 'น้ำอุ่น', 'Wi-Fi'];
    const featureIcons = { 'แอร์': 'fa-wind', 'พัดลม': 'fa-fan', 'น้ำอุ่น': 'fa-droplet', 'Wi-Fi': 'fa-wifi' };

    body.innerHTML = allDorms.map(dorm => {
        const dist = calcDistance(dorm.coords.lat, dorm.coords.lng);
        const features = dorm.features || [];
        return `
            <tr>
                <td style="text-align:left;padding-left:2.5rem">
                    <div style="display:flex;align-items:center;gap:1rem">
                        <img src="${dorm.images?.[0] || ''}" style="width:48px;height:48px;border-radius:14px;object-fit:cover;background:var(--neutral-100);border:2px solid white;box-shadow:var(--shadow-card)">
                        <div style="line-height:1.3">
                            <p style="font-weight:900;letter-spacing:-0.02em">${dorm.name}</p>
                            <p style="font-size:9px;font-weight:700;color:var(--brand-500);text-transform:uppercase;letter-spacing:0.1em">${dorm.zone}</p>
                        </div>
                    </div>
                </td>
                <td style="font-weight:900;font-size:1.1rem;letter-spacing:-0.03em">${formatRange(dorm.priceMin || dorm.price, dorm.priceMax)}</td>
                <td style="font-weight:800;color:var(--neutral-400)">${dist.toFixed(2)}km</td>
                <td style="font-weight:800;color:var(--neutral-400)">~${Math.ceil((dist/25)*60)}m</td>
                <td>
                    <div style="display:flex;justify-content:center;gap:0.4rem">
                        ${stdFeatures.map(f => `<div style="width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;${features.includes(f) ? 'background:#f0fdf4;color:#22c55e' : 'background:var(--neutral-100);color:var(--neutral-200)'}"><i class="fas ${featureIcons[f]}"></i></div>`).join('')}
                    </div>
                </td>
                <td>
                    <div style="display:flex;gap:0.5rem;justify-content:center">
                        <a href="/explorer" data-navigate="/explorer" style="width:40px;height:40px;background:var(--neutral-900);color:white;border-radius:10px;display:flex;align-items:center;justify-content:center;text-decoration:none;transition:background 0.3s" onmouseover="this.style.background='var(--brand-500)'" onmouseout="this.style.background='var(--neutral-900)'"><i class="fas fa-eye" style="font-size:12px"></i></a>
                        <button onclick="deleteDorm('${dorm.id}')" style="width:40px;height:40px;background:var(--neutral-50);color:var(--neutral-300);border:none;border-radius:10px;cursor:pointer;transition:all 0.3s" onmouseover="this.style.background='#ef4444';this.style.color='white'" onmouseout="this.style.background='var(--neutral-50)';this.style.color='var(--neutral-300)'"><i class="fas fa-trash-alt" style="font-size:12px"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Re-bind nav transitions for dynamic content
    Nav.init('compare');
}
