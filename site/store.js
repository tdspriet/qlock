/* Progress state and where it's kept.
 *
 *   server  — started with `python3 site/serve.py`: every change is sent as a
 *             small operation that the server applies to site/progress.json,
 *             so a phone and a laptop can tick things at the same time.
 *             Changes that couldn't be sent wait in this browser and retry.
 *   static  — any plain web host (GitHub Pages): shows the committed
 *             progress.json; your ticks stay in this browser only.
 *   local   — opened as a file: this browser only.
 *
 * An operation is {p: [path...], v: value}; v = null deletes. Everything in
 * the state is a nested object keyed by id, so operations never conflict
 * beyond "last tick of the same box wins".
 */
const Store = (() => {
  const KEY = 'qlock.progress', QUEUE = 'qlock.pending';
  const empty = () => ({ version: 2, tasks: {}, shop: {}, custom: { tasks: {}, shop: {} }, log: {}, updated: null });
  const byId = v => Array.isArray(v) ? Object.fromEntries(v.filter(x => x && x.id).map(x => [x.id, x])) : { ...(v || {}) };
  const normalise = s => {
    if (!s || typeof s !== 'object') return empty();
    return {
      version: 2,
      tasks: { ...(s.tasks || {}) },
      shop: { ...(s.shop || {}) },
      custom: { tasks: byId(s.custom?.tasks), shop: byId(s.custom?.shop) },
      log: byId(s.log),
      updated: s.updated || null,
    };
  };

  function setPath(obj, path, v) {
    let cur = obj;
    for (const k of path.slice(0, -1)) {
      if (!cur[k] || typeof cur[k] !== 'object' || Array.isArray(cur[k])) cur[k] = {};
      cur = cur[k];
    }
    const last = path[path.length - 1];
    if (v == null) delete cur[last]; else cur[last] = v;
  }
  const applyOps = (s, ops) => {
    const c = JSON.parse(JSON.stringify(s));
    ops.forEach(op => setPath(c, op.p, op.v));
    return c;
  };
  const same = (a, b) => JSON.stringify({ ...a, updated: 0 }) === JSON.stringify({ ...b, updated: 0 });

  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

  let mode = 'local', base = empty(), state = empty(), pending = read(QUEUE) || [];
  let inflight = false, timer = null, lastError = null;
  const listeners = [];
  let statusFn = () => {};
  const emit = () => listeners.forEach(fn => fn(state));
  const status = () => statusFn({ mode, pending: pending.length > 0 || inflight, error: lastError });

  async function getServer() {
    const res = await fetch('../api/progress', { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) throw new Error('no api');
    return normalise(await res.json());
  }

  async function load() {
    try {
      base = await getServer();
      mode = 'server';
      state = applyOps(base, pending);
      emit(); status();
      if (pending.length) flush();
      return;
    } catch { /* not served by serve.py */ }

    mode = location.protocol === 'file:' ? 'local' : 'static';
    let published = null;
    try {
      const res = await fetch('progress.json', { cache: 'no-store' });
      if (res.ok) published = normalise(await res.json());
    } catch { /* file:// or not committed yet */ }
    const local = read(KEY);
    state = local && (!published || (local.updated || '') > (published.updated || '')) ? normalise(local) : (published || empty());
    emit(); status();
  }

  function change(ops) {
    state = applyOps(state, ops);
    if (mode !== 'server') {
      state.updated = new Date().toISOString();
      write(KEY, state);
      emit();
      return;
    }
    pending.push(...ops);
    write(QUEUE, pending);
    emit(); status();
    clearTimeout(timer);
    timer = setTimeout(flush, 150);
  }

  async function flush() {
    clearTimeout(timer); timer = null;
    if (inflight || !pending.length) return;
    inflight = true; status();
    const batch = pending.slice();
    try {
      const res = await fetch('../api/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ops: batch }),
      });
      if (!res.ok) throw new Error(`server said ${res.status}`);
      base = normalise(await res.json());
      pending = pending.slice(batch.length);
      write(QUEUE, pending);
      lastError = null;
      const next = applyOps(base, pending);
      const changed = !same(next, state);
      state = next;
      if (changed) emit();
    } catch (e) {
      lastError = e.message || 'unreachable';
      timer = setTimeout(flush, 5000);
    }
    inflight = false; status();
    if (pending.length && !timer) timer = setTimeout(flush, 50);
  }

  // Pick up edits made on another device (the phone in the workshop).
  async function refresh() {
    if (mode !== 'server') return;
    if (pending.length) { if (!inflight) flush(); return; }
    if (inflight) return;
    try {
      const remote = await getServer();
      if (pending.length || inflight) return;
      base = remote;
      if (!same(remote, state)) { state = remote; emit(); }
      if (lastError) { lastError = null; status(); }
    } catch { /* server gone; keep what we have */ }
  }

  const now = () => new Date().toISOString();
  const newId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  return {
    load, refresh,
    get: () => state,
    mode: () => mode,
    subscribe(fn) { listeners.push(fn); },
    onStatus(fn) { statusFn = fn; status(); },

    toggleTask(id) { change([{ p: ['tasks', id], v: state.tasks[id] ? null : { done: now() } }]); },
    setShop(id, st) { change([{ p: ['shop', id, 'status'], v: st }, { p: ['shop', id, 'at'], v: now() }]); },
    setPaid(id, paid) {
      const n = paid === '' || paid == null ? null : Number(paid);
      change([{ p: ['shop', id, 'paid'], v: Number.isFinite(n) ? n : null }]);
    },
    addCustomTask(phase, title) { const id = newId('c-'); change([{ p: ['custom', 'tasks', id], v: { id, phase, title, at: now() } }]); },
    removeCustomTask(id) { change([{ p: ['custom', 'tasks', id], v: null }, { p: ['tasks', id], v: null }]); },
    addCustomShop(item) { const id = newId('c-'); change([{ p: ['custom', 'shop', id], v: { ...item, id, at: now() } }]); },
    removeCustomShop(id) { change([{ p: ['custom', 'shop', id], v: null }, { p: ['shop', id], v: null }]); },
    addLog(text) { const id = newId('l-'); change([{ p: ['log', id], v: { id, at: now(), text } }]); },
    removeLog(id) { change([{ p: ['log', id], v: null }]); },
  };
})();
