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
const avatarPreviewWrap = document.getElementById('profile-image-preview-wrap');
const bannerPreview = document.getElementById('profile-banner-preview');
const bannerPlaceholder = document.getElementById('profile-banner-placeholder');
const bannerPreviewWrap = document.getElementById('profile-banner-preview-wrap');
const removeBanner = document.getElementById('remove-profile-banner');
const cropModal = document.getElementById('profile-crop-modal');
const titleSelect = document.getElementById('collector-title-select');
const achievementGrid = document.getElementById('achievement-grid');
const extrasStatus = document.getElementById('profile-extras-status');

const CROP_MODES = {
    avatar: {
        canvasWidth: 480,
        canvasHeight: 480,
        maxSourceBytes: 8388608,
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
        canvasWidth: 1500,
        canvasHeight: 500,
        maxSourceBytes: 12582912,
        heading: 'Adjust Your Profile Banner',
        description: 'Drag and zoom until the image fills this 3:1 banner frame — the same shape used on your public profile.',
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
let cropModalController = null;

const ctx = canvas?.getContext('2d', { alpha: false });

function cssUrl(url) {
    return `url(${JSON.stringify(String(url))})`;
}

function status(message, type = '') {
    if (!extrasStatus) return;
    extrasStatus.textContent = message;
    extrasStatus.className = `profile-extras-status ${type}`;
}

function setAvatarPreview(url) {
    const avatarUrl = url || '';

    if (avatarUrl) {
        if (preview) {
            preview.src = avatarUrl;
            preview.classList.remove('hidden');
        }
        placeholder?.classList.add('hidden');
        if (avatarPreviewWrap) {
            avatarPreviewWrap.style.backgroundImage = cssUrl(avatarUrl);
        }
    } else {
        preview?.removeAttribute('src');
        preview?.classList.add('hidden');
        placeholder?.classList.remove('hidden');
        if (avatarPreviewWrap) {
            avatarPreviewWrap.style.backgroundImage = '';
        }
    }
}

function setBannerPreview(url) {
    const bannerUrl = url || '';

    if (bannerUrl) {
        if (bannerPreview) {
            bannerPreview.src = bannerUrl;
            bannerPreview.classList.remove('hidden');
        }
        bannerPlaceholder?.classList.add('hidden');
        bannerPreviewWrap?.classList.add('has-photo');
        if (bannerPreviewWrap) {
            bannerPreviewWrap.style.backgroundImage = cssUrl(bannerUrl);
        }
        removeBanner?.classList.remove('hidden');
    } else {
        bannerPreview?.removeAttribute('src');
        bannerPreview?.classList.add('hidden');
        bannerPlaceholder?.classList.remove('hidden');
        bannerPreviewWrap?.classList.remove('has-photo');
        if (bannerPreviewWrap) {
            bannerPreviewWrap.style.backgroundImage = '';
        }
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

function coverMetrics() {
    if (!image || !canvas) return null;
    const baseScale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const finalScale = baseScale * scale;
    const width = image.width * finalScale;
    const height = image.height * finalScale;
    return { width, height, finalScale };
}

function clampOffsets() {
    const metrics = coverMetrics();
    if (!metrics || !canvas) return;
    const maxX = Math.max(0, (metrics.width - canvas.width) / 2);
    const maxY = Math.max(0, (metrics.height - canvas.height) / 2);
    offsetX = Math.min(maxX, Math.max(-maxX, offsetX));
    offsetY = Math.min(maxY, Math.max(-maxY, offsetY));
}

function draw() {
    if (!ctx || !image || !canvas) return;

    clampOffsets();
    ctx.fillStyle = '#0f1a33';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const metrics = coverMetrics();
    if (!metrics) return;

    ctx.drawImage(
        image,
        (canvas.width - metrics.width) / 2 + offsetX,
        (canvas.height - metrics.height) / 2 + offsetY,
        metrics.width,
        metrics.height
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

function whenStarlightUI(callback) {
    if (window.StarlightUI?.adoptModal) {
        callback(window.StarlightUI);
        return;
    }

    const started = Date.now();
    const timer = window.setInterval(() => {
        if (window.StarlightUI?.adoptModal) {
            window.clearInterval(timer);
            callback(window.StarlightUI);
            return;
        }
        if (Date.now() - started > 8000) {
            window.clearInterval(timer);
            status('Profile image tools failed to load. Refresh the page and try again.', 'error');
        }
    }, 25);
}

function openCropModal() {
    if (!cropModalController) {
        status('Profile image editor is still loading…', 'error');
        return;
    }
    cropModalController.open({ initialFocus: zoom || saveImage });
    // Re-draw after layout so the canvas bitmap is visible in the opened dialog.
    window.requestAnimationFrame(() => {
        draw();
        window.requestAnimationFrame(draw);
    });
}

function closeCropModal({ clearFile = true } = {}) {
    clearFileOnClose = clearFile;
    cropModalController?.close(undefined, 'page');
}

function canvasToBlob(quality) {
    return new Promise((resolve, reject) => {
        if (!canvas) {
            reject(new Error('Crop canvas is missing.'));
            return;
        }
        canvas.toBlob(blob => {
            if (!blob) {
                reject(new Error('Could not prepare the image.'));
                return;
            }
            resolve(blob);
        }, 'image/webp', quality);
    });
}

async function exportCroppedBlob() {
    const qualities = [0.86, 0.74, 0.62, 0.5];
    const maxBytes = cropMode === 'banner' ? 2097152 : 1048576;
    let lastBlob = null;

    for (const quality of qualities) {
        lastBlob = await canvasToBlob(quality);
        if (lastBlob.size <= maxBytes) return lastBlob;
    }

    throw new Error(
        `The finished image is still too large (${Math.ceil((lastBlob?.size || 0) / 1024)} KB). Try a simpler photo or zoom out slightly.`
    );
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
        resetCropState(true);
    };

    selectedImage.src = objectUrl;
}

whenStarlightUI(ui => {
    if (!cropModal) return;

    cropModalController = ui.adoptModal(cropModal, {
        dialog: cropModal.querySelector('.st-dialog'),
        labelledBy: 'profile-crop-heading',
        describedBy: 'profile-crop-description',
        initialFocus: saveImage,
        onOpen: () => {
            draw();
        },
        onClose: ({ reason }) => {
            const cancelled = modeConfig().cancelled;
            resetCropState(clearFileOnClose);
            clearFileOnClose = true;
            if (reason === 'escape' || reason === 'backdrop') status(cancelled);
            applyCropMode('avatar');
        }
    });
});

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

cropStage?.addEventListener('wheel', event => {
    if (!image || !zoom) return;
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    const next = Math.min(3, Math.max(1, scale + delta));
    scale = Number(next.toFixed(2));
    zoom.value = String(scale);
    updateZoomLabel();
    draw();
}, { passive: false });

canvas?.addEventListener('pointerdown', event => {
    if (!image) return;
    event.preventDefault();
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
canvas?.addEventListener('pointerleave', event => {
    if (dragging) endDrag(event);
});

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

    try {
        draw();
        const blob = await exportCroppedBlob();
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

        if (titleSelect) {
            titleSelect.innerHTML =
                '<option value="">No collector title</option>' +
                (data.titles || [])
                    .map(title => `<option value="${title.id}">${title.name}</option>`)
                    .join('');

            titleSelect.value = data.selectedTitleId || '';
        }

        if (achievementGrid) {
            achievementGrid.innerHTML = data.achievements?.length
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
        }
    } catch (error) {
        status(error.message || 'Could not load profile extras.', 'error');
    }
})();
