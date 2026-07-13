import { getMyStaffAccess } from './staff-service.js';

async function addStaffToolsLink() {
    try {
        const access = await getMyStaffAccess();
        if (!access?.isStaff) return;

        const target = document.querySelector('.profile-actions') ||
            document.querySelector('.collector-nav-links') ||
            document.querySelector('.top-actions') ||
            document.querySelector('main');

        if (!target || document.getElementById('staff-tools-link')) return;

        const link = document.createElement('a');
        link.id = 'staff-tools-link';
        link.href = './admin-hub.html';
        link.textContent = '✦ Staff Tools';
        link.className = target.classList.contains('profile-actions')
            ? 'profile-link primary'
            : 'staff-tools-link';
        link.style.cssText = target.classList.contains('profile-actions')
            ? ''
            : 'display:inline-flex;align-items:center;justify-content:center;padding:10px 16px;border-radius:999px;background:linear-gradient(135deg,#6bc6f8,#ff82c8);color:white;font-weight:900;text-decoration:none;margin:8px;';

        target.appendChild(link);
    } catch (error) {
        console.warn('[Starlight] Staff link unavailable:', error);
    }
}

addStaffToolsLink();
