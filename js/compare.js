/**
 * EliteDorm - Comparison Page Logic
 */
let allDorms = [];
let hiddenDorms = new Set();
let sortStack = [];

window.addEventListener('DOMContentLoaded', () => {
    Transition.init();
    Nav.init('compare');
    Reveal.init();
    loadDorms();

    LiveSync.init((data) => { 
        allDorms = data; 
        renderDormToggles();
        renderTable(); 
    });
});

async function loadDorms() {
    allDorms = await fetchDorms();
    renderDormToggles();
    renderTable();
}

function renderDormToggles() {
    const container = document.getElementById('dormToggles');
    if (!container) return;
    
    container.innerHTML = allDorms.map(dorm => `
        <label style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem;cursor:pointer;border-radius:0.75rem" class="hover-bg-neutral-50">
            <input type="checkbox" ${!hiddenDorms.has(dorm.id) ? 'checked' : ''} onchange="toggleDormVisibility('${dorm.id}')">
            <span style="font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${dorm.name}</span>
        </label>
    `).join('');
}

function toggleDormVisibility(id) {
    if (hiddenDorms.has(id)) {
        hiddenDorms.add(id);
    } else {
        // Find if it was hidden and remove it
        if (hiddenDorms.has(id)) hiddenDorms.delete(id);
        else hiddenDorms.add(id);
    }
    // Wait, the logic should be simpler:
    // If it's in the set, it's HIDDEN.
    // toggleDormVisibility(id) is called when checkbox changes.
}

// Rewriting toggle for clarity
function toggleDormVisibility(id) {
    if (hiddenDorms.has(id)) {
        hiddenDorms.delete(id);
    } else {
        hiddenDorms.add(id);
    }
    renderTable();
}

function toggleDormMenu() {
    const menu = document.getElementById('dormMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    const colMenu = document.getElementById('columnMenu');
    if (colMenu) colMenu.style.display = 'none';
}

function setSort(val) {
    const select = document.getElementById('compareSort');
    if (select) {
        select.value = val;
        if (val === 'default') sortStack = [];
        else sortStack = [val];
        renderTable();
    }
}

function toggleSort(key) {
    const currentPrimary = sortStack[0];
    let newSort = '';

    if (currentPrimary && currentPrimary.startsWith(key)) {
        const dir = currentPrimary.endsWith('asc') ? 'desc' : 'asc';
        newSort = `${key}-${dir}`;
    } else {
        const defaultDirs = { 
            'price': 'asc', 'deposit': 'asc', 'dist': 'asc', 
            'size': 'desc', 'floors': 'desc', 'fac': 'desc', 'name': 'asc' 
        };
        newSort = `${key}-${defaultDirs[key]}`;
    }

    sortStack = [newSort, ...sortStack.filter(s => !s.startsWith(key))].slice(0, 3);
    const select = document.getElementById('compareSort');
    if (select) {
        const optionExists = Array.from(select.options).some(opt => opt.value === newSort);
        if (optionExists) select.value = newSort;
    }
    renderTable();
}

function toggleZoom() {
    const table = document.getElementById('comparisonTable');
    const icon = document.getElementById('zoomIcon');
    const text = document.getElementById('zoomText');
    if (table.classList.contains('compact')) {
        table.classList.remove('compact');
        table.classList.add('expanded');
        icon.className = 'fas fa-magnifying-glass-minus';
        text.textContent = 'Compact View';
    } else {
        table.classList.remove('expanded');
        table.classList.add('compact');
        icon.className = 'fas fa-magnifying-glass-plus';
        text.textContent = 'Expand Table';
    }
}

function resetTable() {
    sortStack = [];
    hiddenDorms.clear();
    const select = document.getElementById('compareSort');
    if (select) select.value = 'default';
    const colToggles = document.querySelectorAll('#colToggles input');
    colToggles.forEach(t => t.checked = true);
    updateColVis();
    renderDormToggles();
    const table = document.getElementById('comparisonTable');
    if (table.classList.contains('expanded')) toggleZoom();
    renderTable();
}

function toggleColumnMenu() {
    const menu = document.getElementById('columnMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    const dormMenu = document.getElementById('dormMenu');
    if (dormMenu) dormMenu.style.display = 'none';
}

function updateColVis() {
    const toggles = document.querySelectorAll('#colToggles input');
    toggles.forEach(t => {
        const colClass = t.dataset.col;
        if (t.checked) document.body.classList.remove(`hide-${colClass}`);
        else document.body.classList.add(`hide-${colClass}`);
    });
}

function renderTable() {
    const body = document.getElementById('sheetBody');
    const countEl = document.getElementById('compareCount');
    
    // 1. Filter
    let sorted = allDorms.filter(d => !hiddenDorms.has(d.id));
    
    // 2. Sort
    const reversedStack = [...sortStack].reverse();
    for (const sortVal of reversedStack) {
        sorted.sort((a, b) => {
            if (sortVal === 'price-asc') return (parseFloat(a.priceMin || a.price) || 0) - (parseFloat(b.priceMin || b.price) || 0);
            if (sortVal === 'price-desc') return (parseFloat(b.priceMin || b.price) || 0) - (parseFloat(a.priceMin || a.price) || 0);
            if (sortVal === 'deposit-asc') return (parseFloat(a.depositMin || a.deposit) || 0) - (parseFloat(b.depositMin || b.deposit) || 0);
            if (sortVal === 'deposit-desc') return (parseFloat(b.depositMin || b.deposit) || 0) - (parseFloat(a.depositMin || a.deposit) || 0);
            if (sortVal === 'dist-asc') return calcDistance(a.coords.lat, a.coords.lng) - calcDistance(b.coords.lat, b.coords.lng);
            if (sortVal === 'dist-desc') return calcDistance(b.coords.lat, b.coords.lng) - calcDistance(a.coords.lat, a.coords.lng);
            if (sortVal === 'fac-desc') return (b.features?.length || 0) - (a.features?.length || 0);
            if (sortVal === 'fac-asc') return (a.features?.length || 0) - (b.features?.length || 0);
            if (sortVal === 'size-desc') return (parseFloat(b.size) || 0) - (parseFloat(a.size) || 0);
            if (sortVal === 'size-asc') return (parseFloat(a.size) || 0) - (parseFloat(b.size) || 0);
            if (sortVal === 'floors-desc') return (parseFloat(b.floors) || 0) - (parseFloat(a.floors) || 0);
            if (sortVal === 'floors-asc') return (parseFloat(a.floors) || 0) - (parseFloat(b.floors) || 0);
            if (sortVal === 'name-asc') return a.name.localeCompare(b.name, 'th');
            if (sortVal === 'name-desc') return b.name.localeCompare(a.name, 'th');
            return 0;
        });
    }

    if (countEl) countEl.textContent = sorted.length;

    const allFeatures = [
        'แอร์', 'พัดลม', 'น้ำอุ่น', 'Wi-Fi', 'ตู้เย็น', 'ทีวี', 'เฟอร์นิเจอร์', 
        'ฟิตเนส', 'ลิฟต์', 'ที่จอดรถ', 'CCTV', 'คีย์การ์ด', 'เครื่องซักผ้า', 
        'ร้านอาหาร', 'ร้านสะดวกซื้อ', 'รปภ. 24 ชม.', 'เลี้ยงสัตว์ได้'
    ];

    body.innerHTML = sorted.map(dorm => {
        const dist = calcDistance(dorm.coords.lat, dorm.coords.lng);
        const features = dorm.features || [];
        return `
            <tr>
                <td style="text-align:left;padding-left:2rem;position:sticky;left:0;background:white;z-index:10;border-right:1px solid var(--neutral-50)">
                    <div style="display:flex;align-items:center;gap:0.75rem">
                        <img src="${dorm.images?.[0] || ''}" style="width:36px;height:36px;border-radius:10px;object-fit:cover;background:var(--neutral-100);border:1px solid var(--neutral-100)" onerror="this.src='/kku_dorm_elite_logo_1777569958199.png'">
                        <div style="line-height:1.2">
                            <p style="font-weight:900;letter-spacing:-0.02em;font-size:0.9rem;color:var(--neutral-900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">${dorm.name}</p>
                            <p style="font-size:9px;font-weight:800;color:var(--neutral-400);text-transform:uppercase">${dorm.zone}</p>
                        </div>
                    </div>
                </td>
                <td class="col-price" style="font-weight:900;font-size:1rem;color:var(--brand-500)">
                    ${formatRange(dorm.priceMin || dorm.price, dorm.priceMax)}
                </td>
                <td class="col-deposit" style="font-weight:800;color:var(--neutral-600)">
                    ${formatRange(dorm.depositMin || dorm.deposit, dorm.depositMax) || 'N/A'}
                </td>
                <td class="col-dist" style="font-weight:900;color:var(--neutral-900)">
                    ${dist.toFixed(2)}km
                </td>
                <td class="col-travel" style="font-weight:800;color:var(--neutral-600);font-size:10px">
                    <div style="display:flex;flex-direction:column">
                        <span><i class="fas fa-motorcycle" style="color:var(--brand-500)"></i> ~${Math.ceil((dist*1.3/25)*60)}m</span>
                        <span style="opacity:0.6"><i class="fas fa-person-walking"></i> ~${Math.ceil((dist/5)*60)}m</span>
                    </div>
                </td>
                <td class="col-spec" style="font-weight:800;color:var(--neutral-600)">${dorm.size || 'N/A'}</td>
                <td class="col-spec" style="font-weight:800;color:var(--neutral-600)">${dorm.floors || 'N/A'}</td>
                <td class="col-fac">
                    <div class="compact-features" style="display:flex;flex-wrap:wrap;justify-content:center;gap:0.25rem">
                        ${allFeatures.map(f => {
                            const has = features.includes(f);
                            return `
                                <div title="${f}" class="fac-icon ${has ? '' : 'missing'}" style="border-radius:4px;display:flex;align-items:center;justify-content:center;${has ? 'background:var(--brand-50);color:var(--brand-500)' : 'background:var(--neutral-50);color:var(--neutral-200)'}">
                                    <i class="fas ${getIconForFeature(f)}"></i>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </td>
                <td>
                    <div style="display:flex;gap:0.4rem;justify-content:center">
                        <a href="/explorer?id=${dorm.id}" style="width:32px;height:32px;background:var(--neutral-900);color:white;border-radius:8px;display:flex;align-items:center;justify-content:center;text-decoration:none"><i class="fas fa-expand" style="font-size:10px"></i></a>
                        <button onclick="deleteDorm('${dorm.id}')" style="width:32px;height:32px;background:var(--neutral-50);color:var(--neutral-300);border:none;border-radius:8px;cursor:pointer"><i class="fas fa-trash-alt" style="font-size:10px"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    updateColVis();
    Nav.init('compare');
}

document.addEventListener('click', (e) => {
    const menu = document.getElementById('columnMenu');
    const dormMenu = document.getElementById('dormMenu');
    const btn = e.target.closest('button');
    
    if (menu && menu.style.display === 'block' && !menu.contains(e.target) && (!btn || !btn.onclick?.toString().includes('toggleColumnMenu'))) {
        menu.style.display = 'none';
    }
    if (dormMenu && dormMenu.style.display === 'block' && !dormMenu.contains(e.target) && (!btn || !btn.onclick?.toString().includes('toggleDormMenu'))) {
        dormMenu.style.display = 'none';
    }
});
