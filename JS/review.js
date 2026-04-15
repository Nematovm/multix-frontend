const API_URL = 'http://127.0.0.1:8000';

let testData    = null;
let attempt     = null;
let currentPart = 0;
let showCorrect = false;

// ── URL dan attempt ID olish ──
function getAttemptId() {
    return new URLSearchParams(window.location.search).get('attempt');
}

// ── Foiz rangini aniqlash ──
function scoreColor(pct) {
    if (pct >= 70) return '#0f6e56';
    if (pct >= 40) return '#d97706';
    return '#dc2626';
}

// ── Javob to'g'riligini tekshirish ──
function checkAnswer(part, qId, userAnswer, correctAnswer) {
    if (!userAnswer) return false;
    if (correctAnswer) {
        // FITB: case-insensitive
        return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
    }
    // MCQ / matching: part.answers ichida
    const corr = part.answers?.[qId] || '';
    return userAnswer.toUpperCase().trim() === corr.toUpperCase().trim();
}

// ── MCQ option render ──
function renderMCQOption(opt, userAnswer, correctAnswer) {
    const isSelected = userAnswer.toUpperCase() === opt.key.toUpperCase();
    const isCorrect  = correctAnswer.toUpperCase() === opt.key.toUpperCase();
    const isWrong    = isSelected && !isCorrect;
    const showAsCorrect = isCorrect && (showCorrect || isSelected);

    let cls = 'rv-opt';
    if (showAsCorrect) cls += ' correct';
    else if (isWrong)  cls += ' wrong';
    else if (isSelected) cls += ' selected';

    return `
    <div class="${cls}">
        <span class="rv-opt-key">${opt.key}</span>
        <span class="rv-opt-text">${opt.text}</span>
        ${showAsCorrect ? '<span class="rv-opt-badge correct"><i class="fa-solid fa-check"></i></span>' : ''}
        ${isWrong       ? '<span class="rv-opt-badge wrong"><i class="fa-solid fa-xmark"></i></span>'  : ''}
    </div>`;
}

// ── TFNG button render ──
function renderTFNG(opts, userAnswer, correctAnswer) {
    return opts.map(opt => {
        const optKey  = opt === 'Not Given' ? 'NG' : opt[0];
        const isCorr  = correctAnswer.toUpperCase() === opt.toUpperCase() || correctAnswer.toUpperCase() === optKey.toUpperCase();
        const isUser  = userAnswer.toUpperCase()    === opt.toUpperCase() || userAnswer.toUpperCase()    === optKey.toUpperCase();
        let cls = 'rv-tfng-btn';
        if (isCorr)        cls += ' correct';
        else if (isUser)   cls += ' wrong';
        return `<span class="${cls}">${opt}</span>`;
    }).join('');
}

// ── Savol blokini render qilish ──
function renderQuestion(part, q, userAnswers) {
    const userAns = userAnswers[q.id] || '';
    const correct = part.answers?.[q.id] || q.correctAnswer || '';
    const isOk    = checkAnswer(part, q.id, userAns, q.correctAnswer || null);

    let html = `
    <div class="rv-q-block ${isOk ? 'ok' : 'err'}">
        <div class="rv-q-header">
            <span class="rv-q-num">${q.number}</span>
            <span class="rv-q-text">${q.text || ''}</span>
            <span class="rv-q-verdict ${isOk ? 'correct' : 'wrong'}">
                ${isOk
                    ? '<i class="fa-solid fa-check"></i> Correct'
                    : '<i class="fa-solid fa-xmark"></i> Wrong'}
            </span>
        </div>`;

    // MCQ
if (q.type === 'mcq' && q.options) {
    html += '<div class="rv-opts">';
    q.options.forEach(opt => {
        html += renderMCQOption(opt, userAns, correct);
    });
    html += '</div>';
}
    // TFNG
    if (q.type === 'tfng') {
        html += `<div class="rv-tfng">${renderTFNG(['True', 'False', 'Not Given'], userAns, correct)}</div>`;
    }

    // FITB inline (Part 5 FITB — q.correctAnswer bor, q.text yo'q)
    if (!q.type || q.type === 'fitb') {
        html += `
        <div class="rv-fitb-row">
            <span class="rv-fitb-label">Your answer:</span>
            <span class="rv-fitb-val ${isOk ? 'correct' : 'wrong'}">${userAns || '—'}</span>
            ${!isOk && showCorrect
                ? `<span class="rv-fitb-correct"><i class="fa-solid fa-chevron-right"></i> ${correct}</span>`
                : ''}
        </div>`;
    }

    // Explanation
    if (part.explanations?.[q.id]) {
        html += `
        <div class="rv-expl">
            <i class="fa-solid fa-circle-info"></i>
            <span>${part.explanations[q.id]}</span>
        </div>`;
    }

    html += '</div>';
    return html;
}

// ── Partni render qilish ──
function renderPart(partIndex) {
    currentPart = partIndex;
    const part  = testData.parts[partIndex];
    if (!part) return;

    // Part bar
    document.getElementById('rvPartLabel').textContent       = `Part ${part.part_number}`;
    document.getElementById('rvPartInstruction').textContent = part.instruction || '';

    // Passage col
    const passageTitle    = document.getElementById('rvPassageTitle');
    const passageSubtitle = document.getElementById('rvPassageSubtitle');
    const passageText     = document.getElementById('rvPassageText');

    passageTitle.textContent    = part.passage_title    || '';
    passageSubtitle.textContent = part.passage_subtitle || '';

    // Passage text (FITB type'da passage array, boshqalarda string)
    if (part.passage_text) {
        passageText.innerText = part.passage_text;
    } else if (Array.isArray(part.passage)) {
        passageText.innerText = part.passage.map(p => p.content || '').join('');
    } else if (part.paragraphs) {
        passageText.innerHTML = part.paragraphs.map(p =>
            `<div class="rv-para"><strong>${p.label || ''}</strong> ${p.text || ''}</div>`
        ).join('');
    } else {
        passageText.textContent = '';
    }

    // Questions col
    const qCol = document.getElementById('rvQuestionsCol');
    qCol.innerHTML = '';

    if (part.type === 'reading-mixed') {
        // FITB summary + MCQ groups
        (part.question_groups || []).forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'rv-group';

            let html = '';
            if (group.title)       html += `<div class="rv-group-title">${group.title}</div>`;
            if (group.instruction) html += `<div class="rv-group-instr">${group.instruction}</div>`;

            if (group.type === 'fitb') {
                // Summary passage with blanks rendered as review rows
                html += `<div class="rv-fitb-summary">`;
                (group.questions || []).forEach(q => {
                    const userAns = attempt.user_answers[q.id] || '';
                    const isOk    = userAns.toLowerCase().trim() === (q.correctAnswer || '').toLowerCase().trim();
                    html += `
                    <div class="rv-q-block ${isOk ? 'ok' : 'err'}">
                        <div class="rv-q-header">
                            <span class="rv-q-num">${q.number}</span>
                            <span class="rv-q-text">Fill in blank (${q.number})</span>
                            <span class="rv-q-verdict ${isOk ? 'correct' : 'wrong'}">
                                ${isOk ? '<i class="fa-solid fa-check"></i> Correct' : '<i class="fa-solid fa-xmark"></i> Wrong'}
                            </span>
                        </div>
                        <div class="rv-fitb-row">
                            <span class="rv-fitb-label">Your answer:</span>
                            <span class="rv-fitb-val ${isOk ? 'correct' : 'wrong'}">${userAns || '—'}</span>
                            ${!isOk && showCorrect
                                ? `<span class="rv-fitb-correct"><i class="fa-solid fa-chevron-right"></i> ${q.correctAnswer}</span>`
                                : ''}
                        </div>
                        ${part.explanations?.[q.id]
                            ? `<div class="rv-expl"><i class="fa-solid fa-circle-info"></i><span>${part.explanations[q.id]}</span></div>`
                            : ''}
                    </div>`;
                });
                html += '</div>';
            }

            if (group.type === 'mcq') {
                (group.questions || []).forEach(q => {
                    html += renderQuestion(part, q, attempt.user_answers);
                });
            }

            groupDiv.innerHTML = html;
            qCol.appendChild(groupDiv);
        });

    } else if (part.type === 'reading-mcq') {
        (part.question_groups || [{ questions: part.questions || [] }]).forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'rv-group';
            let html = '';
            if (group.title)       html += `<div class="rv-group-title">${group.title}</div>`;
            if (group.instruction) html += `<div class="rv-group-instr">${group.instruction}</div>`;
            (group.questions || []).forEach(q => {
                html += renderQuestion(part, q, attempt.user_answers);
            });
            groupDiv.innerHTML = html;
            qCol.appendChild(groupDiv);
        });

    } else if (part.type === 'matching') {
        // Options panel + questions
        const div = document.createElement('div');
        div.className = 'rv-group';
        let html = '<div class="rv-matching-opts">';
        (part.options || []).forEach(opt => {
            html += `<div class="rv-match-opt"><span class="rv-match-key">${opt.key}</span><span>${opt.text}</span></div>`;
        });
        html += '</div>';
        (part.questions || []).forEach(q => {
            const userAns = attempt.user_answers[q.id] || '';
            const correct = part.answers?.[q.id] || '';
            const isOk    = userAns.toUpperCase() === correct.toUpperCase();
            html += `
            <div class="rv-q-block ${isOk ? 'ok' : 'err'}">
                <div class="rv-q-header">
                    <span class="rv-q-num">${q.number}</span>
                    <span class="rv-q-text">${q.text}</span>
                    <span class="rv-user-sel ${isOk ? 'correct' : 'wrong'}">${userAns || '—'}</span>
                    <span class="rv-q-verdict ${isOk ? 'correct' : 'wrong'}">
                        ${isOk ? '<i class="fa-solid fa-check"></i> Correct' : '<i class="fa-solid fa-xmark"></i> Wrong'}
                    </span>
                </div>
                ${!isOk && showCorrect ? `<div class="rv-fitb-row"><span class="rv-fitb-correct"><i class="fa-solid fa-chevron-right"></i> ${correct}</span></div>` : ''}
            </div>`;
        });
        div.innerHTML = html;
        qCol.appendChild(div);

    } else if (part.type === 'heading-match') {
        const div = document.createElement('div');
        div.className = 'rv-group';
        let html = '';
        (part.paragraphs || []).forEach(para => {
            const userAns = attempt.user_answers[para.id] || '';
            const correct = part.answers?.[para.id] || '';
            const isOk    = userAns.toUpperCase() === correct.toUpperCase();
            const headingText = (part.headings || []).find(h => h.key === userAns)?.text || '';
            html += `
            <div class="rv-q-block ${isOk ? 'ok' : 'err'}">
                <div class="rv-q-header">
                    <span class="rv-q-num">${para.number}</span>
                    <span class="rv-q-text">${para.label || ''}</span>
                    <span class="rv-user-sel ${isOk ? 'correct' : 'wrong'}">${userAns || '—'} ${headingText ? '— ' + headingText : ''}</span>
                    <span class="rv-q-verdict ${isOk ? 'correct' : 'wrong'}">
                        ${isOk ? '<i class="fa-solid fa-check"></i> Correct' : '<i class="fa-solid fa-xmark"></i> Wrong'}
                    </span>
                </div>
                ${!isOk && showCorrect ? `<div class="rv-fitb-row"><span class="rv-fitb-correct"><i class="fa-solid fa-chevron-right"></i> ${correct}</span></div>` : ''}
            </div>`;
        });
        div.innerHTML = html;
        qCol.appendChild(div);

    } else {
        // Default FITB passage
        const div = document.createElement('div');
        div.className = 'rv-group';
        let html = '';
        (part.passage || []).filter(p => p.type === 'input').forEach(item => {
            const userAns = attempt.user_answers[item.id] || '';
            const correct = item.correctAnswer || '';
            const isOk    = userAns.toLowerCase().trim() === correct.toLowerCase().trim();
            html += `
            <div class="rv-q-block ${isOk ? 'ok' : 'err'}">
                <div class="rv-q-header">
                    <span class="rv-q-num">${item.number}</span>
                    <span class="rv-q-text">Question ${item.number}</span>
                    <span class="rv-q-verdict ${isOk ? 'correct' : 'wrong'}">
                        ${isOk ? '<i class="fa-solid fa-check"></i> Correct' : '<i class="fa-solid fa-xmark"></i> Wrong'}
                    </span>
                </div>
                <div class="rv-fitb-row">
                    <span class="rv-fitb-label">Your answer:</span>
                    <span class="rv-fitb-val ${isOk ? 'correct' : 'wrong'}">${userAns || '—'}</span>
                    ${!isOk && showCorrect
                        ? `<span class="rv-fitb-correct"><i class="fa-solid fa-chevron-right"></i> ${correct}</span>`
                        : ''}
                </div>
            </div>`;
        });
        div.innerHTML = html;
        qCol.appendChild(div);
    }

    // Part nav
    const nav = document.getElementById('rvPartNav');
    nav.innerHTML = testData.parts.map((p, i) => `
        <button class="rv-part-btn ${i === currentPart ? 'active' : ''}" onclick="renderPart(${i})">
            Part ${p.part_number}
        </button>`
    ).join('');
}

// ── Show Correct toggle ──
function toggleShowCorrect(val) {
    showCorrect = val;
    renderPart(currentPart);
}

function redoTest() {
    if (window._testId) {
        window.location.href = `../../test-app/public/index.html?id=${window._testId}&token=${localStorage.getItem('cp_token')}`;
    }
}

// ── Main: yuklab render qilish ──
async function init() {
    const token     = localStorage.getItem('cp_token');
    const attemptId = getAttemptId();

    if (!token || !attemptId) {
        window.location.href = 'auth.html';
        return;
    }

    try {
        // 1) Attempt ma'lumotlarini olish
        const aRes = await fetch(`${API_URL}/attempts/${attemptId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!aRes.ok) throw new Error('Attempt topilmadi');
        attempt = await aRes.json();
        window._testId = attempt.test_id;

        // 2) Test JSON ni olish (part ma'lumotlari uchun)
        const tRes = await fetch(`${API_URL}/admin/tests/${attempt.test_id}/json-data`);
        if (!tRes.ok) throw new Error('Test JSON topilmadi');
        testData = await tRes.json();

        // 3) Header
        document.getElementById('rvTestName').textContent = attempt.test_name || testData.title || 'Test';

        // 4) Render
        document.getElementById('rvLoading').style.display = 'none';
        document.getElementById('rvContent').style.display = 'block';
        renderPart(0);

    } catch (err) {
        console.error(err);
        document.getElementById('rvLoading').innerHTML = `
            <p style="color:#dc2626">
                <i class="fa-solid fa-circle-exclamation"></i> ${err.message}
            </p>`;
    }
}

init();