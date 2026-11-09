/* The tracker page. Content comes from guide.js; ticks are saved by serve.py
 * in progress.json, or in this browser if the page is opened without it. */
(() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const euro = n => '€' + n.toFixed(2).replace(/\.00$/, '');

  // ---------------------------------------------------------------- ticks
  let done = {}, saved = true;
  const open = new Set();

  async function load() {
    try {
      const res = await fetch('progress', { cache: 'no-store' });
      if (!res.ok) throw new Error();
      done = (await res.json()).done || {};
      saved = true;
    } catch {
      saved = false;
      try { done = JSON.parse(localStorage.getItem('qlock.done')) || {}; } catch { done = {}; }
    }
    $('note').hidden = saved;
  }

  async function tick(id, on) {
    if (on) done[id] = true; else delete done[id];
    render();
    if (!saved) {
      try { localStorage.setItem('qlock.done', JSON.stringify(done)); } catch { /* private window */ }
      return;
    }
    try {
      const res = await fetch('progress', { method: 'POST', body: JSON.stringify({ id, done: on }) });
      if (!res.ok) throw new Error();
    } catch {
      $('note').hidden = false;
    }
  }

  // ---------------------------------------------------------------- what is where
  const items = p => p.shop ? SHOP.flatMap(g => g.items) : p.steps;
  const left = p => items(p).filter(i => !done[i.id]);
  const current = () => PHASES.find(p => left(p).length);

  // ---------------------------------------------------------------- top
  function renderFace() {
    const d = new Date();
    const { lit, dots } = litAt(d.getHours(), d.getMinutes());
    const letters = FACE.join('').split('').map((ch, i) => `<span${lit.has(i) ? ' class="on"' : ''}>${ch}</span>`).join('');
    const corner = [[5, 5], [95, 5], [95, 95], [5, 95]]      // minute 1..4: clockwise from top-left
      .map(([x, y], i) => `<i class="dot${i < dots ? ' on' : ''}" style="left:${x}%;top:${y}%"></i>`).join('');
    $('face').innerHTML = `<div class="letters">${letters}</div>${corner}`;
    $('face').setAttribute('aria-label', 'The clock face, showing the time now');
  }

  function renderTop() {
    const cur = current();
    if (cur) {
      const n = PHASES.indexOf(cur) + 1;
      const first = left(cur)[0];
      $('now').textContent = `Step ${n} of ${PHASES.length}: ${cur.name}`;
      $('next').textContent = cur.shop ? `${left(cur).length} things left to get` : `Next: ${first.t}`;
    } else {
      $('now').textContent = 'Finished';
      $('next').textContent = 'The clock is on the wall.';
    }
    $('bar').innerHTML = PHASES.map(p => {
      const all = items(p).length;
      return `<i><b style="width:${(all - left(p).length) / all * 100}%"></b></i>`;
    }).join('');
  }

  // ---------------------------------------------------------------- phases
  const box = i => `<input type="checkbox" data-id="${i.id}"${done[i.id] ? ' checked' : ''}>`;

  const stepRow = s => `<li class="row${done[s.id] ? ' done' : ''}"><label>${box(s)}
    <span><span class="t">${esc(s.t)}</span><span class="h">${esc(s.h)}</span></span></label><span></span></li>`;

  const shopRow = i => `<li class="row${done[i.id] ? ' done' : ''}"><label>${box(i)}
    <span class="t">${i.n ? `<span class="qty">${esc(i.n)} ×</span> ` : ''}${
      i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.t)}</a>` : esc(i.t)}</span></label>
    <span class="eur">${i.eur ? euro(i.eur) : ''}</span></li>`;

  const shopList = () => SHOP.map(g => {
    const sum = g.items.filter(i => !done[i.id]).reduce((a, i) => a + i.eur, 0);
    return `<div class="group"><b>${esc(g.name)}</b><span>${esc(g.where)}</span>
      <span class="sum">${sum ? 'about ' + euro(Math.round(sum)) + ' to go' : 'done'}</span></div>
      <ul class="shop">${g.items.map(shopRow).join('')}</ul>`;
  }).join('');

  function ledMap() {
    const cells = [];
    for (let r = -1; r <= 10; r++) {
      for (let c = -1; c <= 11; c++) {
        const edgeRow = r < 0 || r > 9, edgeCol = c < 0 || c > 10;
        if (edgeRow && edgeCol) {
          const n = r < 0 ? (c < 0 ? 113 : 112) : (c < 0 ? 110 : 111);
          cells.push(`<span class="dotled"><small>${n}</small></span>`);
        } else if (edgeRow) cells.push('<span></span>');
        else if (c < 0) cells.push(r === 0 ? '<span class="edge in">IN</span>' : `<span class="edge">${r % 2 ? '←' : '→'}</span>`);
        else if (c > 10) cells.push(`<span class="edge">${r % 2 ? '←' : '→'}</span>`);
        else cells.push(`<span class="led">${FACE[r][c]}<small>${stripNumber(r, c)}</small></span>`);
      }
    }
    return `<figure><div class="scroll"><div class="map">${cells.join('')}</div></div>
      <figcaption>The LED side of the panel, which is the view from the front. Small numbers: the order
      along the strip. Arrows: the direction of each row. After 109 come the four dots, 110 to 113.
      Power and data come in at IN; power also goes to the free end of 113.</figcaption></figure>`;
  }

  function render() {
    const cur = current();
    renderTop();
    $('phases').innerHTML = PHASES.map((p, n) => {
      const all = items(p).length, todo = left(p).length;
      const isOpen = open.has(p.id);
      const figure = p.figure === 'wiring' ? $('fig-wiring').innerHTML : p.figure === 'leds' ? ledMap() : '';
      return `<section class="phase${todo ? '' : ' done'}${p === cur ? ' current' : ''}">
        <button type="button" data-phase="${p.id}" aria-expanded="${isOpen}">
          <span class="num">${n + 1}</span><span class="name">${esc(p.name)}</span>
          <span class="count">${all - todo} / ${all}</span>
          <svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        ${isOpen ? `<div class="body"><p class="intro">${esc(p.intro)}</p>
          ${p.shop ? shopList() : `<ul>${p.steps.map(stepRow).join('')}</ul>`}${figure}</div>` : ''}
      </section>`;
    }).join('');
  }

  $('phases').addEventListener('click', e => {
    const b = e.target.closest('[data-phase]');
    if (!b) return;
    const id = b.dataset.phase;
    if (open.has(id)) open.delete(id); else open.add(id);
    render();
    document.querySelector(`[data-phase="${id}"]`).focus();
  });
  $('phases').addEventListener('change', e => {
    const id = e.target.dataset.id;
    if (!id) return;
    tick(id, e.target.checked);
    document.querySelector(`input[data-id="${id}"]`)?.focus();
  });

  (async () => {
    renderFace();
    await load();
    const cur = current();
    if (cur) open.add(cur.id);
    render();
    setInterval(renderFace, 15000);
    addEventListener('focus', async () => { await load(); render(); });
  })();
})();
