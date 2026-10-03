/* ═══════════════════════════════════════════════════════════
   Clothing Showcaseinator — 2D Showcase
   Template.png drives everything. Colored regions get filled
   with skin tone (default) or clothing texture (when uploaded).
   ═══════════════════════════════════════════════════════════ */

const CONFIG = {
  saveFilename: 'showcase.png',
  skinTone:     { r: 255, g: 216, b: 194 },   // default — updates from picker
};

/* ── Anchor map ──────────────────────────────────────────
   Keys  = exact "R,G,B" of colors in template.png
   Values = crop { sx, sy, sw, sh } from the uploaded
            585×559 clothing texture that fills that region
   ──────────────────────────────────────────────────────── */
const ANCHORS = {
  '255,0,0': {        // 🔴 RED — left arm
    shirt: { sx: 151, sy: 355, sw: 64,  sh: 128 },
    pants: { sx: 151, sy: 355, sw: 64,  sh: 128 },
  },
  '0,255,0': {        // 🟢 GREEN — front torso
    shirt: { sx: 231, sy: 74,  sw: 128, sh: 128 },
    pants: { sx: 231, sy: 74,  sw: 128, sh: 128 },
  },
  '0,0,255': {        // 🔵 BLUE — back torso
    shirt: { sx: 427, sy: 74,  sw: 128, sh: 128 },
    pants: { sx: 427, sy: 74,  sw: 128, sh: 128 },
  },
  '255,255,0': {      // 🟡 YELLOW — right arm
    shirt: { sx: 374, sy: 355, sw: 64,  sh: 128 },
    pants: { sx: 374, sy: 355, sw: 64,  sh: 128 },
  },
};

/* ── State ─────────────────────────────────────────────── */
const state = {
  shirt:      null,
  pants:      null,
  background: null,
  template:   null,
  outline:    null,
};

/* ── DOM ───────────────────────────────────────────────── */
const preview     = document.getElementById('preview');
const dropOverlay = document.getElementById('drop-overlay');
const modal       = document.getElementById('modal');
const modalName   = document.getElementById('modal-filename');

/* ── Image helpers ─────────────────────────────────────── */

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => reject(new Error('Invalid image file'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function imageToCanvas(img) {
  const c = document.createElement('canvas');
  c.width  = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

function rasterize(img) {
  const c = document.createElement('canvas');
  c.width  = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0);
  return {
    width:  c.width,
    height: c.height,
    data:   ctx.getImageData(0, 0, c.width, c.height).data,
  };
}

/* ── Color helpers ─────────────────────────────────────── */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const to2 = n => n.toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/* ── Bounding boxes for each anchor color ──────────────── */

function computeBBoxes(tmplData, W, H) {
  const boxes = {};
  for (const key of Object.keys(ANCHORS)) {
    boxes[key] = { minX: W, minY: H, maxX: -1, maxY: -1, found: false };
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (tmplData[i + 3] === 0) continue;
      const key = `${tmplData[i]},${tmplData[i + 1]},${tmplData[i + 2]}`;
      const bb = boxes[key];
      if (!bb) continue;
      if (x < bb.minX) bb.minX = x;
      if (x > bb.maxX) bb.maxX = x;
      if (y < bb.minY) bb.minY = y;
      if (y > bb.maxY) bb.maxY = y;
      bb.found = true;
    }
  }
  return boxes;
}

/* ── Core render ───────────────────────────────────────── */

function generateShowcase() {
  const hasClothing = state.shirt || state.pants;

  /* Empty state → outline */
  if (!hasClothing) {
    if (state.outline) return imageToCanvas(state.outline);
    const blank = document.createElement('canvas');
    blank.width = 700; blank.height = 450;
    return blank;
  }

  if (!state.template) {
    if (state.outline) return imageToCanvas(state.outline);
    const blank = document.createElement('canvas');
    blank.width = 700; blank.height = 450;
    return blank;
  }

  const W = state.template.naturalWidth;
  const H = state.template.naturalHeight;

  /* Rasterize template so we can read pixels */
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width  = W;
  tmpCanvas.height = H;
  const tmpCtx = tmpCanvas.getContext('2d');
  tmpCtx.imageSmoothingEnabled = false;
  tmpCtx.drawImage(state.template, 0, 0);
  const tmpData = tmpCtx.getImageData(0, 0, W, H).data;

  /* Bounding boxes for each colored region */
  const bboxes = computeBBoxes(tmpData, W, H);

  /* Rasterize uploaded clothing */
  const shirtPix = state.shirt ? rasterize(state.shirt.img) : null;
  const pantsPix = state.pants ? rasterize(state.pants.img) : null;

  /* Output canvas */
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* Optional background */
  if (state.background) {
    ctx.drawImage(state.background.img, 0, 0, W, H);
  }

  /* Per-pixel fill */
  const out = ctx.getImageData(0, 0, W, H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = tmpData[i + 3];

      /* Transparent → leave as-is (background shows) */
      if (a === 0) continue;

      const key = `${tmpData[i]},${tmpData[i + 1]},${tmpData[i + 2]}`;
      const anchor = ANCHORS[key];

      /* Non-anchor pixel → copy from template (branding text) */
      if (!anchor) {
        out.data[i]     = tmpData[i];
        out.data[i + 1] = tmpData[i + 1];
        out.data[i + 2] = tmpData[i + 2];
        out.data[i + 3] = tmpData[i + 3];
        continue;
      }

      /* Anchor pixel → fill with clothing or skin tone */
      const bb = bboxes[key];
      if (!bb || !bb.found) continue;

      const bbW = bb.maxX - bb.minX + 1;
      const bbH = bb.maxY - bb.minY + 1;
      const u = (x - bb.minX) / bbW;   // 0..1 across region
      const v = (y - bb.minY) / bbH;   // 0..1 down region

      let src    = null;
      let coords = null;
      if (state.shirt && shirtPix) {
        src = shirtPix; coords = anchor.shirt;
      } else if (state.pants && pantsPix) {
        src = pantsPix; coords = anchor.pants;
      }

      if (src && coords) {
        const srcX = Math.min(src.width  - 1, Math.floor(coords.sx + u * coords.sw));
        const srcY = Math.min(src.height - 1, Math.floor(coords.sy + v * coords.sh));
        const si   = (srcY * src.width + srcX) * 4;
        out.data[i]     = src.data[si];
        out.data[i + 1] = src.data[si + 1];
        out.data[i + 2] = src.data[si + 2];
        out.data[i + 3] = 255;
      } else {
        /* Live-read skin tone so picker changes apply instantly */
        const sk = CONFIG.skinTone;
        out.data[i]     = sk.r;
        out.data[i + 1] = sk.g;
        out.data[i + 2] = sk.b;
        out.data[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas;
}

/* ── Preview refresh ───────────────────────────────────── */

function refresh() {
  const result = generateShowcase();
  preview.width  = result.width;
  preview.height = result.height;
  const ctx = preview.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, result.width, result.height);
  ctx.drawImage(result, 0, 0);
}

/* ── Set / clear ───────────────────────────────────────── */

function setItem(kind, img, name) {
  state[kind] = { img, name };
  const label = document.getElementById(`${kind}-filename`);
  if (label) label.textContent = name;
  refresh();
}

function clearItem(kind) {
  state[kind] = null;
  const label = document.getElementById(`${kind}-filename`);
  if (label) label.textContent = '';
  refresh();
}

/* ── Sidebar upload / clear ────────────────────────────── */

document.querySelectorAll('[data-upload]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById(`${btn.dataset.upload}-input`).click();
  });
});

document.querySelectorAll('[data-clear]').forEach(btn => {
  btn.addEventListener('click', () => clearItem(btn.dataset.clear));
});

['shirt', 'pants', 'background'].forEach(kind => {
  const input = document.getElementById(`${kind}-input`);
  if (!input) return;
  input.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await fileToImage(file);
      setItem(kind, img, file.name);
    } catch (err) {
      alert(err.message);
    }
    e.target.value = '';
  });
});

/* ── Skin tone picker ──────────────────────────────────── */

(function initSkinPicker() {
  const picker  = document.getElementById('skin-picker');
  const presets = document.querySelectorAll('.preset');
  if (!picker) return;

  /* Initial value from CONFIG */
  picker.value = rgbToHex(CONFIG.skinTone);

  /* Live changes from the color input */
  picker.addEventListener('input', e => {
    CONFIG.skinTone = hexToRgb(e.target.value);
    presets.forEach(p => p.classList.remove('active'));
    refresh();
  });

  /* Preset swatches */
  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      const hex = btn.dataset.color;
      picker.value = hex;
      CONFIG.skinTone = hexToRgb(hex);
      presets.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      refresh();
    });
  });

  /* Mark the default swatch as active */
  presets.forEach(btn => {
    if (btn.dataset.color.toLowerCase() === rgbToHex(CONFIG.skinTone).toLowerCase()) {
      btn.classList.add('active');
    }
  });
})();

/* ── Save ──────────────────────────────────────────────── */

const saveBtn = document.getElementById('save');
if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    const result = generateShowcase();
    result.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = CONFIG.saveFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  });
}

/* ── Drag & drop ───────────────────────────────────────── */

let dragDepth = 0;
let pendingFile = null;

document.addEventListener('dragenter', e => {
  e.preventDefault();
  if (!e.dataTransfer.types.includes('Files')) return;
  dragDepth++;
  dropOverlay.classList.add('visible');
});

document.addEventListener('dragover', e => e.preventDefault());

document.addEventListener('dragleave', e => {
  e.preventDefault();
  dragDepth--;
  if (dragDepth <= 0) {
    dragDepth = 0;
    dropOverlay.classList.remove('visible');
  }
});

document.addEventListener('drop', async e => {
  e.preventDefault();
  dragDepth = 0;
  dropOverlay.classList.remove('visible');

  const file = e.dataTransfer.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.png')) {
    alert('Only PNG images are supported.');
    return;
  }

  pendingFile = file;
  modalName.textContent = file.name;
  modal.classList.add('visible');
});

document.querySelectorAll('[data-apply]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.apply;
    modal.classList.remove('visible');
    if (action === 'cancel' || !pendingFile) { pendingFile = null; return; }
    try {
      const img = await fileToImage(pendingFile);
      setItem(action, img, pendingFile.name);
    } catch (err) { alert(err.message); }
    pendingFile = null;
  });
});

/* ── Init ──────────────────────────────────────────────── */

(async function init() {
  try { state.template = await loadImage('assets/template.png'); }
  catch { console.warn('template.png missing.'); }

  try { state.outline  = await loadImage('assets/outline.png');  }
  catch { console.warn('outline.png missing.'); }

  refresh();
})();