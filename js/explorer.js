/**
 * EliteDorm - Explorer Page Logic
 */
let allDorms = [];
let currentZone = 'all';
let favorites = JSON.parse(localStorage.getItem('elite_favorites') || '[]');
let hiddenDorms = new Set(JSON.parse(localStorage.getItem('elite_hidden') || '[]'));

function toggleFavorite(id) {
    const isFav = favorites.includes(id);
    if (isFav) {
        favorites = favorites.filter(f => f !== id);
    } else {
        favorites.push(id);
    }
    localStorage.setItem('elite_favorites', JSON.stringify(favorites));
    
    // Update button UI without full re-render
    const btn = document.getElementById(`fav-${id}`);
    if (btn) {
        btn.style.color = !isFav ? '#ef4444' : 'var(--neutral-400)';
        gsap.fromTo(btn, { scale: 0.8 }, { scale: 1.2, duration: 0.2, yoyo: true, repeat: 1, ease: 'back.out' });
    }
    
    showToast(!isFav ? 'เพิ่มในรายการโปรดแล้ว' : 'ลบออกจากรายการโปรดแล้ว', !isFav ? 'success' : 'info');
}

function hideDorm(id) {
    hiddenDorms.add(id);
    localStorage.setItem('elite_hidden', JSON.stringify(Array.from(hiddenDorms)));
    renderGrid();
    showToast('ซ่อนหอพักนี้แล้ว (จัดการได้ในหน้า Comparison)', 'info');
}

window.addEventListener('DOMContentLoaded', () => {
    Transition.init();
    Nav.init('explorer');
    Reveal.init();
    loadDorms();

    document.getElementById('searchInput')?.addEventListener('input', () => renderGrid());

    LiveSync.init((data) => { 
        allDorms = data; 
        // Sync hidden state from localStorage in case it changed in another tab/page
        hiddenDorms = new Set(JSON.parse(localStorage.getItem('elite_hidden') || '[]'));
        renderGrid(); 
    });
});

async function loadDorms() {
    allDorms = await fetchDorms();
    renderGrid();
    
    // Check URL for specific dorm ID to open automatically
    const urlParams = new URLSearchParams(window.location.search);
    const dormId = urlParams.get('id');
    if (dormId) {
        setTimeout(() => showDetail(dormId), 300);
    }
}

function setFilter(zone) {
    currentZone = zone;
    document.querySelectorAll('.zone-btn').forEach(btn => {
        const isActive = btn.textContent.trim() === (zone === 'all' ? 'ทั้งหมด' : zone);
        btn.style.background = isActive ? 'var(--neutral-900)' : 'transparent';
        btn.style.color = isActive ? 'white' : 'var(--neutral-400)';
    });
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('dormGrid');
    const query = (document.getElementById('searchInput')?.value || '').toLowerCase();
    const minPrice = parseInt(document.getElementById('filterMinPrice')?.value) || 0;
    const maxPrice = parseInt(document.getElementById('filterMaxPrice')?.value) || Infinity;
    const showFavs = document.getElementById('filterFavorites')?.checked;
    const selectedFeatures = Array.from(document.querySelectorAll('#filterFeatures input:checked')).map(cb => cb.value);

    // 1. Refresh hidden state from storage
    hiddenDorms = new Set(JSON.parse(localStorage.getItem('elite_hidden') || '[]'));

    const mainZones = ['หลังมอ', 'กังสดาล', 'โคลัมโบ'];
    const filtered = allDorms.filter(d => {
        // Exclude hidden dorms
        if (hiddenDorms.has(d.id)) return false;

        let zoneOk = false;
        if (currentZone === 'all') zoneOk = true;
        else if (currentZone === 'อื่นๆ') zoneOk = !mainZones.includes(d.zone);
        else zoneOk = d.zone === currentZone;
        const searchOk = d.name.toLowerCase().includes(query);
        const p = parseInt(d.priceMin || d.price) || 0;
        const priceOk = p >= minPrice && p <= maxPrice;
        const favOk = !showFavs || favorites.includes(d.id);
        const featuresOk = selectedFeatures.every(f => (d.features || []).includes(f));
        return zoneOk && searchOk && priceOk && favOk && featuresOk;
    });

    grid.innerHTML = '';
    filtered.forEach((dorm, i) => {
        const dist = typeof calcDistance === 'function' ? calcDistance(dorm.coords.lat, dorm.coords.lng) : 0;
        const imgs = (dorm.images && dorm.images.length > 0) ? dorm.images.filter(i => i && i !== 'null') : [];
        if (imgs.length === 0) imgs.push(null);
        const card = document.createElement('div');
        card.className = 'v-card reveal-up';
        card.style.transitionDelay = `${i * 0.05}s`;
        card.style.overflow = 'hidden';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.position = 'relative';

        const isFull = (dorm.roomTypes || []).length > 0 && dorm.roomTypes.every(rt => rt.status === 'เต็ม');
        const statusText = isFull ? 'เต็ม' : 'ว่าง';
        const statusColor = isFull ? '#ef4444' : '#10b981';

        card.innerHTML = `
            <div style="height:250px;position:relative;cursor:pointer" onclick="showDetail('${dorm.id}')">
                <div class="swiper swiper-${dorm.id}" style="height:100%">
                    <div class="swiper-wrapper">
                        ${imgs.map(img => `
                            <div class="swiper-slide">
                                ${img ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover" onerror="this.src='/kku_dorm_elite_logo_1777569958199.png';this.style.objectFit='contain';this.parentElement.style.background='var(--neutral-900)'">` : `<div style="height:100%;display:flex;align-items:center;justify-content:center;background:var(--neutral-100);color:var(--neutral-300)"><i class="fas fa-image fa-3x"></i></div>`}
                            </div>
                        `).join('')}
                    </div>
                    <div class="swiper-pagination swiper-pagination-${dorm.id}"></div>
                </div>
                <div style="position:absolute;top:1rem;left:1rem;z-index:10;display:flex;gap:0.5rem">
                    <div style="background:white;padding:0.4rem 1rem;border-radius:var(--radius-pill);font-size:9px;font-weight:900;color:var(--neutral-900);box-shadow:var(--shadow-soft);display:flex;align-items:center;gap:6px">
                        <div style="width:6px;height:6px;border-radius:50%;background:${statusColor}"></div> ${statusText}
                    </div>
                </div>
            </div>
            
            <!-- Floating Actions -->
            <div style="position:absolute;top:1rem;right:1rem;z-index:20;display:flex;flex-direction:column;gap:0.5rem">
                <button id="fav-${dorm.id}" onclick="event.stopPropagation(); toggleFavorite('${dorm.id}')" style="width:36px;height:36px;border-radius:50%;background:white;border:none;box-shadow:var(--shadow-heavy);cursor:pointer;color:${favorites.includes(dorm.id) ? '#ef4444' : 'var(--neutral-400)'};transition:all 0.3s ease;display:flex;align-items:center;justify-content:center">
                    <i class="fas fa-heart"></i>
                </button>
                <button onclick="event.stopPropagation(); hideDorm('${dorm.id}')" style="width:36px;height:36px;border-radius:50%;background:white;border:none;box-shadow:var(--shadow-heavy);cursor:pointer;color:var(--neutral-300);transition:all 0.3s ease;display:flex;align-items:center;justify-content:center" title="ซ่อนหอพักนี้">
                    <i class="fas fa-eye-slash"></i>
                </button>
            </div>

            <div style="padding:1.5rem;flex:1;display:flex;flex-direction:column;cursor:pointer" onclick="showDetail('${dorm.id}')">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.75rem">
                    <div>
                        <h3 style="font-family:'Public Sans',sans-serif;font-weight:900;font-size:1.4rem;letter-spacing:-0.03em;color:var(--neutral-900);margin-bottom:4px">${dorm.name}</h3>
                        <div style="display:flex;align-items:center;gap:12px">
                            <span style="font-size:10px;font-weight:800;color:var(--brand-500);text-transform:uppercase;letter-spacing:0.05em">${dorm.zone}</span>
                            <span style="width:3px;height:3px;border-radius:50%;background:var(--neutral-200)"></span>
                            <span style="font-size:11px;font-weight:700;color:var(--neutral-400)"><i class="fas fa-location-arrow" style="font-size:9px"></i> ${dist.toFixed(2)} km</span>
                        </div>
                    </div>
                    <div style="text-align:right">
                        <p style="font-size:9px;font-weight:900;color:var(--neutral-400);text-transform:uppercase;margin-bottom:2px">เริ่มต้นที่</p>
                        <p style="font-size:1.5rem;font-weight:900;color:var(--brand-500);letter-spacing:-0.03em">฿${dorm.priceMin || dorm.price}</p>
                    </div>
                </div>
                
                <div style="display:flex;gap:0.5rem;margin-top:auto;padding-top:1rem;border-top:1px solid var(--neutral-50)">
                    ${(dorm.features || []).slice(0, 4).map(f => `
                        <div style="width:32px;height:32px;border-radius:10px;background:var(--neutral-50);color:var(--neutral-500);display:flex;align-items:center;justify-content:center;font-size:11px" title="${f}">
                            <i class="fas ${getIconForFeature(f)}"></i>
                        </div>
                    `).join('')}
                    ${(dorm.features || []).length > 4 ? `
                        <div style="width:32px;height:32px;border-radius:10px;background:var(--neutral-50);color:var(--neutral-400);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900">
                            +${dorm.features.length - 4}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        grid.appendChild(card);
        new Swiper(`.swiper-${dorm.id}`, { 
            loop: imgs.length > 1, 
            pagination: { el: `.swiper-pagination-${dorm.id}`, clickable: true },
            autoplay: { delay: 4000 + (i * 200) }, 
            speed: 1000 
        });
    });

    // Trigger reveal
    setTimeout(() => Reveal.init(), 50);
}

function showDetail(id) {
    const dorm = allDorms.find(d => d.id === id);
    if (!dorm) return;

    // Update URL to include dorm ID for sharing
    const url = new URL(window.location);
    url.searchParams.set('id', id);
    window.history.pushState({}, '', url);

    const dist = typeof calcDistance === 'function' ? calcDistance(dorm.coords.lat, dorm.coords.lng) : 0;
    const imgs = (dorm.images && dorm.images.length > 0) ? dorm.images.filter(i => i && i !== 'null') : [];
    if (imgs.length === 0) imgs.push(null);
    const overlay = document.getElementById('detailOverlay');
    
    overlay.innerHTML = `
        <div class="detail-container" style="background:var(--neutral-50);min-height:100vh">
            <button onclick="closeDetail()" class="detail-back-btn"><i class="fas fa-arrow-left"></i></button>

            <div class="detail-hero">
                <div class="swiper swiper-detail" style="height:100%">
                    <div class="swiper-wrapper">
                        ${imgs.map((img, idx) => `
                            <div class="swiper-slide">
                                ${img ? `<img src="${img}" class="hero-img" onclick='viewFullImage(${JSON.stringify(imgs)}, ${idx})' onerror="this.src='/kku_dorm_elite_logo_1777569958199.png';this.style.objectFit='contain';this.parentElement.style.background='var(--neutral-900)'">` : `<div class="hero-placeholder"><i class="fas fa-image"></i></div>`}
                            </div>
                        `).join('')}
                    </div>
                    <div class="swiper-pagination"></div>
                </div>
            </div>

            <div class="detail-content-wrapper">
                <div class="detail-main">
                    <!-- Breadcrumbs -->
                    <div class="detail-breadcrumb">
                        <a href="/" data-navigate="/" style="text-decoration:none;color:inherit;opacity:0.6">EliteDorm</a> 
                        <i class="fas fa-chevron-right" style="font-size:8px;margin:0 0.5rem;opacity:0.3"></i> 
                        <a href="/explorer" data-navigate="/explorer" style="text-decoration:none;color:inherit;opacity:0.6">หอพัก ${dorm.zone}</a> 
                        <i class="fas fa-chevron-right" style="font-size:8px;margin:0 0.5rem;opacity:0.3"></i> 
                        <span style="font-weight:900;color:var(--brand-500)">${dorm.name}</span>
                    </div>

                    <section class="detail-section" style="margin-bottom:3rem">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:2rem">
                            <div style="flex:1">
                                <h2 class="detail-title" style="margin-bottom:1rem">${dorm.name}</h2>
                                <p style="font-size:1.1rem;color:var(--neutral-400);line-height:1.6">${dorm.description || 'หอพักพรีเมียมพร้อมสิ่งอำนวยความสะดวกครบครัน ใกล้ มข.'}</p>
                                ${dorm.contact ? `<div style="margin-top:1.5rem;display:flex;gap:1rem;flex-wrap:wrap">
                                    <a href="tel:${dorm.contact}" class="btn-primary" style="padding:0.75rem 1.5rem;font-size:10px"><i class="fas fa-phone-alt"></i> ${dorm.contact}</a>
                                    <button class="btn-ghost" style="padding:0.75rem 1.5rem;font-size:10px" onclick="copyToClipboard('${dorm.contact}')"><i class="fas fa-copy"></i> Copy Contact</button>
                                    ${dorm.reference ? `<a href="${dorm.reference}" target="_blank" class="btn-ghost" style="padding:0.75rem 1.5rem;font-size:10px;color:var(--brand-500)"><i class="fas fa-external-link-alt"></i> แหล่งข้อมูล</a>` : ''}
                                 </div>` : ''}
                            </div>
                            <div style="text-align:right;background:var(--brand-50);padding:2rem;border-radius:2rem;border:1px solid var(--brand-100)">
                                <p class="detail-price-label" style="color:var(--brand-600)">อัตราค่าเช่า</p>
                                <p class="detail-price-value" style="font-size:1.8rem">${formatRange(dorm.priceMin || dorm.price, dorm.priceMax)}</p>
                                <p style="font-size:9px;font-weight:900;color:var(--brand-400);text-transform:uppercase;margin-top:0.5rem">ต่อเดือน</p>
                            </div>
                        </div>

                        <!-- Property Info Grid -->
                        <div class="property-meta-grid" style="margin-top:2.5rem;display:grid;grid-template-columns:repeat(3, 1fr);gap:1.5rem">
                            <div class="meta-item">
                                <span class="meta-label">เงินมัดจำ/ประกัน</span>
                                <span class="meta-value">${formatRange(dorm.depositMin || dorm.deposit, dorm.depositMax) || 'N/A'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">ค่าน้ำ (หน่วย/เหมา)</span>
                                <span class="meta-value">${dorm.water || 'N/A'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">ค่าไฟ (ต่อหน่วย)</span>
                                <span class="meta-value">${dorm.electric ? `${dorm.electric} ฿` : 'N/A'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">ระยะทาง (มข.)</span>
                                <span class="meta-value">${dist.toFixed(2)} กม.</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">ขนาดห้อง</span>
                                <span class="meta-value">${dorm.size ? `${dorm.size} ตร.ม.` : 'N/A'}</span>
                            </div>
                            <div class="meta-item">
                                <span class="meta-label">จำนวนชั้น</span>
                                <span class="meta-value">${dorm.floors || 'N/A'} ชั้น</span>
                            </div>
                        </div>
                    </section>

                    <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:3rem">
                        <div>
                            <section class="detail-section">
                                <div class="section-header" style="margin-bottom:1.5rem">
                                    <div class="accent-bar" style="background:var(--neutral-900);width:40px;height:4px;border-radius:2px;margin-bottom:0.75rem"></div>
                                    <h4 class="section-title" style="font-size:1.5rem;font-weight:900;letter-spacing:-0.03em">รายละเอียดห้องพัก</h4>
                                </div>
                                <div style="background:white;border-radius:1.5rem;border:1px solid var(--neutral-100);overflow:hidden;margin-bottom:1.5rem">
                                    <div style="display:flex;padding:1.25rem;border-bottom:1px solid var(--neutral-50);justify-content:space-between;font-size:14px">
                                        <span style="color:var(--neutral-400);font-weight:700">จำนวนชั้นทั้งหมด</span>
                                        <span style="font-weight:900;color:var(--neutral-900)">${dorm.floors || 'N/A'} ชั้น</span>
                                    </div>
                                    <div style="display:flex;padding:1.25rem;border-bottom:1px solid var(--neutral-50);justify-content:space-between;font-size:14px">
                                        <span style="color:var(--neutral-400);font-weight:700">ค่ามัดจำ (เริ่มต้น)</span>
                                        <span style="font-weight:900;color:var(--brand-500)">฿${dorm.depositMin || dorm.deposit || 'N/A'}</span>
                                    </div>
                                    <div style="display:flex;padding:1.25rem;border-bottom:1px solid var(--neutral-50);justify-content:space-between;font-size:14px">
                                        <span style="color:var(--neutral-400);font-weight:700">ค่าน้ำ</span>
                                        <span style="font-weight:900;color:var(--neutral-900)">${dorm.water || 'N/A'}</span>
                                    </div>
                                    <div style="display:flex;padding:1.25rem;border-bottom:1px solid var(--neutral-50);justify-content:space-between;font-size:14px">
                                        <span style="color:var(--neutral-400);font-weight:700">ค่าไฟ</span>
                                        <span style="font-weight:900;color:var(--neutral-900)">${dorm.electric ? `${dorm.electric} บาท/หน่วย` : 'N/A'}</span>
                                    </div>
                                    <div style="display:flex;padding:1.25rem;justify-content:space-between;font-size:14px">
                                        <span style="color:var(--neutral-400);font-weight:700">ขนาดห้องเฉลี่ย</span>
                                        <span style="font-weight:900;color:var(--neutral-900)">${dorm.size ? `${dorm.size} ตร.ม.` : 'N/A'}</span>
                                    </div>
                                </div>

                                <div class="section-header" style="margin-bottom:2rem;display:flex;justify-content:space-between;align-items:center">
                                    <h4 class="section-title" style="font-size:1.5rem;font-weight:900;letter-spacing:-0.03em">ประเภทห้องพัก</h4>
                                    <span style="font-size:11px;font-weight:900;color:var(--neutral-400);background:var(--neutral-100);padding:0.5rem 1rem;border-radius:2rem">${(dorm.roomTypes || []).length} แบบ</span>
                                </div>

                                <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:1.5rem">
                                    ${(dorm.roomTypes || []).map((rt, idx) => {
                                        const rtImages = Array.isArray(rt.images) ? rt.images : (rt.image ? [rt.image] : []);
                                        const mainImg = rtImages[0] || '/kku_dorm_elite_logo_1777569958199.png';
                                        return `
                                        <div class="room-card" style="background:white;border-radius:1.5rem;overflow:hidden;border:1px solid var(--neutral-100);box-shadow:0 10px 30px rgba(0,0,0,0.03);transition:transform 0.3s ease" onmouseover="this.style.transform='translateY(-5px)'" onmouseout="this.style.transform='translateY(0)'">
                                            <div style="position:relative;height:180px;background:var(--neutral-50);cursor:pointer" onclick='viewFullImage(${JSON.stringify(rtImages)})'>
                                                <img src="${mainImg}" style="width:100%;height:100%;object-fit:cover" onerror="this.src='/kku_dorm_elite_logo_1777569958199.png';this.style.objectFit='contain'">
                                                <div style="position:absolute;bottom:0;left:0;right:0;padding:1rem;background:linear-gradient(transparent, rgba(0,0,0,0.4));color:white">
                                                    <span style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em">${rt.status || 'ว่าง'}</span>
                                                </div>
                                            </div>
                                            <div style="padding:1.25rem">
                                                <h5 style="font-weight:900;font-size:1.1rem;margin-bottom:0.25rem">${rt.name}</h5>
                                                <p style="font-size:11px;font-weight:700;color:var(--neutral-400);margin-bottom:1rem">${rt.size || dorm.size || 'N/A'} ตร.ม.</p>
                                                <div style="display:flex;justify-content:space-between;align-items:center">
                                                    <span style="font-weight:900;color:var(--brand-500);font-size:1.25rem">฿${rt.price || dorm.price}</span>
                                                    <button class="btn-ghost" style="padding:0.5rem 1rem;font-size:10px" onclick='viewFullImage(${JSON.stringify(rtImages)})'>ดูรูปเพิ่ม</button>
                                                </div>
                                            </div>
                                        </div>
                                        `;
                                    }).join('')}
                                </div>
                            </section>
                        </div>

                        <div>
                            <section class="detail-section">
                                <div class="section-header" style="margin-bottom:1.5rem">
                                    <div class="accent-bar" style="background:var(--brand-500);width:40px;height:4px;border-radius:2px;margin-bottom:0.75rem"></div>
                                    <h4 class="section-title" style="font-size:1.5rem;font-weight:900;letter-spacing:-0.03em">สิ่งอำนวยความสะดวก</h4>
                                </div>
                                <div class="facilities-grid">
                                    ${(dorm.features || []).map(f => `
                                        <div class="facility-item">
                                            <i class="fas ${getIconForFeature(f)}"></i>
                                            <span>${f}</span>
                                        </div>
                                    `).join('')}
                                    ${(dorm.features || []).length === 0 ? '<p style="color:var(--neutral-300);font-size:13px">ไม่มีข้อมูลสิ่งอำนวยความสะดวก</p>' : ''}
                                </div>
                            </section>

                            <section class="detail-section" style="margin-top:3rem">
                                <div class="section-header" style="margin-bottom:1.5rem">
                                    <div class="accent-bar" style="background:var(--neutral-900);width:40px;height:4px;border-radius:2px;margin-bottom:0.75rem"></div>
                                    <h4 class="section-title" style="font-size:1.5rem;font-weight:900;letter-spacing:-0.03em">ที่ตั้งและแผนที่</h4>
                                </div>
                                <div id="detailMap" class="detail-map-box"></div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .detail-container { position:relative; overflow-x:hidden; }
            .detail-back-btn { position:fixed; top:2rem; left:2rem; width:50px; height:50px; border-radius:50%; background:white; color:var(--neutral-900); border:none; box-shadow:var(--shadow-heavy); z-index:100; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:1.2rem; transition:all 0.3s; }
            .detail-back-btn:hover { transform:scale(1.1); background:var(--neutral-900); color:white; }
            .detail-hero { height:60vh; background:var(--neutral-100); }
            .hero-img { width:100%; height:100%; object-fit:cover; cursor:zoom-in; }
            .hero-placeholder { height:100%; display:flex; align-items:center; justify-content:center; color:var(--neutral-300); font-size:4rem; }
            .detail-content-wrapper { max-width:85rem; margin:-5rem auto 0; position:relative; z-index:10; padding:0 2rem 5rem; }
            .detail-main { background:white; border-radius:3rem; padding:4rem; box-shadow:var(--shadow-heavy); border:1px solid var(--neutral-100); }
            .detail-breadcrumb { display:flex; align-items:center; font-size:11px; font-weight:900; color:var(--neutral-400); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:2.5rem; }
            .detail-title { font-family:'Public Sans',sans-serif; font-weight:900; font-size:3.5rem; letter-spacing:-0.05em; color:var(--neutral-900); }
            .meta-label { font-size:9px; font-weight:900; color:var(--neutral-400); text-transform:uppercase; display:block; margin-bottom:6px; }
            .meta-value { font-size:1.1rem; font-weight:800; color:var(--neutral-900); }
            .detail-price-label { font-size:10px; font-weight:900; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:0.5rem; }
            .detail-price-value { font-weight: 900; font-size: 2.5rem; color: var(--brand-500); letter-spacing: -0.03em; }
            .location-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; }
            .stat-item { padding: 1.5rem; display: flex; align-items: center; gap: 1.25rem; }
            .stat-item i { font-size: 1.5rem; color: var(--brand-500); }
            .stat-value { font-size: 1.8rem; font-weight: 900; color: var(--neutral-900); }
            .stat-label { font-size: 9px; font-weight: 900; color: var(--neutral-400); text-transform: uppercase; }
            .detail-map-box { height: 450px; border-radius: 2.5rem; overflow: hidden; border: 1px solid var(--neutral-200); }
            .facilities-grid { display: grid; gap: 1rem; }
            .facility-item { padding: 1rem; background: var(--neutral-50); border-radius: 1.25rem; display: flex; align-items: center; gap: 0.75rem; font-weight: 800; font-size: 0.8rem; }
            @media (max-width: 768px) { .detail-main { padding: 2rem; } .detail-title { font-size: 2rem; } .location-stats { grid-template-columns: 1fr; } .detail-map-box { height: 300px; } }
        </style>
    `;

    overlay.style.display = 'block';
    gsap.fromTo(overlay, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.6 });
    
    new Swiper('.swiper-detail', { loop: imgs.length > 1, autoplay: { delay: 4000 }, effect: 'fade' });

    setTimeout(() => {
        const dm = L.map('detailMap', { 
            zoomControl: true,
            scrollWheelZoom: true,
            touchZoom: true
        }).setView([dorm.coords.lat, dorm.coords.lng], 16);
        
        // Use Google Maps Tiles for detail view
        L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }).addTo(dm);
        
        // University Marker
        const uniIcon = L.divIcon({ 
            html: '<div style="width:40px;height:40px;background:var(--brand-500);color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;border:4px solid white;box-shadow:0 10px 20px rgba(255, 45, 85, 0.2);"><i class="fas fa-graduation-cap"></i></div>', 
            className: '', 
            iconSize: [40, 40] 
        });
        L.marker([TARGET_COORDS.lat, TARGET_COORDS.lng], { icon: uniIcon }).addTo(dm).bindPopup('มหาวิทยาลัยขอนแก่น');

        // Dorm Marker
        const dormIcon = L.divIcon({ 
            html: '<div style="width:36px;height:36px;background:var(--neutral-900);color:white;border-radius:12px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 8px 20px rgba(0,0,0,0.2);"><i class="fas fa-house"></i></div>', 
            className: '', 
            iconSize: [36, 36] 
        });
        
        const dormMarker = L.marker([dorm.coords.lat, dorm.coords.lng], { icon: dormIcon }).addTo(dm);
        
        // Route Line
        const routeLine = L.polyline([
            [dorm.coords.lat, dorm.coords.lng],
            [TARGET_COORDS.lat, TARGET_COORDS.lng]
        ], {
            color: 'var(--brand-500)',
            weight: 4,
            opacity: 0.6,
            dashArray: '10, 15'
        }).addTo(dm);

        dormMarker.bindPopup(`
            <div style="font-family:Sarabun;padding:5px">
                <h4 style="margin:0;font-weight:900">${dorm.name}</h4>
                <p style="margin:5px 0 0;font-size:11px;color:var(--neutral-400)">ห่างจาก มข. ${dist.toFixed(2)} กม.</p>
            </div>
        `).openPopup();
        
        // Fit both markers in view
        dm.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
        
        // Final invalidate for safety
        setTimeout(() => dm.invalidateSize(), 200);
    }, 500);
}

function closeDetail() {
    const overlay = document.getElementById('detailOverlay');
    gsap.to(overlay, { opacity: 0, y: 100, duration: 0.4, onComplete: () => {
        overlay.style.display = 'none';
        
        // Remove dorm ID from URL
        const url = new URL(window.location);
        url.searchParams.delete('id');
        window.history.pushState({}, '', url);
        
        // window.scrollTo({ top: 0, behavior: 'smooth' }); // REMOVED: Stop jumping to top
    }});
}
