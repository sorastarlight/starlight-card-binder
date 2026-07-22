import { deleteCardComment, getCardComments, postCardComment } from './social-service.js';
import { supabase } from './supabase-client.js';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const delta = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export async function mountCardComments(host, cardId) {
  if (!host || !cardId) return;

  host.innerHTML = `<section class="card-comments" data-card-comments>
    <h3>💬 Card Comments</h3>
    <p class="card-comments-status" data-comments-status>Loading comments…</p>
    <div class="card-comments-list" data-comments-list></div>
    <form class="card-comments-form" data-comments-form>
      <label class="sr-only" for="card-comment-input-${esc(cardId)}">Add a comment</label>
      <textarea id="card-comment-input-${esc(cardId)}" data-comments-input maxlength="280" rows="2" placeholder="Share a memory about this card…"></textarea>
      <div class="card-comments-form-row">
        <span data-comments-count>0/280</span>
        <button type="submit" class="btn primary">Post</button>
      </div>
    </form>
  </section>`;

  const status = host.querySelector('[data-comments-status]');
  const list = host.querySelector('[data-comments-list]');
  const form = host.querySelector('[data-comments-form]');
  const input = host.querySelector('[data-comments-input]');
  const count = host.querySelector('[data-comments-count]');

  const { data: auth } = await supabase.auth.getUser();
  const signedIn = Boolean(auth?.user);
  if (!signedIn) {
    form.innerHTML = `<p class="card-comments-signin"><a href="login.html?mode=signin">Sign in</a> to join the conversation.</p>`;
  }

  async function refresh() {
    try {
      const data = await getCardComments(cardId, { limit: 30 });
      const comments = data?.comments || [];
      status.textContent = comments.length
        ? `${comments.length} comment${comments.length === 1 ? '' : 's'}`
        : 'No comments yet — start the thread.';
      list.innerHTML = comments.length
        ? comments.map((comment) => {
          const author = comment.author || {};
          const name = author.displayName || author.username || 'Collector';
          const profile = author.username
            ? `binder.html?view=collector&username=${encodeURIComponent(author.username)}`
            : '#';
          return `<article class="card-comment" data-comment-id="${esc(comment.id)}">
            <div class="card-comment-head">
              <a href="${profile}"><strong>${esc(name)}</strong></a>
              <span>${esc(relativeTime(comment.createdAt))}</span>
              ${comment.isOwn ? `<button type="button" class="card-comment-delete" data-delete-comment="${esc(comment.id)}">Delete</button>` : ''}
            </div>
            <p>${esc(comment.body)}</p>
          </article>`;
        }).join('')
        : '<p class="card-comments-empty">Be the first to leave a memory.</p>';
    } catch (error) {
      status.textContent = error.message || 'Could not load comments.';
      list.innerHTML = '';
    }
  }

  input?.addEventListener('input', () => {
    if (count) count.textContent = `${input.value.length}/280`;
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!signedIn || !input) return;
    const body = input.value.trim();
    if (!body) return;
    try {
      status.textContent = 'Posting…';
      await postCardComment(cardId, body);
      input.value = '';
      if (count) count.textContent = '0/280';
      await refresh();
    } catch (error) {
      status.textContent = error.message || 'Could not post comment.';
    }
  });

  list?.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-comment]');
    if (!button) return;
    const id = Number(button.dataset.deleteComment);
    if (!id) return;
    try {
      await deleteCardComment(id);
      await refresh();
    } catch (error) {
      status.textContent = error.message || 'Could not delete comment.';
    }
  });

  await refresh();
}
