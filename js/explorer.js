/**
 * EliteDorm - Explorer Page Logic
 */
let allDorms = [];
let currentZone = 'all';
let favorites = JSON.parse(localStorage.getItem('elite_favorites') || '[]');

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

window.addEventListener('DOMContentLoaded', () => {
    Transition.init();
    Nav.init('explorer');
    Reveal.init();
    loadDorms();

    document.getElementById('searchInput')?.addEventListener('input', () => renderGrid());

    LiveSync.init((data) => { allDorms = data; renderGrid(); });
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

    const mainZones = ['หลังมอ', 'กังสดาล', 'โคลัมโบ'];
    const filtered = allDorms.filter(d => {
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
        const isFull = (dorm.roomTypes || []).length > 0 && dorm.roomTypes.every(rt => rt.status === 'เต็ม');
        const statusText = isFull ? 'เต็ม' : 'ว่าง';
        const statusColor = isFull ? '#ef4444' : '#10b981';

        card.innerHTML = `
            <div style="height:250px;position:relative;cursor:pointer" onclick="showDetail('${dorm.id}')">
                <div class="swiper swiper-${dorm.id}" style="height:100%">
                    <div class="swiper-wrapper">
                        ${imgs.map(img => `
                            <div class="swiper-slide">
                                ${img ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.5s" class="hover-scale" onerror="this.src='/kku_dorm_elite_logo_1777569958199.png';this.style.objectFit='contain';this.parentElement.style.background='var(--neutral-900)'">` : `<div style="width:100%;height:100%;background:var(--neutral-100);display:flex;align-items:center;justify-content:center"><i class="fas fa-building" style="font-size:3rem;color:var(--neutral-400)"></i></div>`}
                            </div>
                        `).join('')}
                    </div>
                    <div class="swiper-pagination swiper-pagination-${dorm.id}" style="--swiper-pagination-color:white;--swiper-pagination-bullet-inactive-color:rgba(255,255,255,0.5)"></div>
                </div>
                
                <!-- Badges -->
                <div style="position:absolute;top:1rem;left:1rem;z-index:20;display:flex;gap:0.4rem">
                    <span style="background:rgba(255,255,255,0.95);color:var(--neutral-900);padding:0.4rem 0.8rem;border-radius:0.75rem;font-size:9px;font-weight:900;text-transform:uppercase;box-shadow:0 4px 12px rgba(0,0,0,0.08);display:flex;align-items:center;gap:4px">
                        <i class="fas fa-map-marker-alt" style="color:var(--brand-500)"></i> ${dorm.zone}
                    </span>
                    <span style="background:${statusColor};color:white;padding:0.4rem 0.8rem;border-radius:0.75rem;font-size:9px;font-weight:900;text-transform:uppercase;box-shadow:0 4px 12px rgba(0,0,0,0.1)">
                        ${statusText}
                    </span>
                </div>
                
                <!-- Action Buttons -->
                <div style="position:absolute;top:1rem;right:1rem;z-index:20;display:flex;gap:0.5rem">
                    <button id="fav-${dorm.id}" onclick="event.stopPropagation();toggleFavorite('${dorm.id}')" style="width:34px;height:34px;background:rgba(255,255,255,0.95);border:none;border-radius:50%;cursor:pointer;color:${favorites.includes(dorm.id) ? '#ef4444' : 'var(--neutral-400)'};transition:all 0.3s;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button onclick="event.stopPropagation();openEditModal('${dorm.id}',allDorms)" style="width:34px;height:34px;background:rgba(255,255,255,0.95);border:none;border-radius:50%;cursor:pointer;color:var(--neutral-900);transition:all 0.3s;box-shadow:0 4px 12px rgba(0,0,0,0.08)" onmouseover="this.style.color='var(--brand-500)'" onmouseout="this.style.color='var(--neutral-900)'">
                        <i class="fas fa-pen"></i>
                    </button>
                </div>
            </div>
            
            <div style="padding:1.5rem;flex:1;display:flex;flex-direction:column;cursor:pointer;background:white" onclick="showDetail('${dorm.id}')">
                <div style="margin-bottom:0.75rem">
                    <h3 style="font-family:'Public Sans',sans-serif;font-weight:900;font-size:1.25rem;color:var(--neutral-900);line-height:1.3;letter-spacing:-0.02em;margin-bottom:0.4rem">${dorm.name}</h3>
                    <span style="font-size:11px;font-weight:800;color:var(--neutral-400)"><i class="fas fa-location-arrow" style="color:var(--brand-500);margin-right:4px"></i>${dist.toFixed(1)} กม. จาก มข.</span>
                </div>

                <div style="margin-bottom:1.25rem">
                    <div style="display:flex;align-items:baseline;gap:4px">
                        <span style="font-size:1.5rem;font-weight:900;color:var(--brand-500);letter-spacing:-0.03em">${formatRange(dorm.priceMin || dorm.price, dorm.priceMax)}</span>
                        <span style="font-size:10px;font-weight:800;color:var(--neutral-400);text-transform:uppercase">/ เดือน</span>
                    </div>
                </div>
                
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:auto">
                    ${(dorm.features || []).map(f => `
                        <span style="padding:0.4rem 0.6rem;background:var(--neutral-50);font-size:9px;font-weight:800;border-radius:0.6rem;color:var(--neutral-500);border:1px solid var(--neutral-100);display:flex;align-items:center;gap:4px">
                            <i class="fas ${getIconForFeature(f)}" style="font-size:8px;color:var(--brand-500)"></i>
                            ${f}
                        </span>
                    `).join('')}
                </div>
            </div>
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
                                                <div style="position:absolute;bottom:1rem;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);color:white;padding:0.4rem 0.8rem;border-radius:2rem;font-size:9px;font-weight:900;backdrop-filter:blur(4px)">กดดูรูปภาพ (${rtImages.length})</div>
                                            </div>
                                            <div style="padding:1.5rem">
                                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
                                                    <h5 style="font-size:1.1rem;font-weight:900;color:var(--neutral-800)">${rt.type}</h5>
                                                    <span style="background:${rt.status === 'เต็ม' ? '#fee2e2' : '#dcfce7'};color:${rt.status === 'เต็ม' ? '#ef4444' : '#059669'};padding:0.3rem 0.7rem;border-radius:2rem;font-size:9px;font-weight:900">ห้อง${rt.status}</span>
                                                </div>
                                                <div style="display:flex;justify-content:space-between;align-items:flex-end">
                                                    <div>
                                                        <p style="font-size:9px;font-weight:900;color:var(--neutral-400);text-transform:uppercase;margin-bottom:0.2rem">ราคาค่าเช่า</p>
                                                        <p style="font-size:1.4rem;font-weight:900;color:var(--brand-500)">฿${rt.price}</p>
                                                    </div>
                                                    <button class="btn-ghost" style="padding:0.6rem 1rem;font-size:9px;border-radius:1rem" onclick='viewFullImage(${JSON.stringify(rtImages)})'>ดูรายละเอียด</button>
                                                </div>
                                            </div>
                                        </div>`;
                                    }).join('') || '<div style="grid-column:1/-1;padding:4rem;text-align:center;color:var(--neutral-300);background:white;border-radius:1.5rem;border:1px dashed var(--neutral-100)">ไม่มีข้อมูลราคาแยกประเภท</div>'}
                                </div>
                            </section>

                            <section class="detail-section">
                                <div class="section-header" style="margin-bottom:1.5rem">
                                    <div class="accent-bar" style="background:var(--brand-500);width:40px;height:4px;border-radius:2px;margin-bottom:0.75rem"></div>
                                    <h4 class="section-title" style="font-size:1.5rem;font-weight:900;letter-spacing:-0.03em">สิ่งอำนวยความสะดวก</h4>
                                </div>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
                                    ${(dorm.features || []).map(f => `
                                        <div class="facility-card">
                                            <div class="facility-icon"><i class="fas ${getIconForFeature(f)}"></i></div>
                                            <span style="font-weight:700;font-size:0.85rem">${f}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </section>
                        </div>

                        <div>
                            <section class="detail-section">
                                <div class="section-header" style="margin-bottom:1.5rem">
                                    <div class="accent-bar" style="background:var(--accent-gold);width:40px;height:4px;border-radius:2px;margin-bottom:0.75rem"></div>
                                    <h4 class="section-title" style="font-size:1.5rem;font-weight:900;letter-spacing:-0.03em">แผนที่และพิกัด</h4>
                                </div>
                                <div id="detailMap" class="detail-map-box" style="height:350px;margin-bottom:1rem"></div>
                                <a href="https://www.google.com/maps/dir/?api=1&destination=${dorm.coords.lat},${dorm.coords.lng}" target="_blank" class="btn-primary" style="width:100%;padding:1.1rem;justify-content:center;font-size:10px;border-radius:1.25rem">
                                    <i class="fas fa-directions"></i> นำทางด้วย Google Maps
                                </a>
                            </section>
                        </div>
                    </div>

                    <section class="detail-section" style="margin-top:2rem">
                        <div class="section-header" style="margin-bottom:2rem;text-align:center">
                            <h4 class="section-title" style="font-size:1.8rem;font-weight:900;letter-spacing:-0.03em">Gallery</h4>
                            <p style="font-size:0.9rem;color:var(--neutral-400)">รูปภาพบรรยากาศภายในและภายนอกหอพัก</p>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:1rem">
                            ${imgs.filter(img => img).map((img, idx) => `
                                <div style="aspect-ratio:1.4;border-radius:1.5rem;overflow:hidden;cursor:zoom-in;box-shadow:var(--shadow-soft);border:4px solid white" onclick='viewFullImage(${JSON.stringify(imgs.filter(img => img))}, ${idx})'>
                                    <img src="${img}" style="width:100%;height:100%;object-fit:cover;transition:transform 0.5s" class="hover-scale" onerror="this.src='/kku_dorm_elite_logo_1777569958199.png';this.style.objectFit='contain';this.parentElement.style.background='var(--neutral-900)'">
                                </div>
                            `).join('') || '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--neutral-300);font-weight:700">ไม่มีรูปภาพประกอบ</p>'}
                        </div>
                    </section>
                </div>
            </div>
        </div>

        <style>
            .detail-back-btn { position: fixed; top: 1.5rem; left: 1.5rem; z-index: 9100; width: 50px; height: 50px; background: white; border: none; border-radius: 16px; box-shadow: var(--shadow-heavy); cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; transition: all 0.3s; }
            .detail-back-btn:hover { background: var(--neutral-900); color: white; transform: translateX(-5px); }
            .detail-hero { height: 50vh; width: 100%; position: relative; background: var(--neutral-100); overflow: hidden; }
            .hero-img { width: 100%; height: 100%; object-fit: cover; cursor: zoom-in; }
            .hero-placeholder { width: 100%; height: 50vh; background: var(--neutral-100); display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--neutral-300); gap: 1rem; }
            .hero-placeholder i { font-size: 3rem; }
            .hero-placeholder::after { content: 'ไม่มีรูปภาพประกอบ'; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; }
            .detail-content-wrapper { max-width: 1000px; margin: -5rem auto 0; position: relative; z-index: 10; padding: 0 1.5rem 6rem; }
            .detail-main { background: white; border-radius: 3rem; padding: 4rem; box-shadow: var(--shadow-heavy); }
            .detail-section { margin-bottom: 4rem; }
            .detail-title { font-family: 'Public Sans', sans-serif; font-weight: 900; font-size: 3rem; letter-spacing: -0.05em; color: var(--neutral-900); }
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
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }});
}

