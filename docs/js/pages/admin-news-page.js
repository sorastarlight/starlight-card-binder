import { listAdminNews, saveNews, deleteNews } from '../news-service.js';
import { uploadStudioAsset } from '../content-studio-service.js';
import { getMyStaffAccess } from '../staff-service.js';

const byId = id => document.getElementById(id);
const escapeHtml = window.StarlightUI.escapeHtml;
const editorElement = byId('editor');
const editorModal = window.StarlightUI.adoptModal(editorElement, {
  dialog: editorElement.querySelector('.st-dialog'),
  labelledBy: 'editorTitle',
  initialFocus: '#title'
});

let posts = [];
let editing = null;

function render() {
  byId('list').innerHTML = posts.length ? posts.map(post => `
    <article class="post">
      ${post.imageUrl ? `<img src="${escapeHtml(post.imageUrl)}" alt="">` : '<div></div>'}
      <div>
        <small>${post.isPublished ? 'Published' : 'Draft'}${post.isPinned ? ' • Pinned' : ''}</small>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.summary || post.body || '')}</p>
      </div>
      <button class="btn" type="button" data-edit="${post.id}">Edit</button>
    </article>`).join('') : '<p class="lead">No news posts yet.</p>';
}

async function load() {
  try {
    const access = await getMyStaffAccess();
    if (!access.isStaff) throw new Error('Administration access is required.');
    posts = await listAdminNews();
    byId('status').textContent = '';
    render();
  } catch (error) {
    byId('status').textContent = error.message;
  }
}

function openEditor(post = null) {
  editing = post;
  byId('editorTitle').textContent = post ? 'Edit Update' : 'New Update';
  byId('title').value = post?.title || '';
  byId('summary').value = post?.summary || '';
  byId('body').value = post?.body || '';
  byId('imageUrl').value = post?.imageUrl || '';
  byId('published').checked = post?.isPublished ?? true;
  byId('pinned').checked = Boolean(post?.isPinned);
  byId('publishedAt').value = post?.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
  byId('delete').hidden = !post;
  byId('preview').hidden = !post?.imageUrl;
  if (post?.imageUrl) byId('preview').src = post.imageUrl;
  byId('editorStatus').textContent = '';
  editorModal.open({ initialFocus: '#title' });
}

byId('newPost').addEventListener('click', () => openEditor());
byId('close').addEventListener('click', () => editorModal.close(undefined, 'page'));
byId('list').addEventListener('click', event => {
  const id = event.target.closest('[data-edit]')?.dataset.edit;
  if (id) openEditor(posts.find(post => String(post.id) === String(id)));
});

byId('imageFile').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    byId('editorStatus').textContent = 'Uploading image…';
    const upload = await uploadStudioAsset(file, 'news');
    byId('imageUrl').value = upload.url;
    byId('preview').src = upload.url;
    byId('preview').hidden = false;
    byId('editorStatus').textContent = 'Image uploaded.';
  } catch (error) {
    byId('editorStatus').textContent = error.message;
  }
});

byId('save').addEventListener('click', async () => {
  try {
    byId('editorStatus').textContent = 'Saving…';
    await saveNews({
      id: editing?.id || null,
      title: byId('title').value.trim(),
      summary: byId('summary').value.trim(),
      body: byId('body').value.trim(),
      imageUrl: byId('imageUrl').value.trim(),
      publishedAt: new Date(byId('publishedAt').value).toISOString(),
      isPublished: byId('published').checked,
      isPinned: byId('pinned').checked
    });
    editorModal.close(undefined, 'saved');
    await load();
  } catch (error) {
    byId('editorStatus').textContent = error.message;
  }
});

byId('delete').addEventListener('click', async () => {
  if (!editing || !(await window.StarlightUI.confirm({
    title: 'Delete this news update?',
    message: 'This removes the update from the Home page and cannot be undone.',
    confirmText: 'Delete Update',
    danger: true
  }))) return;
  try {
    await deleteNews(editing.id);
    editorModal.close(undefined, 'deleted');
    await load();
  } catch (error) {
    byId('editorStatus').textContent = error.message;
  }
});

load();
