// Toast notification
function showToast(message, type = 'success') {
    // Eski toastni o'chirish
    const existing = document.getElementById('cp-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'cp-toast';
    toast.className = `cp-toast cp-toast-${type}`;
    toast.innerHTML = `
        <div class="cp-toast-icon">
            <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
        </div>
        <span class="cp-toast-msg">${message}</span>
        <button class="cp-toast-close" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    document.body.appendChild(toast);

    // Avtomatik yo'qolish
    setTimeout(() => {
        toast.classList.add('cp-toast-hide');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}