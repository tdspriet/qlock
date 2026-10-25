/* QLOCK build tracker — UI. Content comes from data.js, ticks from Store. */
(() => {
  // ---------------------------------------------------------------- helpers
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const euro = (n, dp = 2) => '€' + Number(n || 0).toFixed(dp).replace(/\.00$/, '');
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
  const fmtDateTime = iso => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const fmtHours = min => min >= 60 ? `${Math.floor(min / 60)} h ${String(Math.round(min % 60)).padStart(2, '0')}` : `${Math.round(min)} min`;
  const pref = {
    get(k, d) { try { const v = localStorage.getItem('qlock.ui.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('qlock.ui.' + k, JSON.stringify(v)); } catch { /* fine */ } },
  };
  const ICON = {
    check: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    out: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5h5v5M9.5 2.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    x: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    caret: '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const STATUS_LABEL = { buy: 'To buy', print: 'To print', build: 'To build', done: 'Done' };
  const SHOP_LABEL = { need: 'To get', got: 'Got it', have: 'Already have', skip: 'Not needed' };
  const REF_LABEL = { leds: 'Face & LEDs', wiring: 'Wiring', print: 'Printing', firmware: 'Firmware', rules: 'Don’t forget', log: 'Build log' };

  // ---------------------------------------------------------------- derived state
  const S = () => Store.get();
  const byAt = (a, b) => (a.at || '').localeCompare(b.at || '');
  const shopItems = () => [...SHOP, ...Object.values(S().custom.shop).sort(byAt).map(i => ({ ...i, custom: true }))];
  const shopById = id => shopItems().find(i => i.id === id);
  const shopStatus = item => S().shop[item.id]?.status || item.defaultStatus || 'need';
  const sorted = st => st === 'got' || st === 'have' || st === 'skip';
  const itemsSorted = ids => ids.every(id => { const i = shopById(id); return !i || sorted(shopStatus(i)); });

  const phases = () => PHASES.map(p => ({
    ...p,
    tasks: [...p.tasks, ...Object.values(S().custom.tasks).filter(t => t.phase === p.id).sort(byAt).map(t => ({ ...t, custom: true }))],
  }));
  const allTasks = () => phases().flatMap(p => p.tasks.map(t => ({ ...t, phase: p.id })));
  const taskById = id => allTasks().find(t => t.id === id);
  const taskDone = t => t ? (t.shop ? itemsSorted(t.shop) : !!S().tasks[t.id]) : false;
  const stepDone = st => st.shop ? itemsSorted(st.shop) : taskDone(taskById(st.task));
  // A ticked later step implies the earlier ones happened (you can't print
  // a tile without filament), so status follows the furthest step done.
  const reached = p => { let n = 0; p.steps.forEach((s, i) => { if (stepDone(s)) n = i + 1; }); return n; };
  const partStatus = p => { const st = p.steps.slice(reached(p)).find(s => !stepDone(s)); return st ? st.kind : 'done'; };
  const partProgress = p => [reached(p), p.steps.length];
  const printed = p => p.kind === 'print' && p.steps.filter(s => s.kind === 'print' && s.task).every(stepDone);

  // ---------------------------------------------------------------- header
  function renderFace(el, lit, opts = {}) {
    let html = '';
    LETTERS.forEach((row, r) => [...row].forEach((ch, c) => {
      const i = r * 11 + c;
      html += `<span class="${lit.has(i) ? 'on' : ''}"${opts.title ? ` data-i="${i}"` : ''}>${ch}</span>`;
    }));
    el.innerHTML = html;
  }

  let liveNow = new Date();
  function renderClock() {
    liveNow = new Date();
    const { lit, phrase } = CLOCK.at(liveNow.getHours(), liveNow.getMinutes());
    renderFace($('#mini-face'), lit);
    $('#phrase').textContent = phrase;
    $('#mini-face').classList.toggle('night', CLOCK.isNight(liveNow.getHours()));
  }

  function renderStats() {
    const tasks = allTasks(), done = tasks.filter(taskDone).length;
    const pct = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    const printParts = PARTS.filter(p => p.kind === 'print');
    const left = printParts.filter(p => !printed(p));
    const gLeft = left.reduce((a, p) => a + (PRINT_INFO[p.id]?.g || 0), 0);
    const minLeft = left.reduce((a, p) => a + (PRINT_INFO[p.id]?.min || 0), 0);
    const items = shopItems(), need = items.filter(i => shopStatus(i) === 'need');
    const toSpend = need.reduce((a, i) => a + i.price * i.qty, 0);
    const next = tasks.find(t => !taskDone(t));
    $('#stats').innerHTML = `
      <div class="stat stat-main">
        <span class="stat-k">Overall</span>
        <span class="stat-v">${pct}<small>%</small></span>
        <span class="bar"><i style="width:${pct}%"></i></span>
        <span class="stat-s">${done} of ${tasks.length} steps</span>
      </div>
      <div class="stat">
        <span class="stat-k">Still to print</span>
        <span class="stat-v">${left.length}<small> / ${printParts.length} parts</small></span>
        <span class="stat-s">${gLeft} g PLA${minLeft ? ` · ≈ ${fmtHours(minLeft)}` : ''}</span>
      </div>
      <div class="stat">
        <span class="stat-k">Still to buy</span>
        <span class="stat-v">${euro(toSpend, 0)}</span>
        <span class="stat-s">${need.length} item${need.length === 1 ? '' : 's'}, estimated</span>
      </div>
      <div class="stat stat-next">
        <span class="stat-k">Up next</span>
        <span class="stat-t">${next ? esc(next.title) : 'Nothing. It’s on the wall.'}</span>
      </div>`;
  }

  // ---------------------------------------------------------------- plan
  const openPhases = new Set(pref.get('openPhases', []));
  const closedPhases = new Set(pref.get('closedPhases', []));
  const openNotes = new Set();

  function taskRow(t, n) {
    const done = taskDone(t);
    const auto = !!t.shop;
    let check, meta = [];
    if (auto) {
      const got = t.shop.filter(id => { const i = shopById(id); return !i || sorted(shopStatus(i)); }).length;
      const frac = got / t.shop.length;
      check = `<button type="button" class="check auto ${done ? 'on' : ''}" data-shopjump="${esc(t.id)}" style="--frac:${frac}" title="Ticks itself once these are sorted in the shopping list" aria-label="${esc(t.title)}: ${got} of ${t.shop.length} items sorted, show in the shopping list">${ICON.check}</button>`;
      meta.push(`<button type="button" class="t-link" data-shopjump="${esc(t.id)}">${done ? 'All sorted' : `${got} of ${t.shop.length} sorted`} · shopping list →</button>`);
    } else {
      check = `<button type="button" class="check ${done ? 'on' : ''}" role="checkbox" aria-checked="${done}" data-task="${esc(t.id)}" aria-label="${esc(t.title)}">${ICON.check}</button>`;
    }
    const pi = t.part && PRINT_INFO[t.part];
    if (pi) meta.push(`<span class="t-date">${pi.min ? '≈ ' + fmtHours(pi.min) + ' · ' : ''}${pi.g} g</span>`);
    if (t.ref) meta.push(`<a class="t-link" href="#${t.ref}" data-tab-link="${t.ref}">${esc(REF_LABEL[t.ref])}</a>`);
    if (done && !auto && S().tasks[t.id]?.done) meta.push(`<span class="t-date">done ${fmtDate(S().tasks[t.id].done)}</span>`);
    if (t.custom) meta.push(`<button type="button" class="t-link t-remove" data-rmtask="${esc(t.id)}">Remove</button>`);
    const noteOpen = openNotes.has(t.id);
    const title = t.note
      ? `<button type="button" class="t-title has-note" aria-expanded="${noteOpen}" data-note="${esc(t.id)}">${esc(t.title)}<span class="caret">${ICON.caret}</span></button>`
      : `<span class="t-title">${esc(t.title)}</span>`;
    return `<li class="task ${done ? 'done' : ''}" data-id="${esc(t.id)}">
      ${check}
      <div class="t-body">
        ${n != null ? `<span class="t-phase">${esc(n)}</span>` : ''}
        ${title}
        ${t.note ? `<p class="t-note" ${noteOpen ? '' : 'hidden'}>${esc(t.note)}</p>` : ''}
        ${meta.length ? `<div class="t-meta">${meta.join('')}</div>` : ''}
      </div>
    </li>`;
  }

  function renderPlan() {
    const ps = phases();
    const tasks = allTasks();
    const firstOpen = ps.find(p => p.tasks.some(t => !taskDone(t)));
    const next = tasks.filter(t => !taskDone(t)).slice(0, 3);
    $('#plan-meta').textContent = `${tasks.filter(taskDone).length} / ${tasks.length}`;
    $('#next').innerHTML = next.length
      ? `<h3 class="next-h">Up next</h3><ol class="tasks">${next.map(t => taskRow(t, ps.find(p => p.id === t.phase).name)).join('')}</ol>`
      : `<div class="next-done"><strong>All steps done.</strong> Enjoy the clock.</div>`;

    $('#phases').innerHTML = ps.map((p, i) => {
      const d = p.tasks.filter(taskDone).length, n = p.tasks.length;
      const complete = d === n;
      const open = closedPhases.has(p.id) ? false : openPhases.has(p.id) || p === firstOpen;
      return `<details class="phase ${complete ? 'complete' : ''} ${p === firstOpen ? 'current' : ''}" data-phase="${p.id}" ${open ? 'open' : ''}>
        <summary>
          <span class="ph-num">${i + 1}</span>
          <span class="ph-name">${esc(p.name)}</span>
          <span class="ph-count">${d}/${n}</span>
          <span class="ph-bar"><i style="width:${n ? d / n * 100 : 0}%"></i></span>
        </summary>
        <p class="ph-blurb">${esc(p.blurb)}</p>
        <ol class="tasks">${p.tasks.map(t => taskRow(t)).join('')}</ol>
        <form class="add-task" data-phase="${p.id}" autocomplete="off">
          <input name="step" placeholder="Add a step to ${esc(p.name.toLowerCase())}" maxlength="160" aria-label="New step in ${esc(p.name)}">
          <button type="submit" aria-label="Add step">+</button>
        </form>
      </details>`;
    }).join('');
  }

  function bindPlan() {
    const col = $('.col-plan');
    col.addEventListener('click', e => {
      const t = e.target.closest('[data-task]');
      if (t) { Store.toggleTask(t.dataset.task); return; }
      const n = e.target.closest('[data-note]');
      if (n) {
        const id = n.dataset.note;
        openNotes.has(id) ? openNotes.delete(id) : openNotes.add(id);
        renderAll();
        return;
      }
      const j = e.target.closest('[data-shopjump]');
      if (j) { jumpToShop(taskById(j.dataset.shopjump).shop); return; }
      const r = e.target.closest('[data-rmtask]');
      if (r) Store.removeCustomTask(r.dataset.rmtask);
    });
    col.addEventListener('toggle', e => {
      const d = e.target.closest('details.phase');
      if (!d) return;
      const id = d.dataset.phase;
      if (d.open) { openPhases.add(id); closedPhases.delete(id); } else { openPhases.delete(id); closedPhases.add(id); }
      pref.set('openPhases', [...openPhases]); pref.set('closedPhases', [...closedPhases]);
    }, true);
    col.addEventListener('submit', e => {
      const f = e.target.closest('.add-task');
      if (!f) return;
      e.preventDefault();
      const input = f.elements.step, v = input.value.trim();
      input.value = '';
      if (v) Store.addCustomTask(f.dataset.phase, v);
    });
  }

  // ---------------------------------------------------------------- shopping
  let shopFilter = pref.get('shopFilter', 'need');
  const openItems = new Set();

  function itemRow(i) {
    const st = shopStatus(i), rec = S().shop[i.id] || {};
    const total = i.price * i.qty;
    const open = openItems.has(i.id);
    const host = i.url ? (() => { try { return new URL(i.url).hostname.replace(/^www\./, ''); } catch { return ''; } })() : '';
    const meta = [
      i.shop ? `<span>${esc(i.shop)}</span>` : '',
      i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(host || 'link')} ${ICON.out}</a>` : '',
      i.later && st === 'need' ? `<span class="tag">later</span>` : '',
      st !== 'need' && st !== 'got' ? `<span class="tag tag-${st}">${SHOP_LABEL[st]}</span>` : '',
      st === 'got' && rec.at ? `<span class="t-date">got ${fmtDate(rec.at)}</span>` : '',
    ].filter(Boolean).join('<span class="sep">·</span>');
    const choices = ['need', 'got', 'have', 'skip'].map(s =>
      `<button type="button" class="chip ${st === s ? 'on' : ''}" data-setshop="${esc(i.id)}" data-v="${s}" aria-pressed="${st === s}">${SHOP_LABEL[s]}</button>`).join('');
    return `<li class="item st-${st} ${open ? 'open' : ''}" data-id="${esc(i.id)}">
      <button type="button" class="check ${sorted(st) ? 'on' : ''}" role="checkbox" aria-checked="${sorted(st)}" data-gotit="${esc(i.id)}" aria-label="${esc(i.name)}">${ICON.check}</button>
      <div class="i-body">
        <button type="button" class="i-name" data-open="${esc(i.id)}" aria-expanded="${open}">${esc(i.name)}${i.qty > 1 ? ` <span class="i-qty">× ${i.qty}</span>` : ''}</button>
        ${meta ? `<div class="i-meta">${meta}</div>` : ''}
        <div class="i-more" ${open ? '' : 'hidden'}>
          ${i.note ? `<p>${esc(i.note)}</p>` : ''}
          ${i.src ? `<p class="i-src">Price: ${esc(i.src)}.</p>` : ''}
          <div class="chips">${choices}</div>
          <label class="paid">Paid <input type="number" min="0" step="0.01" inputmode="decimal" data-paid="${esc(i.id)}" value="${rec.paid ?? ''}" placeholder="${total.toFixed(2)}" aria-label="Actually paid for ${esc(i.name)}"> €</label>
          ${i.custom ? `<button type="button" class="t-link t-remove" data-rmshop="${esc(i.id)}">Remove from list</button>` : ''}
        </div>
      </div>
      <span class="i-price">${total ? euro(total) : '—'}</span>
    </li>`;
  }

  function renderShop() {
    const items = shopItems();
    const need = items.filter(i => shopStatus(i) === 'need');
    const got = items.filter(i => shopStatus(i) === 'got');
    const toSpend = need.reduce((a, i) => a + i.price * i.qty, 0);
    const spent = got.reduce((a, i) => a + (S().shop[i.id]?.paid ?? i.price * i.qty), 0);
    const total = toSpend + spent;
    $('#shop-meta').textContent = `${items.length - need.length} / ${items.length}`;
    $('#budget').innerHTML = `
      <div class="b-main"><span class="b-v">${euro(toSpend)}</span><span class="b-k">left to spend</span></div>
      <div class="bar"><i style="width:${total ? spent / total * 100 : 0}%"></i></div>
      <div class="b-sub"><span>${euro(spent)} spent</span><span>≈ ${euro(total, 0)} all in</span></div>`;

    $$('#seg-shopfilter button').forEach(b => b.setAttribute('aria-checked', b.dataset.v === shopFilter));
    const show = i => shopFilter === 'all' || (shopFilter === 'need' ? shopStatus(i) === 'need' : shopStatus(i) !== 'need');
    $('#shop').innerHTML = SHOP_GROUPS.map(g => {
      const all = items.filter(i => i.group === g.id);
      const vis = all.filter(show);
      const left = all.filter(i => shopStatus(i) === 'need');
      const sub = left.reduce((a, i) => a + i.price * i.qty, 0);
      const tt = left.filter(i => i.shop === 'TinyTronics');
      return `<section class="sgroup" data-group="${g.id}">
        <div class="sg-head">
          <h3>${esc(g.name)}</h3>
          <span class="sg-sum">${left.length ? `${left.length} left · ${euro(sub, 0)}` : 'all sorted'}</span>
        </div>
        ${tt.length > 1 ? `<button type="button" class="copy" data-copy="${g.id}">Copy TinyTronics order (${tt.length})</button>` : ''}
        ${vis.length ? `<ul class="items">${vis.map(itemRow).join('')}</ul>` : `<p class="empty">${shopFilter === 'need' ? 'Nothing left to get here.' : 'Nothing sorted yet.'}</p>`}
      </section>`;
    }).join('');
  }

  function bindShop() {
    const col = $('.col-shop');
    col.addEventListener('click', async e => {
      const c = e.target.closest('[data-gotit]');
      if (c) {
        const i = shopById(c.dataset.gotit);
        Store.setShop(i.id, sorted(shopStatus(i)) ? 'need' : (i.defaultStatus || 'got'));
        return;
      }
      const o = e.target.closest('[data-open]');
      if (o) { const id = o.dataset.open; openItems.has(id) ? openItems.delete(id) : openItems.add(id); renderAll(); return; }
      const s = e.target.closest('[data-setshop]');
      if (s) { Store.setShop(s.dataset.setshop, s.dataset.v); return; }
      const r = e.target.closest('[data-rmshop]');
      if (r) { Store.removeCustomShop(r.dataset.rmshop); return; }
      const f = e.target.closest('#seg-shopfilter button');
      if (f) { shopFilter = f.dataset.v; pref.set('shopFilter', shopFilter); renderAll(); return; }
      const cp = e.target.closest('[data-copy]');
      if (cp) {
        const lines = shopItems().filter(i => i.group === cp.dataset.copy && i.shop === 'TinyTronics' && shopStatus(i) === 'need')
          .map(i => `${i.qty} × ${i.name}${i.url ? ' — ' + i.url : ''}`);
        const text = lines.join('\n');
        try { await navigator.clipboard.writeText(text); cp.textContent = 'Copied'; }
        catch { cp.textContent = 'Copy failed, select the text below'; cp.insertAdjacentHTML('afterend', `<textarea class="copy-fallback" readonly>${esc(text)}</textarea>`); }
        setTimeout(() => renderShop(), 1600);
      }
    });
    col.addEventListener('change', e => {
      const p = e.target.closest('[data-paid]');
      if (p) Store.setPaid(p.dataset.paid, p.value);
    });
    $('#add-shop').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#add-shop-name').value.trim();
      if (!name) return;
      Store.addCustomShop({
        name, group: $('#add-shop-group').value,
        price: Number($('#add-shop-price').value) || 0,
        qty: Math.max(1, parseInt($('#add-shop-qty').value, 10) || 1),
        url: $('#add-shop-url').value.trim() || undefined,
        shop: 'Added by you',
      });
      e.target.reset();
    });
  }

  function jumpToShop(ids) {
    if (shopFilter === 'got') { shopFilter = 'all'; renderShop(); }
    const rows = ids.map(id => $(`.col-shop .item[data-id="${CSS.escape(id)}"]`)).filter(Boolean);
    const target = rows[0] || $(`.col-shop .sgroup[data-group="${shopById(ids[0])?.group}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    rows.forEach(r => { r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); });
  }

  // ---------------------------------------------------------------- parts board
  const clockParts = () => PARTS.filter(p => !p.test);
  function renderBoard() {
    const cols = ['buy', 'print', 'build', 'done'];
    const by = Object.fromEntries(cols.map(c => [c, []]));
    PARTS.forEach(p => by[partStatus(p)].push(p));
    $('#board-meta').textContent = `${by.done.length} of ${PARTS.length} finished`;
    $('#board').innerHTML = cols.map(c => `
      <div class="b-col" data-st="${c}">
        <div class="b-col-h"><span class="dot"></span>${STATUS_LABEL[c]}<span class="n">${by[c].length}</span></div>
        <ul>${by[c].map(p => {
          const [d, n] = partProgress(p);
          return `<li><button type="button" class="part-chip ${selection?.part === p.id || selection?.family === p.family ? 'sel' : ''}" data-part="${p.id}">
            <span class="pc-name">${esc(p.name)}</span>
            <span class="pc-meta">${p.test ? '<span class="tag">test</span>' : ''}<span class="pc-steps">${d}/${n}</span></span>
          </button></li>`;
        }).join('') || '<li class="b-empty">—</li>'}</ul>
      </div>`).join('');
  }

  // ---------------------------------------------------------------- 3D
  let selection = null, colourMode = pref.get('colourMode', 'status'), lit = false, litOverride = null;
  const FAMILY_NAME = { faceplate: 'Faceplate', splines: 'Splines', diffuser: 'Diffuser film', lightgrid: 'Light grid',
    leds: 'LED rows', panel: 'Back panel', electronics: 'Electronics', frame: 'Wooden frame', rearcover: 'Rear cover', test: 'Test pieces' };

  function statusMap() {
    return Object.fromEntries(PARTS.map(p => [p.id, partStatus(p)]));
  }

  function renderLegend() {
    const counts = { buy: 0, print: 0, build: 0, done: 0 };
    clockParts().forEach(p => counts[partStatus(p)]++);
    const hide = colourMode === 'real' || lit;
    $('#v-legend').hidden = hide;
    $('#v-legend').innerHTML = Object.entries(counts).map(([k, n]) =>
      `<span class="lg lg-${k}"><span class="dot"></span>${STATUS_LABEL[k]}<b>${n}</b></span>`).join('');
  }

  function stepButton(st) {
    const done = stepDone(st);
    if (st.shop) {
      const items = st.shop.map(shopById).filter(Boolean);
      if (items.length === 1) {
        return `<button type="button" class="step ${done ? 'on' : ''}" data-step-shop="${items[0].id}" aria-pressed="${done}" data-kind="${st.kind}">${done ? ICON.check : ''}${esc(st.label)}</button>`;
      }
      const n = items.filter(i => sorted(shopStatus(i))).length;
      return `<button type="button" class="step ${done ? 'on' : ''}" data-step-jump="${st.shop.join(',')}" data-kind="${st.kind}">${done ? ICON.check : ''}${esc(st.label)} <small>${n}/${items.length}</small></button>`;
    }
    const t = taskById(st.task);
    if (t?.shop) return `<button type="button" class="step ${done ? 'on' : ''}" data-step-jump="${t.shop.join(',')}" data-kind="${st.kind}">${done ? ICON.check : ''}${esc(st.label)}</button>`;
    return `<button type="button" class="step ${done ? 'on' : ''}" data-step-task="${esc(st.task)}" aria-pressed="${done}" data-kind="${st.kind}" title="${esc(t?.title || '')}">${done ? ICON.check : ''}${esc(st.label)}</button>`;
  }

  function renderCard() {
    const card = $('#v-card');
    if (!selection) { card.hidden = true; return; }
    const family = selection.family || PARTS.find(p => p.id === selection.part)?.family;
    const list = PARTS.filter(p => p.family === family);
    if (!list.length) { card.hidden = true; return; }
    card.hidden = false;
    card.innerHTML = `
      <div class="card-h">
        <h3>${esc(FAMILY_NAME[family] || family)}</h3>
        <button type="button" class="icon-btn" id="card-close" aria-label="Close">${ICON.x}</button>
      </div>
      ${PART_NOTES[family] ? `<p class="card-note">${esc(PART_NOTES[family])}</p>` : ''}
      <ul class="card-parts">${list.map(p => {
        const st = partStatus(p), info = PRINT_INFO[p.id];
        const facts = [
          p.stl ? `<code>stl/${esc(p.stl)}</code>` : '',
          info ? `${info.size} mm` : '',
          info ? `${info.g} g ${p.colour}` : '',
          info?.min ? `≈ ${fmtHours(info.min)}` : '',
        ].filter(Boolean).join('<span class="sep">·</span>');
        return `<li class="${p.id === selection.part ? 'sel' : ''}">
          <div class="cp-h"><span class="cp-name">${esc(p.name)}</span><span class="pill pill-${st}">${STATUS_LABEL[st]}</span></div>
          ${facts ? `<div class="cp-facts">${facts}</div>` : ''}
          <div class="steps">${p.steps.map(stepButton).join('<span class="arrow">→</span>')}</div>
        </li>`;
      }).join('')}</ul>`;
  }

  function select(sel) {
    selection = sel;
    Viewer.select(sel?.part || (sel?.family ? PARTS.find(p => p.family === sel.family)?.id : null));
    renderCard();
    renderBoard();
  }

  function bindViewer() {
    const segColour = $('#seg-colour'), segExplode = $('#seg-explode');
    let explodeTarget = Viewer.getExplode();
    const syncSegs = () => {
      $$('button', segColour).forEach(b => b.setAttribute('aria-checked', b.dataset.v === colourMode));
      $$('button', segExplode).forEach(b => b.setAttribute('aria-checked', Number(b.dataset.v) === explodeTarget));
    };
    const explodeTo = t => {
      explodeTarget = t;
      Viewer.setExplode(t, true, v => { $('#explode').value = v; });
      $('#explode').value = t;
      syncSegs();
    };
    segColour.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      colourMode = b.dataset.v; pref.set('colourMode', colourMode);
      Viewer.setColourMode(colourMode); renderLegend(); syncSegs();
    });
    segExplode.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      explodeTo(Number(b.dataset.v));
    });
    $('#explode').addEventListener('input', e => { explodeTarget = Number(e.target.value); Viewer.setExplode(explodeTarget); syncSegs(); });
    $('#seg-view').addEventListener('click', e => { const b = e.target.closest('button'); if (b) Viewer.view(b.dataset.v); });

    const litBtn = $('#btn-lit');
    litBtn.addEventListener('click', () => {
      lit = !lit;
      litBtn.setAttribute('aria-pressed', lit);
      $('#v-time').hidden = !lit;
      Viewer.setLit(lit);
      if (lit) {
        if (Viewer.getExplode() > 0.05) explodeTo(0);
        Viewer.view('front');
        updateLitTime();
      }
      renderLegend(); syncSegs();
    });
    $('#lit-time').addEventListener('input', e => {
      const [h, m] = e.target.value.split(':').map(Number);
      if (Number.isFinite(h)) { litOverride = [h, m]; updateLitTime(); }
    });
    $('#lit-now').addEventListener('click', () => { litOverride = null; updateLitTime(); });

    $('#viewer').addEventListener('click', e => {
      if (e.target.closest('#card-close')) { select(null); return; }
      const st = e.target.closest('[data-step-task]');
      if (st) { Store.toggleTask(st.dataset.stepTask); return; }
      const ss = e.target.closest('[data-step-shop]');
      if (ss) { const i = shopById(ss.dataset.stepShop); Store.setShop(i.id, sorted(shopStatus(i)) ? 'need' : (i.defaultStatus || 'got')); return; }
      const sj = e.target.closest('[data-step-jump]');
      if (sj) jumpToShop(sj.dataset.stepJump.split(','));
    });
    $('#board').addEventListener('click', e => {
      const b = e.target.closest('[data-part]'); if (!b) return;
      const p = PARTS.find(x => x.id === b.dataset.part);
      select(selection?.part === p.id ? null : { part: p.id });
      const v = $('#viewer');
      if (v.getBoundingClientRect().top < 0) v.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    syncSegs();
  }

  function updateLitTime() {
    const [h, m] = litOverride || [liveNow.getHours(), liveNow.getMinutes()];
    const input = $('#lit-time');
    const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (document.activeElement !== input) input.value = v;
    Viewer.setTime(h, m);
  }

  async function startViewer() {
    const load = $('#v-load');
    if (!window.THREE || !THREE.STLLoader) { load.textContent = 'The 3D view needs vendor/three.min.js.'; return; }
    const failed = await Viewer.init($('#viewer'), {
      stlBase: '../stl/',
      onSelect: sel => select(sel && (selection?.part === sel.part && sel.part) ? null : sel),
      onHover: id => {
        const tip = $('#v-tip');
        if (!id) { tip.hidden = true; return; }
        const p = PARTS.find(x => x.id === id);
        const st = partStatus(p);
        tip.innerHTML = `${esc(p.name)} <span class="pill pill-${st}">${STATUS_LABEL[st]}</span>`;
        tip.hidden = false;
      },
      onProgress: (n, total, bad) => { load.textContent = `Loading printed parts ${n} / ${total}`; if (n === total && !bad) load.hidden = true; },
    });
    Viewer.setStatuses(statusMap());
    Viewer.setColourMode(colourMode);
    if (failed) {
      load.hidden = false;
      load.classList.add('warn');
      load.innerHTML = location.protocol === 'file:'
        ? 'Browsers block STL files opened from disk. Start it with <code>python3 site/serve.py</code>.'
        : `${failed} STL file${failed > 1 ? 's' : ''} didn’t load. Check <code>stl/</code>.`;
    }
  }

  // ---------------------------------------------------------------- reference
  let refTab = pref.get('refTab', 'leds');
  let refTime = null, faceShow = pref.get('faceShow', 'letters'), faceSide = pref.get('faceSide', 'front');

  function tabLeds() {
    return `<div class="ref-grid">
      <div>
        <div class="face-tools">
          <div class="seg seg-small" id="face-show" role="radiogroup" aria-label="Show">
            <button type="button" data-v="letters" role="radio">Letters</button>
            <button type="button" data-v="leds" role="radio">LED numbers</button>
          </div>
          <div class="seg seg-small" id="face-side" role="radiogroup" aria-label="Seen from">
            <button type="button" data-v="front" role="radio">From the front</button>
            <button type="button" data-v="back" role="radio">From the back</button>
          </div>
        </div>
        <div class="bigface-wrap"><div class="bigface" id="bigface"></div></div>
        <div class="scrub">
          <label for="scrub">Time</label>
          <input type="range" id="scrub" min="0" max="287" step="1">
          <output id="scrub-out"></output>
          <button type="button" class="chip" id="scrub-now">Now</button>
        </div>
        <p class="scrub-phrase" id="scrub-phrase"></p>
      </div>
      <div class="ref-text">
        <h3>Marking the panel</h3>
        <dl class="specs">
          <dt>First LED centre</dt><dd>21.33 mm from the left, 30.5 mm from the top, seen from the front</dd>
          <dt>Column pitch</dt><dd>33.333 mm (exactly 30 LED/m)</dd>
          <dt>Row pitch</dt><dd>35 mm</dd>
          <dt>Row tolerance</dt><dd>±1 mm in Y, or the grid won’t seat</dd>
          <dt>Strip run</dt><dd>366.7 mm in a 368 mm gap: ~0.7 mm play per end</dd>
          <dt>Power injection</dt><dd>LEDs 0, 55 and 109 <span class="inj-key"></span></dd>
        </dl>
        <h3>Snake</h3>
        <p>Seen from the front: row 1 left → right, row 2 right → left, and so on. From the open back every direction reverses, and alternate strips are turned 180°: follow the arrows on the strip.</p>
        <pre class="code">led = row * 11 + (col if row % 2 == 0 else 10 - col)</pre>
        <p>The clock lights at most 23 letters. <b>HET</b> and <b>IS</b> are always on; <b>UUR</b> only on the hour.</p>
      </div>
    </div>`;
  }

  function renderBigFace() {
    const el = $('#bigface');
    if (!el) return;
    const t = refTime ?? (liveNow.getHours() * 60 + Math.floor(liveNow.getMinutes() / 5) * 5);
    const h = Math.floor(t / 60), m = t % 60;
    const { lit, phrase } = CLOCK.at(h, m);
    const back = faceSide === 'back';
    let html = '';
    for (let r = 0; r < 10; r++) {
      const dir = (r % 2 === 0) !== back ? '→' : '←';
      html += `<span class="row-num" aria-hidden="true">${r + 1}</span>`;
      for (let vc = 0; vc < 11; vc++) {
        const c = back ? 10 - vc : vc;
        const i = r * 11 + c, n = CLOCK.led(i);
        const inj = n === 0 || n === 55 || n === 109;
        const label = faceShow === 'leds' ? n : LETTERS[r][c];
        html += `<span class="cell ${lit.has(i) ? 'on' : ''} ${inj ? 'inj' : ''}" title="Row ${r + 1}, column ${c + 1} · LED ${n}">${label}</span>`;
      }
      html += `<span class="row-dir" aria-hidden="true">${dir}</span>`;
    }
    el.innerHTML = html;
    el.classList.toggle('back', back);
    el.classList.toggle('show-leds', faceShow === 'leds');
    el.classList.toggle('night', CLOCK.isNight(h));
    $('#scrub').value = t / 5;
    $('#scrub-out').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    $('#scrub-phrase').textContent = phrase + (CLOCK.isNight(h) ? '  · dimmed to 25/255 (23:00–07:00)' : '');
    $$('#face-show button').forEach(b => b.setAttribute('aria-checked', b.dataset.v === faceShow));
    $$('#face-side button').forEach(b => b.setAttribute('aria-checked', b.dataset.v === faceSide));
  }

  function tabWiring() {
    const pins = [
      [1, '1OE', 'GND', 'gnd', 'Active-low enable. Never floating.'],
      [2, '1A', 'GPIO16 via harness + 10 kΩ to GND', 'data', 'Pulldown holds it low during boot.'],
      [3, '1Y', '470 Ω → strip DIN', 'data', 'Resistor right at the strip.'],
      [4, '2OE', '5 V', 'v5', 'Unused enable'],
      [5, '2A', 'GND', 'gnd', 'Unused input'],
      [6, '2Y', 'not connected', 'nc', ''],
      [7, 'GND', 'GND', 'gnd', '100 nF to pin 14'],
      [8, '3Y', 'not connected', 'nc', ''],
      [9, '3A', 'GND', 'gnd', 'Unused input'],
      [10, '3OE', '5 V', 'v5', 'Unused enable'],
      [11, '4Y', 'not connected', 'nc', ''],
      [12, '4A', 'GND', 'gnd', 'Unused input'],
      [13, '4OE', '5 V', 'v5', 'Unused enable'],
      [14, 'VCC', '5 V', 'v5', '100 nF to pin 7'],
    ];
    const left = pins.slice(0, 7), right = pins.slice(7).reverse();
    const pinName = n => n.endsWith('OE') ? `${n[0]}<span class="ol">OE</span>` : n;
    const pinRow = (p, side) => `<div class="pin pin-${p[3]} ${side}"><span class="pn">${p[0]}</span><span class="pname">${pinName(p[1])}</span><span class="pconn">${esc(p[2])}</span></div>`;
    return `<div class="ref-grid wiring">
      <div class="diagram-wrap">${WIRING_SVG}</div>
      <div class="ref-text">
        <div class="callout danger">
          <h3>Programming over USB</h3>
          <ol>
            <li>Switch the clock off and unplug the whole 3-wire ESP32 harness.</li>
            <li>Connect USB to the bare ESP32 and upload. Nothing from the clock is connected to VIN, GND or GPIO16.</li>
            <li>Unplug USB, reconnect the harness, switch the supply on.</li>
          </ol>
          <p>Switching the supply off does not isolate VIN from the strip. Once it’s closed up, update over Wi-Fi (OTA).</p>
        </div>
      </div>
    </div>
    <div class="ref-grid wiring-2">
      <div>
        <h3>SN74AHCT125N, top view</h3>
        <div class="dip">
          <div class="dip-side">${left.map(p => pinRow(p, 'l')).join('')}</div>
          <div class="dip-body"><span class="notch"></span><span class="dip-name">74AHCT125</span></div>
          <div class="dip-side">${right.map(p => pinRow(p, 'r')).join('')}</div>
        </div>
      </div>
      <div class="ref-text">
        <h3>Wire and parts</h3>
        <dl class="specs">
          <dt>Supply feed</dt><dd>18 AWG red/black, jack straight to the distribution point</dd>
          <dt>Injection + jumpers</dt><dd>22 AWG red/black, short (0.5 mm² from the list is a bit thicker: fine)</dd>
          <dt>Data</dt><dd>24 AWG yellow (0.14 mm² from the list)</dd>
          <dt>Bulk cap</dt><dd>1000 µF, 16 V or more, across 5 V / GND at the strip input, stripe to GND</dd>
          <dt>Bypass cap</dt><dd>100 nF directly across pins 14 and 7</dd>
          <dt>Harness</dt><dd>Keyed, labelled: VIN, GND, GPIO16. ESP32 gets 5 V on VIN, no series diode</dd>
          <dt>Current</dt><dd>36 mA per LED at full white; firmware estimate capped at 3 A of the 4 A supply</dd>
        </dl>
      </div>
    </div>`;
  }

  function printTotals() {
    const sum = list => list.reduce((a, p) => [a[0] + (PRINT_INFO[p.id]?.g || 0), a[1] + (PRINT_INFO[p.id]?.min || 0)], [0, 0]);
    const all = PARTS.filter(p => p.kind === 'print');
    const [g1, m1] = sum(all.filter(p => !p.test)), [g2, m2] = sum(all.filter(p => p.test));
    const [g3, m3] = sum(all.filter(p => !printed(p)));
    return `<tr><td colspan="3">Clock parts</td><td class="num">${g1} g</td><td class="num">${fmtHours(m1)}</td><td></td></tr>
      <tr><td colspan="3">Test pieces</td><td class="num">${g2} g</td><td class="num">${fmtHours(m2)}</td><td></td></tr>
      <tr><td colspan="3">Still to print</td><td class="num">${g3} g</td><td class="num">${fmtHours(m3)}</td><td></td></tr>`;
  }

  function tabPrint() {
    const rows = PARTS.filter(p => p.kind === 'print').map(p => {
      const info = PRINT_INFO[p.id] || {};
      const pr = printed(p);
      const needPla = !pr && p.steps.some(s => s.shop && !stepDone(s));
      return `<tr class="${pr ? 'is-done' : ''}">
        <td><code>${esc(p.stl)}</code>${p.test ? ' <span class="tag">test</span>' : ''}</td>
        <td><span class="swatch sw-${p.colour}"></span>${p.colour}</td>
        <td class="num">${esc(info.size || '')}</td>
        <td class="num">${info.g ?? ''} g</td>
        <td class="num">${info.min ? fmtHours(info.min) : '—'}</td>
        <td><span class="pill pill-${pr ? 'done' : needPla ? 'buy' : 'print'}">${pr ? 'Printed' : needPla ? 'Need PLA' : 'To print'}</span></td>
      </tr>`;
    }).join('');
    const timed = PARTS.some(p => PRINT_INFO[p.id]?.min);
    return `<div class="table-wrap"><table class="ptable">
        <thead><tr><th>File</th><th>Colour</th><th class="num">Size (mm)</th><th class="num">PLA</th><th class="num">Time</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>${printTotals()}</tfoot>
      </table></div>
      <p class="fine">${timed ? esc(PRINT_TIME_NOTE) : 'Grams from the STL volume × 1.24 g/cm³, before brims and waste. Print times come from Cura for your printer profile.'}</p>
      <div class="ref-grid">
        <div class="ref-text">
          <h3>Cura, Ultimaker 3</h3>
          <dl class="specs">
            <dt>Extruders</dt><dd>Single: disable extruder 2. Prime tower off</dd>
            <dt>Core</dt><dd>Left extruder, AA 0.4</dd>
            <dt>Filament</dt><dd>2.85 mm PLA</dd>
            <dt>Layers / infill</dt><dd>0.2 mm, 20 %</dd>
            <dt>Brim</dt><dd>1.2 mm (3 lines at 0.4 mm)</dd>
            <dt>Initial layer width</dt><dd>100 %</dd>
            <dt>Travel avoid distance</dt><dd>1 mm</dd>
            <dt>Print Thin Walls</dt><dd>On, if your Cura shows it</dd>
            <dt>Placement</dt><dd>X = −12, Y = −1, Z = 0 from bed centre (Y = +1 with Flip Y). No auto-arrange afterwards</dd>
          </dl>
        </div>
        <div class="ref-text">
          <h3>Orientation</h3>
          <ul class="bullets">
            <li>Import at 100 %, Z unchanged. <b>Do not mirror</b>: the faceplate files are mirrored on purpose so the smooth front lies on the glass.</li>
            <li>Tile names TL / TR / BL / BR always mean seen from the front.</li>
            <li>Grid tiles print with the flat wall edges on the glass, notches up.</li>
            <li>In the layer view, check the continuous 0.8 mm seam half-walls and the bridges in O A R P D.</li>
            <li>Slice one wide tile first and check it isn’t greyed out.</li>
          </ul>
        </div>
      </div>`;
  }

  function tabFirmware() {
    return `<div class="ref-grid">
      <div class="ref-text">
        <h3>What the clock is telling you</h3>
        <ul class="signals">
          <li><span class="sig sig-red"></span><div><b>Three red blinks on boot</b><p>Orientation check. It must be the H of HET, top left, seen from the front. If not, flip <code>SERPENTINE_STARTS_LEFT</code> or <code>SERPENTINE_STARTS_TOP</code> and reflash.</p></div></li>
          <li><span class="sig sig-amber"></span><div><b>Slow amber pulse on LED 0</b><p>No time yet. Check <code>WIFI_SSID</code> / <code>WIFI_PASS</code>; it keeps retrying by itself.</p></div></li>
          <li><span class="sig sig-violet"></span><div><b>HET IS in violet</b><p>No NTP sync for over 26 hours: the clock is free-running and may drift.</p></div></li>
          <li><span class="sig sig-warm"></span><div><b>Warm white, dimmer at night</b><p>Brightness 140/255, dimmed to 25/255 from 23:00 to 07:00.</p></div></li>
        </ul>
      </div>
      <div class="ref-text">
        <h3>Build setup</h3>
        <dl class="specs">
          <dt>Sketch</dt><dd><code>firmware/qlock/qlock.ino</code></dd>
          <dt>Light test</dt><dd><code>firmware/light_test/light_test.ino</code>, no Wi-Fi</dd>
          <dt>Board</dt><dd>ESP32 Dev Module, default 4 MB / OTA partitions</dd>
          <dt>Versions</dt><dd>esp32 core 3.3.12, FastLED 3.10.5</dd>
          <dt>Data pin</dt><dd>GPIO16 (WROOM-32). On a WROVER use 13</dd>
          <dt>Time</dt><dd>NTP, <code>CET-1CEST,M3.5.0,M10.5.0/3</code></dd>
          <dt>OTA hostname</dt><dd><code>qlock</code></dd>
          <dt>Power limit</dt><dd>3 A software estimate</dd>
        </dl>
        <p class="fine">Before pushing to a public repo: keep your Wi-Fi password out of git.</p>
      </div>
    </div>`;
  }

  const RULES = [
    ['Never connect USB with the ESP32 harness plugged in.', 'Switching the supply off doesn’t isolate VIN from the strip.'],
    ['Buy five metres of strip, not four.', 'Each metre makes only two 11-LED rows.'],
    ['Use a regulated 5 V adapter, never 12 V.', 'Check centre-positive with the multimeter before connecting.'],
    ['Pin 1 of the level shifter goes to GND.', 'It’s an active-low enable; floating means undefined.'],
    ['Put the 470 Ω at the strip end of the data line.', 'On the input side it does nothing.'],
    ['Cura: single extruder, prime tower off.', 'Dual extrusion shrinks the bed to 197 mm and the wide tiles won’t fit.'],
    ['Don’t mirror the STLs again.', 'They are exported mirrored on purpose: smooth front on the glass.'],
    ['Print the opacity test at 1.3 mm, not 2.5.', 'That’s what’s left under the spline pockets.'],
    ['Light LED 0 before gluing anything.', 'It must be the H of HET, top left, seen from the front.'],
    ['Keep each strip within ±1 mm of its row.', 'Y is the tight axis, or the grid won’t seat.'],
    ['Keep the frame rebate under 10 mm.', 'The outer letters start 11.8 mm in from the edge.'],
    ['Fix the back panel to the grid over its whole area.', 'Everything splits at y = 188; without support it hinges.'],
    ['Leave the USB port and the harness reachable.', 'The rear cover must come off.'],
  ];
  function tabRules() {
    return `<ul class="rules">${RULES.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ul>`;
  }

  function tabLog() {
    const log = Object.values(S().log).sort((a, b) => byAt(b, a));
    return `<form class="log-form" id="log-form" autocomplete="off">
        <label for="log-text">What happened?</label>
        <textarea id="log-text" rows="3" maxlength="4000" placeholder="e.g. Opacity sample passed with Prusament Jet Black, no glow at full brightness."></textarea>
        <button type="submit">Add to log</button>
      </form>
      ${log.length ? `<ol class="log">${log.map(l => `<li><time>${fmtDateTime(l.at)}</time><p>${esc(l.text)}</p><button type="button" class="icon-btn" data-rmlog="${l.id}" aria-label="Delete note">${ICON.x}</button></li>`).join('')}</ol>`
        : '<p class="empty">No notes yet. Write down what worked, what failed and the settings you used: future you will want them.</p>'}`;
  }

  const TABS = { leds: tabLeds, wiring: tabWiring, print: tabPrint, firmware: tabFirmware, rules: tabRules, log: tabLog };
  function renderRef() {
    $$('#tabs [role=tab]').forEach(b => {
      b.setAttribute('aria-selected', b.dataset.tab === refTab);
      b.tabIndex = b.dataset.tab === refTab ? 0 : -1;
    });
    const draft = $('#log-text')?.value;
    $('#tab-panels').innerHTML = `<div role="tabpanel" class="panel panel-${refTab}">${TABS[refTab]()}</div>`;
    if (refTab === 'leds') renderBigFace();
    if (draft && $('#log-text')) $('#log-text').value = draft;
  }

  function openTab(name, scroll) {
    if (!TABS[name]) return;
    refTab = name; pref.set('refTab', name); renderRef();
    if (scroll) $('#reference').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function bindRef() {
    $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { openTab(b.dataset.tab); history.replaceState(null, '', '#' + b.dataset.tab); } });
    $('#tabs').addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const keys = Object.keys(TABS), i = keys.indexOf(refTab);
      openTab(keys[(i + (e.key === 'ArrowRight' ? 1 : keys.length - 1)) % keys.length]);
      $(`#tabs [data-tab="${refTab}"]`).focus();
    });
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-tab-link]');
      if (a) { e.preventDefault(); openTab(a.dataset.tabLink, true); history.replaceState(null, '', '#' + a.dataset.tabLink); }
    });
    const panels = $('#tab-panels');
    panels.addEventListener('input', e => {
      if (e.target.id === 'scrub') { refTime = Number(e.target.value) * 5; renderBigFace(); }
    });
    panels.addEventListener('click', e => {
      if (e.target.id === 'scrub-now') { refTime = null; renderBigFace(); return; }
      const fs = e.target.closest('#face-show button');
      if (fs) { faceShow = fs.dataset.v; pref.set('faceShow', faceShow); renderBigFace(); return; }
      const sd = e.target.closest('#face-side button');
      if (sd) { faceSide = sd.dataset.v; pref.set('faceSide', faceSide); renderBigFace(); return; }
      const rl = e.target.closest('[data-rmlog]');
      if (rl) Store.removeLog(rl.dataset.rmlog);
    });
    panels.addEventListener('submit', e => {
      if (e.target.id !== 'log-form') return;
      e.preventDefault();
      const v = $('#log-text').value.trim();
      if (v) { $('#log-text').value = ''; Store.addLog(v); }
    });
  }

  // ---------------------------------------------------------------- save status
  function bindStatus() {
    const banner = $('#banner');
    Store.onStatus(({ mode, pending, error }) => {
      let msg = '', cls = '';
      if (mode === 'server' && error) { msg = `Couldn’t save to progress.json (${esc(error)}). Your changes are kept in this browser; is <code>serve.py</code> still running?`; cls = 'warn'; }
      else if (mode === 'static') { msg = 'Read-only copy of the progress in the repo. Ticks you make here stay in this browser. Run <code>python3 site/serve.py</code> to save them to the project.'; }
      else if (mode === 'local') { msg = 'Opened as a file: progress is saved in this browser only, and the 3D parts can’t load. Run <code>python3 site/serve.py</code> from the project folder.'; cls = 'warn'; }
      banner.hidden = !msg;
      banner.className = 'banner ' + cls;
      banner.innerHTML = msg;
      document.body.dataset.saving = pending ? 'yes' : 'no';
    });
  }

  // ---------------------------------------------------------------- go
  // Rendering replaces the lists. Never do it halfway through a click (the
  // button would vanish between press and release), and afterwards put focus
  // and half-typed text back where they were.
  let busySince = 0, queued = false;
  document.addEventListener('pointerdown', () => { busySince = Date.now(); }, true);
  const release = () => setTimeout(() => { busySince = 0; if (queued) { queued = false; renderAll(); } }, 0);
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);

  const FOCUS_ATTRS = ['data-task', 'data-gotit', 'data-setshop', 'data-note', 'data-open', 'data-paid', 'data-shopjump',
    'data-rmtask', 'data-rmshop', 'data-step-task', 'data-step-shop', 'data-step-jump', 'data-part', 'data-copy', 'data-rmlog'];
  function focusKey(el) {
    if (!el || el === document.body || !el.closest) return null;
    const form = el.closest('.add-task');
    if (form) return [`.add-task[data-phase="${form.dataset.phase}"] input`];
    const a = FOCUS_ATTRS.find(x => el.hasAttribute(x));
    if (!a) return null;
    let sel = `[${a}="${CSS.escape(el.getAttribute(a))}"]`;
    if (el.dataset.v) sel += `[data-v="${CSS.escape(el.dataset.v)}"]`;
    // a step can be in "Up next" and in its phase; prefer the same list, then any
    const scope = ['#next', '#phases', '#v-card', '#shop', '#board'].find(s => el.closest(s));
    return scope ? [`${scope} ${sel}`, sel] : [sel];
  }

  function renderAll() {
    if (busySince && Date.now() - busySince < 2000) { queued = true; return; }
    const active = document.activeElement;
    const key = focusKey(active);
    const drafts = $$('.add-task').map(f => [f.dataset.phase, f.elements.step.value]).filter(d => d[1]);
    const paid = active?.matches?.('[data-paid]') ? [active.dataset.paid, active.value] : null;

    renderStats();
    renderPlan();
    renderShop();
    renderBoard();
    renderLegend();
    renderCard();
    if (window.THREE) Viewer.setStatuses?.(statusMap());
    if (refTab === 'print' || refTab === 'log') renderRef();

    drafts.forEach(([ph, v]) => { const f = $(`.add-task[data-phase="${ph}"]`); if (f) f.elements.step.value = v; });
    if (paid) { const el = $(`[data-paid="${CSS.escape(paid[0])}"]`); if (el) el.value = paid[1]; }
    const el = key && key.map(k => $(k)).find(Boolean);
    if (el && el !== document.activeElement) el.focus({ preventScroll: true });
  }

  async function main() {
    renderClock();
    bindPlan(); bindShop(); bindRef(); bindStatus();
    const hash = location.hash.slice(1);
    if (TABS[hash]) refTab = hash;
    renderRef();
    Store.subscribe(renderAll);
    await Store.load();
    bindViewer();
    startViewer();

    setInterval(() => {
      const before = liveNow.getMinutes();
      renderClock();
      if (liveNow.getMinutes() !== before) {
        if (lit && !litOverride) updateLitTime();
        if (refTab === 'leds' && refTime == null) renderBigFace();
      }
    }, 10000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { renderClock(); Store.refresh(); } });
    window.addEventListener('focus', () => Store.refresh());
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => Viewer.retheme?.());
    if (TABS[hash]) setTimeout(() => $('#reference').scrollIntoView(), 50);
  }

  main();
})();
