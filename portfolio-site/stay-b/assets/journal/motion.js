// Keep content readable when JavaScript or motion effects are unavailable.
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const photosAndHeadings = document.querySelectorAll('main .sec-head, main .j-photo');
  const links = [...document.querySelectorAll('.ed-nav a[href^="#"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  let frame = 0;
  let observer;
  function update() {
    frame = 0;
    const distance = root.scrollHeight - root.clientHeight;
    const progress = distance ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
    root.style.setProperty('--reading', String(progress));
    const y = document.querySelector('.ed-header').getBoundingClientRect().bottom + 45;
    links.forEach((link, i) => {
      const box = sections[i]?.getBoundingClientRect();
      if (box && box.top <= y && box.bottom > y) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
  }
  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }
  function watchSections() {
    observer?.disconnect();
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('j-enter');
        observer.unobserve(entry.target);
      });
    });
    photosAndHeadings.forEach(el => observer.observe(el));
  }
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', schedule);
  document.addEventListener('toggle', schedule, true);
  if (reduced.addEventListener) reduced.addEventListener('change', watchSections);
  watchSections();
  schedule();
})();

(() => {
  function openService(hash) {
    if (!hash.startsWith('#off-')) return;
    const details = document.getElementById(hash.slice(1))?.querySelector('.j-service');
    if (details) details.open = true;
  }
  window.addEventListener('hashchange', () => openService(location.hash));
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#off-"]');
    if (link) openService(link.hash);
  });
  openService(location.hash);
})();
