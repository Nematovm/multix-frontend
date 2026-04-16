const API_URL = 'https://api.multx.uz';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('cp_token');

    if (!token) {
        sessionStorage.setItem('cp_logged_in', 'false');
        updateSidebarGuest();
        return;
    }

    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            localStorage.removeItem('cp_token');
            sessionStorage.setItem('cp_logged_in', 'false');
            updateSidebarGuest();
            return;
        }

        const user = await res.json();
        updateSidebarUser(user);
        sessionStorage.setItem('cp_logged_in', 'true');
        sessionStorage.setItem('cp_user', JSON.stringify(user));

    } catch (err) {
        console.error('User info error:', err);
        updateSidebarGuest();
    }
    // Testlarni yuklash
loadPublicTests();
});

function updateSidebarUser(user) {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
    const initial = fullName.charAt(0).toUpperCase();

    const nameEl = document.querySelector('.sb-user-name');
    const avatarEl = document.querySelector('.sb-user-avatar');
    const roleEl = document.querySelector('.sb-user-role');

    if (nameEl) nameEl.textContent = fullName;
    if (avatarEl) avatarEl.textContent = initial;
    if (roleEl) roleEl.textContent = user.is_premium ? 'Pro Plan' : 'Free Plan';
}

function updateSidebarGuest() {
    const nameEl = document.querySelector('.sb-user-name');
    const roleEl = document.querySelector('.sb-user-role');
    if (nameEl) nameEl.textContent = 'Guest';
    if (roleEl) roleEl.textContent = 'Not signed in';
}

function signOut() {
    localStorage.removeItem('cp_token');
    sessionStorage.clear();
    window.location.href = 'auth.html';
}

function toggleUserMenu() {
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.toggle('hidden');
}

document.addEventListener('click', e => {
    if (!e.target.closest('.sb-user')) {
        const dd = document.getElementById('userDropdown');
        if (dd) dd.classList.add('hidden');
    }
});

// Testlarni backenddan yuklash
async function loadPublicTests() {
    try {
        const res = await fetch(`${API_URL}/tests`);
        if (!res.ok) return;
        const data = await res.json();
        renderTests(data);
        renderTypeFilter(data);  // ← qo'shing
    } catch (e) {
        console.error('Tests load error:', e);
    }
}

function renderTests(tests) {
    const content = document.getElementById('testContent');
    if (!tests.length) {
        content.innerHTML = `
            <div class="tests-empty">
                <div class="te-icon"><i class="fa-solid fa-box-open"></i></div>
                <h3>No tests available yet</h3>
                <p>Tests will appear here once they are added by the admin.</p>
            </div>`;
        return;
    }

    const groups = {};
    tests.forEach(t => {
        const cat = t.category_name || 'Other';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(t);
    });

    content.innerHTML = Object.entries(groups).map(([catName, catTests]) => `
        <div class="test-group" data-group="${catName}">
            <div class="tg-header" onclick="toggleGroup(this)">
                <div>
                    <span class="tg-title">${catName}</span>
                    <span class="tg-count">${catTests.length} test${catTests.length !== 1 ? 's' : ''}</span>
                </div>
                <i class="fa-solid fa-chevron-up tg-chevron"></i>
            </div>
            <div class="tg-body">
                ${catTests.map(t => {
                    const pdfUrl = t.pdf_url || (t.pdf_filename
                        ? `http://127.0.0.1:8000/static/pdfs/${t.pdf_filename}`
                        : null);
                    return `
                    <div class="test-card" data-type="${t.type}" data-level="${t.level}" data-parts="${t.parts || ''}" data-category="${catName}">
                        <div class="tc-left">
                            <div class="tc-info">
                                <span class="tc-name">${t.name}</span>
                                <span class="tc-badge ${t.type}">
                                    <i class="fa-solid ${t.type === 'free' ? 'fa-gift' : 'fa-crown'}"></i>
                                    ${t.type === 'free' ? 'Free' : 'Premium'}
                                </span>
                            </div>
                            <div class="tc-meta">${t.description || 'Parts ' + (t.parts || '1,2,3,4,5')} · ${t.level ? t.level.charAt(0).toUpperCase() + t.level.slice(1) : 'Medium'} Level</div>
                            <div class="tc-tags">
                                <span class="tc-tag"><i class="fa-solid fa-chart-bar"></i> ${t.level || 'medium'}</span>
                                <span class="tc-tag"><i class="fa-regular fa-clock"></i> ${t.duration || 60} min</span>
                                <span class="tc-tag"><i class="fa-regular fa-circle-check"></i> ${t.questions_count || 35} questions</span>
                            </div>
${t.telegram_link ? `
<div style="margin-top:8px">
    <a href="${t.telegram_link}" target="_blank" class="tg-link-btn">
        <i class="fa-brands fa-telegram"></i> ${t.telegram_channel || 'Telegram'}
    </a>
</div>` : ''}
                        </div>
                        ${t.type === 'premium'
                            ? `<button class="tc-btn premium-lock" onclick="showGate()"><i class="fa-solid fa-lock"></i> Unlock</button>`
                            : `<button class="tc-btn" onclick="startTest(${t.id}, '${pdfUrl || ''}')">Start test</button>`
                        }
                    </div>`;
                }).join('')}
            </div>
        </div>
    `).join('');
}

function startTest(testId, pdfUrl) {
    const token = localStorage.getItem('cp_token');
    if (!token) {
        showGate();
        return;
    }
    // Tokenni URL ga qo'shib yuboramiz
    window.open(`https://multix-test-app-production.up.railway.app/test/${testId}?token=${token}`, '_blank');
}

function filterPart(val) {
    document.querySelectorAll('.test-card').forEach(card => {
        if (!val) {
            card.style.display = '';
            return;
        }
        const parts = card.dataset.parts || '';
        card.style.display = parts.split(',').map(p => p.trim()).includes(val) ? '' : 'none';
    });
    updateGroupCounts();
}


function renderTypeFilter(tests) {
    // Backenddan kelgan testlardan unique category_name larni olish
    const types = [...new Set(tests.map(t => t.category_name).filter(Boolean))];
    
    // dashboard.html dagi "All Types" select ni topib yangilaymiz
    const selects = document.querySelectorAll('.filter-select');
    // 3-select = All Types (index 2)
    const typeSelect = selects[2];
    if (!typeSelect) return;

    typeSelect.innerHTML = `<option value="">All Types</option>` +
        types.map(t => `<option value="${t}">${t}</option>`).join('');

    // filter logikasi
    typeSelect.onchange = function() {
        const val = this.value;
        document.querySelectorAll('.test-card').forEach(card => {
            if (!val || card.dataset.category === val) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
        updateGroupCounts();
    };
}

