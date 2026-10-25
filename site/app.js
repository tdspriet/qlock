/* QLOCK build tracker — UI. Content comes from data.js, ticks from Store. */
(() => {
  // ---------------------------------------------------------------- helpers
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const euro = (n, dp = 2) => '€' + Number(n || 0).toFixed(dp).replace(/\.00$/, '');
  const hours = min => min >= 60 ? `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}` : `${Math.round(min)} min`;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pref = {
    get(k, d) { try { const v = localStorage.getItem('qlock.ui.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('qlock.ui.' + k, JSON.stringify(v)); } catch { /* fine */ } },
  };
  const ICON = {
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    out: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5h5v5M9.5 2.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    chev: '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const STATUS = { buy: 'to buy', print: 'to print', build: 'to build', done: 'done' };

  // ---------------------------------------------------------------- derived state
  const S = () => Store.get();
  const byAt = (a, b) => (a.at || '').localeCompare(b.at || '');
  const shopItems = () => [...SHOP, ...Object.values(S().custom.shop).sort(byAt).map(i => ({ ...i, custom: true }))];
  const shopById = id => shopItems().find(i => i.id === id);
  const shopStatus = item => S().shop[item.id]?.status || item.defaultStatus || 'need';
  const sorted = st => st === 'got' || st === 'have' || st === 'skip';
  const itemsSorted = ids => ids.every(id => { const i = shopById(id); return !i || sorted(shopStatus(i)); });
  const toggleItem = i => Store.setShop(i.id, sorted(shopStatus(i)) ? 'need' : (i.defaultStatus || 'got'));

  const phases = () => PHASES.map(p => ({
    ...p,
    tasks: [...p.tasks, ...Object.values(S().custom.tasks).filter(t => t.phase === p.id).sort(byAt).map(t => ({ ...t, custom: true }))],
  }));
  const allTasks = () => phases().flatMap(p => p.tasks);
  const taskById = id => allTasks().find(t => t.id === id);
  const taskDone = t => t ? (t.shop ? itemsSorted(t.shop) : !!S().tasks[t.id]) : false;
  const stepDone = st => st.shop ? itemsSorted(st.shop) : taskDone(taskById(st.task));
  // A ticked later step implies the earlier ones happened (you can't print a
  // tile without filament), so a part's status follows its furthest step.
  const reached = p => { let n = 0; p.steps.forEach((s, i) => { if (stepDone(s)) n = i + 1; }); return n; };
  const partStatus = p => { const st = p.steps.slice(reached(p)).find(s => !stepDone(s)); return st ? st.kind : 'done'; };
  const printed = p => p.kind === 'print' && p.steps.filter(s => s.kind === 'print' && s.task).every(stepDone);

  // ---------------------------------------------------------------- header
  let now = new Date();
  function renderFace() {
    now = new Date();
    const { lit, phrase } = CLOCK.at(now.getHours(), now.getMinutes());
    $('#face').innerHTML = LETTERS.map((row, r) => [...row].map((_, c) =>
      `<i${lit.has(r * 11 + c) ? ' class="on"' : ''}></i>`).join('')).join('');
    $('#face').title = phrase;
  }

  function renderSummary() {
    const tasks = allTasks(), done = tasks.filter(taskDone).length;
    const toBuy = shopItems().filter(i => shopStatus(i) === 'need').reduce((a, i) => a + i.price * i.qty, 0);
    const printLeft = PARTS.filter(p => p.kind === 'print' && !printed(p)).reduce((a, p) => a + (PRINT_INFO[p.id]?.min || 0), 0);
    const bits = [`${done} of ${tasks.length} steps`];
    if (toBuy) bits.push(`${euro(toBuy, 0)} to buy`);
    if (printLeft) bits.push(`${hours(printLeft)} printing`);
    $('#summary').textContent = bits.map(b => b.replace(/ /g, '\u00a0')).join(' · ');
    $('#summary-bar').style.width = `${tasks.length ? done / tasks.length * 100 : 0}%`;
  }

  // ---------------------------------------------------------------- plan
  const openPhases = new Set(pref.get('open', []));
  const closedPhases = new Set(pref.get('closed', []));
  const openNotes = new Set();
  let addingTo = null;

  function taskRow(t) {
    const done = taskDone(t);
    let check, right = '';
    if (t.shop) {
      const got = t.shop.filter(id => { const i = shopById(id); return !i || sorted(shopStatus(i)); }).length;
      check = `<button type="button" class="check auto ${done ? 'on' : ''}" data-shopjump="${esc(t.id)}" title="Ticks itself from the shopping list" aria-label="${esc(t.title)}: ${got} of ${t.shop.length} sorted. Show in shopping list">${ICON.check}</button>`;
      if (!done) right = `<span class="num">${got}/${t.shop.length}</span>`;
    } else {
      check = `<button type="button" class="check ${done ? 'on' : ''}" role="checkbox" aria-checked="${done}" data-task="${esc(t.id)}" aria-label="${esc(t.title)}">${ICON.check}</button>`;
      const pi = t.part && PRINT_INFO[t.part];
      if (pi?.min && !done) right = `<span class="num">${hours(pi.min)}</span>`;
      if (t.custom) right = `<button type="button" class="rm" data-rmtask="${esc(t.id)}" aria-label="Remove step">✕</button>`;
    }
    const open = openNotes.has(t.id);
    const title = t.note
      ? `<button type="button" class="t-title" data-note="${esc(t.id)}" aria-expanded="${open}">${esc(t.title)}</button>`
      : `<span class="t-title">${esc(t.title)}</span>`;
    return `<li class="task ${done ? 'done' : ''}">${check}${title}${right}${t.note && open ? `<p class="note">${esc(t.note)}</p>` : ''}</li>`;
  }

  function renderPlan() {
    const ps = phases();
    const current = ps.find(p => p.tasks.some(t => !taskDone(t)));
    $('#phases').innerHTML = ps.map(p => {
      const d = p.tasks.filter(taskDone).length, n = p.tasks.length;
      const open = !closedPhases.has(p.id) && (openPhases.has(p.id) || p === current);
      const adder = addingTo === p.id
        ? `<form class="add-step" data-phase="${p.id}" autocomplete="off"><input name="step" placeholder="New step" maxlength="160" aria-label="New step"><button type="submit">Add</button></form>`
        : `<button type="button" class="add-link" data-addstep="${p.id}">+ Add step</button>`;
      return `<details class="phase ${d === n ? 'complete' : ''}" data-phase="${p.id}" ${open ? 'open' : ''}>
        <summary><span class="ph-name">${esc(p.name)}</span><span class="num muted">${d}/${n}</span>${ICON.chev}</summary>
        <ul class="tasks">${p.tasks.map(taskRow).join('')}</ul>
        ${adder}
      </details>`;
    }).join('');
  }

  function bindPlan() {
    const col = $('.col-plan');
    col.addEventListener('click', e => {
      const t = e.target.closest('[data-task]');
      if (t) return Store.toggleTask(t.dataset.task);
      const n = e.target.closest('[data-note]');
      if (n) { const id = n.dataset.note; openNotes.has(id) ? openNotes.delete(id) : openNotes.add(id); return renderAll(); }
      const j = e.target.closest('[data-shopjump]');
      if (j) return jumpToShop(taskById(j.dataset.shopjump).shop);
      const r = e.target.closest('[data-rmtask]');
      if (r) return Store.removeCustomTask(r.dataset.rmtask);
      const a = e.target.closest('[data-addstep]');
      if (a) { addingTo = a.dataset.addstep; focusAfter = `.add-step[data-phase="${addingTo}"] input`; renderAll(); }
    });
    col.addEventListener('toggle', e => {
      const d = e.target.closest?.('details.phase');
      if (!d) return;
      const id = d.dataset.phase;
      if (d.open) { openPhases.add(id); closedPhases.delete(id); } else { openPhases.delete(id); closedPhases.add(id); }
      pref.set('open', [...openPhases]); pref.set('closed', [...closedPhases]);
    }, true);
    col.addEventListener('submit', e => {
      const f = e.target.closest('.add-step');
      if (!f) return;
      e.preventDefault();
      const v = f.elements.step.value.trim();
      f.elements.step.value = '';
      if (v) Store.addCustomTask(f.dataset.phase, v);
      else { addingTo = null; renderAll(); }
    });
    col.addEventListener('keydown', e => {
      if (e.key === 'Escape' && e.target.closest('.add-step')) { addingTo = null; renderAll(); }
    });
  }

  // ---------------------------------------------------------------- shopping
  const openItems = new Set();

  function itemRow(i) {
    const st = shopStatus(i), open = openItems.has(i.id), done = sorted(st);
    const total = i.price * i.qty;
    const label = st === 'have' ? ' <span class="tag">have it</span>' : st === 'skip' ? ' <span class="tag">not needed</span>' : '';
    const later = i.later && !done ? ' <span class="tag">later</span>' : '';
    const more = open ? `<div class="i-more">
        ${i.note ? `<p>${esc(i.note)}</p>` : ''}
        <div class="i-actions">
          <button type="button" data-setshop="${esc(i.id)}" data-v="${st === 'have' ? 'need' : 'have'}" aria-pressed="${st === 'have'}">Already have it</button>
          <button type="button" data-setshop="${esc(i.id)}" data-v="${st === 'skip' ? 'need' : 'skip'}" aria-pressed="${st === 'skip'}">Not needed</button>
          ${i.custom ? `<button type="button" data-rmshop="${esc(i.id)}">Remove</button>` : ''}
        </div>
      </div>` : '';
    return `<li class="item ${done ? 'sorted' : ''}" data-id="${esc(i.id)}">
      <button type="button" class="check ${done ? 'on' : ''}" role="checkbox" aria-checked="${done}" data-gotit="${esc(i.id)}" aria-label="${esc(i.name)}">${ICON.check}</button>
      <div>
        <button type="button" class="i-name" data-open="${esc(i.id)}" aria-expanded="${open}">${esc(i.name)}${i.qty > 1 ? ` <span class="i-qty">× ${i.qty}</span>` : ''}</button>${label}${later}
      </div>
      <span class="i-right">${i.url ? `<a class="i-link" href="${esc(i.url)}" target="_blank" rel="noopener" aria-label="Open in ${esc(i.shop || 'shop')}" title="${esc(i.shop || 'Open')}">${ICON.out}</a>` : ''}<span class="i-price num">${total ? euro(total) : ''}</span></span>
      ${more}
    </li>`;
  }

  function renderShop() {
    const items = shopItems();
    $('#shop').innerHTML = SHOP_GROUPS.map(g => {
      const all = items.filter(i => i.group === g.id);
      const need = all.filter(i => !sorted(shopStatus(i))), rest = all.filter(i => sorted(shopStatus(i)));
      const tt = need.filter(i => i.shop === 'TinyTronics');
      const left = all.filter(i => shopStatus(i) === 'need').reduce((a, i) => a + i.price * i.qty, 0);
      return `<section class="group" data-group="${g.id}">
        <div class="group-h"><h3>${esc(g.name)}${left ? `<span class="num">${euro(left, 0)}</span>` : ''}</h3>${tt.length > 1 ? `<button type="button" class="copy" data-copy="${g.id}">Copy TinyTronics list</button>` : ''}</div>
        <ul class="items">${[...need, ...rest].map(itemRow).join('')}</ul>
      </section>`;
    }).join('');
  }

  function bindShop() {
    const col = $('.col-shop');
    col.addEventListener('click', async e => {
      const c = e.target.closest('[data-gotit]');
      if (c) return toggleItem(shopById(c.dataset.gotit));
      const o = e.target.closest('[data-open]');
      if (o) { const id = o.dataset.open; openItems.has(id) ? openItems.delete(id) : openItems.add(id); return renderAll(); }
      const s = e.target.closest('[data-setshop]');
      if (s) return Store.setShop(s.dataset.setshop, s.dataset.v);
      const r = e.target.closest('[data-rmshop]');
      if (r) return Store.removeCustomShop(r.dataset.rmshop);
      const cp = e.target.closest('[data-copy]');
      if (cp) {
        const text = shopItems().filter(i => i.group === cp.dataset.copy && i.shop === 'TinyTronics' && shopStatus(i) === 'need')
          .map(i => `${i.qty} × ${i.name}${i.url ? '  ' + i.url : ''}`).join('\n');
        try { await navigator.clipboard.writeText(text); cp.textContent = 'Copied'; } catch { cp.textContent = 'Copy failed'; }
        setTimeout(() => { cp.textContent = 'Copy TinyTronics list'; }, 1500);
      }
    });
    $('#add-item-open').addEventListener('click', () => {
      $('#add-item').hidden = false; $('#add-item-open').hidden = true; $('#add-item-name').focus();
    });
    $('#add-item').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#add-item-name').value.trim();
      if (name) Store.addCustomShop({ name, group: 'materials', price: Number($('#add-item-price').value) || 0, qty: 1 });
      e.target.reset(); e.target.hidden = true; $('#add-item-open').hidden = false;
    });
    $('#add-item').addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.currentTarget.reset(); e.currentTarget.hidden = true; $('#add-item-open').hidden = false; $('#add-item-open').focus(); }
    });
  }

  function jumpToShop(ids) {
    const rows = ids.map(id => $(`#shop .item[data-id="${CSS.escape(id)}"]`)).filter(Boolean);
    const target = rows.find(r => !r.classList.contains('sorted')) || rows[0];
    if (!target) return;
    target.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    rows.forEach(r => { r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); });
  }

  // ---------------------------------------------------------------- clock
  let selection = null, lit = false, litTime = null, exploded = true;

  // Faceplate TL TR BL BR rather than four rows: tiles and test samples are
  // folded under one label, each still its own button.
  const partLabel = p => p.tile ? p.tile : p.test ? p.name.replace(/ sample$/, '') : p.name;
  function renderTodo() {
    const by = { buy: [], print: [], build: [], done: [] };
    PARTS.forEach(p => by[partStatus(p)].push(p));
    const btn = p => `<button type="button" data-part="${p.id}" class="${selection === p.id ? 'sel' : ''}" aria-label="${esc(p.name)}">${esc(partLabel(p))}</button>`;
    const row = k => {
      const groups = [];
      by[k].forEach(p => {
        const key = p.tile ? p.family : p.test ? 'test' : p.id;
        const g = groups.find(x => x.key === key);
        if (g) g.parts.push(p);
        else groups.push({ key, label: p.tile ? p.name.replace(/ \w\w$/, '') : p.test ? 'Samples' : null, parts: [p] });
      });
      const list = groups.map(g => `<li>${g.label ? `<span>${esc(g.label)}</span>` : ''}${g.parts.map(btn).join('')}</li>`).join('');
      return `<h3><i class="dot st-${k}"></i>${STATUS[k][0].toUpperCase() + STATUS[k].slice(1)} <span class="num">${by[k].length}</span></h3>
        ${list ? `<ul>${list}</ul>` : '<p class="none">—</p>'}`;
    };
    $('#todo').innerHTML = row('buy') + row('print') + row('build');
  }

  function stepItem(st) {
    const done = stepDone(st);
    const t = st.task && taskById(st.task);
    const items = st.shop ? st.shop.map(shopById).filter(Boolean) : null;
    let attr;
    if (items?.length === 1) attr = `data-step-shop="${items[0].id}"`;
    else if (items || t?.shop) attr = `data-step-jump="${(items ? st.shop : t.shop).join(',')}"`;
    else attr = `data-step-task="${esc(st.task)}"`;
    const label = items && items.length > 1 ? `${st.label} (${items.filter(i => sorted(shopStatus(i))).length}/${items.length})` : st.label;
    return `<li class="${done ? 'done' : ''}"><button type="button" class="check ${done ? 'on' : ''}" ${attr} aria-label="${esc(label)}">${ICON.check}</button><span>${esc(label)}</span></li>`;
  }

  function renderCard() {
    const card = $('#v-card');
    const part = PARTS.find(p => p.id === selection);
    if (!part) { card.hidden = true; return; }
    const st = partStatus(part), info = PRINT_INFO[part.id];
    const meta = [STATUS[st], info && `${info.g} g ${part.colour}`, info?.min && hours(info.min)].filter(Boolean).join(' · ');
    card.hidden = false;
    card.innerHTML = `
      <div class="card-h"><h3>${esc(part.name)}</h3><button type="button" class="card-close" id="card-close" aria-label="Close">×</button></div>
      <p class="card-meta">${esc(meta)}</p>
      <ul class="steps">${part.steps.map(stepItem).join('')}</ul>`;
  }

  function select(id) {
    selection = id;
    Viewer.select(id);
    renderCard();
    renderTodo();
  }

  function setLitTime() {
    const [h, m] = litTime || [now.getHours(), now.getMinutes()];
    const input = $('#lit-time');
    if (document.activeElement !== input) input.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    Viewer.setTime(h, m);
  }

  function bindViewer() {
    const btnEx = $('#btn-explode'), btnLit = $('#btn-lit');
    const setExploded = on => {
      exploded = on;
      btnEx.setAttribute('aria-pressed', on);
      Viewer.setExplode(on ? 0.6 : 0, true);
    };
    let explodedBeforeLit = exploded;
    btnEx.addEventListener('click', () => setExploded(!exploded));
    btnLit.addEventListener('click', () => {
      lit = !lit;
      btnLit.setAttribute('aria-pressed', lit);
      $('#v-time').hidden = !lit;
      Viewer.setLit(lit);
      if (lit) { explodedBeforeLit = exploded; setExploded(false); Viewer.view('front'); setLitTime(); }
      else { setExploded(explodedBeforeLit); Viewer.view('iso'); }
    });
    $('#btn-reset').addEventListener('click', () => Viewer.view(lit ? 'front' : 'iso'));
    $('#lit-time').addEventListener('input', e => {
      const [h, m] = e.target.value.split(':').map(Number);
      if (Number.isFinite(h)) { litTime = [h, m || 0]; setLitTime(); }
    });
    $('#lit-now').addEventListener('click', () => { litTime = null; setLitTime(); });

    $('#viewer').addEventListener('click', e => {
      if (e.target.closest('#card-close')) return select(null);
      const st = e.target.closest('[data-step-task]');
      if (st) return Store.toggleTask(st.dataset.stepTask);
      const ss = e.target.closest('[data-step-shop]');
      if (ss) return toggleItem(shopById(ss.dataset.stepShop));
      const sj = e.target.closest('[data-step-jump]');
      if (sj) jumpToShop(sj.dataset.stepJump.split(','));
    });
    $('#todo').addEventListener('click', e => {
      const b = e.target.closest('[data-part]');
      if (!b) return;
      select(selection === b.dataset.part ? null : b.dataset.part);
      if ($('#viewer').getBoundingClientRect().top < 0) $('#viewer').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' });
    });
  }

  async function startViewer() {
    const load = $('#v-load');
    if (!window.THREE || !THREE.STLLoader) { load.textContent = 'The 3D view needs site/vendor/three.min.js.'; return; }
    const failed = await Viewer.init($('#viewer'), {
      stlBase: '../stl/',
      onSelect: sel => select(sel?.part && sel.part !== selection ? sel.part : null),
      onHover: id => {
        const tip = $('#v-tip');
        if (!id) { tip.hidden = true; return; }
        const p = PARTS.find(x => x.id === id);
        tip.innerHTML = `${esc(p.name)}<span class="muted">${STATUS[partStatus(p)]}</span>`;
        tip.hidden = false;
      },
      onProgress: (n, total, bad) => { if (n === total && !bad) load.hidden = true; },
    });
    Viewer.setStatuses(statusMap());
    if (failed) {
      load.hidden = false;
      load.innerHTML = location.protocol === 'file:'
        ? 'Start the site with <code>python3 site/serve.py</code> to load the 3D parts.'
        : `${failed} STL file${failed > 1 ? 's' : ''} didn’t load.`;
    }
  }
  const statusMap = () => Object.fromEntries(PARTS.map(p => [p.id, partStatus(p)]));

  // ---------------------------------------------------------------- sections
  // Build plus four reference views, chosen in the header; the hash keeps the
  // view across a reload.
  let ledSide = 'front';

  function tabWiring() {
    const pins = [
      [1, '1OE', 'GND', 'gnd'], [2, '1A', 'GPIO16 via harness, 10 kΩ to GND', 'data'], [3, '1Y', '470 Ω to strip DIN', 'data'],
      [4, '2OE', '5 V', 'v5'], [5, '2A', 'GND', 'gnd'], [6, '2Y', '—', ''], [7, 'GND', 'GND, 100 nF to pin 14', 'gnd'],
      [8, '3Y', '—', ''], [9, '3A', 'GND', 'gnd'], [10, '3OE', '5 V', 'v5'], [11, '4Y', '—', ''],
      [12, '4A', 'GND', 'gnd'], [13, '4OE', '5 V', 'v5'], [14, 'VCC', '5 V, 100 nF to pin 7', 'v5'],
    ];
    const name = n => n.endsWith('OE') ? `${n[0]}<span class="ol">OE</span>` : n;
    const row = p => `<tr><td class="pn">${p[0]}</td><td class="pname">${name(p[1])}</td><td class="${p[3] ? '' : 'nc'}">${p[3] ? `<i class="wire ${p[3]}"></i>` : ''}${esc(p[2])}</td></tr>`;
    return `<div class="ref-grid ref-wiring">
      <div class="diagram">${WIRING_SVG}</div>
      <div class="stack">
        <div>
          <h3>SN74AHCT125N pins</h3>
          <table class="pins"><tbody>${pins.map(row).join('')}</tbody></table>
        </div>
        <div class="warn-box">
          <h3>Flashing over USB</h3>
          <ol class="steps-ol">
            <li>Switch off and unplug the ESP32 harness.</li>
            <li>Plug USB into the bare ESP32 and upload.</li>
            <li>Unplug USB, reconnect the harness, switch on.</li>
          </ol>
          <p>The switch doesn’t isolate VIN from the strip. Once it’s closed up, update over Wi-Fi.</p>
        </div>
      </div>
    </div>`;
  }

  function tabLeds() {
    const back = ledSide === 'back';
    let cells = '';
    for (let r = 0; r < 10; r++) {
      cells += `<span class="dir">${r + 1}</span>`;
      for (let vc = 0; vc < 11; vc++) {
        const c = back ? 10 - vc : vc, i = r * 11 + c, n = CLOCK.led(i);
        cells += `<span class="cell ${n === 0 || n === 55 || n === 109 ? 'inj' : ''} ${n === 0 ? 'first' : ''}"><small>${n}</small>${LETTERS[r][c]}</span>`;
      }
      cells += `<span class="dir">${(r % 2 === 0) !== back ? '→' : '←'}</span>`;
    }
    return `<div class="ref-grid ref-leds">
      <div>
        <div class="leds-tools" role="group" aria-label="Seen from">
          <button type="button" data-side="front" aria-pressed="${!back}">From the front</button>
          <button type="button" data-side="back" aria-pressed="${back}">From the back</button>
        </div>
        <div class="ledface">${cells}</div>
        <p class="led-key">Small numbers: order along the strip. <i></i>Power goes in at LEDs 0, 55 and 109.</p>
      </div>
      <div>
        <h3>Marking the panel</h3>
        <dl class="specs">
          <dt>First LED</dt><dd>21.33 mm from the left, 30.5 mm from the top, seen from the front</dd>
          <dt>Spacing</dt><dd>33.333 mm across, 35 mm down</dd>
          <dt>Tolerance</dt><dd>±1 mm up/down, or the grid won’t seat</dd>
          <dt>Strip run</dt><dd>366.7 mm in a 368 mm gap</dd>
        </dl>
      </div>
    </div>`;
  }

  function tabPrint() {
    const rows = PARTS.filter(p => p.kind === 'print').map(p => {
      const info = PRINT_INFO[p.id] || {}, done = printed(p);
      return `<tr class="${done ? 'done' : ''}">
        <td>${esc(p.stl.replace('.stl', ''))}</td>
        <td><span class="swatch sw-${p.colour}"></span>${p.colour}</td>
        <td class="r">${info.g} g</td>
        <td class="r">${hours(info.min)}</td>
        <td>${done ? 'printed' : ''}</td>
      </tr>`;
    }).join('');
    const sum = list => list.reduce((a, p) => [a[0] + PRINT_INFO[p.id].g, a[1] + PRINT_INFO[p.id].min], [0, 0]);
    const [g, m] = sum(PARTS.filter(p => p.kind === 'print' && !p.test));
    return `<div class="ref-grid">
      <div>
        <div class="table-wrap"><table class="ptable">
          <thead><tr><th>File</th><th>Colour</th><th class="r">PLA</th><th class="r">Time</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot><tr><td colspan="2">Clock parts, without tests</td><td class="r">${g} g</td><td class="r">${hours(m)}</td><td></td></tr></tfoot>
        </table></div>
        <p class="fine">CuraEngine 5.13 slice with these settings, without heat-up.</p>
      </div>
      <div>
        <h3>Cura, Ultimaker 3</h3>
        <dl class="specs">
          <dt>Extruder</dt><dd>Single (disable extruder 2), left, AA 0.4. Prime tower off</dd>
          <dt>Filament</dt><dd>2.85 mm PLA</dd>
          <dt>Layers</dt><dd>0.2 mm, 20 % infill</dd>
          <dt>Brim</dt><dd>1.2 mm, initial layer width 100 %</dd>
          <dt>Travel avoid</dt><dd>1 mm</dd>
          <dt>Placement</dt><dd>X −12, Y −1, Z 0 from bed centre (Y +1 with Flip Y)</dd>
          <dt>Orientation</dt><dd>As exported, 100 %. Don’t mirror: the faceplates are mirrored on purpose</dd>
        </dl>
      </div>
    </div>`;
  }

  function tabFirmware() {
    return `<div class="ref-grid">
      <div>
        <h3>What the clock is telling you</h3>
        <ul class="signals">
          <li><i class="sig" style="background:#ff4a3d"></i><div><b>Three red blinks at boot</b>Should be the H of HET, top left from the front. If not, flip <code>SERPENTINE_STARTS_LEFT</code> or <code>_TOP</code> and reflash.</div></li>
          <li><i class="sig" style="background:#d08327"></i><div><b>Amber pulse on the first LED</b>No time yet: check the Wi-Fi details.</div></li>
          <li><i class="sig" style="background:#9a5ad0"></i><div><b>HET IS in violet</b>No time sync for 26 hours; it may drift.</div></li>
          <li><i class="sig" style="background:var(--accent)"></i><div><b>Warm white</b>Normal. Dims from 23:00 to 07:00.</div></li>
        </ul>
      </div>
      <div>
        <h3>Arduino IDE</h3>
        <dl class="specs">
          <dt>Board</dt><dd>ESP32 Dev Module</dd>
          <dt>Versions</dt><dd>esp32 core 3.3.12, FastLED 3.10.5</dd>
          <dt>Sketches</dt><dd><code>firmware/light_test</code>, then <code>firmware/qlock</code></dd>
          <dt>Wi-Fi</dt><dd>Two <code>#define</code>s at the top. Don’t commit them</dd>
          <dt>Updates</dt><dd>Over Wi-Fi, hostname <code>qlock</code></dd>
        </dl>
      </div>
    </div>`;
  }

  const TABS = { wiring: tabWiring, leds: tabLeds, print: tabPrint, firmware: tabFirmware };
  const VIEWS = ['build', ...Object.keys(TABS)];
  const viewFromHash = () => { const v = location.hash.slice(1); return VIEWS.includes(v) ? v : 'build'; };
  let view = viewFromHash();

  function renderView() {
    $$('#views [role=tab]').forEach(b => { b.setAttribute('aria-selected', b.dataset.view === view); b.tabIndex = b.dataset.view === view ? 0 : -1; });
    $('#view-build').hidden = view !== 'build';
    $('#view-ref').hidden = view === 'build';
    if (view !== 'build') renderRef();
  }
  function renderRef() {
    const panel = $('#view-ref');
    panel.setAttribute('aria-label', $(`#views [data-view="${view}"]`).textContent);
    panel.innerHTML = TABS[view]();
  }
  function setView(v) {
    if (v === view) return;
    view = v;
    history.replaceState(null, '', v === 'build' ? location.pathname + location.search : '#' + v);
    $('#view-ref').scrollTop = 0;
    scrollTo(0, 0);
    renderView();
  }
  function bindViews() {
    $('#views').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setView(b.dataset.view); });
    $('#views').addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const i = VIEWS.indexOf(view);
      setView(VIEWS[(i + (e.key === 'ArrowRight' ? 1 : VIEWS.length - 1)) % VIEWS.length]);
      $(`#views [data-view="${view}"]`).focus();
    });
    addEventListener('hashchange', () => setView(viewFromHash()));
    $('#view-ref').addEventListener('click', e => {
      const s = e.target.closest('[data-side]');
      if (s) { ledSide = s.dataset.side; renderRef(); $(`[data-side="${ledSide}"]`).focus(); }
    });
  }

  // ---------------------------------------------------------------- saving
  function bindStatus() {
    const banner = $('#banner');
    Store.onStatus(({ mode, error }) => {
      let msg = '', warn = false;
      if (mode === 'server' && error) { msg = 'Can’t reach <code>serve.py</code>. Your changes are kept here and saved once it’s back.'; warn = true; }
      else if (mode === 'static') msg = 'Read-only copy. Ticks stay in this browser; run <code>python3 site/serve.py</code> to save them to the project.';
      else if (mode === 'local') { msg = 'Opened as a file. Run <code>python3 site/serve.py</code> from the project folder instead.'; warn = true; }
      banner.hidden = !msg;
      banner.className = 'banner' + (warn ? ' warn' : '');
      banner.innerHTML = msg;
    });
  }

  // ---------------------------------------------------------------- render
  // Rendering replaces the lists. Never do it halfway through a click (the
  // button would vanish between press and release), and afterwards put focus
  // and half-typed text back where they were.
  let busySince = 0, queued = false, focusAfter = null;
  document.addEventListener('pointerdown', () => { busySince = Date.now(); }, true);
  const release = () => setTimeout(() => { busySince = 0; if (queued) { queued = false; renderAll(); } }, 0);
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);

  const FOCUS_ATTRS = ['data-task', 'data-gotit', 'data-setshop', 'data-note', 'data-open', 'data-shopjump', 'data-rmtask',
    'data-rmshop', 'data-step-task', 'data-step-shop', 'data-step-jump', 'data-part', 'data-copy', 'data-addstep'];
  function focusKey(el) {
    if (!el || el === document.body || !el.closest) return null;
    const form = el.closest('.add-step');
    if (form) return [`.add-step[data-phase="${form.dataset.phase}"] input`];
    const a = FOCUS_ATTRS.find(x => el.hasAttribute(x));
    if (!a) return null;
    let sel = `[${a}="${CSS.escape(el.getAttribute(a))}"]`;
    if (el.dataset.v) sel += `[data-v="${CSS.escape(el.dataset.v)}"]`;
    return [sel, `[${a}="${CSS.escape(el.getAttribute(a))}"]`];
  }

  function renderAll() {
    if (busySince && Date.now() - busySince < 2000) { queued = true; return; }
    const key = focusKey(document.activeElement);
    const draft = $('.add-step input')?.value;

    renderSummary();
    renderPlan();
    renderShop();
    renderTodo();
    renderCard();
    if (window.THREE) Viewer.setStatuses?.(statusMap());
    if (view === 'print') renderRef();

    if (draft) { const i = $('.add-step input'); if (i) i.value = draft; }
    const el = focusAfter ? $(focusAfter) : key && key.map(k => $(k)).find(Boolean);
    focusAfter = null;
    if (el && el !== document.activeElement) el.focus({ preventScroll: true });
  }

  async function main() {
    renderFace();
    bindPlan(); bindShop(); bindViews(); bindStatus(); bindViewer();
    renderView();
    Store.subscribe(renderAll);
    await Store.load();
    startViewer();
    setInterval(() => {
      const m = now.getMinutes();
      renderFace();
      if (lit && !litTime && now.getMinutes() !== m) setLitTime();
    }, 10000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderFace(); Store.refresh(); } });
    window.addEventListener('focus', () => Store.refresh());
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => Viewer.retheme?.());
  }

  main();
})();
