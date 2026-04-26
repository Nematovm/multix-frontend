const API_URL = 'https://api.multx.uz';
let selectedJsonFile = null;

function showToast(msg, type = 'success') {
    const t = document.getElementById('cp-toast');
    if (t) t.remove();
    const el = document.createElement('div');
    el.id = 'cp-toast';
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}"></i><span>${msg}</span>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('cp_token');
    if (!token) { window.location.href = 'auth.html'; return; }

    try {
        const res = await fetch(`${API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) { window.location.href = 'auth.html'; return; }
        const user = await res.json();
        if (!user.is_admin) { window.location.href = 'dashboard.html'; return; }

        const name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        document.getElementById('adminName').textContent = name;
        document.getElementById('adminAvatar').textContent = name.charAt(0).toUpperCase();
    } catch (e) {
        window.location.href = 'auth.html';
    }

    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    loadDashboard();
    loadCategories();
});

function showSection(name, el) {
    document.querySelectorAll('.db-main section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`sec-${name}`).classList.remove('hidden');
    document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');

    if (name === 'tests') loadTests();
    if (name === 'users') loadUsers();
    if (name === 'premium') loadPremiumUsers();
    if (name === 'categories') loadCategories();
    if (name === 'feedbacks') loadFeedbacks('pending');
    if (name === 'listening') loadListeningTests();
}

// ── DASHBOARD ──
async function loadDashboard() {
    const token = localStorage.getItem('cp_token');
    try {
        const res = await fetch(`${API_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        document.getElementById('stat-users').textContent = data.total_users;
        document.getElementById('stat-tests').textContent = data.total_tests;
        document.getElementById('stat-premium').textContent = data.premium_users;
        document.getElementById('stat-cats').textContent = data.total_categories;
        drawCharts(data);
    } catch (e) {}
}

function drawCharts(data) {
    const months = ['Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
    new Chart(document.getElementById('chartUsers'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                { data: data.user_growth || [], borderColor: '#2caa9a', backgroundColor: 'rgba(44,170,154,0.08)', tension: 0.4, fill: true, pointRadius: 3 },
                { data: data.premium_growth || [], borderColor: '#f5a623', backgroundColor: 'transparent', tension: 0.4, pointRadius: 3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { font: { size: 11 }, color: '#888' }, grid: { display: false } },
                y: { ticks: { font: { size: 11 }, color: '#888' }, grid: { color: 'rgba(0,0,0,0.05)' } }
            }
        }
    });

    const free = (data.total_users || 1) - (data.premium_users || 0);
    new Chart(document.getElementById('chartDoughnut'), {
        type: 'doughnut',
        data: {
            datasets: [{ data: [free, data.premium_users || 0], backgroundColor: ['#2caa9a', '#f5a623'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false } } }
    });
}

// ── CATEGORIES ──
async function loadCategories() {
    const token = localStorage.getItem('cp_token');
    const res = await fetch(`${API_URL}/admin/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const cats = await res.json();

    const sel = document.getElementById('testCategory');
    // Listening modal kategoriya select
const lSel = document.getElementById('lTestCategory');
if (lSel) {
    lSel.innerHTML = '<option value="">Select category</option>' +
        cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}
    sel.innerHTML = '<option value="">Select category</option>' +
        cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    const grid = document.getElementById('categoriesGrid');
    if (!cats.length) {
        grid.innerHTML = '<div class="cat-empty">No categories yet. Add one!</div>';
        return;
    }
    grid.innerHTML = cats.map(c => `
        <div class="cat-card">
            <div class="cat-name">${c.name}</div>
            <div class="cat-desc">${c.description || 'No description'}</div>
            <div class="cat-count">${c.tests_count || 0} tests</div>
            <div class="act-btns" style="margin-top:12px">
                <button class="act-btn danger" onclick="deleteCategory(${c.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function addCategory() {
    const token = localStorage.getItem('cp_token');
    const name = document.getElementById('catName').value.trim();
    const description = document.getElementById('catDesc').value.trim();
    if (!name) { showToast('Enter category name', 'error'); return; }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('section', 'reading');

    const res = await fetch(`${API_URL}/admin/categories`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });

    if (res.ok) {
        showToast('Category added!');
        closeModal('addCategory');
        document.getElementById('catName').value = '';
        document.getElementById('catDesc').value = '';
        loadCategories();
    } else {
        const d = await res.json();
        showToast(d.detail || 'Error', 'error');
    }
}

async function deleteCategory(id) {
    if (!confirm('Delete this category?')) return;
    const token = localStorage.getItem('cp_token');
    const res = await fetch(`${API_URL}/admin/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) { showToast('Category deleted'); loadCategories(); }
    else showToast('Error', 'error');
}

// ── TESTS ──
async function loadTests() {
    const token = localStorage.getItem('cp_token');
    const res = await fetch(`${API_URL}/admin/tests`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const tests = await res.json();
    const tbody = document.getElementById('testsBody');

    if (!tests.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No tests yet. Add one!</td></tr>';
        return;
    }

    tbody.innerHTML = tests.map(t => {
        // ── Format ko'rsatish: parts qiymatiga qarab ──
        // parts = '1,2,3,4,5' → Full Mock
        // parts = '1' yoki '2' yoki bitta raqam → Part N
        const partsVal = (t.parts || '').trim();
        const isFullMock = partsVal === '1,2,3,4,5' || partsVal.includes(',');
        const formatLabel = isFullMock
            ? 'Full Mock'
            : partsVal ? `Part ${partsVal}` : t.name;

        return `
        <tr>
            <td style="font-weight:600;color:var(--text)">${t.name}</td>
            <td>${t.category_name || '—'}</td>
            <td><span class="badge badge-${t.level}">${t.level}</span></td>
            <td>${formatLabel}</td>
            <td><span class="badge badge-${t.type}">${t.type}</span></td>
            <td>
                ${t.has_json
                    ? `<span style="color:#2caa9a;font-size:12px">
                        <i class="fa-solid fa-file-code"></i> JSON
                       </span>`
                    : `<span style="color:var(--text-3);font-size:12px">No JSON</span>`
                }
                ${t.telegram_link
                    ? `<a href="${t.telegram_link}" target="_blank" style="margin-left:8px;font-size:12px;color:#2caa9a">
                        <i class="fa-brands fa-telegram"></i> TG
                       </a>`
                    : ''
                }
            </td>
            <td>
                <div class="act-btns">
                    <button class="act-btn success" onclick="openQuestions(${t.id}, '${t.name}')">
                        <i class="fa-solid fa-list"></i> Questions
                    </button>
                    <button class="act-btn danger" onclick="deleteTest(${t.id})">Delete</button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// JSON fayl tanlanganda
function onJsonSelect(input) {
    const file = input.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
        showToast('Faqat .json fayl yuklang!', 'error');
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed.parts) {
                showToast('JSON da "parts" array yo\'q!', 'error');
                input.value = '';
                selectedJsonFile = null;
                return;
            }
            selectedJsonFile = file;
            const area = document.getElementById('jsonUploadArea');
            area.classList.add('selected');
            document.getElementById('jsonUploadText').textContent =
                `✓ ${file.name} (${(file.size / 1024).toFixed(1)}KB) — ${parsed.parts.length} part(s)`;
        } catch (err) {
            showToast('JSON fayl noto\'g\'ri formatda!', 'error');
            input.value = '';
            selectedJsonFile = null;
        }
    };
    reader.readAsText(file);
}

function toggleParts(val) {
    const wrap = document.getElementById('partSelectWrap');
    wrap.classList.toggle('hidden', val !== 'part');
}

async function addTest() {
    const token = localStorage.getItem('cp_token');
    const format = document.getElementById('testFormat').value;

    // parts: full → '1,2,3,4,5', part → tanlangan raqam
    const parts = format === 'full'
        ? '1,2,3,4,5'
        : document.getElementById('testPart').value;

    const name = document.getElementById('testName').value.trim();
    const category_id = document.getElementById('testCategory').value;

    if (!name) { showToast('Enter test name', 'error'); return; }
    if (!category_id) { showToast('Select category', 'error'); return; }
    if (!selectedJsonFile) { showToast('JSON fayl tanlang!', 'error'); return; }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category_id', category_id);
    formData.append('section', 'reading');
    formData.append('level', document.getElementById('testLevel').value);
    formData.append('type', document.getElementById('testType').value);
    formData.append('format', format);
    formData.append('parts', parts);          // ← to'g'ri parts yuboriladi
    formData.append('duration', document.getElementById('testDuration').value);
    formData.append('questions_count', document.getElementById('testQuestions').value);
    formData.append('telegram_channel', document.getElementById('testTgChannel').value);
    formData.append('telegram_link', document.getElementById('testTgLink').value);
    formData.append('json_file', selectedJsonFile);

    document.getElementById('uploadProgress').classList.remove('hidden');
    document.getElementById('uploadFill').style.width = '30%';
    document.getElementById('uploadStatus').textContent = 'Uploading...';

    try {
        const res = await fetch(`${API_URL}/admin/tests`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        document.getElementById('uploadFill').style.width = '100%';

        if (res.ok) {
            showToast('Test added successfully!');
            closeModal('addTest');
            resetTestForm();
            loadTests();
            loadDashboard();
        } else {
            const d = await res.json();
            showToast(d.detail || 'Error adding test', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    } finally {
        document.getElementById('uploadProgress').classList.add('hidden');
        document.getElementById('uploadFill').style.width = '0%';
    }
}

function resetTestForm() {
    document.getElementById('testName').value = '';
    document.getElementById('testTgChannel').value = '';
    document.getElementById('testTgLink').value = '';
    document.getElementById('testDuration').value = 60;
    document.getElementById('testQuestions').value = 35;
    document.getElementById('jsonUploadArea').classList.remove('selected');
    document.getElementById('jsonUploadText').textContent = 'Click to upload JSON file';
    document.getElementById('jsonFileInput').value = '';
    selectedJsonFile = null;
}

async function deleteTest(id) {
    if (!confirm('Delete this test?')) return;
    const token = localStorage.getItem('cp_token');
    const res = await fetch(`${API_URL}/admin/tests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) { showToast('Test deleted'); loadTests(); }
    else showToast('Error deleting test', 'error');
}

// ── USERS ──
async function loadUsers() {
    const token = localStorage.getItem('cp_token');
    const res = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await res.json();
    const tbody = document.getElementById('usersBody');

    tbody.innerHTML = users.map(u => `
        <tr>
            <td style="font-weight:600;color:var(--text)">${u.first_name || ''} ${u.last_name || ''}</td>
            <td>${u.email}</td>
            <td><span class="badge badge-${u.is_premium ? 'premium' : 'free'}">${u.is_premium ? 'Premium' : 'Free'}</span></td>
            <td><span class="badge badge-${u.is_verified ? 'yes' : 'no'}">${u.is_verified ? 'Yes' : 'No'}</span></td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td>
                <div class="act-btns">
                    ${u.is_premium
                        ? `<button class="act-btn danger" onclick="togglePremium(${u.id}, false)">Revoke</button>`
                        : `<button class="act-btn success" onclick="togglePremium(${u.id}, true)">Make Premium</button>`
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

async function loadPremiumUsers() {
    const token = localStorage.getItem('cp_token');
    const res = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const users = await res.json();
    const premiumUsers = users.filter(u => u.is_premium);
    const tbody = document.getElementById('premiumBody');

    if (!premiumUsers.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No premium users yet</td></tr>';
        return;
    }

    tbody.innerHTML = premiumUsers.map(u => `
        <tr>
            <td style="font-weight:600;color:var(--text)">${u.first_name || ''} ${u.last_name || ''}</td>
            <td>${u.email}</td>
            <td>${new Date(u.created_at).toLocaleDateString()}</td>
            <td><button class="act-btn danger" onclick="togglePremium(${u.id}, false)">Revoke</button></td>
        </tr>
    `).join('');
}

async function togglePremium(userId, isPremium) {
    const token = localStorage.getItem('cp_token');
    const formData = new FormData();
    formData.append('is_premium', isPremium);
    const res = await fetch(`${API_URL}/admin/users/${userId}/premium`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    if (res.ok) {
        showToast(isPremium ? 'Premium activated!' : 'Premium revoked');
        loadUsers();
        loadPremiumUsers();
    } else {
        showToast('Error', 'error');
    }
}

// ── HELPERS ──
function openModal(name) {
    document.getElementById(`modal-${name}`).classList.remove('hidden');
}
function closeModal(name) {
    document.getElementById(`modal-${name}`).classList.add('hidden');
}
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.add('hidden');
    }
});
function searchTable(tableId, query) {
    const q = query.toLowerCase();
    document.querySelectorAll(`#${tableId} tbody tr`).forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
}
function signOut() {
    localStorage.removeItem('cp_token');
    sessionStorage.clear();
    window.location.href = 'auth.html';
}

let currentTestId = null;

async function openQuestions(testId, testName) {
    currentTestId = testId;
    document.getElementById('questionsModalTitle').textContent = `Questions — ${testName}`;
    openModal('questions');
    onQTypeChange('tfng');
    await loadQuestions();
}

function onQTypeChange(type) {
    const mcqOpts = document.getElementById('mcqOptions');
    const answerSelect = document.getElementById('qAnswer');
    const answerText = document.getElementById('qAnswerText');

    mcqOpts.classList.add('hidden');
    answerSelect.classList.add('hidden');
    answerText.classList.add('hidden');

    if (type === 'tfng') {
        answerSelect.innerHTML = `
            <option value="True">True</option>
            <option value="False">False</option>
            <option value="Not Given">Not Given</option>
        `;
        answerSelect.classList.remove('hidden');
    } else if (type === 'mcq') {
        mcqOpts.classList.remove('hidden');
        answerSelect.innerHTML = `
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
        `;
        answerSelect.classList.remove('hidden');
    } else if (type === 'fitb' || type === 'matching') {
        answerText.classList.remove('hidden');
    }
}

async function loadQuestions() {
    const token = localStorage.getItem('cp_token');
    const res = await fetch(`${API_URL}/admin/tests/${currentTestId}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const questions = await res.json();

    document.getElementById('qCount').textContent = `(${questions.length} ta)`;
    document.getElementById('qNumber').value = questions.length + 1;

    const list = document.getElementById('questionsList');
    if (!questions.length) {
        list.innerHTML = '<p style="color:var(--text-3);font-size:13px">No questions yet</p>';
        return;
    }

    const typeLabels = { tfng: 'T/F/NG', mcq: 'MCQ', fitb: 'Fill blank', matching: 'Matching' };

    list.innerHTML = questions.map(q => `
        <div style="background:var(--white);border:1px solid var(--border);border-radius:10px;padding:12px 16px;display:flex;align-items:flex-start;gap:12px">
            <div style="background:var(--teal-faint);color:var(--teal-dark);border-radius:8px;padding:4px 10px;font-size:12px;font-weight:600;flex-shrink:0">
                P${q.part_number} · Q${q.question_number}
            </div>
            <div style="flex:1">
                <div style="font-size:12px;color:var(--teal);margin-bottom:4px">${typeLabels[q.question_type] || q.question_type}</div>
                <div style="font-size:13px;color:var(--text);margin-bottom:4px">${q.question_text || '—'}</div>
                <div style="font-size:12px;color:#0f6e56;font-weight:500">
                    ✓ ${q.correct_answer}
                    ${q.explanation ? `<span style="color:var(--text-3);font-weight:400"> — ${q.explanation}</span>` : ''}
                </div>
            </div>
            <button class="act-btn danger" onclick="deleteQuestion(${q.id})" style="flex-shrink:0">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
}

async function addQuestion() {
    const token = localStorage.getItem('cp_token');
    const type = document.getElementById('qType').value;

    const answerSelect = document.getElementById('qAnswer');
    const answerText = document.getElementById('qAnswerText');
    const correct_answer = (type === 'tfng' || type === 'mcq')
        ? answerSelect.value
        : answerText.value.trim();

    if (!correct_answer) { showToast('Enter correct answer', 'error'); return; }

    const payload = {
        test_id: currentTestId,
        part_number: parseInt(document.getElementById('qPart').value),
        question_number: parseInt(document.getElementById('qNumber').value),
        question_type: type,
        question_text: document.getElementById('qText').value.trim(),
        passage_text: document.getElementById('qPassage').value.trim(),
        option_a: document.getElementById('qOptA')?.value.trim() || null,
        option_b: document.getElementById('qOptB')?.value.trim() || null,
        option_c: document.getElementById('qOptC')?.value.trim() || null,
        option_d: document.getElementById('qOptD')?.value.trim() || null,
        correct_answer,
        explanation: document.getElementById('qExplanation').value.trim(),
    };

    const res = await fetch(`${API_URL}/admin/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        showToast('Question added!');
        document.getElementById('qText').value = '';
        document.getElementById('qPassage').value = '';
        document.getElementById('qExplanation').value = '';
        if (document.getElementById('qAnswerText')) document.getElementById('qAnswerText').value = '';
        await loadQuestions();
    } else {
        showToast('Error', 'error');
    }
}

async function deleteQuestion(id) {
    if (!confirm('Delete this question?')) return;
    const token = localStorage.getItem('cp_token');
    const res = await fetch(`${API_URL}/admin/questions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) { showToast('Deleted'); loadQuestions(); }
    else showToast('Error', 'error');
}

// ── FEEDBACKS ──
async function loadFeedbacks(mode = 'pending') {
    const token = localStorage.getItem('cp_token');
    const approved = mode === 'approved';

    document.getElementById('btn-pending').className = `admin-btn${!approved ? ' primary' : ''}`;
    document.getElementById('btn-approved').className = `admin-btn${approved ? ' primary' : ''}`;

    const res = await fetch(`${API_URL}/admin/feedbacks?approved=${approved}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const tbody = document.getElementById('feedbacksBody');

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">No feedbacks found</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(f => `
        <tr>
            <td>${f.user_name || 'Anonymous'}</td>
            <td>${'★'.repeat(f.rating || 0)}${'☆'.repeat(5 - (f.rating || 0))}</td>
            <td style="max-width:300px">${f.message}</td>
            <td>${new Date(f.created_at).toLocaleDateString()}</td>
            <td>
                ${!f.is_approved ? `
                    <button class="admin-btn primary" onclick="approveFeedback(${f.id})" style="padding:6px 12px;font-size:12px">
                        <i class="fa-solid fa-check"></i> Approve
                    </button>
                ` : '<span style="color:#2caa9a;font-size:13px"><i class="fa-solid fa-check-circle"></i> Approved</span>'}
                <button class="admin-btn" onclick="deleteFeedback(${f.id})" style="padding:6px 12px;font-size:12px;margin-left:6px;color:#e74c3c">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function approveFeedback(id) {
    const token = localStorage.getItem('cp_token');
    await fetch(`${API_URL}/admin/feedbacks/${id}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
    });
    loadFeedbacks('pending');
}

async function deleteFeedback(id) {
    if (!confirm('Delete this feedback?')) return;
    const token = localStorage.getItem('cp_token');
    await fetch(`${API_URL}/admin/feedbacks/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
    });
    loadFeedbacks('pending');
}

// ── PART FILTER ──
function filterPart(val) {
    document.querySelectorAll('.test-card').forEach(card => {
        if (!val || card.dataset.parts === val) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}



// ════════════════════════════════════════════
// ── LISTENING TESTS ──
// ════════════════════════════════════════════

let selectedListeningAudioFile = null;
let selectedListeningJsonFile  = null;
let selectedListeningMapFile = null;

async function loadListeningTests() {
    const token = localStorage.getItem('cp_token');
    const res = await fetch(`${API_URL}/admin/listening-tests`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const tests = await res.json();
    const tbody = document.getElementById('listeningBody');

    if (!tests.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="table-empty">No listening tests yet.</td></tr>';
        return;
    }

    tbody.innerHTML = tests.map(t => {
        const partsVal   = (t.parts || '').trim();
        const isFull     = partsVal.includes(',') || partsVal === '1,2,3,4';
        const formatLabel = isFull ? 'Full Mock' : `Part ${partsVal}`;

        return `
        <tr>
          <td style="font-weight:600;color:var(--text)">${t.name}</td>
          <td>${t.category_name || '—'}</td>
          <td><span class="badge badge-${t.level}">${t.level}</span></td>
          <td>${formatLabel}</td>
          <td><span class="badge badge-${t.type}">${t.type}</span></td>
          <td>
            ${t.has_audio
              ? `<span style="color:#2caa9a;font-size:12px"><i class="fa-solid fa-headphones"></i> Audio</span>`
              : `<span style="color:var(--text-3);font-size:12px">No audio</span>`}
          </td>
          <td>
            ${t.has_json
              ? `<span style="color:#2caa9a;font-size:12px"><i class="fa-solid fa-file-code"></i> JSON</span>`
              : `<span style="color:var(--text-3);font-size:12px">No JSON</span>`}
          </td>
          <td>
            <div class="act-btns">
              <button class="act-btn danger" onclick="deleteListeningTest(${t.id})">Delete</button>
            </div>
          </td>
        </tr>`;
    }).join('');
}

function toggleListeningParts(val) {
    const wrap = document.getElementById('lPartSelectWrap');
    wrap.classList.toggle('hidden', val !== 'part');
}

function onListeningAudioSelect(input) {
    const file = input.files[0];
    if (!file) return;
    selectedListeningAudioFile = file;
    const area = document.getElementById('lAudioUploadArea');
    area.classList.add('selected');
    document.getElementById('lAudioUploadText').textContent =
        `✓ ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
}

// ── onListeningJsonSelect — faqat JSON tanlash, map ga tegmaydi ──
function onListeningJsonSelect(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
        showToast('Faqat .json fayl yuklang!', 'error');
        input.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            if (!parsed.parts) {
                showToast('JSON da "parts" array yo\'q!', 'error');
                input.value = '';
                selectedListeningJsonFile = null;
                return;
            }
            selectedListeningJsonFile = file;
            const area = document.getElementById('lJsonUploadArea');
            area.classList.add('selected');
            document.getElementById('lJsonUploadText').textContent =
                `✓ ${file.name} (${(file.size / 1024).toFixed(1)}KB) — ${parsed.parts.length} part(s)`;

            // ── JSON da map_image_url bor bo'lsa — map upload ni ko'rsat ──
            if (mapField) mapField.classList.remove('hidden');
            if (mapField) {
                mapField.classList.toggle('hidden', !hasMap);
            }
        } catch {
            showToast('JSON fayl noto\'g\'ri formatda!', 'error');
            input.value = '';
            selectedListeningJsonFile = null;
        }
    };
    reader.readAsText(file);
}


// ── onListeningMapSelect — faqat map rasm tanlash ──
function onListeningMapSelect(input) {
    const file = input.files[0];
    if (!file) return;

    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
        showToast('Faqat rasm fayl yuklang! (png, jpg, jpeg, webp)', 'error');
        input.value = '';
        return;
    }

    selectedListeningMapFile = file;
    const area = document.getElementById('lMapUploadArea');
    area.classList.add('selected');
    document.getElementById('lMapUploadText').textContent =
        `✓ ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => {
        area.style.backgroundImage    = `url(${e.target.result})`;
        area.style.backgroundSize     = 'cover';
        area.style.backgroundPosition = 'center';
        area.style.minHeight          = '140px';
        const icon = area.querySelector('i');
        const text = area.querySelector('div');
        if (icon) icon.style.display = 'none';
        if (text) text.style.opacity = '0';
    };
    reader.readAsDataURL(file);
}


// ── resetListeningForm — hammani tozalaydi ──
function resetListeningForm() {
    document.getElementById('lTestName').value     = '';
    document.getElementById('lTestDuration').value = 40;

    // Audio reset
    document.getElementById('lAudioUploadArea').classList.remove('selected');
    document.getElementById('lAudioUploadText').textContent = 'Click to upload Audio file';
    document.getElementById('lAudioFileInput').value = '';
    selectedListeningAudioFile = null;

    // JSON reset
    document.getElementById('lJsonUploadArea').classList.remove('selected');
    document.getElementById('lJsonUploadText').textContent  = 'Click to upload JSON file';
    document.getElementById('lJsonFileInput').value  = '';
    selectedListeningJsonFile  = null;

    // Map reset
    const mapArea = document.getElementById('lMapUploadArea');
    if (mapArea) {
        mapArea.classList.remove('selected');
        mapArea.style.backgroundImage = '';
        mapArea.style.minHeight       = '';
        const icon = mapArea.querySelector('i');
        const text = mapArea.querySelector('div');
        if (icon) icon.style.display = '';
        if (text) text.style.opacity = '';
    }
    document.getElementById('lMapUploadText').textContent = 'Click to upload Map image';
    document.getElementById('lMapFileInput').value        = '';
    selectedListeningMapFile = null;

    // Map field yashirish
    const mapField = document.getElementById('lMapFieldWrap');
    if (mapField) mapField.classList.add('hidden');
}

function onListeningMapSelect(input) {
    const file = input.files[0];
    if (!file) return;
 
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
        showToast('Faqat rasm fayl yuklang! (png, jpg, jpeg, webp)', 'error');
        input.value = '';
        return;
    }
 
    selectedListeningMapFile = file;
    const area = document.getElementById('lMapUploadArea');
    area.classList.add('selected');
    document.getElementById('lMapUploadText').textContent =
        `✓ ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
 
    // Preview ko'rsatish — upload area da rasm ko'rinadi
    const reader = new FileReader();
    reader.onload = (e) => {
        area.style.backgroundImage    = `url(${e.target.result})`;
        area.style.backgroundSize     = 'cover';
        area.style.backgroundPosition = 'center';
        area.style.minHeight          = '140px';
        // Icon va textni yashirish
        area.querySelector('i').style.display   = 'none';
        area.querySelector('div').style.opacity = '0';
    };
    reader.readAsDataURL(file);
}

async function addListeningTest() {
    const token = localStorage.getItem('cp_token');
    const name        = document.getElementById('lTestName').value.trim();
    const category_id = document.getElementById('lTestCategory').value;
    const format      = document.getElementById('lTestFormat').value;
const parts = format === 'full'
    ? '1,2,3,4,5,6'   // ← 4 dan 6 ga
    : document.getElementById('lTestPart').value;

    if (!name)                        { showToast('Test nomini kiriting', 'error'); return; }
    if (!category_id)                 { showToast('Kategoriya tanlang', 'error'); return; }
    if (!selectedListeningAudioFile)  { showToast('Audio fayl tanlang!', 'error'); return; }
    if (!selectedListeningJsonFile)   { showToast('JSON fayl tanlang!', 'error'); return; }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('category_id', category_id);
    formData.append('level',    document.getElementById('lTestLevel').value);
    formData.append('type',     document.getElementById('lTestType').value);
    formData.append('format',   format);
    formData.append('parts',    parts);
    formData.append('duration', document.getElementById('lTestDuration').value);
    formData.append('audio_file', selectedListeningAudioFile);
    formData.append('json_file',  selectedListeningJsonFile);
    if (selectedListeningMapFile) {
        formData.append('map_image', selectedListeningMapFile);
    }

    document.getElementById('lUploadProgress').classList.remove('hidden');
    document.getElementById('lUploadFill').style.width = '30%';
    document.getElementById('lUploadStatus').textContent = 'Uploading audio & JSON...';

    try {
        const res = await fetch(`${API_URL}/admin/listening-tests`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        document.getElementById('lUploadFill').style.width = '100%';

        if (res.ok) {
            showToast('Listening test qo\'shildi!');
            closeModal('addListening');
            resetListeningForm();
            loadListeningTests();
        } else {
            const d = await res.json();
            showToast(d.detail || 'Xato', 'error');
        }
    } catch (e) {
        showToast('Network error', 'error');
    } finally {
        document.getElementById('lUploadProgress').classList.add('hidden');
        document.getElementById('lUploadFill').style.width = '0%';
    }
}

async function deleteListeningTest(id) {
    if (!confirm('Bu listening testni o\'chirasizmi?')) return;
    const token = localStorage.getItem('cp_token');
    const res = await fetch(`${API_URL}/admin/listening-tests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) { showToast('O\'chirildi'); loadListeningTests(); }
    else showToast('Xato', 'error');
}

function resetListeningForm() {
    document.getElementById('lTestName').value     = '';
    document.getElementById('lTestDuration').value = 40;
    document.getElementById('lAudioUploadArea').classList.remove('selected');
    document.getElementById('lAudioUploadText').textContent = 'Click to upload Audio file';
    document.getElementById('lAudioFileInput').value = '';
    document.getElementById('lJsonUploadArea').classList.remove('selected');
    document.getElementById('lJsonUploadText').textContent  = 'Click to upload JSON file';
    document.getElementById('lJsonFileInput').value  = '';
    selectedListeningAudioFile = null;
    selectedListeningJsonFile  = null;
}