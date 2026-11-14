// Still images change only when a visitor selects another scene.
(() => {
  const hero = document.querySelector('.scene-hero');
  if (!hero) return;
  const picker = hero.querySelector('.scene-picker');
  const picture = hero.querySelector('picture');
  const image = picture.querySelector('img');
  const mobile = picture.querySelector('source');
  const folder = new URL('.', image.src);
  const buttons = [...picker.querySelectorAll('button')];
  const korean = document.documentElement.lang === 'ko';
  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      const key = button.dataset.key;
      mobile.srcset = new URL(key + '-detail.webp', folder).href;
      image.src = new URL(key + '-wide.webp', folder).href;
      image.alt = korean ? button.dataset.altKo : button.dataset.altEn;
      for (const choice of buttons) choice.setAttribute('aria-pressed', String(choice === button));
    });
  }
  picker.hidden = false;
})();
