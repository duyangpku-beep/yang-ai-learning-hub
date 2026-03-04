/* ============================================================
   Yang's AI Learning Hub — main.js
   - Tab switching (Resources section)
   - Smooth scroll for nav links
   - Mobile hamburger menu
   - Scroll-spy for active nav link
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ----------------------------------------------------------
     TAB SWITCHING
  ---------------------------------------------------------- */
  const tabBtns  = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      // Update button states
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Show matching panel
      tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${target}`);
      });
    });
  });


  /* ----------------------------------------------------------
     MOBILE HAMBURGER MENU
  ---------------------------------------------------------- */
  const hamburger = document.getElementById('nav-hamburger');
  const mobileNav = document.getElementById('nav-mobile');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);

      // Animate bars → X
      const bars = hamburger.querySelectorAll('span');
      if (isOpen) {
        bars[0].style.transform = 'translateY(7px) rotate(45deg)';
        bars[1].style.opacity   = '0';
        bars[2].style.transform = 'translateY(-7px) rotate(-45deg)';
      } else {
        bars[0].style.transform = '';
        bars[1].style.opacity   = '';
        bars[2].style.transform = '';
      }
    });

    // Close menu on link click
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        const bars = hamburger.querySelectorAll('span');
        bars[0].style.transform = '';
        bars[1].style.opacity   = '';
        bars[2].style.transform = '';
      });
    });
  }


  /* ----------------------------------------------------------
     SMOOTH SCROLL — nav links
  ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();

      const navHeight = document.querySelector('nav')?.offsetHeight ?? 64;
      const top = target.getBoundingClientRect().top + window.scrollY - navHeight;

      window.scrollTo({ top, behavior: 'smooth' });
    });
  });


  /* ----------------------------------------------------------
     SCROLL-SPY — highlight active section in nav
  ---------------------------------------------------------- */
  const sections  = document.querySelectorAll('section[id], div[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  const updateSpy = () => {
    const navH = document.querySelector('nav')?.offsetHeight ?? 64;
    const scrollY = window.scrollY + navH + 16;

    let current = '';
    sections.forEach(sec => {
      if (sec.offsetTop <= scrollY) {
        current = sec.id;
      }
    });

    navAnchors.forEach(a => {
      a.classList.toggle('scroll-active', a.getAttribute('href') === `#${current}`);
    });
  };

  window.addEventListener('scroll', updateSpy, { passive: true });
  updateSpy();


  /* ----------------------------------------------------------
     NOTION CMS — JOURNAL FEED
     Replaces .journal-feed content with Notion-backed entries.
     Silent-fail: static fallback stays if fetch fails.
  ---------------------------------------------------------- */
  (async () => {
    try {
      const res   = await fetch('/api/journal');
      if (!res.ok) return;
      const posts = await res.json();
      if (!posts.length) return;

      const feed = document.querySelector('.journal-feed');
      if (!feed) return;

      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      function fmtDate(iso) {
        if (!iso) return '';
        const [y, m, d] = iso.split('-').map(Number);
        return `${months[m - 1]} ${d}, ${y}`;
      }

      feed.innerHTML = posts.map(p => `
        <article class="journal-entry">
          <div class="journal-meta">
            ${p.issue != null ? `<span class="journal-issue">Issue #${p.issue}</span>` : ''}
            ${p.date ? `<time class="journal-date" datetime="${p.date}">${fmtDate(p.date)}</time>` : ''}
          </div>
          <div class="journal-body">
            <h3 class="journal-title">
              <a href="/post.html?id=${encodeURIComponent(p.id)}">${p.title}</a>
            </h3>
            ${p.excerpt ? `<p class="journal-excerpt">${p.excerpt}</p>` : ''}
            <a href="/post.html?id=${encodeURIComponent(p.id)}" class="journal-read-more">Read &rarr;</a>
          </div>
        </article>
      `).join('');
    } catch (_) { /* silent fail — static fallback stays */ }
  })();


  /* ----------------------------------------------------------
     NOTION CMS — RESOURCES
     Replaces each tab panel's .card-grid with Notion cards.
     Silent-fail: static fallback stays if fetch fails.
  ---------------------------------------------------------- */
  (async () => {
    try {
      const res       = await fetch('/api/resources');
      if (!res.ok) return;
      const resources = await res.json();
      if (!resources.length) return;

      // Map Notion category name → tab panel ID
      const tabMap = {
        'Videos':    'tab-videos',
        'Podcasts':  'tab-podcasts',
        'X Accounts':'tab-xaccounts',
        'Articles':  'tab-articles',
      };

      // Group by category
      const grouped = {};
      resources.forEach(r => {
        const panelId = tabMap[r.category];
        if (!panelId) return;
        if (!grouped[panelId]) grouped[panelId] = [];
        grouped[panelId].push(r);
      });

      Object.entries(grouped).forEach(([panelId, items]) => {
        const grid = document.querySelector(`#${panelId} .card-grid`);
        if (!grid) return;

        grid.innerHTML = items.map(r => `
          <article class="card">
            <div class="card-icon" aria-hidden="true">${r.icon || ''}</div>
            <h3 class="card-title">${r.name}</h3>
            <p class="card-meta">${r.platform}</p>
            <div class="card-footer">
              <a href="${r.url}" target="_blank" rel="noopener" class="btn btn-ghost">Visit &rarr;</a>
            </div>
          </article>
        `).join('');
      });
    } catch (_) { /* silent fail — static fallback stays */ }
  })();


  /* ----------------------------------------------------------
     NOTION CMS — WORKS
     Replaces #works .card-grid with Notion project cards.
     Silent-fail: static fallback stays if fetch fails.
  ---------------------------------------------------------- */
  (async () => {
    try {
      const res   = await fetch('/api/works');
      if (!res.ok) return;
      const works = await res.json();
      if (!works.length) return;

      const grid = document.querySelector('#works .card-grid');
      if (!grid) return;

      grid.innerHTML = works.map(w => `
        <article class="work-card">
          <h3 class="work-title">${w.name}</h3>
          <p class="work-desc">${w.description}</p>
          <div class="work-tags">
            ${w.tags.map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
          <div class="card-footer">
            <a href="${w.githubUrl}" target="_blank" rel="noopener" class="btn btn-primary">GitHub &rarr;</a>
          </div>
        </article>
      `).join('');
    } catch (_) { /* silent fail — static fallback stays */ }
  })();

});
