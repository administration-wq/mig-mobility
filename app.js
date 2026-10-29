// MIG Mobility Sénégal · shared script for the home page and the vehicle pages. Everything here is an
// enhancement: without it the pages show every vehicle, the spec sheets, a fixed kilometre table and
// working links. Each part looks for its own elements and does nothing on a page that lacks them.

const WA_DEFAULT = '221710971212';
const waHref = (text, num = WA_DEFAULT) => `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// WhatsApp links carry a written first message
document.querySelectorAll('[data-wa]').forEach((a) => { a.href = waHref(a.dataset.wa, a.dataset.waNum || WA_DEFAULT); });

// Reveal once when a part enters the viewport; never leaves content hidden
(() => {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -4% 0px', threshold: 0.01 });
  targets.forEach((el) => io.observe(el));
  // the first screen comes in at once, whatever its height
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.hero [data-reveal], .vhero [data-reveal]').forEach((el) => el.classList.add('is-in'))));
  addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
  }), 2500));
})();

// The film: a 12 s loop, three seconds per vehicle; the line under it names the one on the plate
(() => {
  const hero = document.querySelector('.hero');
  const video = hero && hero.querySelector('.hero__video');
  if (!video) return;
  const now = hero.querySelector('.hero__now');
  const link = now.querySelector('.hero__now-link');
  const name = now.querySelector('[data-now-name]');
  const fact = now.querySelector('[data-now-fact]');
  const toggle = now.querySelector('.hero__toggle');
  const list = JSON.parse(now.dataset.now);
  const portrait = matchMedia('(orientation: portrait)');
  // browsers that ignore media on <source> take the first one: correct the choice
  const pick = () => {
    const want = portrait.matches ? 'hero-portrait' : 'hero-landscape';
    video.poster = portrait.matches ? video.dataset.posterPortrait : 'assets/video/hero-landscape.jpg';
    if (video.currentSrc && !video.currentSrc.includes(want)) { video.src = `assets/video/${want}.mp4`; if (!video.paused || video.autoplay) video.play().catch(() => {}); }
  };
  video.addEventListener('loadedmetadata', pick, { once: true });
  portrait.addEventListener('change', () => { video.removeAttribute('src'); video.load(); pick(); });
  pick();
  let shown = -1;
  video.addEventListener('timeupdate', () => {
    const i = Math.floor((((video.currentTime - 0.4) % 12) + 12) % 12 / 3);
    if (i === shown) return;
    shown = i;
    const v = list[i];
    link.href = v.page; name.textContent = v.name; fact.textContent = v.fact;
  });
  let paused = reduced;
  const apply = () => {
    toggle.textContent = paused ? 'Lecture' : 'Pause';
    toggle.setAttribute('aria-pressed', paused);
    hero.classList.toggle('is-paused', paused);
  };
  if (reduced) { video.removeAttribute('autoplay'); video.pause(); }
  toggle.addEventListener('click', () => { paused = !paused; if (paused) video.pause(); else video.play().catch(() => {}); apply(); });
  // off screen the film rests
  new IntersectionObserver((l) => { for (const e of l) { if (paused) return; if (e.isIntersecting) video.play().catch(() => {}); else video.pause(); } }, { threshold: 0.1 }).observe(hero);
  apply();
})();

// The showroom: the plate shows the vehicle whose entry is in the reading band
(() => {
  const stage = document.querySelector('.showroom__stage');
  const entries = [...document.querySelectorAll('.entry')];
  if (!stage || !entries.length) return;
  const order = ['t15', 'leopard', 'a23', 'js150'];
  const caption = {
    t15: ['T15', "120 km d'autonomie"],
    leopard: ['Asia Leopard', '125 cm³, 85 km/h'],
    a23: ['A23-1', 'toit et pare-brise'],
    js150: ['JS150', "jusqu'à 900 kg"],
  };
  const cars = [...stage.querySelectorAll('.plate__car')];
  const name = stage.querySelector('[data-cap-name]');
  const fact = stage.querySelector('[data-cap-fact]');
  const show = (key) => {
    if (stage.dataset.active === key) return;
    const at = order.indexOf(key);
    stage.dataset.active = key;
    stage.style.setProperty('--turn', `${-20 + at * 90}deg`);
    cars.forEach((img) => {
      const i = order.indexOf(img.dataset.car);
      img.style.setProperty('--from', i < at ? '-16%' : '16%');
      img.classList.toggle('is-on', i === at);
    });
    name.textContent = caption[key][0];
    fact.textContent = caption[key][1];
  };
  const io = new IntersectionObserver((list) => {
    for (const e of list) if (e.isIntersecting) show(e.target.dataset.vehicle);
  }, { rootMargin: '-48% 0px -40% 0px' });
  entries.forEach((el) => io.observe(el));
})();

// Your kilometres: the MIG ring fills with the share of the day's energy
(() => {
  const range = document.getElementById('km-range');
  if (!range) return;
  const out = document.getElementById('km-out');
  const result = document.getElementById('km-result');
  const fill = document.querySelector('.km__fill');
  const wa = document.getElementById('km-wa');
  const sheet = document.getElementById('km-sheet');
  const tabs = [...document.querySelectorAll('.km__tabs [role="tab"]')];
  const cars = [...document.querySelectorAll('.km__car')];
  const V = {
    t15: { name: 'le T15', price: 'du T15', range: 120 },
    a23: { name: "l'A23-1", price: "de l'A23-1", range: 60 },
    js150: { name: 'le JS150', price: 'du JS150', perKm: 0.036, tank: 17 },
  };
  let key = 't15';
  const nb = (n, d = 0) => n.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const render = () => {
    const km = Number(range.value);
    const v = V[key];
    out.textContent = km;
    let text; let share;
    if (v.range) {
      share = km / v.range;
      const cap = v.name.charAt(0).toUpperCase() + v.name.slice(1);
      text = share <= 1
        ? `À ${km} km par jour, ${v.name} utilise environ ${nb(Math.round(share * 100))} % de son autonomie de ${v.range} km : une charge par jour suffit.`
        : `À ${km} km par jour, ${v.name} dépasse son autonomie de ${v.range} km : prévoyez une recharge en cours de journée. ${cap} se recharge complètement en 6 à 10 heures.`;
      if (key === 'a23' && share > 1) text = `À ${km} km par jour, l'A23-1 dépasse son autonomie de 60 km : prévoyez une ou plusieurs recharges en cours de journée.`;
      if (key === 't15' && share > 1) text = `À ${km} km par jour, le T15 dépasse son autonomie de 120 km : prévoyez une recharge en cours de journée. Une charge complète prend 6 à 10 heures.`;
    } else {
      const litres = km * v.perKm;
      const days = Math.floor(v.tank / litres);
      share = litres / v.tank;
      text = `À ${km} km par jour, le JS150 consomme au plus ${nb(litres, 1)} L d'essence : un plein de 17 L couvre environ ${days} jour${days > 1 ? 's' : ''}.`;
    }
    result.textContent = text;
    fill.style.setProperty('--fill', Math.min(share, 1) * 100);
    fill.classList.toggle('is-over', share > 1);
    wa.href = waHref(`Bonjour MIG Mobility, je voudrais le prix ${v.price}. Je roule environ ${km} km par jour.`);
    const tab = tabs.find((t) => t.dataset.k === key);
    sheet.href = tab.dataset.page;
    sheet.textContent = `Voir la fiche ${v.price}`;
  };
  const select = (k, focus) => {
    key = k;
    tabs.forEach((t) => { const on = t.dataset.k === k; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    cars.forEach((c) => c.classList.toggle('is-on', c.dataset.kcar === k));
    render();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t.dataset.k));
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      select(n.dataset.k, true);
    });
  });
  range.addEventListener('input', render);
  const asked = new URLSearchParams(location.search).get('v');
  select(V[asked] ? asked : 't15');
})();

// The reel: on a wide screen the page scroll carries the row sideways while the stage holds;
// elsewhere it is a native row to swipe or drag. The video plays only while it is on screen.
(() => {
  const root = document.querySelector('.reel');
  const row = document.querySelector('.reel__row');
  if (!row) return;
  const wide = matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)');
  let dx = 0; let queued = false;
  const pinned = () => root.classList.contains('is-pinned');
  const place = () => {
    queued = false;
    if (!pinned()) return;
    const p = Math.min(1, Math.max(0, -root.getBoundingClientRect().top / dx));
    row.style.transform = `translate3d(${(-p * dx).toFixed(1)}px, 0, 0)`;
  };
  const measure = () => {
    root.classList.add('is-pinned'); // measure the row as it would be when held
    row.style.transform = '';
    dx = row.scrollWidth - row.clientWidth;
    const pin = wide.matches && dx > 0 && dx < innerHeight * 3;
    root.classList.toggle('is-pinned', pin);
    root.style.height = pin ? `${innerHeight + dx}px` : ''; // one pixel of scroll moves the row one pixel
    place();
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(place); } }, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  wide.addEventListener('change', measure);
  measure();
  let down = false; let x0 = 0; let s0 = 0; let moved = false;
  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || pinned()) return;
    down = true; moved = false; x0 = e.clientX; s0 = row.scrollLeft;
  });
  addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - x0;
    if (Math.abs(dx) > 4) { moved = true; row.classList.add('is-dragging'); }
    row.scrollLeft = s0 - dx;
  });
  addEventListener('pointerup', () => { down = false; row.classList.remove('is-dragging'); });
  row.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  row.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const step = (e.key === 'ArrowRight' ? 1 : -1) * row.clientWidth * 0.6;
    if (pinned()) { e.preventDefault(); scrollBy({ top: step, behavior: 'instant' }); } else row.scrollBy({ left: step, behavior: reduced ? 'auto' : 'smooth' });
  });
})();

// Films inside the page play only while they are on screen; with reduced motion they wait for a click
(() => {
  const films = document.querySelectorAll('video[data-inview]');
  if (!films.length) return;
  if (reduced || !('IntersectionObserver' in window)) { films.forEach((v) => { v.controls = true; }); return; }
  const io = new IntersectionObserver((list) => {
    for (const e of list) if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause();
  }, { threshold: 0.25 });
  films.forEach((v) => io.observe(v));
})();
