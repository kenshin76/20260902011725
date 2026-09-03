/* 비철금속 B2B 거래 플랫폼 개발 — 웹 제안서 (위시켓 158040)
   의존성 없음 · 스타일.md §13.6 모션 규격 */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 테마: 시스템 → 라이트 → 다크 순환 ───────────────── */
  var MODES = ['sys', 'light', 'dark'];
  var LABEL = { sys: '시스템', light: '라이트', dark: '다크' };
  var mode = 'sys';
  try { var st = localStorage.getItem('proposal-theme'); if (MODES.indexOf(st) >= 0) mode = st; } catch (e) {}

  function applyTheme() {
    var root = document.documentElement;
    if (mode === 'sys') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    var ico = $('#tico'), lb = $('#tlb');
    if (ico) ico.className = 'tico' + (mode === 'sys' ? ' sys' : mode === 'dark' ? ' dk' : '');
    if (lb) lb.textContent = LABEL[mode];
    try { localStorage.setItem('proposal-theme', mode); } catch (e) {}
  }
  applyTheme();
  var tb = $('#themeBtn');
  if (tb) tb.addEventListener('click', function () {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    applyTheme();
  });

  /* ── 인쇄: 리빌·카운터·바를 확정 상태로 만든 뒤 인쇄 ── */
  function settle() {
    $$('.rv').forEach(function (el) { el.classList.add('in'); });
    $$('[data-to]').forEach(function (el) { el.textContent = fmt(el.getAttribute('data-to'), el.getAttribute('data-dec')); });
  }
  var pb = $('#printBtn');
  if (pb) pb.addEventListener('click', function () { settle(); setTimeout(function () { window.print(); }, 60); });
  window.addEventListener('beforeprint', settle);

  /* ── 숫자 서식 ───────────────────────────────────────── */
  function fmt(v, dec) {
    var d = dec ? parseInt(dec, 10) : 0;
    var n = parseFloat(v);
    var s = d ? n.toFixed(d) : String(Math.round(n));
    var p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  }

  /* ── 제안서 핵심 수치는 처음부터 최종값으로 표시 ─────── */
  function count(el) {
    var to = parseFloat(el.getAttribute('data-to'));
    var dec = el.getAttribute('data-dec');
    if (isFinite(to)) el.textContent = fmt(to, dec);
  }

  /* ── 리빌 · 카운터 · 바 성장 ─────────────────────────── */
  var seen = new WeakSet();
  function fire(el) {
    if (seen.has(el)) return;
    seen.add(el);
    var d = parseInt(el.getAttribute('data-d') || '0', 10);
    setTimeout(function () {
      el.classList.add('in');
      $$('[data-to]', el).forEach(count);
    }, reduce ? 0 : d);
  }

  if (!('IntersectionObserver' in window) || reduce) {
    settle();
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { fire(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach(function (el) { io.observe(el); });
    /* 히어로는 즉시 */
    $$('.hero .rv').forEach(fire);
  }

  /* 간트·타임라인 바에 순차 지연 부여 */
  $$('.g').forEach(function (g) {
    $$('.g-bar', g).forEach(function (b, i) { b.style.setProperty('--dl', (i * 0.11) + 's'); });
  });
  $$('.tl').forEach(function (t) {
    $$('.tl-b', t).forEach(function (b, i) { b.style.setProperty('--dl', (i * 0.08) + 's'); });
  });

  /* ── 상단 바 · 진행 바 · 맨 위로 · 스크롤스파이 ──────── */
  var topbar = $('#topbar'), prog = $('#prog'), totop = $('#totop');
  var navA = $$('#tbnav a');
  var secs = navA.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
                 .filter(Boolean);
  var hero = $('.hero');
  var lastY = window.pageYOffset || 0, ticking = false;

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (prog) prog.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';

    var hh = hero ? hero.offsetHeight : 520;
    if (topbar) {
      var show = y > hh * 0.62 && (y < lastY || y > hh);
      topbar.classList.toggle('on', !!show);
    }
    if (totop) totop.classList.toggle('on', y > hh * 1.2);

    var cur = null;
    for (var i = 0; i < secs.length; i++) {
      var r = secs[i].getBoundingClientRect();
      if (r.top <= window.innerHeight * 0.42) cur = secs[i].id;
    }
    navA.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + cur); });

    lastY = y;
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if (totop) totop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ── 게이트 라벨 영역 높이 보정 ─────────────────────
     지그재그는 마크업(.dn)이 담당한다. 좁은 화면에서 라벨이 두 줄로
     늘어나면 아래 줄 라벨이 잘리므로 컨테이너 높이만 키운다. */
  function gates() {
    var box = $('#gates');
    if (!box) return;
    var w = box.clientWidth;
    if (!w) return;
    box.style.height = (w * 0.0833 < 104) ? '130px' : '98px';
  }
  gates();
  window.addEventListener('resize', gates, { passive: true });
})();
