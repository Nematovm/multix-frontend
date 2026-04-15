const API_URL = 'http://127.0.0.1:8000';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('cp_token');
    if (!token) { window.location.href = 'auth.html'; return; }

    // Sidebar user info
    const meRes = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!meRes.ok) { window.location.href = 'auth.html'; return; }
    const user = await meRes.json();
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User';
    document.querySelector('.sb-user-name').textContent = fullName;
    document.querySelector('.sb-user-avatar').textContent = fullName.charAt(0).toUpperCase();

    // Sessions
    const res = await fetch(`${API_URL}/auth/me/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const sessions = await res.json();
    const list = document.getElementById('sessionsList');

    if (!sessions.length) {
        list.innerHTML = '<p class="sessions-empty">Hech qanday session topilmadi</p>';
        return;
    }

    list.innerHTML = sessions.map(s => {
        const ua = s.device || '';
        const isMobile = /mobile|android|iphone/i.test(ua);
        const icon = isMobile ? 'fa-mobile-screen' : 'fa-desktop';
        const browser = getBrowserName(ua);
        const date = new Date(s.created_at).toLocaleString();

        return `
        <div class="session-card">
            <div class="session-icon"><i class="fa-solid ${icon}"></i></div>
            <div class="session-info">
                <div class="session-device">${browser}</div>
                <div class="session-meta">
                    <span><i class="fa-solid fa-location-dot"></i> ${s.ip_address || 'Unknown IP'}</span>
                    <span><i class="fa-regular fa-clock"></i> ${date}</span>
                </div>
            </div>
        </div>`;
    }).join('');
});

function getBrowserName(ua) {
    if (!ua) return 'Unknown Browser';
    if (ua.includes('Edg')) return 'Microsoft Edge';
    if (ua.includes('Chrome')) return 'Google Chrome';
    if (ua.includes('Firefox')) return 'Mozilla Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Unknown Browser';
}

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