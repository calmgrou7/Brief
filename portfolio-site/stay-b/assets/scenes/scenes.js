// Enhance the original pictures only when a visitor can play the matching film.
(() => {
  const hero = document.querySelector('.scene-hero');
  if (!hero) return;
  const picture = hero.querySelector('#scene-picture');
  const image = picture.querySelector('img');
  const mobile = picture.querySelector('source');
  const folder = new URL('.', image.src);
  const korean = document.documentElement.lang === 'ko';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function setupFilm(video) {
    const frame = video.parentElement;
    const toggle = frame.querySelector('.scene-playback');
    const autoPlay = () => !motion.matches && !navigator.connection?.saveData;
    let wantsPlayback = autoPlay();
    let enabled = true;
    let failed = false;
    let visible = !('IntersectionObserver' in window);

    function updateLabel() {
      const playing = !video.paused;
      toggle.textContent = playing
        ? (korean ? '영상 일시정지' : 'Pause video')
        : (korean ? '영상 재생' : 'Play video');
      toggle.dataset.playing = String(playing);
      toggle.hidden = failed || !enabled;
    }
    function sync() {
      if (!failed && enabled && wantsPlayback && visible && !document.hidden) {
        if (!video.hasAttribute('src')) video.src = new URL(video.dataset.file, folder).href;
        video.play().catch(updateLabel);
      } else {
        video.pause();
      }
      updateLabel();
    }
    video.muted = true;
    video.addEventListener('playing', () => {
      video.classList.toggle('is-visible', enabled);
      updateLabel();
    });
    video.addEventListener('pause', updateLabel);
    video.addEventListener('error', () => {
      failed = true;
      video.classList.remove('is-visible');
      updateLabel();
    });
    toggle.addEventListener('click', () => {
      wantsPlayback = video.paused;
      sync();
    });
    motion.addEventListener('change', () => {
      wantsPlayback = autoPlay();
      if (!wantsPlayback) video.classList.remove('is-visible');
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      }).observe(frame);
    }
    sync();
    return (show) => {
      enabled = show;
      if (!enabled) video.classList.remove('is-visible');
      sync();
    };
  }

  const films = new Map();
  for (const video of document.querySelectorAll('.scene-film')) {
    films.set(video.id, setupFilm(video));
  }
  const picker = hero.querySelector('.scene-picker');
  const buttons = [...picker.querySelectorAll('button')];
  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      const key = button.dataset.key;
      mobile.srcset = new URL(key + '-detail.webp', folder).href;
      image.src = new URL(key + '-wide.webp', folder).href;
      image.alt = korean ? button.dataset.altKo : button.dataset.altEn;
      for (const choice of buttons) choice.setAttribute('aria-pressed', String(choice === button));
      films.get('scene-film')?.(key === 'opening');
    });
  }
  picker.hidden = false;
})();
