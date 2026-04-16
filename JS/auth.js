const API_URL = 'https://api.multx.uz';

let isLoading = false;

/* ══ TOAST ══════════════════════════════════════════ */
function showToast(message, type = 'error') {
    const existing = document.getElementById('auth-toast');
    if (existing) existing.remove();

    const colors = {
        error:   { border: '#fee2e2', text: '#991b1b', icon: 'fa-circle-xmark', iconColor: '#ef4444' },
        success: { border: '#d1fae5', text: '#065f46', icon: 'fa-circle-check', iconColor: '#10b981' },
        info:    { border: '#dbeafe', text: '#1e3a8a', icon: 'fa-circle-info',  iconColor: '#3b82f6' },
    };
    const c = colors[type] || colors.error;

    const toast = document.createElement('div');
    toast.id = 'auth-toast';
    toast.style.cssText = `
        position:fixed; top:20px; left:50%; transform:translateX(-50%);
        display:flex; align-items:center; gap:10px;
        padding:13px 18px; border-radius:12px;
        box-shadow:0 8px 32px rgba(0,0,0,0.12);
        font-family:"Saira",sans-serif; font-size:14px; font-weight:500;
        z-index:9999; min-width:280px; max-width:420px;
        background:#fff;
        border:1.5px solid ${c.border};
        color:${c.text};
        animation: toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
        white-space: pre-wrap;
    `;

    if (!document.getElementById('toast-style')) {
        const s = document.createElement('style');
        s.id = 'toast-style';
        s.textContent = `
            @keyframes toastIn  { from{opacity:0;transform:translateX(-50%) translateY(-14px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
            @keyframes toastOut { from{opacity:1;transform:translateX(-50%) translateY(0)} to{opacity:0;transform:translateX(-50%) translateY(-14px)} }
        `;
        document.head.appendChild(s);
    }

    toast.innerHTML = `
        <i class="fa-solid ${c.icon}" style="font-size:18px;color:${c.iconColor};flex-shrink:0"></i>
        <span style="flex:1">${message}</span>
        <button onclick="this.parentElement.remove()"
                style="background:none;border:none;cursor:pointer;color:#aaa;font-size:13px;padding:2px;flex-shrink:0">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
        if (!toast.parentElement) return;
        toast.style.animation = 'toastOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

/* ══ LOADING STATE ══════════════════════════════════
   id yo'q bo'lsa — hozirgi stepning primary btn'ini oladi
══════════════════════════════════════════════════ */
function getActiveBtn() {
    const card = document.querySelector('.auth-card:not(.hidden)');
    return card ? card.querySelector('.auth-btn.primary') : null;
}

function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        btn.dataset.originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:6px"></i> Yuklanmoqda...';
        btn.disabled = true;
        btn.style.opacity = '0.78';
    } else {
        if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
        btn.disabled = false;
        btn.style.opacity = '';
    }
}

/* ══ STEP 1: OTP Yuborish ════════════════════════════ */
async function goToOTP() {
    if (isLoading) return;

    const email = document.getElementById('emailInput').value.trim();
    if (!email) return showToast('Email manzilingizni kiriting!');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return showToast("Email manzil noto'g'ri formatda");
    }

    isLoading = true;
    const btn = getActiveBtn();
    setLoading(btn, true);

    try {
        const res = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Xato yuz berdi');

        sessionStorage.setItem('cp_email', email);
        document.getElementById('otpEmailDisplay').textContent = email;
        showStep('step-otp');
        startTimer();
        showToast(`Kod ${email} ga yuborildi`, 'success');
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            showToast("Server bilan bog'lanib bo'lmadi.\nBackend ishlab turganligini tekshiring.");
        } else {
            showToast(err.message);
        }
    } finally {
        isLoading = false;
        setLoading(btn, false);
    }
}

/* ══ STEP 2: OTP Tekshirish ══════════════════════════ */
async function goToRegister() {
    if (isLoading) return;

    const email = sessionStorage.getItem('cp_email');
    const boxes = document.querySelectorAll('.otp-box');
    const code  = [...boxes].map(b => b.value).join('');

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        return showToast("6 raqamli kodni to'liq kiriting");
    }

    isLoading = true;
    const btn = getActiveBtn();
    setLoading(btn, true);

    try {
        const res = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "OTP noto'g'ri yoki muddati o'tgan");

        if (data.temp_token) {
            sessionStorage.setItem('cp_temp_token', data.temp_token);
            showStep('step-register');
        } else if (data.access_token) {
            localStorage.setItem('cp_token', data.access_token);
            sessionStorage.setItem('cp_logged_in', 'true');
            showToast("Xush kelibsiz! Yo'naltirilmoqda...", 'success');
            setTimeout(() => window.location.href = 'dashboard.html', 900);
        }
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            showToast("Server bilan bog'lanib bo'lmadi.");
        } else {
            showToast(err.message);
        }
        boxes.forEach(b => {
            b.style.borderColor = '#ef4444';
            b.style.background  = '#fff5f5';
            setTimeout(() => { b.style.borderColor = ''; b.style.background = ''; }, 1800);
        });
    } finally {
        isLoading = false;
        setLoading(btn, false);
    }
}

/* ══ STEP 3: Ro'yxatdan o'tish ══════════════════════ */
async function completeRegistration() {
    if (isLoading) return;

    const email      = sessionStorage.getItem('cp_email');
    const temp_token = sessionStorage.getItem('cp_temp_token');
    const firstName  = document.querySelector('[placeholder="John"]').value.trim();
    const lastName   = document.querySelector('[placeholder="Doe"]').value.trim();
    const password   = document.getElementById('pwInput').value;
    const password2  = document.getElementById('pw2Input').value;

    if (!firstName)             return showToast('Ismingizni kiriting');
    if (!lastName)              return showToast('Familiyangizni kiriting');
    if (password.length < 6)    return showToast("Parol kamida 6 ta belgidan iborat bo'lsin");
    if (password !== password2) return showToast('Parollar mos emas');

    isLoading = true;
    const btn = getActiveBtn();
    setLoading(btn, true);

    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                first_name: firstName,
                last_name:  lastName,
                password,
                otp_verified_token: temp_token
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Ro'yxatdan o'tishda xato");

        localStorage.setItem('cp_token', data.access_token);
        sessionStorage.setItem('cp_logged_in', 'true');
        showToast('Hisob muvaffaqiyatli yaratildi! 🎉', 'success');
        setTimeout(() => window.location.href = 'dashboard.html', 900);
    } catch (err) {
        if (err.message === 'Failed to fetch') {
            showToast("Server bilan bog'lanib bo'lmadi.");
        } else {
            showToast(err.message);
        }
    } finally {
        isLoading = false;
        setLoading(btn, false);
    }
}

/* ══ GOOGLE LOGIN ════════════════════════════════════ */
async function handleGoogle() {
    const btn = document.querySelector('.auth-btn.google');
    const origHtml = btn ? btn.innerHTML : '';

    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:6px"></i> Yuklanmoqda...';
        btn.disabled = true;
    }

    const restore = () => {
        if (btn) { btn.innerHTML = origHtml; btn.disabled = false; }
    };

    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 8000);

        const res = await fetch(`${API_URL}/auth/google/login`, { signal: controller.signal });
        clearTimeout(tid);

        if (!res.ok) throw new Error('Google login sozlanmagan');
        const data = await res.json();
        if (!data.url) throw new Error('Google redirect URL topilmadi');

        window.location.href = data.url;
    } catch (err) {
        restore();
        if (err.name === 'AbortError') {
            showToast('Server javob bermadi (timeout).\nBackend ishlab turganligini tekshiring.');
        } else if (err.message === 'Failed to fetch') {
            showToast("Backend bilan bog'lanib bo'lmadi.\nBackend ishlab turganligini tekshiring.");
        } else {
            showToast('Google login: ' + err.message);
        }
    }
}

/* ══ OTP BOXES ═══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    const boxes = document.querySelectorAll('.otp-box');
    boxes.forEach((box, i) => {
        box.addEventListener('input', () => {
            box.value = box.value.replace(/\D/g, '').slice(0, 1);
            box.classList.toggle('filled', !!box.value);
            if (box.value && i < boxes.length - 1) boxes[i + 1].focus();
            if ([...boxes].every(b => b.value)) setTimeout(goToRegister, 300);
        });

        box.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !box.value && i > 0) {
                boxes[i - 1].value = '';
                boxes[i - 1].classList.remove('filled');
                boxes[i - 1].focus();
            }
        });

        box.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData)
                .getData('text').replace(/\D/g, '').slice(0, 6);
            boxes.forEach((b, idx) => {
                b.value = text[idx] || '';
                b.classList.toggle('filled', !!b.value);
            });
            boxes[Math.min(text.length, 5)].focus();
            if (text.length === 6) setTimeout(goToRegister, 300);
        });
    });

    // Enter key support
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const visible = document.querySelector('.auth-card:not(.hidden)');
        if (!visible) return;
        if (visible.id === 'step-email')    goToOTP();
        if (visible.id === 'step-otp')      goToRegister();
        if (visible.id === 'step-register') completeRegistration();
    });

    // Password strength
    const pwInput = document.getElementById('pwInput');
    if (pwInput) {
        pwInput.addEventListener('input', () => {
            const val   = pwInput.value;
            const fill  = document.getElementById('pwFill');
            const label = document.getElementById('pwLabel');
            if (!fill || !label) return;

            let score = 0;
            if (val.length >= 6)          score++;
            if (val.length >= 10)         score++;
            if (/[A-Z]/.test(val))        score++;
            if (/[0-9]/.test(val))        score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            const levels = [
                { pct: '0%',   color: '#e5e7eb', text: '' },
                { pct: '25%',  color: '#ef4444', text: 'Zaif' },
                { pct: '50%',  color: '#f59e0b', text: "O'rta" },
                { pct: '75%',  color: '#3b82f6', text: 'Yaxshi' },
                { pct: '100%', color: '#10b981', text: 'Kuchli' },
            ];
            const lvl = levels[Math.min(score, 4)];
            fill.style.width      = lvl.pct;
            fill.style.background = lvl.color;
            label.style.color     = lvl.color;
            label.textContent     = lvl.text;
        });
    }
});

/* ══ HELPERS ═════════════════════════════════════════ */
function showStep(stepId) {
    document.querySelectorAll('.auth-card').forEach(c => c.classList.add('hidden'));
    document.getElementById(stepId).classList.remove('hidden');
}

function goBack(stepId) {
    isLoading = false; // reset — agar xato holat qolgan bo'lsa
    showStep(stepId);
}

function startTimer() {
    const timerEl   = document.getElementById('timerCount');
    const timerRow  = document.getElementById('resendTimer');
    const resendBtn = document.getElementById('resendBtn');
    if (timerRow)  timerRow.classList.remove('hidden');
    if (resendBtn) resendBtn.classList.add('hidden');

    let secs = 60;
    if (timerEl) timerEl.textContent = secs;

    const interval = setInterval(() => {
        secs--;
        if (timerEl) timerEl.textContent = secs;
        if (secs <= 0) {
            clearInterval(interval);
            if (timerRow)  timerRow.classList.add('hidden');
            if (resendBtn) resendBtn.classList.remove('hidden');
        }
    }, 1000);
}

async function resendCode() {
    const email = sessionStorage.getItem('cp_email');
    if (!email) return;
    try {
        const res = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (res.ok) { showToast('Yangi kod yuborildi', 'success'); startTimer(); }
        else showToast('Kod yuborishda xato');
    } catch {
        showToast("Server bilan bog'lanib bo'lmadi");
    }
}

function togglePw(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}