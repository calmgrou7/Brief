(() => {
  const data = window.StayBCampuses;
  const desk = document.getElementById('local-desk');
  if (!desk || !data || !window.StayB) return;
  const list = desk.querySelector('#sb-campus-list');
  const search = desk.querySelector('#sb-search');
  const count = desk.querySelector('#sb-count');
  const date = desk.querySelector('#sb-date');
  const buttons = [...desk.querySelectorAll('[data-region]')];
  const resources = [...desk.querySelectorAll('[data-zone]')];
  let region = 'busan';
  const normalized = value => value.normalize('NFKC').toLowerCase().replace(/\s/g,'');
  function node(type, text) {
    const el = document.createElement(type);
    el.textContent = text;
    return el;
  }
  function render() {
    const lang = window.StayB.getLang();
    const ko = lang === 'ko';
    const query = normalized(search.value);
    const selected = data.items.filter(item => item.region === region);
    const rows = selected.filter(item => normalized([item.ko,item.en,item.address].join(' ')).includes(query));
    list.replaceChildren();
    for (const item of rows) {
      const row = node('li','');
      const details = node('details','');
      const summary = node('summary',item[lang]);
      const info = node('div','');
      info.className = 'sb-detail';
      const otherName = node('p',ko ? item.en : item.ko);
      otherName.lang = ko ? 'en' : 'ko';
      const address = node('p',item.address);
      address.lang = 'ko';
      info.append(otherName,address);
      const link = node('a',ko ? '학교 홈페이지 →' : 'University website →');
      const raw = item.website.trim();
      try {
        const url = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://'+raw);
        if (/^https?:$/.test(url.protocol) && url.hostname.endsWith('.ac.kr')) {
          link.href = url.href;
          info.append(link);
        }
      } catch { /* Other campus details remain readable. */ }
      details.append(summary,info);row.append(details);list.append(row);
    }
    count.textContent = rows.length ? (ko ? rows.length+'개 캠퍼스' : rows.length+' campuses') :
      (ko ? '검색 결과가 없습니다. 학교 이름이나 한글 주소로 다시 검색해 주세요.' : 'No matches. Try another campus name or Korean address.');
    const dates = [...new Set(selected.map(item => item.asOf))].sort();
    date.textContent = ' · '+(ko ? '자료 기준 ' : 'Data as of ')+dates.join(' / ');
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.region === region));
    for (const entry of resources) {
      entry.hidden = entry.dataset.zone !== 'all' && entry.dataset.zone !== region;
      const link = entry.querySelector('a');
      link.href = ko ? link.dataset.urlKo : link.dataset.urlEn;
    }
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    region = button.dataset.region;
    search.value = '';
    render();
  }));
  search.addEventListener('input', render);
  window.StayB.onLang(render);
  render();
})();
