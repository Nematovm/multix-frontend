const API_URL = 'https://valiant-expression-production-a4f5.up.railway.app';

// ── Toast ──
function showToast(message, type = 'success') {
    const existing = document.getElementById('cp-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'cp-toast';
    toast.style.cssText = `
        position:fixed; top:20px; right:20px;
        display:flex; align-items:center; gap:12px;
        padding:14px 18px; border-radius:12px;
        box-shadow:0 8px 32px rgba(0,0,0,0.12);
        font-family:"Saira",sans-serif; font-size:14px; font-weight:500;
        z-index:9999; min-width:260px; max-width:360px;
        background:#fff;
        border:1.5px solid ${type === 'success' ? '#d1fae5' : '#fee2e2'};
        color:${type === 'success' ? '#065f46' : '#991b1b'};
        animation: slideIn 0.35s ease;
    `;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}" 
           style="font-size:18px;color:${type === 'success' ? '#10b981' : '#ef4444'}"></i>
        <span style="flex:1">${message}</span>
        <button onclick="this.parentElement.remove()" 
                style="background:none;border:none;cursor:pointer;color:#999;font-size:13px">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3500);
}

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

// ── Vaqtni formatlash ──
function formatTime(seconds) {
    if (!seconds) return '< 1 min';
    if (seconds < 60) return '< 1 min';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m} min`;
}

// ── Sanani formatlash ──
function formatDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── Score rangini aniqlash ──
function scoreColor(percent) {
    if (percent >= 70) return '#0f6e56';
    if (percent >= 40) return '#854f0b';
    return '#dc2626';
}

// ── Completed Tests yuklash va render qilish ──
async function loadCompletedTests(token) {
    const container = document.getElementById('completedTestsList');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/attempts/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Attemptlarni yuklab bo\'lmadi');

        const attempts = await res.json();

        if (!attempts || attempts.length === 0) {
            container.innerHTML = `
                <p style="color:var(--text-3);font-size:14px;text-align:center;padding:20px 0">
                    <i class="fa-solid fa-box-open" style="font-size:28px;display:block;margin-bottom:10px;opacity:0.4"></i>
                    No completed tests yet
                </p>`;
            return;
        }

container.innerHTML = attempts.map(a => {
    const pct   = Math.round(a.percent);
    const color = scoreColor(pct);

    return `
    <div style="
        display:flex; align-items:center; justify-content:space-between;
        padding:16px 20px; border:1px solid #e7e5e4; border-radius:12px;
        background:#fff; margin-bottom:10px; gap:16px; flex-wrap:wrap;
    ">
        <div style="flex:1; min-width:0">
            <div style="font-size:15px;font-weight:600;color:#1c1917;margin-bottom:8px">
                ${a.test_name || 'Test'}
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;color:#78716c">
                <span><i class="fa-regular fa-calendar"></i> ${formatDate(a.completed_at)}</span>
                <span style="color:#d1d5db">·</span>
                <span><i class="fa-regular fa-clock"></i> ${formatTime(a.time_spent_seconds)}</span>
                <span style="color:#d1d5db">·</span>
                <span><i class="fa-regular fa-circle-check"></i> ${a.score}/${a.total} correct</span>
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
            <span style="
                font-size:14px;font-weight:700;padding:4px 14px;
                border-radius:20px;border:1.5px solid ${color}33;
                color:${color};background:${color}18;
            ">${pct}%</span>
            <a href="review.html?attempt=${a.id}" style="
                display:flex;align-items:center;gap:6px;
                padding:8px 16px;border:1px solid #e7e5e4;border-radius:8px;
                background:#fff;font-size:13px;font-weight:500;color:#44403c;
                cursor:pointer;text-decoration:none;white-space:nowrap;
                font-family:'Saira',sans-serif;transition:all 0.15s;
            " onmouseover="this.style.borderColor='#2caa9a';this.style.color='#2caa9a'"
               onmouseout="this.style.borderColor='#e7e5e4';this.style.color='#44403c'">
                <i class="fa-solid fa-chart-bar"></i> Review attempt
            </a>
        </div>
    </div>`;
}).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <p style="color:#dc2626;font-size:14px;text-align:center;padding:16px">
                <i class="fa-solid fa-circle-exclamation"></i>
                Attemptlarni yuklab bo'lmadi
            </p>`;
    }
}

// ── DOMContentLoaded ──
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('cp_token');
    if (!token) { window.location.href = 'auth.html'; return; }

    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) { window.location.href = 'auth.html'; return; }

        const user = await res.json();
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';

        // Sidebar
        document.querySelector('.sb-user-name').textContent = fullName;
        document.querySelector('.sb-user-avatar').textContent = fullName.charAt(0).toUpperCase();

        // Profile card
        document.getElementById('pcFullName').textContent = fullName;
        document.getElementById('pcEmail').textContent    = user.email;
        document.getElementById('profileAvatar').textContent = fullName.charAt(0).toUpperCase();

        // Form
        document.getElementById('profileFirstName').value = user.first_name || '';
        document.getElementById('profileLastName').value  = user.last_name  || '';
        document.getElementById('profileEmail').value     = user.email || '';

        // Completed tests
        await loadCompletedTests(token);

    } catch (err) {
        console.error(err);
        window.location.href = 'auth.html';
    }
});

// ── Profile saqlash ──
async function saveProfile() {
    const token      = localStorage.getItem('cp_token');
    const first_name = document.getElementById('profileFirstName').value.trim();
    const last_name  = document.getElementById('profileLastName').value.trim();
    if (!first_name) return showToast('Enter your first name', 'error');

    const res = await fetch(`${API_URL}/auth/me/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ first_name, last_name })
    });

    if (res.ok) {
        const data = await res.json();
        const fullName = `${data.first_name} ${data.last_name}`.trim();
        document.getElementById('pcFullName').textContent = fullName;
        document.getElementById('profileAvatar').textContent = fullName.charAt(0).toUpperCase();
        document.querySelector('.sb-user-name').textContent  = fullName;
        document.querySelector('.sb-user-avatar').textContent = fullName.charAt(0).toUpperCase();
        showToast('Profile updated successfully!');
    } else {
        showToast('Something went wrong', 'error');
    }
}

// ── Parol o'zgartirish ──
async function changePassword() {
    const token        = localStorage.getItem('cp_token');
    const old_password = document.getElementById('oldPassword').value;
    const new_password = document.getElementById('newPassword').value;
    const confirm      = document.getElementById('confirmPassword').value;

    if (!old_password || !new_password) return showToast('Fill in all the fields!', 'error');
    if (new_password !== confirm)        return showToast('New passwords do not match!', 'error');
    if (new_password.length < 6)         return showToast('Password must be at least 6 characters!', 'error');

    const res = await fetch(`${API_URL}/auth/me/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ old_password, new_password })
    });

    if (res.ok) {
        showToast('Password changed successfully!');
        document.getElementById('oldPassword').value    = '';
        document.getElementById('newPassword').value    = '';
        document.getElementById('confirmPassword').value = '';
    } else {
        const data = await res.json();
        showToast(data.detail || 'Something went wrong', 'error');
    }
}

// ── Sign out ──
function signOut() {
    localStorage.removeItem('cp_token');
    sessionStorage.clear();
    window.location.href = 'auth.html';
}

function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('hidden');
}

document.addEventListener('click', e => {
    if (!e.target.closest('.sb-user')) {
        const dd = document.getElementById('userDropdown');
        if (dd) dd.classList.add('hidden');
    }
});