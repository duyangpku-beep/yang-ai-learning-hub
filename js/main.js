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

});
