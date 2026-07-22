function slugify(value) {
  return String(value || 'starlight-card')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'starlight-card';
}

export function cardShareUrl(card) {
  const id = card?.id || '';
  const url = new URL('binder.html', location.href);
  url.searchParams.set('view', 'binder');
  if (id) url.searchParams.set('card', id);
  return url.href;
}

export async function shareOwnedCard(card, { toast } = {}) {
  const name = card?.name || 'Starlight Card';
  const series = card?.series || card?.seriesName || 'Starlight Card Binder';
  const url = cardShareUrl(card);
  const text = `Look at my ${name} from ${series}!`;
  const notify = (message, type = 'success') => {
    (toast || window.StarlightUI?.toast)?.(message, type);
  };

  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: name, text, url });
      return 'shared';
    } catch (error) {
      if (error?.name === 'AbortError') return 'aborted';
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    notify('Share text copied to clipboard.');
    return 'copied';
  } catch {
    notify('Could not share this card.', 'error');
    return 'failed';
  }
}

async function blobFromImageUrl(imageUrl) {
  const response = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) throw new Error('Could not fetch card artwork.');
  return response.blob();
}

async function blobFromCanvas(img) {
  const canvas = document.createElement('canvas');
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (!width || !height) throw new Error('Card artwork is not ready yet.');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not export card artwork.'));
    }, 'image/png');
  });
}

export async function downloadOwnedCardImage(card, imgEl, { toast } = {}) {
  const notify = (message, type = 'success') => {
    (toast || window.StarlightUI?.toast)?.(message, type);
  };
  const imageUrl = imgEl?.currentSrc || imgEl?.src || card?.imageUrl || card?.thumbnailUrl;
  if (!imageUrl) {
    notify('No card artwork to download.', 'error');
    return false;
  }

  try {
    let blob;
    try {
      blob = await blobFromImageUrl(imageUrl);
    } catch {
      if (imgEl instanceof HTMLImageElement) blob = await blobFromCanvas(imgEl);
      else throw new Error('Artwork is blocked for download.');
    }
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = `${slugify(card?.name || card?.id)}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    notify('Card image downloaded.');
    return true;
  } catch (error) {
    notify(error.message || 'Could not download card artwork.', 'error');
    return false;
  }
}
