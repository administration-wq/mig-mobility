// MIG Mobility Sénégal · page script. Everything here is an enhancement: without it the page
// shows every vehicle, the spec sheets, a fixed kilometre table and working links.

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
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.intro [data-reveal]').forEach((el) => el.classList.add('is-in'))));
  addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
  }), 2500));
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
  // back at the top, the T15 returns
  const intro = document.querySelector('.intro');
  new IntersectionObserver((list) => { for (const e of list) if (e.isIntersecting) show('t15'); }, { rootMargin: '-48% 0px -40% 0px' }).observe(intro);
  // on a phone the plate sits above the catalogue and turns through the four by itself
  const phone = matchMedia('(max-width: 900px)');
  if (!reduced) {
    let seen = false;
    new IntersectionObserver((list) => { seen = list[0].isIntersecting; }, { threshold: 0.4 }).observe(stage);
    setInterval(() => {
      if (!phone.matches || !seen || document.hidden) return;
      show(order[(order.indexOf(stage.dataset.active) + 1) % order.length]);
    }, 2800);
  }
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
    sheet.href = `#fiche-${key}`;
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
  select('t15');
})();

// The details: the active row opens and the picture follows it
(() => {
  const items = [...document.querySelectorAll('.rows__item')];
  const pics = [...document.querySelectorAll('.details__pic img')];
  if (!items.length) return;
  const activate = (n) => {
    items.forEach((it, i) => {
      const on = i === n;
      it.classList.toggle('is-on', on);
      it.querySelector('.rows__btn').setAttribute('aria-expanded', on);
    });
    pics.forEach((p) => p.classList.toggle('is-on', Number(p.dataset.pic) === n));
  };
  items.forEach((it, i) => {
    const btn = it.querySelector('.rows__btn');
    btn.addEventListener('click', () => activate(i));
    btn.addEventListener('focus', () => activate(i));
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) btn.addEventListener('mouseenter', () => activate(i));
  });
  // scrolling a row to the middle of the screen activates it
  const io = new IntersectionObserver((list) => {
    for (const e of list) if (e.isIntersecting) activate(items.indexOf(e.target));
  }, { rootMargin: '-50% 0px -45% 0px' });
  items.forEach((it) => io.observe(it));
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
  const video = row.querySelector('video');
  if (video && 'IntersectionObserver' in window) {
    if (reduced) { video.removeAttribute('autoplay'); video.pause(); video.controls = true; }
    new IntersectionObserver((list) => {
      for (const e of list) {
        if (reduced) return;
        if (e.isIntersecting) video.play().catch(() => {}); else video.pause();
      }
    }, { threshold: 0.25 }).observe(video);
  }
})();
