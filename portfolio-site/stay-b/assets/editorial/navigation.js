// The existing StayB script owns language, guide routing and the mobile menu.
(() => {
  const language = document.getElementById('ed-language');
  const menuButton = document.getElementById('menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (!language || !menuButton || !mobileNav) return;
  const summary = language.querySelector('summary');
  function closeLanguage(returnFocus) {
    if (!language.open) return;
    language.open = false;
    if (returnFocus) summary.focus();
  }
  language.addEventListener('click', event => {
    if (event.target.closest('[data-edition]')) closeLanguage(true);
    if (event.target.closest('summary') && !mobileNav.hidden) menuButton.click();
  });
  document.addEventListener('click', event => {
    if (!language.contains(event.target)) closeLanguage(false);
  });
  document.addEventListener('focusin', event => {
    if (!language.contains(event.target)) closeLanguage(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeLanguage(true);
  });
  window.matchMedia('(min-width: 960px)').addEventListener('change', event => {
    if (event.matches && !mobileNav.hidden) menuButton.click();
  });
})();
