import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const DATA = './data';
const state = {
  meta: null,
  elev: null,        // Int16Array
  flow: null,        // Int8Array interleaved dx,dy
  flowacc: null,     // Uint32Array (upstream cell count per pixel)
  W: 0, H: 0,
  layer: 'color',
  images: {},        // cached HTMLImageElements
  contour: false,
  three: null,
  profile: { active: false, p0: null, p1: null },
  rain: { active: false, drops: [], raf: null, rate: 5 },
  flood: {
    validCount: 0,
    rainDepth: 30,   // mm total
    rainDur: 2,      // hours
    infil: 0,        // 0=low, 1=med, 2=high, 3=very-high
    lastResult: null // { floodedCells, maxDepth, totalVolumeM3, peakFlowM3s }
  },
};

const LEGENDS = {
  color: { title: 'Elevation', grad: 'linear-gradient(90deg,#1e468c,#1e8296,#28a06e,#78be46,#e1d250,#e69632,#c85032,#fafafa)', unit: 'm' },
  hillshade: { title: 'Hillshade (relief)', grad: 'linear-gradient(90deg,#000,#fff)', unit: '' },
  slope: { title: 'Slope', grad: 'linear-gradient(90deg,#1e781e,#f0dc28,#eb7814,#c81e1e)', unit: '°' },
  aspect: { title: 'Aspect (facing direction)', grad: 'linear-gradient(90deg,#ff0040,#ffaa00,#aaff00,#00ffaa,#00aaff,#aa00ff,#ff0040)', unit: '' },
};

// ---------------- Boot ----------------
async function boot() {
  const meta = await fetch(`${DATA}/metadata.json`).then(r => r.json());
  state.meta = meta;
  state.W = meta.width;
  state.H = meta.height;

  // elevation grid
  const buf = await fetch(`${DATA}/elevation.bin`).then(r => r.arrayBuffer());
  state.elev = new Int16Array(buf);

  // flow-direction grid (dx,dy int8 interleaved)
  const fbuf = await fetch(`${DATA}/flowdir.bin`).then(r => r.arrayBuffer());
  state.flow = new Int8Array(fbuf);

  // flow accumulation (upstream cell count) - Uint32 LE
  try {
    const abuf = await fetch(`${DATA}/flowacc.bin`).then(r => r.arrayBuffer());
    state.flowacc = new Uint32Array(abuf);
  } catch (e) {
    console.warn('flowacc.bin not available - flood model will fall back');
    state.flowacc = null;
  }

  // count valid cells for flood %
  let vc = 0;
  for (let i = 0; i < state.elev.length; i++) if (state.elev[i] !== -32768) vc++;
  state.flood.validCount = vc;

  fillMeta();
  await preloadImages();
  setLayer('color');
  bindUI();
  document.getElementById('loading').classList.add('hidden');
}

function fillMeta() {
  const m = state.meta;
  document.getElementById('regionName').textContent = m.region;
  const b = m.bounds;
  const rows = [
    ['Resolution', `${m.src_resolution_m} m`],
    ['Grid', `${m.src_width.toLocaleString()} × ${m.src_height.toLocaleString()}`],
    ['Coverage', `${m.area_km.width} × ${m.area_km.height} km`],
    ['Elev. range', `${m.elevation.min}–${m.elevation.max} m`],
    ['Mean elev.', `${m.elevation.mean} m`],
    ['Projection', 'UTM 37N'],
    ['Lat', `${b.lat_min.toFixed(2)}–${b.lat_max.toFixed(2)}°N`],
    ['Lon', `${b.lon_min.toFixed(2)}–${b.lon_max.toFixed(2)}°E`],
  ];
  document.getElementById('metaList').innerHTML =
    rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

function preloadImages() {
  const layers = ['color', 'hillshade', 'slope', 'aspect'];
  return Promise.all(layers.map(l => new Promise(res => {
    const img = new Image();
    img.onload = () => { state.images[l] = img; res(); };
    img.onerror = () => res();
    img.src = `${DATA}/${l}.png`;
  })));
}

// ---------------- Layer rendering ----------------
const mapCanvas = document.getElementById('mapCanvas');
const mctx = mapCanvas.getContext('2d');
const overlay = document.getElementById('overlayCanvas');
const octx = overlay.getContext('2d');
const floodCv = document.getElementById('floodCanvas');
const fctx = floodCv.getContext('2d');
const waterCv = document.getElementById('waterCanvas');
const wctx = waterCv.getContext('2d');

function fitCanvas() {
  const wrap = document.getElementById('canvasWrap');
  const aspect = state.W / state.H;
  let cw = wrap.clientWidth - 32, ch = wrap.clientHeight - 32;
  if (cw / ch > aspect) cw = ch * aspect; else ch = cw / aspect;
  for (const c of [mapCanvas, overlay, floodCv, waterCv]) {
    c.style.width = cw + 'px';
    c.style.height = ch + 'px';
    c.width = state.W;
    c.height = state.H;
  }
  // Re-render flood overlay if a result exists
  if (state.flood.lastResult) runFloodModel();
}

function setLayer(layer) {
  state.layer = layer;
  document.querySelectorAll('.layer-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.layer === layer));
  fitCanvas();
  drawMap();
  updateLegend();
}

function drawMap() {
  mctx.clearRect(0, 0, state.W, state.H);
  const img = state.images[state.layer];
  if (img) mctx.drawImage(img, 0, 0, state.W, state.H);
  if (state.contour) drawContours();
}

function updateLegend() {
  const L = LEGENDS[state.layer];
  document.getElementById('legendTitle').textContent = L.title;
  document.getElementById('legendBar').style.background = L.grad;
  const m = state.meta.elevation;
  const lm = document.getElementById('legendMin'), lx = document.getElementById('legendMax');
  if (state.layer === 'color') { lm.textContent = `${m.min} m`; lx.textContent = `${m.max} m`; }
  else if (state.layer === 'slope') { lm.textContent = '0°'; lx.textContent = '45°+'; }
  else if (state.layer === 'aspect') { lm.textContent = 'N→E→S'; lx.textContent = 'W→N'; }
  else { lm.textContent = 'shadow'; lx.textContent = 'light'; }
}

// ---------------- Contours ----------------
function elevAt(px, py) {
  const x = Math.max(0, Math.min(state.W - 1, px | 0));
  const y = Math.max(0, Math.min(state.H - 1, py | 0));
  const v = state.elev[y * state.W + x];
  return v === -32768 ? null : v;
}

function drawContours() {
  const m = state.meta.elevation;
  const interval = Math.max(10, Math.round((m.max - m.min) / 18 / 10) * 10);
  mctx.save();
  mctx.strokeStyle = 'rgba(255,255,255,0.32)';
  mctx.lineWidth = 0.6;
  const step = 2;
  for (let y = 0; y < state.H - step; y += step) {
    for (let x = 0; x < state.W - step; x += step) {
      const v = elevAt(x, y);
      if (v === null) continue;
      const band = Math.floor(v / interval);
      const vr = elevAt(x + step, y), vd = elevAt(x, y + step);
      if (vr !== null && Math.floor(vr / interval) !== band) { mctx.beginPath(); mctx.moveTo(x + step, y); mctx.lineTo(x + step, y + step); mctx.stroke(); }
      if (vd !== null && Math.floor(vd / interval) !== band) { mctx.beginPath(); mctx.moveTo(x, y + step); mctx.lineTo(x + step, y + step); mctx.stroke(); }
    }
  }
  mctx.restore();
}

// ---------------- Coordinate mapping ----------------
function canvasToGrid(evt) {
  const r = mapCanvas.getBoundingClientRect();
  const px = (evt.clientX - r.left) / r.width * state.W;
  const py = (evt.clientY - r.top) / r.height * state.H;
  return { px, py };
}
function gridToLatLon(px, py) {
  const b = state.meta.bounds;
  const lon = b.lon_min + (px / state.W) * (b.lon_max - b.lon_min);
  const lat = b.lat_max - (py / state.H) * (b.lat_max - b.lat_min);
  return { lat, lon };
}

// ---------------- Interaction: hover readout ----------------
function onMove(evt) {
  const { px, py } = canvasToGrid(evt);
  const v = elevAt(px, py);
  const { lat, lon } = gridToLatLon(px, py);
  document.getElementById('readoutValue').textContent = v === null ? '— m' : `${v} m`;
  document.getElementById('readoutCoord').textContent = `${lat.toFixed(4)}°N  ${lon.toFixed(4)}°E`;
}

// ---------------- Profile tool ----------------
function startProfile() {
  state.profile.active = !state.profile.active;
  document.getElementById('profileBtn').classList.toggle('active', state.profile.active);
  mapCanvas.classList.toggle('crosshair', state.profile.active);
  state.profile.p0 = state.profile.p1 = null;
  octx.clearRect(0, 0, state.W, state.H);
  document.getElementById('toolHint').textContent = state.profile.active
    ? 'Click the START point, then the END point on the map.'
    : 'Click and drag two points on the map to draw a cross-section.';
}

function onProfileClick(evt) {
  if (!state.profile.active) return;
  const { px, py } = canvasToGrid(evt);
  if (!state.profile.p0) {
    state.profile.p0 = { px, py };
    drawProfileMarkers();
  } else {
    state.profile.p1 = { px, py };
    drawProfileMarkers();
    computeProfile();
    state.profile.active = false;
    document.getElementById('profileBtn').classList.remove('active');
    mapCanvas.classList.remove('crosshair');
    document.getElementById('toolHint').textContent = 'Profile drawn. Click “Draw elevation profile” to make another.';
  }
}

function drawProfileMarkers() {
  octx.clearRect(0, 0, state.W, state.H);
  const { p0, p1 } = state.profile;
  octx.lineWidth = 2; octx.strokeStyle = '#2dd4bf'; octx.fillStyle = '#2dd4bf';
  const dot = (p) => { octx.beginPath(); octx.arc(p.px, p.py, 5, 0, 7); octx.fill(); };
  if (p0) dot(p0);
  if (p0 && p1) {
    octx.beginPath(); octx.moveTo(p0.px, p0.py); octx.lineTo(p1.px, p1.py); octx.stroke();
    dot(p1);
  }
}

function computeProfile() {
  const { p0, p1 } = state.profile;
  const n = 220;
  const pts = [], elevs = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const px = p0.px + (p1.px - p0.px) * t;
    const py = p0.py + (p1.py - p0.py) * t;
    pts.push(t);
    elevs.push(elevAt(px, py));
  }
  // horizontal distance in km
  const a = gridToLatLon(p0.px, p0.py), b = gridToLatLon(p1.px, p1.py);
  const distKm = haversine(a.lat, a.lon, b.lat, b.lon);
  // Show panel BEFORE drawing so the canvas has a measurable width
  document.getElementById('profilePanel').classList.remove('hidden');
  requestAnimationFrame(() => drawProfileChart(elevs, distKm));
}

function haversine(la1, lo1, la2, lo2) {
  const R = 6371, dLa = (la2 - la1) * Math.PI / 180, dLo = (lo2 - lo1) * Math.PI / 180;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * Math.PI / 180) * Math.cos(la2 * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function drawProfileChart(elevs, distKm) {
  const cv = document.getElementById('profileChart');
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, h = 160;
  cv.width = w * dpr; cv.height = h * dpr;
  const c = cv.getContext('2d'); c.scale(dpr, dpr);
  c.clearRect(0, 0, w, h);
  const valid = elevs.filter(v => v !== null);
  const lo = Math.min(...valid), hi = Math.max(...valid);
  const padL = 44, padB = 22, padT = 10, padR = 10;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const xOf = i => padL + (i / (elevs.length - 1)) * plotW;
  const yOf = v => padT + plotH - ((v - lo) / (hi - lo || 1)) * plotH;

  // grid + y labels
  c.strokeStyle = 'rgba(255,255,255,0.08)'; c.fillStyle = '#8b97a6';
  c.font = '10px JetBrains Mono, monospace'; c.textAlign = 'right';
  for (let g = 0; g <= 4; g++) {
    const val = lo + (hi - lo) * g / 4;
    const y = yOf(val);
    c.beginPath(); c.moveTo(padL, y); c.lineTo(w - padR, y); c.stroke();
    c.fillText(Math.round(val) + 'm', padL - 6, y + 3);
  }
  // x labels
  c.textAlign = 'center';
  for (let g = 0; g <= 4; g++) {
    const x = padL + plotW * g / 4;
    c.fillText((distKm * g / 4).toFixed(1) + 'km', x, h - 6);
  }
  // area fill + line
  c.beginPath();
  elevs.forEach((v, i) => { if (v === null) return; const x = xOf(i), y = yOf(v); i === 0 ? c.moveTo(x, y) : c.lineTo(x, y); });
  const grad = c.createLinearGradient(0, padT, 0, padT + plotH);
  grad.addColorStop(0, 'rgba(45,212,191,0.35)'); grad.addColorStop(1, 'rgba(45,212,191,0.02)');
  c.lineTo(xOf(elevs.length - 1), padT + plotH); c.lineTo(xOf(0), padT + plotH); c.closePath();
  c.fillStyle = grad; c.fill();
  c.beginPath();
  elevs.forEach((v, i) => { if (v === null) return; const x = xOf(i), y = yOf(v); i === 0 ? c.moveTo(x, y) : c.lineTo(x, y); });
  c.strokeStyle = '#2dd4bf'; c.lineWidth = 1.8; c.stroke();

  // stats
  const gain = elevs.reduce((s, v, i) => (i && v !== null && elevs[i - 1] !== null && v > elevs[i - 1]) ? s + (v - elevs[i - 1]) : s, 0);
  document.getElementById('profileStats').innerHTML = `
    <span>Distance <b>${distKm.toFixed(2)} km</b></span>
    <span>Min <b>${Math.round(lo)} m</b></span>
    <span>Max <b>${Math.round(hi)} m</b></span>
    <span>Relief <b>${Math.round(hi - lo)} m</b></span>
    <span>Total ascent <b>${Math.round(gain)} m</b></span>`;
}

// ---------------- 3D terrain ----------------
function init3D() {
  const wrap = document.getElementById('threeWrap');
  const W = wrap.clientWidth, H = wrap.clientHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(W, H);
  wrap.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.Fog(0x0d1117, 400, 1400);

  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 5000);
  camera.position.set(0, 320, 420);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2.05;

  // downsample grid for mesh
  const gw = 300, gh = Math.round(gw * state.H / state.W);
  const geo = new THREE.PlaneGeometry(400, 400 * state.H / state.W, gw - 1, gh - 1);
  geo.rotateX(-Math.PI / 2);
  const m = state.meta.elevation;
  const zExag = 0.42; // vertical exaggeration on normalized scale (toned down)
  const pos = geo.attributes.position;
  const colors = [];

  // Pre-sample a smoothed height field (averaging a small window, ignoring nodata)
  const heights = new Float32Array(gw * gh);
  const win = 2;
  for (let iy = 0; iy < gh; iy++) {
    for (let ix = 0; ix < gw; ix++) {
      const sx0 = Math.round(ix / (gw - 1) * (state.W - 1));
      const sy0 = Math.round(iy / (gh - 1) * (state.H - 1));
      let sum = 0, n = 0;
      for (let dy = -win; dy <= win; dy++) for (let dx = -win; dx <= win; dx++) {
        const xx = sx0 + dx, yy = sy0 + dy;
        if (xx < 0 || yy < 0 || xx >= state.W || yy >= state.H) continue;
        const v = state.elev[yy * state.W + xx];
        if (v === -32768) continue;
        sum += v; n++;
      }
      // nodata (outside footprint) -> sea level (min); else smoothed average
      heights[iy * gw + ix] = n === 0 ? m.min : sum / n;
    }
  }
  const ramp = [
    [0.0, 0x1e, 0x46, 0x8c], [0.32, 0x28, 0xa0, 0x6e], [0.5, 0x78, 0xbe, 0x46],
    [0.66, 0xe1, 0xd2, 0x50], [0.8, 0xe6, 0x96, 0x32], [1.0, 0xfa, 0xfa, 0xfa],
  ];
  function colorFor(t) {
    for (let i = 1; i < ramp.length; i++) {
      if (t <= ramp[i][0]) {
        const a = ramp[i - 1], b = ramp[i], f = (t - a[0]) / (b[0] - a[0]);
        return [(a[1] + (b[1] - a[1]) * f) / 255, (a[2] + (b[2] - a[2]) * f) / 255, (a[3] + (b[3] - a[3]) * f) / 255];
      }
    }
    return [1, 1, 1];
  }
  for (let i = 0; i < pos.count; i++) {
    const v = heights[i];
    const t = (v - m.min) / (m.max - m.min);
    pos.setY(i, t * 110 * zExag);
    const [r, g, b] = colorFor(t);
    colors.push(r, g, b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0.0, flatShading: false });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(-200, 240, 180); scene.add(sun);
  scene.add(new THREE.AmbientLight(0x6688aa, 0.55));
  scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a1410, 0.4));

  state.three = { renderer, scene, camera, controls, mesh, wrap };
  function loop() {
    if (!state.three) return;
    controls.update();
    renderer.render(scene, camera);
    state.three.raf = requestAnimationFrame(loop);
  }
  loop();
}

function toggle3D(on) {
  document.getElementById('threeWrap').classList.toggle('hidden', !on);
  mapCanvas.classList.toggle('hidden', on);
  overlay.classList.toggle('hidden', on);
  floodCv.classList.toggle('hidden', on);
  waterCv.classList.toggle('hidden', on);
  // water overlays are 2D-only; pause rain while in 3D
  if (on && state.rain.active) { cancelAnimationFrame(state.rain.raf); }
  else if (!on && state.rain.active) { stepRain(); }
  if (on) document.getElementById('waterBanner').classList.add('hidden');
  else if (state.rain.active) document.getElementById('waterBanner').classList.remove('hidden');
  document.getElementById('readout').style.opacity = on ? '0.4' : '1';
  if (on && !state.three) init3D();
}

// ---------------- Rainfall animation ----------------
function flowAt(px, py) {
  const x = Math.max(0, Math.min(state.W - 1, px | 0));
  const y = Math.max(0, Math.min(state.H - 1, py | 0));
  const i = (y * state.W + x) * 2;
  return { dx: state.flow[i], dy: state.flow[i + 1] };
}

function spawnDrop() {
  // spawn on a random valid cell
  for (let tries = 0; tries < 20; tries++) {
    const x = Math.random() * state.W;
    const y = Math.random() * state.H;
    if (elevAt(x, y) !== null) {
      return { x, y, age: 0, life: 140 + Math.random() * 120, vx: 0, vy: 0, pooled: 0 };
    }
  }
  return null;
}

function stepRain() {
  if (!state.rain.active) return;
  const drops = state.rain.drops;
  // maintain population based on rate
  const target = 120 + state.rain.rate * 130;
  while (drops.length < target) {
    const d = spawnDrop();
    if (d) drops.push(d); else break;
  }
  // trail fade — erase a fraction of the transparent water canvas each frame
  // so the terrain map beneath stays fully visible while trails linger.
  wctx.globalCompositeOperation = 'destination-out';
  wctx.fillStyle = 'rgba(0,0,0,0.12)';
  wctx.fillRect(0, 0, state.W, state.H);

  wctx.globalCompositeOperation = 'lighter';
  for (let k = drops.length - 1; k >= 0; k--) {
    const d = drops[k];
    const f = flowAt(d.x, d.y);
    if (f.dx === 0 && f.dy === 0) {
      d.pooled++;
    } else {
      // momentum-smoothed downhill motion
      const speed = 0.9 + 0.04 * state.rain.rate;
      d.vx = d.vx * 0.5 + f.dx * speed * 0.5;
      d.vy = d.vy * 0.5 + f.dy * speed * 0.5;
      d.x += d.vx;
      d.y += d.vy;
      d.pooled = 0;
    }
    d.age++;
    const out = elevAt(d.x, d.y) === null;
    // draw
    const t = Math.min(1, d.age / d.life);
    const alpha = (1 - t) * 0.9;
    const r = d.pooled > 0 ? 2.2 : 1.4;
    wctx.beginPath();
    wctx.fillStyle = d.pooled > 3
      ? `rgba(56,189,248,${alpha})`        // pooled -> brighter blue
      : `rgba(125,211,252,${alpha})`;      // flowing -> light cyan
    wctx.arc(d.x, d.y, r, 0, 7);
    wctx.fill();
    // recycle
    if (d.age > d.life || out || d.pooled > 90) {
      const nd = spawnDrop();
      if (nd) drops[k] = nd; else drops.splice(k, 1);
    }
  }
  state.rain.raf = requestAnimationFrame(stepRain);
}

function toggleRain(on) {
  state.rain.active = on;
  document.getElementById('rainBtn').classList.toggle('active', on);
  document.getElementById('rainBtn').innerHTML = on
    ? '<span class="wb-ico">■</span> Stop rainfall'
    : '<span class="wb-ico">☂</span> Start rainfall';
  const banner = document.getElementById('waterBanner');
  banner.classList.toggle('hidden', !on);
  if (on) {
    document.getElementById('waterBannerText').textContent = 'Rainfall active — water flows downhill into channels';
    state.rain.drops = [];
    wctx.clearRect(0, 0, state.W, state.H);
    stepRain();
  } else {
    cancelAnimationFrame(state.rain.raf);
    wctx.clearRect(0, 0, state.W, state.H);
  }
}

// ---------------- Rainfall-Runoff Flood Model ----------------
// Physically-motivated, real-time browser model.
//
// Inputs:
//   P  = rainfall depth (mm)
//   T  = storm duration (h)
//   I  = infiltration class (0..3)
//
// For each cell we compute:
//   runoff_coef C  = f(slope, infiltration)
//   effective rain Pe = P * C (mm)
//   upstream cells A_up (from flow accumulation)
//   contributing area A = (A_up + 1) * cellArea_m2
//   water volume V = Pe / 1000 * A  (m^3)
//   peak discharge Q = V / (T*3600) * peakFactor  (m^3/s)
//   stream width w = a * Q^b  (regime equation, Leopold & Maddock)
//   water depth d = c * Q^f
// Cell is flagged “flooded” if d exceeds visualization threshold.
//
// All constants are calibrated for arid wadi catchments (Saudi Arabia).

const INFIL_PRESETS = [
  { name: 'Low (arid bedrock)', baseRunoff: 0.70, infilMM: 5 },
  { name: 'Medium (sand/gravel)', baseRunoff: 0.45, infilMM: 15 },
  { name: 'High (sandy soil)',    baseRunoff: 0.25, infilMM: 30 },
  { name: 'Very high (vegetated)',baseRunoff: 0.12, infilMM: 50 },
];

function computeSlopeFromFlow(i) {
  // Approximate slope magnitude from flow direction dx,dy and neighbour elev.
  const fi = i * 2;
  const dx = state.flow[fi], dy = state.flow[fi + 1];
  if (dx === 0 && dy === 0) return 0;
  const W = state.W;
  const x = i % W, y = (i / W) | 0;
  const nx = x + dx, ny = y + dy;
  if (nx < 0 || nx >= W || ny < 0 || ny >= state.H) return 0;
  const v = state.elev[i];
  const nv = state.elev[ny * W + nx];
  if (v === -32768 || nv === -32768) return 0;
  const dist = (dx !== 0 && dy !== 0) ? 42.43 : 30; // cell ~30m, diag = 30*sqrt(2)
  return Math.max(0, (v - nv) / dist); // rise/run
}

function runFloodModel() {
  if (!state.flowacc) {
    document.getElementById('floodStat').innerHTML =
      '<b>Flow accumulation data missing.</b> Cannot run physically-based model.';
    return;
  }
  const t0 = performance.now();
  const P = state.flood.rainDepth;      // mm
  const T = state.flood.rainDur;        // hours
  const preset = INFIL_PRESETS[state.flood.infil];
  const baseRunoff = preset.baseRunoff;
  const infilMM = preset.infilMM;

  // Effective rainfall after subtracting initial abstraction (SCS-style)
  // Pe = max(0, P - 0.2 * S)  where S ≈ infilMM here
  const Pe = Math.max(0, P - 0.2 * infilMM);

  // Source DEM resolution (m) - need to use the source 30m not the display pixel
  // because flowacc was computed at source resolution.  Each display pixel
  // corresponds to multiple source cells; we approximate with display pixel area.
  const m = state.meta;
  const pixelM = (m.area_km.width * 1000) / state.W;  // ~110m at display res
  const pixelArea = pixelM * pixelM;                  // m² per display pixel

  // Each flowacc value counts cells at SOURCE resolution (30m).
  // So contributing area for a display pixel ≈ acc * 30 * 30 m²
  const srcCellArea = m.src_resolution_m * m.src_resolution_m;  // 900 m²

  const img = fctx.createImageData(state.W, state.H);
  const data = img.data;

  let floodedCells = 0;
  let maxDepth = 0;
  let totalVolume = 0;
  let peakQ = 0;

  // Channel threshold: only cells with substantial upstream area are stream channels.
  // 50 source cells = 50 * 900 m² = 4.5 hectares of upstream drainage = minimum wadi.
  // Below this, water is sheet flow / hillslope runoff (not "flooding").
  const CHANNEL_THRESHOLD = 50;

  const N = state.elev.length;
  let floodedAreaM2 = 0;

  for (let i = 0; i < N; i++) {
    const ev = state.elev[i];
    const o = i * 4;
    if (ev === -32768) { data[o+3] = 0; continue; }

    // Exclude sea (elevation ≤ 0): these are ocean, not land floods.
    if (ev <= 1) { data[o+3] = 0; continue; }

    const acc = state.flowacc[i];

    // Only channel cells can flood. Hillslopes shed water - don't count them.
    if (acc < CHANNEL_THRESHOLD) { data[o+3] = 0; continue; }

    // Local slope influences runoff coefficient of upstream area
    const s = computeSlopeFromFlow(i);
    const slopeBoost = Math.min(1, s * 3);
    const C = Math.min(0.95, baseRunoff + 0.25 * slopeBoost);

    // Upstream contributing area in m²
    const Aup = (acc + 1) * srcCellArea;

    // Total runoff volume that passes through this channel cell (m³)
    const V = (Pe / 1000) * Aup * C;

    // Peak discharge - simplified peaking factor for arid flashy catchments
    // Q_peak ≈ V / (T*3600) * 2.5
    const Q = V / (T * 3600) * 2.5;

    // Regime equations for arid channels (Leopold-style)
    let depth = 0;
    if (Q > 0.05) {
      depth = 0.27 * Math.pow(Q, 0.30);
    }

    // Flood threshold: water depth > 0.3 m in a channel = significant flooding
    // (cars float at ~0.3 m, pedestrians swept at ~0.5 m)
    if (depth > 0.30) {
      floodedCells++;
      // Channel-width-aware area accounting:
      // Regime equation: width w ≈ 2.5 * Q^0.5 (m).
      // Flooded area in this pixel ≈ min(pixelM, w) * pixelM (channel length × width)
      const channelWidth = 2.5 * Math.sqrt(Q);
      const effectiveWidth = Math.min(pixelM, channelWidth);
      floodedAreaM2 += effectiveWidth * pixelM;

      if (depth > maxDepth) maxDepth = depth;
      if (Q > peakQ) { peakQ = Q; totalVolume = V; }

      // Color by depth: light cyan (shallow) -> deep navy (deep)
      const dNorm = Math.min(1, Math.log10(depth * 20 + 1) / 2.0);
      data[o]     = (140 - 110 * dNorm) | 0;
      data[o + 1] = (210 -  90 * dNorm) | 0;
      data[o + 2] = (255 -  35 * dNorm) | 0;
      data[o + 3] = (140 + 110 * dNorm) | 0;
    } else {
      data[o + 3] = 0;
    }
  }

  fctx.putImageData(img, 0, 0);

  state.flood.lastResult = {
    floodedCells, maxDepth, totalVolume, peakQ,
    P, T, Pe, infilName: preset.name, runtime: (performance.now() - t0)|0
  };

  // Update readout - use channel-width-aware area, not pixel count
  const pct = (100 * floodedCells / state.flood.validCount).toFixed(2);
  const areaKm2 = floodedAreaM2 / 1e6;
  document.getElementById('floodStat').innerHTML = `
    <div class="flood-readout">
      <div><b>${pct}%</b> of area flooded (${areaKm2.toFixed(1)} km²)</div>
      <div>Max depth: <b>${maxDepth.toFixed(2)} m</b></div>
      <div>Peak discharge: <b>${(peakQ).toLocaleString(undefined,{maximumFractionDigits:1})} m³/s</b></div>
      <div>Runoff volume: <b>${(totalVolume/1e6).toFixed(2)} M m³</b></div>
      <div class="hint-sub">Storm: ${P} mm over ${T} h → effective ${Pe.toFixed(1)} mm · ${preset.name}</div>
      <div class="hint-sub">Compute: ${state.flood.lastResult.runtime} ms</div>
    </div>`;
}

function clearFlood() {
  fctx.clearRect(0, 0, state.W, state.H);
  state.flood.lastResult = null;
  document.getElementById('floodStat').innerHTML =
    'Set rainfall, then run the model to predict flooded wadis and depths.';
}

// Legacy compat: keep renderFlood as a no-op since old bathtub slider is removed.
function renderFlood() { /* deprecated */ }

// ---------------- UI binding ----------------
function bindUI() {
  document.querySelectorAll('.layer-btn').forEach(b =>
    b.addEventListener('click', () => setLayer(b.dataset.layer)));
  mapCanvas.addEventListener('mousemove', onMove);
  mapCanvas.addEventListener('click', onProfileClick);
  document.getElementById('profileBtn').addEventListener('click', startProfile);
  document.getElementById('closeProfile').addEventListener('click', () => {
    document.getElementById('profilePanel').classList.add('hidden');
    octx.clearRect(0, 0, state.W, state.H);
    state.profile.p0 = state.profile.p1 = null;
  });
  document.getElementById('contourToggle').addEventListener('change', e => {
    state.contour = e.target.checked; drawMap();
  });
  document.getElementById('threeToggle').addEventListener('change', e => toggle3D(e.target.checked));

  // Rain animation (unchanged - drops follow flow lines)
  document.getElementById('rainBtn').addEventListener('click', () => toggleRain(!state.rain.active));

  // Flood model controls
  const rainDepth = document.getElementById('rainDepth');
  const rainDur   = document.getElementById('rainDur');
  const infil     = document.getElementById('infil');
  const rainDepthVal = document.getElementById('rainDepthVal');
  const rainDurVal   = document.getElementById('rainDurVal');
  const infilVal     = document.getElementById('infilVal');
  rainDepth.addEventListener('input', e => {
    state.flood.rainDepth = +e.target.value;
    rainDepthVal.textContent = `${state.flood.rainDepth} mm`;
  });
  rainDur.addEventListener('input', e => {
    state.flood.rainDur = +e.target.value;
    rainDurVal.textContent = `${state.flood.rainDur} h`;
  });
  infil.addEventListener('input', e => {
    state.flood.infil = +e.target.value;
    infilVal.textContent = INFIL_PRESETS[state.flood.infil].name;
  });
  document.getElementById('floodRunBtn').addEventListener('click', runFloodModel);
  document.getElementById('floodClearBtn').addEventListener('click', clearFlood);
  window.addEventListener('resize', () => {
    fitCanvas(); drawMap(); drawProfileMarkers();
    if (state.three) {
      const w = state.three.wrap.clientWidth, h = state.three.wrap.clientHeight;
      state.three.camera.aspect = w / h; state.three.camera.updateProjectionMatrix();
      state.three.renderer.setSize(w, h);
    }
  });
}

boot();
