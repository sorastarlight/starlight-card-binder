import { getMyProfileExtras, setMyProfileExtras, uploadProfileImage } from './profile-extras-service.js';

const fileInput = document.getElementById('profile-image-file');
const canvas = document.getElementById('profile-image-canvas');
const zoom = document.getElementById('profile-image-zoom');
const zoomValue = document.getElementById('profile-image-zoom-value');
const saveImage = document.getElementById('save-profile-image');
const cancelImage = document.getElementById('cancel-profile-image');
const preview = document.getElementById('profile-image-preview');
const placeholder = document.getElementById('profile-image-placeholder');
const cropModal = document.getElementById('profile-crop-modal');
const titleSelect = document.getElementById('collector-title-select');
const achievementGrid = document.getElementById('achievement-grid');
const extrasStatus = document.getElementById('profile-extras-status');

let image = null;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let dragging = false;
let lastX = 0;
let lastY = 0;
let currentAvatar = '';
let objectUrl = '';
let clearFileOnClose = true;

const ctx = canvas?.getContext('2d');

function status(message, type = '') {
    if (!extrasStatus) return;
    extrasStatus.textContent = message;
    extrasStatus.className = `profile-extras-status ${type}`;
}

function setPreview(url) {
    currentAvatar = url || '';

    if (currentAvatar) {
        preview.src = currentAvatar;
        preview.classList.remove('hidden');
        placeholder?.classList.add('hidden');
    } else {
        preview.removeAttribute('src');
        preview.classList.add('hidden');
        placeholder?.classList.remove('hidden');
    }
}

function draw() {
    if (!ctx || !image || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const baseScale = Math.max(
        canvas.width / image.width,
        canvas.height / image.height
    );

    const finalScale = baseScale * scale;
    const width = image.width * finalScale;
    const height = image.height * finalScale;

    ctx.drawImage(
        image,
        (canvas.width - width) / 2 + offsetX,
        (canvas.height - height) / 2 + offsetY,
        width,
        height
    );
}

function updateZoomLabel() {
    if (zoomValue) {
        zoomValue.textContent = `${Math.round(scale * 100)}%`;
    }
}

function resetCropState(clearFile = true) {
    image = null;
    dragging = false;
    scale = 1;
    offsetX = 0;
    offsetY = 0;

    if (zoom) zoom.value = '1';
    updateZoomLabel();

    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = '';
    }

    if (clearFile && fileInput) {
        fileInput.value = '';
    }
}

const cropModalController = cropModal ? window.StarlightUI.adoptModal(cropModal, {
    dialog: cropModal.querySelector('.st-dialog'),
    labelledBy: 'profile-crop-heading',
    describedBy: 'profile-crop-description',
    initialFocus: saveImage,
    onClose: ({ reason }) => {
        resetCropState(clearFileOnClose);
        clearFileOnClose = true;
        if (reason === 'escape' || reason === 'backdrop') status('Profile image change cancelled.');
    }
}) : null;

function openCropModal() {
    cropModalController?.open({ initialFocus: saveImage });
}

function closeCropModal({ clearFile = true } = {}) {
    clearFileOnClose = clearFile;
    cropModalController?.close(undefined, 'page');
}

fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (file.size > 1048576) {
        status('Please choose an image that is 1 MB or smaller.', 'error');
        fileInput.value = '';
        return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        status('Please choose a PNG, JPG, or WebP image.', 'error');
        fileInput.value = '';
        return;
    }

    if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
    }

    objectUrl = URL.createObjectURL(file);

    const selectedImage = new Image();

    selectedImage.onload = () => {
        image = selectedImage;
        scale = 1;
        offsetX = 0;
        offsetY = 0;

        if (zoom) zoom.value = '1';
        updateZoomLabel();
        draw();
        status('Adjust your image in the popup, then save.', 'success');
        openCropModal();
    };

    selectedImage.onerror = () => {
        status('That image could not be opened.', 'error');
        closeCropModal();
    };

    selectedImage.src = objectUrl;
});

zoom?.addEventListener('input', () => {
    scale = Number(zoom.value) || 1;
    updateZoomLabel();
    draw();
});

canvas?.addEventListener('pointerdown', event => {
    if (!image) return;

    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture?.(event.pointerId);
});

canvas?.addEventListener('pointermove', event => {
    if (!dragging) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);

    offsetX += (event.clientX - lastX) * scaleX;
    offsetY += (event.clientY - lastY) * scaleY;

    lastX = event.clientX;
    lastY = event.clientY;

    draw();
});

function endDrag(event) {
    dragging = false;
    if (event?.pointerId !== undefined) {
        canvas?.releasePointerCapture?.(event.pointerId);
    }
}

canvas?.addEventListener('pointerup', endDrag);
canvas?.addEventListener('pointercancel', endDrag);

cancelImage?.addEventListener('click', () => {
    closeCropModal();
    status('Profile image change cancelled.');
});

saveImage?.addEventListener('click', async () => {
    if (!image || !canvas) return;

    saveImage.disabled = true;
    saveImage.textContent = 'Saving…';
    status('Uploading your profile image…');

    canvas.toBlob(async blob => {
        try {
            if (!blob) {
                throw new Error('Could not prepare the image.');
            }

            const url = await uploadProfileImage(blob);
            setPreview(url);
            closeCropModal({ clearFile: true });
            status('Profile image saved!', 'success');
        } catch (error) {
            status(error.message || 'Upload failed.', 'error');
        } finally {
            saveImage.disabled = false;
            saveImage.textContent = 'Save Profile Image';
        }
    }, 'image/webp', 0.86);
});

titleSelect?.addEventListener('change', async () => {
    try {
        await setMyProfileExtras({
            avatarUrl: currentAvatar || null,
            titleId: titleSelect.value || null
        });

        status('Collector title updated.', 'success');
    } catch (error) {
        status(error.message || 'Could not update title.', 'error');
    }
});

(async () => {
    try {
        const data = await getMyProfileExtras();

        setPreview(data.avatarUrl || '');

        titleSelect.innerHTML =
            '<option value="">No collector title</option>' +
            data.titles
                .map(title => `<option value="${title.id}">${title.name}</option>`)
                .join('');

        titleSelect.value = data.selectedTitleId || '';

        achievementGrid.innerHTML = data.achievements.length
            ? data.achievements
                .map(achievement => `
                    <article class="achievement-badge">
                        <span>${achievement.icon}</span>
                        <div>
                            <strong>${achievement.name}</strong>
                            <small>${achievement.description}</small>
                        </div>
                    </article>
                `)
                .join('')
            : '<p class="profile-help">Open packs and grow your collection to unlock achievements.</p>';
    } catch (error) {
        status(error.message || 'Could not load profile extras.', 'error');
    }
})();
