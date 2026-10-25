/* The 3D clock. Printed parts are the real STLs from ../stl; everything that
 * isn't printed (film, LEDs, panel, electronics, frame) is modelled here from
 * the README dimensions.
 *
 * Scene units are mm. X right and Y up as seen from the FRONT, origin at the
 * centre of the plate, +Z towards the viewer. A layer's depth `d` is measured
 * from the smooth front face backwards, so it sits at z = -d.
 */
const Viewer = (() => {
  const G = GEO, HALF = G.PLATE / 2;

  // Assembled depth of each layer and how far it travels when exploded.
  const LAYERS = {
    frame:       { d: 0,    off: 0 },
    faceplate:   { d: 0,    off: 0 },
    splines:     { d: 0,    off: 22 },
    diffuser:    { d: 2.55, off: 48 },
    grid:        { d: 2.6,  off: 84 },
    leds:        { d: 20.6, off: 132 },
    panel:       { d: 20.6, off: 160 },
    electronics: { d: 24.6, off: 196 },
    rearcover:   { d: 38,   off: 246 },
  };
  const TILE_DIR = { TL: [-1, 1], TR: [1, 1], BL: [-1, -1], BR: [1, -1] };

  let renderer, scene, camera, controls, host, tipEl;
  let dirty = true, explode = 0.6, lit = false, time = [12, 0];
  let hovered = null, selected = null, tween = null, onSelect = () => {}, onHover = () => {};
  const parts = {};          // partId → {group, layer, tile, meshes: [{mesh, natural, status}]}
  const layerGroups = {};    // layer → THREE.Group
  let statuses = {};
  let glow = null, ledDots = null, lights = {};
  const C = {};              // colours read from CSS tokens

  // ---------------------------------------------------------------- helpers
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const col = hex => new THREE.Color(hex || '#ff00ff');
  const fx = x => x - HALF;  // design → scene
  const fy = y => y - HALF;

  function readTokens() {
    C.bg = css('--viewer-bg');
    C.buy = css('--st-buy'); C.print = css('--st-print'); C.build = css('--st-build');
    C.led = '#ffbe78';   // the firmware's CRGB(255,190,120), whatever the theme
  }

  function woodTexture(base, grain, w = 512, h = 512, lines = 90) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < lines; i++) {
      const y = rnd() * h, amp = 2 + rnd() * 6, alpha = 0.04 + rnd() * 0.1;
      g.strokeStyle = grain; g.globalAlpha = alpha; g.lineWidth = 0.6 + rnd() * 2.2;
      g.beginPath();
      for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / (40 + rnd() * 30) + i) * amp);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if ('colorSpace' in t) t.colorSpace = THREE.SRGBColorSpace; else t.encoding = THREE.sRGBEncoding;
    return t;
  }

  const MAT = {};
  function makeMaterials() {
    const std = (o) => new THREE.MeshStandardMaterial(o);
    MAT.black = std({ color: 0x1d1e21, roughness: 0.55, metalness: 0.0 });
    MAT.white = std({ color: 0xefede6, roughness: 0.7 });
    MAT.film = std({ color: 0xf6f3ea, roughness: 0.9, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    MAT.pcb = std({ color: 0xf2f2ee, roughness: 0.5 });
    MAT.ledBody = std({ color: 0xfafaf7, roughness: 0.3 });
    MAT.ply = std({ map: woodTexture('#d2b083', '#8a6237'), roughness: 0.85 });
    MAT.oak = std({ map: woodTexture('#9a6a40', '#4a2e16', 512, 512, 140), roughness: 0.7 });
    MAT.hardboard = std({ color: 0x6e5038, roughness: 0.95 });
    MAT.esp = std({ color: 0x1b2433, roughness: 0.5 });
    MAT.metal = std({ color: 0xb9bcc2, roughness: 0.3, metalness: 0.8 });
    MAT.perf = std({ color: 0xc9a466, roughness: 0.8 });
    MAT.chip = std({ color: 0x18181a, roughness: 0.4 });
    MAT.capBlue = std({ color: 0x2a3f88, roughness: 0.45 });
    MAT.red = std({ color: 0xc8352b, roughness: 0.5 });
    MAT.blk = std({ color: 0x222222, roughness: 0.5 });
    MAT.yel = std({ color: 0xe8c33a, roughness: 0.5 });
  }

  function statusMaterial(status, natural) {
    if (status === 'done' || !C[status]) return natural;
    const m = new THREE.MeshStandardMaterial({ color: col(C[status]), roughness: 0.75 });
    if (natural.transparent) { m.transparent = true; m.opacity = 0.6; m.side = THREE.DoubleSide; m.depthWrite = false; }
    return m;
  }

  function box(w, h, d, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  }

  function register(partId, layer, mesh, tile) {
    if (!parts[partId]) {
      const group = new THREE.Group();
      group.userData.partId = partId;
      layerGroups[layer].add(group);
      parts[partId] = { group, layer, tile, meshes: [] };
    }
    const p = parts[partId];
    const add = (m) => {
      m.userData.partId = partId;
      p.meshes.push({ mesh: m, natural: m.material });
    };
    mesh.traverse(o => { if (o.isMesh) add(o); });
    p.group.add(mesh);
    return p;
  }

  // ---------------------------------------------------------------- build
  function buildProcedural() {
    // splines: 29.4 × 7.4 × 1, seated in the 1.2 mm pockets on the faceplate back
    const gapY = G.rowY.slice(0, -1).map((y, r) => (y + G.rowY[r + 1]) / 2);
    const gapX = G.colX.slice(0, -1).map((x, c) => (x + G.colX[c + 1]) / 2);
    const L = G.POCKET_L - 2 * G.SPLINE_CLEAR, W = G.POCKET_W - 2 * G.SPLINE_CLEAR;
    const sp = new THREE.Group();
    for (const r of [7, 5, 3, 1]) sp.add(box(L, W, G.SPLINE_T, MAT.black, fx(G.SEAM_X), fy(gapY[r]), -2.0));
    for (const c of [1, 3, 6, 8]) sp.add(box(W, L, G.SPLINE_T, MAT.black, fx(gapX[c]), fy(G.SEAM_Y), -2.0));
    register('splines', 'splines', sp);

    // diffuser film, 5 mm in from the plate edge all round
    const film = new THREE.Mesh(new THREE.PlaneGeometry(366, 366), MAT.film);
    register('diffuser', 'diffuser', film);

    // letter glow: one quad per cell just behind the faceplate, visible
    // through the cut-outs when the clock is lit
    const cellW = G.COL_PITCH - G.WALL_T, cellH = G.ROW_PITCH - G.WALL_T;
    glow = new THREE.InstancedMesh(new THREE.PlaneGeometry(cellW, cellH),
      new THREE.MeshBasicMaterial({ toneMapped: false }), 110);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 110; i++) {
      m4.makeTranslation(fx(G.colX[i % 11]), fy(G.rowY[Math.floor(i / 11)]), 0.4);
      glow.setMatrixAt(i, m4);
      glow.setColorAt(i, new THREE.Color(0));
    }
    glow.visible = false;
    glow.raycast = () => {};
    layerGroups.diffuser.add(glow);

    // LED rows: 10 strips of 11, 366.7 mm long, pads at the ends
    const leds = new THREE.Group();
    const stripLen = 11 * G.COL_PITCH;
    for (let r = 0; r < G.ROWS; r++) leds.add(box(stripLen, 10, 0.3, MAT.pcb, 0, fy(G.rowY[r]), 0.15));
    const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 5, 1.6), MAT.ledBody, 110);
    ledDots = new THREE.InstancedMesh(new THREE.CircleGeometry(1.7, 20), new THREE.MeshBasicMaterial({ toneMapped: false }), 110);
    for (let i = 0; i < 110; i++) {
      const x = fx(G.colX[i % 11]), y = fy(G.rowY[Math.floor(i / 11)]);
      m4.makeTranslation(x, y, 1.1); bodies.setMatrixAt(i, m4);
      m4.makeTranslation(x, y, 1.92); ledDots.setMatrixAt(i, m4);
      ledDots.setColorAt(i, new THREE.Color(0x4a4232));
    }
    leds.add(bodies, ledDots);
    // 9 three-wire jumpers hugging the outer walls: right end after even rows
    // (seen from the front), left end after odd rows
    const wires = [MAT.red, MAT.blk, MAT.yel];
    for (let r = 0; r < G.ROWS - 1; r++) {
      const side = r % 2 === 0 ? 1 : -1;
      const x0 = side * (stripLen / 2 - 3);
      const yMid = fy((G.rowY[r] + G.rowY[r + 1]) / 2);
      wires.forEach((mat, k) => leds.add(box(1.1, G.ROW_PITCH - 6, 1.1, mat, x0 - side * k * 1.5, yMid, 0.9)));
    }
    register('leds', 'leds', leds);

    // back panel, 4 mm plywood
    register('panel', 'panel', box(G.PLATE, G.PLATE, 4, MAT.ply, 0, 0, -2));

    // electronics on the back of the panel (seen from the front: bottom right)
    const esp = new THREE.Group();
    esp.add(box(51, 28, 1.6, MAT.esp, 0, 0, -0.8));
    esp.add(box(18, 25.5, 3.2, MAT.metal, -12, 0, -3.2));
    esp.add(box(8, 6, 3, MAT.metal, 24, 0, -3));                          // USB port
    esp.position.set(95, -120, -6);
    const harness = new THREE.Group();
    [MAT.red, MAT.blk, MAT.yel].forEach((m, k) => harness.add(box(46, 1.2, 1.2, m, 0, -4 + k * 2, -2)));
    harness.add(box(8, 8, 6, MAT.blk, -24, -2, -3));
    harness.position.set(46, -122, -3);
    register('esp32', 'electronics', esp);
    register('esp32', 'electronics', harness);

    const shift = new THREE.Group();
    shift.add(box(34, 24, 1.6, MAT.perf, 0, 0, -0.8));
    shift.add(box(19, 7, 3.5, MAT.chip, 0, 2, -3.4));
    const c100 = box(4, 4, 3, MAT.capBlue, 12, 2, -3);
    shift.add(c100);
    shift.position.set(-8, -128, -1.6);
    register('shifterboard', 'electronics', shift);

    const pw = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 20, 24), MAT.capBlue);
    cap.rotation.z = Math.PI / 2; cap.position.set(-60, -150, -5.5);   // lying flat
    pw.add(cap);
    pw.add(box(14, 11, 9, MAT.blk, -150, -150, -4.5));                    // DC jack block
    pw.add(box(90, 1.6, 1.6, MAT.red, -105, -146, -2), box(90, 1.6, 1.6, MAT.blk, -105, -154, -2));
    register('power', 'electronics', pw);

    // frame: 18 mm sides 41 mm deep, plus a 4 mm front lip with an 8 mm rebate
    const fr = new THREE.Group();
    const T = 18, inner = G.PLATE + 1, outer = inner + 2 * T, depth = 41, lip = 8, lipT = 4;
    const sideZ = -depth / 2;
    fr.add(box(outer, T, depth, MAT.oak, 0, (inner + T) / 2, sideZ));
    fr.add(box(outer, T, depth, MAT.oak, 0, -(inner + T) / 2, sideZ));
    fr.add(box(T, inner, depth, MAT.oak, (inner + T) / 2, 0, sideZ));
    fr.add(box(T, inner, depth, MAT.oak, -(inner + T) / 2, 0, sideZ));
    const lipW = lip + T + 0.5;
    const lipC = inner / 2 - lip + lipW / 2;
    fr.add(box(outer, lipW, lipT, MAT.oak, 0, lipC, lipT / 2));
    fr.add(box(outer, lipW, lipT, MAT.oak, 0, -lipC, lipT / 2));
    fr.add(box(lipW, inner - 2 * lip, lipT, MAT.oak, lipC, 0, lipT / 2));
    fr.add(box(lipW, inner - 2 * lip, lipT, MAT.oak, -lipC, 0, lipT / 2));
    register('frame', 'frame', fr);

    register('rearcover', 'rearcover', box(G.PLATE - 1, G.PLATE - 1, 3, MAT.hardboard, 0, 0, -1.5));
  }

  async function loadStls(stlParts, base, onProgress) {
    const loader = new THREE.STLLoader();
    // print orientation → seen from the front: undo the X mirror and flip Z
    // so the smooth face points at the viewer. det = +1, winding unchanged.
    const toFront = new THREE.Matrix4().makeScale(-1, 1, -1).setPosition(HALF, -HALF, 0);
    let done = 0, failed = 0;
    await Promise.all(stlParts.map(async p => {
      try {
        const res = await fetch(base + p.stl);
        if (!res.ok) throw new Error(res.status);
        const geo = loader.parse(await res.arrayBuffer());
        geo.applyMatrix4(toFront);
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, p.colour === 'white' ? MAT.white : MAT.black);
        register(p.id, p.layer, mesh, p.tile);
      } catch (e) {
        failed++;
        console.warn('Could not load', p.stl, e);
      }
      onProgress(++done, stlParts.length, failed);
      applyStatuses();
      layout();
    }));
    return failed;
  }

  // ---------------------------------------------------------------- state → scene
  function layout() {
    const t = explode;
    for (const [name, L] of Object.entries(LAYERS)) {
      const g = layerGroups[name];
      if (g) g.position.z = -(L.d + t * L.off);
    }
    for (const p of Object.values(parts)) {
      const dir = p.tile && TILE_DIR[p.tile];
      if (dir) p.group.position.set(dir[0] * t * 10, dir[1] * t * 10, 0);
    }
    // the frame would hide the stack once exploded: let it fade away
    const fade = Math.max(0, 1 - t * 2.5);
    if (parts.frame) {
      parts.frame.group.visible = fade > 0.02;
      for (const m of parts.frame.meshes) {
        m.mesh.material.transparent = fade < 1;
        m.mesh.material.opacity = fade;
        m.mesh.material.depthWrite = fade >= 1;
      }
    }
    dirty = true;
  }

  function applyStatuses() {
    for (const [id, p] of Object.entries(parts)) {
      const st = lit ? 'done' : (statuses[id] || 'buy');
      for (const m of p.meshes) {
        if (m.statusKey !== st) {
          if (m.mesh.material !== m.natural && m.mesh.material.dispose) m.mesh.material.dispose();
          m.mesh.material = st === 'done' ? m.natural.clone() : statusMaterial(st, m.natural);
          m.statusKey = st;
        }
      }
    }
    highlight();
    layout();
  }

  function highlight() {
    for (const [id, p] of Object.entries(parts)) {
      const on = id === hovered || id === selected;
      for (const m of p.meshes) {
        const mat = m.mesh.material;
        if (mat.emissive) mat.emissive.setHex(on ? (id === selected ? 0x3a2a10 : 0x222222) : 0x000000);
      }
    }
    dirty = true;
  }

  function applyLight() {
    const { lit: litSet } = CLOCK.at(time[0], time[1]);
    const night = CLOCK.isNight(time[0]);
    const on = col(C.led).multiplyScalar(night ? 0.42 : 1);
    const off = new THREE.Color(lit ? 0x0e0d0c : 0x000000);
    for (let i = 0; i < 110; i++) {
      glow.setColorAt(i, lit && litSet.has(i) ? on : off);
      ledDots.setColorAt(i, lit && litSet.has(i) ? on : new THREE.Color(0x4a4232));
    }
    glow.instanceColor.needsUpdate = true;
    ledDots.instanceColor.needsUpdate = true;
    glow.visible = lit;
    lights.hemi.intensity = lit ? 0.18 : 0.85;
    lights.key.intensity = lit ? 0.12 : 0.9;
    lights.fill.intensity = lit ? 0.05 : 0.35;
    scene.background = col(lit ? '#07080a' : C.bg);
    applyStatuses();
  }

  // ---------------------------------------------------------------- camera
  // direction from the target to the camera; the distance is fitted
  const VIEWS = {
    iso:   { dir: [0.66, 0.36, 0.66], target: [0, -6, -100], r: 270 },
    front: { dir: [0, 0, 1], target: [0, 0, -20], r: 225 },
    back:  { dir: [0, 0.08, -1], target: [0, 0, -60], r: 225 },
    side:  { dir: [1, 0.12, 0.03], target: [0, 0, -120], r: 250 },
  };
  function view(name, instant) {
    const v = VIEWS[name];
    if (!v) return;
    const from = { p: camera.position.clone(), t: controls.target.clone() };
    const t = new THREE.Vector3(...v.target);
    const to = { p: new THREE.Vector3(...v.dir).normalize().multiplyScalar(fitDistance(v.r)).add(t), t };
    if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      camera.position.copy(to.p); controls.target.copy(to.t); controls.update(); dirty = true; return;
    }
    tween = { from, to, start: performance.now(), dur: 700 };
  }
  // distance at which a sphere of radius r fills the narrower field of view
  function fitDistance(r) {
    const aspect = host.clientWidth / Math.max(1, host.clientHeight);
    const v = THREE.MathUtils.degToRad(camera.fov) / 2;
    const h = Math.atan(Math.tan(v) * aspect);
    return r * 1.08 / Math.sin(Math.min(v, h));
  }

  // ---------------------------------------------------------------- picking
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const meshes = [];
    for (const p of Object.values(parts)) if (p.group.visible) for (const m of p.meshes) meshes.push(m.mesh);
    const hit = ray.intersectObjects(meshes, false).find(h => h.object.material.opacity > 0.3 || h.object.material === MAT.film || h.object.userData.partId === 'diffuser');
    return hit ? hit.object.userData.partId : null;
  }

  // ---------------------------------------------------------------- init
  function init(el, opts) {
    host = el;
    onSelect = opts.onSelect || onSelect;
    onHover = opts.onHover || onHover;
    if (THREE.ColorManagement && 'legacyMode' in THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
    readTokens();

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    else renderer.outputEncoding = THREE.sRGBEncoding;
    host.prepend(renderer.domElement);
    tipEl = host.querySelector('.v-tip');

    scene = new THREE.Scene();
    scene.background = col(C.bg);
    camera = new THREE.PerspectiveCamera(32, 1, 5, 5000);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minDistance = 120;
    controls.maxDistance = 2200;
    controls.addEventListener('change', () => { dirty = true; });

    lights.hemi = new THREE.HemisphereLight(0xffffff, 0x6b6156, 0.85);
    lights.key = new THREE.DirectionalLight(0xffffff, 0.9);
    lights.key.position.set(300, 500, 700);
    lights.fill = new THREE.DirectionalLight(0xfff2e0, 0.35);
    lights.fill.position.set(-500, -200, -600);
    scene.add(lights.hemi, lights.key, lights.fill);

    makeMaterials();
    for (const name of Object.keys(LAYERS)) {
      layerGroups[name] = new THREE.Group();
      scene.add(layerGroups[name]);
    }
    buildProcedural();
    layout();

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      dirty = true;
    };
    new ResizeObserver(resize).observe(host);
    resize();
    view('iso', true);

    const cvs = renderer.domElement;
    let down = null;
    cvs.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    cvs.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const id = pick(e);
      onSelect(id ? { part: id } : null);
    });
    cvs.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || e.buttons) return;
      const id = pick(e);
      if (id !== hovered) { hovered = id; highlight(); onHover(id); }
      if (id) {
        const r = host.getBoundingClientRect();
        tipEl.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
      }
      cvs.style.cursor = id ? 'pointer' : 'grab';
    });
    cvs.addEventListener('pointerleave', () => { if (hovered) { hovered = null; highlight(); onHover(null); } });

    const loop = (now) => {
      if (tween) {
        const k = Math.min(1, (now - tween.start) / tween.dur), e = 1 - Math.pow(1 - k, 3);
        camera.position.lerpVectors(tween.from.p, tween.to.p, e);
        controls.target.lerpVectors(tween.from.t, tween.to.t, e);
        if (k >= 1) tween = null;
        dirty = true;
      }
      if (explodeTween) {
        const k = Math.min(1, (now - explodeTween.start) / 650), e = 1 - Math.pow(1 - k, 3);
        explode = explodeTween.from + (explodeTween.to - explodeTween.from) * e;
        explodeTween.onStep && explodeTween.onStep(explode);
        layout();
        if (k >= 1) explodeTween = null;
      }
      controls.update();
      if (dirty) { renderer.render(scene, camera); dirty = false; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // splines_x10.stl is a bed layout; the 8 fitted splines are modelled above
    return loadStls(PARTS.filter(p => p.stl && !p.test && p.layer !== 'splines'), opts.stlBase, opts.onProgress || (() => {}));
  }

  let explodeTween = null;
  function setExplode(t, animate, onStep) {
    if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      explodeTween = { from: explode, to: t, start: performance.now(), onStep };
    } else { explode = t; layout(); }
  }

  return {
    init,
    view,
    setExplode,
    getExplode: () => explode,
    setStatuses(map) { statuses = map; applyStatuses(); },
    setLit(on) { lit = on; applyLight(); },
    setTime(h, m) { time = [h, m]; if (lit) applyLight(); },
    select(id) { selected = id; highlight(); },
    retheme() { readTokens(); if (!lit) scene.background = col(C.bg); for (const p of Object.values(parts)) for (const m of p.meshes) m.statusKey = null; applyStatuses(); },
    layers: LAYERS,
  };
})();
