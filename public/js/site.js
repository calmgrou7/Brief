// 절세 간단 계산 (스크립트가 없어도 기본값 결과가 화면에 보입니다)
(function () {
  var form = document.querySelector('[data-tax]');
  if (!form) return;
  var amount = form.querySelector('#tax-amount');
  var rate = form.querySelector('#tax-rate');
  var outRate = form.querySelector('[data-out="rate"]');
  var outSaving = form.querySelector('[data-out="saving"]');
  function fmtMan(n) {
    n = Math.round(n);
    if (n >= 10000) {
      var eok = Math.floor(n / 10000), man = n % 10000;
      return eok + '억' + (man ? ' ' + man.toLocaleString('ko-KR') + '만' : '') + ' 원';
    }
    return n.toLocaleString('ko-KR') + '만 원';
  }
  function update() {
    var raw = amount.value.replace(/[^0-9]/g, '');
    var n = Number(raw || 0);
    var r = Number(rate.value) * 1.1; // 지방소득세 10% 포함
    outRate.textContent = (Math.round(r * 1000) / 10) + '%';
    outSaving.textContent = fmtMan(n * r);
  }
  amount.addEventListener('input', function () {
    var raw = amount.value.replace(/[^0-9]/g, '').slice(0, 7);
    amount.value = raw ? Number(raw).toLocaleString('ko-KR') : '';
    update();
  });
  rate.addEventListener('change', update);
  update();
})();

// 모바일 메뉴: 링크를 누르면 닫기
(function () {
  var menu = document.querySelector('.nav__menu');
  if (!menu) return;
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) menu.removeAttribute('open'); });
})();
