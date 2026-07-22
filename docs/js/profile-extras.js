import {
    getMyProfileExtras,
    setMyProfileExtras,
    uploadProfileImage,
    uploadProfileBanner
} from './profile-extras-service.js';

const avatarFileInput = document.getElementById('profile-image-file');
const bannerFileInput = document.getElementById('profile-banner-file');
const canvas = document.getElementById('profile-image-canvas');
const cropStage = document.getElementById('profile-crop-stage');
const cropMask = document.getElementById('profile-crop-mask');
const cropHeading = document.getElementById('profile-crop-heading');
const cropDescription = document.getElementById('profile-crop-description');
const zoom = document.getElementById('profile-image-zoom');
const zoomValue = document.getElementById('profile-image-zoom-value');
const saveImage = document.getElementById('save-profile-image');
const cancelImage = document.getElementById('cancel-profile-image');
const preview = document.getElementById('profile-image-preview');
const placeholder = document.getElementById('profile-image-placeholder');
const bannerPreview = document.getElementById('profile-banner-preview');
const bannerPlaceholder = document.getElementById('profile-banner-placeholder');
const removeBanner = document.getElementById('remove-profile-banner');
const cropModal = document.getElementById('profile-crop-modal');
const titleSelect = document.getElementById('collector-title-select');
const achievementGrid = document.getElementById('achievement-grid');
const extrasStatus = document.getElementById('profile-extras-status');

const CROP_MODES = {
    avatar: {
        canvasWidth: 480,
        canvasHeight: 480,
        maxSourceBytes: 1048576,
        heading: 'Adjust Your Profile Image',
        description: 'Drag the image to reposition it, then use zoom until it looks just right inside the circle.',
        canvasLabel: 'Profile image crop editor',
        saveLabel: 'Save Profile Image',
        uploading: 'Uploading your profile image…',
        saved: 'Profile image saved!',
        cancelled: 'Profile image change cancelled.',
        upload: uploadProfileImage
    },
    banner: {
        canvasWidth: 1200,
        canvasHeight: 400,
        maxSourceBytes: 2097152,
        heading: 'Adjust Your Profile Banner',
        description: 'Drag the image to reposition it, then use zoom until it looks just right inside the banner frame.',
        canvasLabel: 'Profile banner crop editor',
        saveLabel: 'Save Profile Banner',
        uploading: 'Uploading your profile banner…',
        saved: 'Profile banner saved!',
        cancelled: 'Profile banner change cancelled.',
        upload: uploadProfileBanner
    }
};

let cropMode = 'avatar';
let image = null;
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let dragging = false;
let lastX = 0;
let lastY = 0;
let objectUrl = '';
let clearFileOnClose = true;
let activeFileInput = null;

const ctx = canvas?.getContext('2d');

function status(message, type = '') {
    if (!extrasStatus) return;
    extrasStatus.textContent = message;
    extrasStatus.className = `profile-extras-status ${type}`;
}

function setAvatarPreview(url) {
    const avatarUrl = url || '';

    if (avatarUrl) {
        preview.src = avatarUrl;
        preview.classList.remove('hidden');
        placeholder?.classList.add('hidden');
    } else {
        preview.removeAttribute('src');
        preview.classList.add('hidden');
        placeholder?.classList.remove('hidden');
    }
}

function setBannerPreview(url) {
    const bannerUrl = url || '';

    if (bannerUrl) {
        bannerPreview.src = bannerUrl;
        bannerPreview.classList.remove('hidden');
        bannerPlaceholder?.classList.add('hidden');
        removeBanner?.classList.remove('hidden');
    } else {
        bannerPreview?.removeAttribute('src');
        bannerPreview?.classList.add('hidden');
        bannerPlaceholder?.classList.remove('hidden');
        removeBanner?.classList.add('hidden');
    }
}

function modeConfig() {
    return CROP_MODES[cropMode] || CROP_MODES.avatar;
}

function applyCropMode(mode) {
    cropMode = mode === 'banner' ? 'banner' : 'avatar';
    const config = modeConfig();

    if (canvas) {
        canvas.width = config.canvasWidth;
        canvas.height = config.canvasHeight;
        canvas.setAttribute('aria-label', config.canvasLabel);
    }

    cropModal?.setAttribute('data-crop-mode', cropMode);
    cropStage?.classList.toggle('is-banner', cropMode === 'banner');
    cropMask?.classList.toggle('is-banner', cropMode === 'banner');

    if (cropHeading) cropHeading.textContent = config.heading;
    if (cropDescription) cropDescription.textContent = config.description;
    if (saveImage) saveImage.textContent = config.saveLabel;
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

    if (clearFile && activeFileInput) {
        activeFileInput.value = '';
    }

    activeFileInput = null;
}

const cropModalController = cropModal ? window.StarlightUI.adoptModal(cropModal, {
    dialog: cropModal.querySelector('.st-dialog'),
    labelledBy: 'profile-crop-heading',
    describedBy: 'profile-crop-description',
    initialFocus: saveImage,
    onClose: ({ reason }) => {
        const cancelled = modeConfig().cancelled;
        resetCropState(clearFileOnClose);
        clearFileOnClose = true;
        if (reason === 'escape' || reason === 'backdrop') status(cancelled);
        applyCropMode('avatar');
    }
}) : null;

function openCropModal() {
    cropModalController?.open({ initialFocus: saveImage });
}

function closeCropModal({ clearFile = true } = {}) {
    clearFileOnClose = clearFile;
    cropModalController?.close(undefined, 'page');
}

function handleFileSelection(fileInput, mode) {
    const file = fileInput.files?.[0];
    if (!file) return;

    applyCropMode(mode);
    const config = modeConfig();
    activeFileInput = fileInput;

    if (file.size > config.maxSourceBytes) {
        const mb = Math.round(config.maxSourceBytes / 1048576);
        status(`Please choose an image that is ${mb} MB or smaller.`, 'error');
        fileInput.value = '';
        activeFileInput = null;
        return;
    }

    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        status('Please choose a PNG, JPG, or WebP image.', 'error');
        fileInput.value = '';
        activeFileInput = null;
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
}

avatarFileInput?.addEventListener('change', () => {
    handleFileSelection(avatarFileInput, 'avatar');
});

bannerFileInput?.addEventListener('change', () => {
    handleFileSelection(bannerFileInput, 'banner');
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
    const cancelled = modeConfig().cancelled;
    closeCropModal();
    status(cancelled);
});

saveImage?.addEventListener('click', async () => {
    if (!image || !canvas) return;

    const config = modeConfig();

    saveImage.disabled = true;
    saveImage.textContent = 'Saving…';
    status(config.uploading);

    canvas.toBlob(async blob => {
        try {
            if (!blob) {
                throw new Error('Could not prepare the image.');
            }

            const url = await config.upload(blob);
            if (cropMode === 'banner') {
                setBannerPreview(url);
            } else {
                setAvatarPreview(url);
            }
            closeCropModal({ clearFile: true });
            status(config.saved, 'success');
        } catch (error) {
            status(error.message || 'Upload failed.', 'error');
        } finally {
            saveImage.disabled = false;
            saveImage.textContent = config.saveLabel;
        }
    }, 'image/webp', 0.86);
});

removeBanner?.addEventListener('click', async () => {
    removeBanner.disabled = true;
    status('Removing profile banner…');

    try {
        await setMyProfileExtras({ bannerUrl: '' });
        setBannerPreview('');
        status('Profile banner removed.', 'success');
    } catch (error) {
        status(error.message || 'Could not remove banner.', 'error');
    } finally {
        removeBanner.disabled = false;
    }
});

titleSelect?.addEventListener('change', async () => {
    try {
        await setMyProfileExtras({
            titleId: titleSelect.value || ''
        });

        status('Collector title updated.', 'success');
    } catch (error) {
        status(error.message || 'Could not update title.', 'error');
    }
});

applyCropMode('avatar');
setBannerPreview('');

(async () => {
    try {
        const data = await getMyProfileExtras();

        setAvatarPreview(data.avatarUrl || '');
        setBannerPreview(data.bannerUrl || '');

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
