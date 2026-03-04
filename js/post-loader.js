/* ============================================================
   post-loader.js
   Reads ?id= from URL, fetches /api/post?id=…, and injects
   the full post content into #post-content.
   ============================================================ */

(async () => {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');
  const wrap   = document.getElementById('post-content');

  if (!id) {
    renderError(wrap, 'No post ID found in URL.');
    return;
  }

  let post;
  try {
    const res = await fetch(`/api/post?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    post = await res.json();
  } catch (err) {
    renderError(wrap, 'Could not load post. Please try again later.');
    return;
  }

  // Update <title> and meta description
  document.title = `${post.title} — Yang's AI Learning Hub`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc && post.excerpt) metaDesc.setAttribute('content', post.excerpt);

  // Format date for display
  const dateDisplay = post.date ? formatDate(post.date) : '';
  const dateAttr    = post.date ?? '';

  wrap.innerHTML = `
    <header class="post-header">
      <div class="post-kicker">
        ${post.issue != null ? `<span class="journal-issue">Issue #${post.issue}</span>` : ''}
        ${dateAttr ? `<time class="journal-date" datetime="${escHtml(dateAttr)}">${escHtml(dateDisplay)}</time>` : ''}
      </div>
      <h1 class="post-title">${escHtml(post.title)}</h1>
      ${post.excerpt ? `<p class="post-subtitle">${escHtml(post.excerpt)}</p>` : ''}
    </header>

    <div class="post-body">
      ${post.bodyHtml}
    </div>

    <footer class="post-footer">
      <a href="index.html#journal" class="btn btn-ghost">&larr; Back to Journal</a>
    </footer>
  `;
})();

/* ---------------------------------------------------------------
   Helpers
--------------------------------------------------------------- */
function renderError(wrap, message) {
  wrap.innerHTML = `
    <div style="text-align:center; padding: 4rem 0;">
      <p style="color: var(--muted); margin-bottom: 1.5rem;">${escHtml(message)}</p>
      <a href="index.html#journal" class="btn btn-ghost">&larr; Back to Journal</a>
    </div>
  `;
}

function formatDate(isoStr) {
  // e.g. "2026-02-05" → "Feb 5, 2026"
  const [year, month, day] = isoStr.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
