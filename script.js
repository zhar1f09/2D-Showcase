/* ═══════════════════════════════════════════════════════════
   Clothing Showcaseinator — 2D Showcase
   Base image: 700 × 450 (character body)
   Texture:    585 × 559 (standard Roblox clothing)
   ═══════════════════════════════════════════════════════════ */

const CONFIG = {
  saveFilename: 'showcase.png',
};

/* ── Region maps ─────────────────────────────────────────
   sx, sy, sw, sh = crop from uploaded 585×559 texture
   dx, dy, dw, dh = paste position on 700×450 base image
   ──────────────────────────────────────────────────────── */

const SHIRT_REGIONS = [
  // Left arm (viewer's left = Roblox right arm)
  { sx: 151, sy: 355, sw: 64,  sh: 128,
    dx: 40,  dy: 100, dw: 100, dh: 200 },

  // Front torso (the T-shape center)
  { sx: 231, sy: 74,  sw: 128, sh: 128,
    dx: 180, dy: 100, dw: 340, dh: 190 },

  // Right arm (viewer's right = Roblox left arm)
  { sx: 374, sy: 355, sw: 64,  sh: 128,
    dx: 560, dy: 100, dw: 100, dh: 200 },
];

const PANTS_REGIONS = [
  // Left leg
  { sx: 151, sy: 355, sw: 64,  sh: 128,
    dx: 200, dy: 280, dw: 130, dh: 150 },

  // Right leg
  { sx: 374, sy: 355, sw: 64,  sh: 128,
    dx: 370, dy: 280, dw: 130, dh: 150 },

  // Hip area (covers both legs at top)
  { sx: 231, sy: 74,  sw: 128, sh: 128,
    dx: 200, dy: 250, dw: 300, dh: 60 },
];

/* ── State ─────────────────────────────────────────────── */
const state = {
  shirt:      null,
  pants:      null,
  background: null,
  base:       null,
  outline:    null,
};

/* ── DOM ───────────────────────────────────────────────── */
const preview     = document.getElementById('preview');
const dropOverlay = document.getElementById('drop-overlay');
const modal       = document.getElementById('modal');
const modalName   = document.getElementById('modal-filename');

/* ── Helpers ───────────────────────────────────────────── */

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

/* ── Core render ───────────────────────────────────────── */

function generateShowcase() {
  const hasClothing = state.shirt || state.pants;

  // Empty state → show outline
  if (!hasClothing) {
    if (state.outline) return imageToCanvas(state.outline);
    const blank = document.createElement('canvas');
    blank.width = 700; blank.height = 450;
    return blank;
  }

  // Need a base image
  if (!state.base) {
    console.warn('base.png missing — upload one into assets/');
    const blank = document.createElement('canvas');
    blank.width = 700; blank.height = 450;
    return blank;
  }

  const W = state.base.naturalWidth;
  const H = state.base.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // 1. Background (if user uploaded one)
  if (state.background) {
    ctx.drawImage(state.background.img, 0, 0, W, H);
  }

  // 2. Draw the character body
  ctx.drawImage(state.base, 0, 0, W, H);

  // 3. Pants first (under shirt)
  if (state.pants) {
    for (const r of PANTS_REGIONS) {
      ctx.drawImage(
        state.pants.img,
        r.sx, r.sy, r.sw, r.sh,
        r.dx, r.dy, r.dw, r.dh
      );
    }
  }

  // 4. Shirt on top
  if (state.shirt) {
    for (const r of SHIRT_REGIONS) {
      ctx.drawImage(
        state.shirt.img,
        r.sx, r.sy, r.sw, r.sh,
        r.dx, r.dy, r.dw, r.dh
      );
    }
  }

  return canvas;
}

/* ── Refresh preview ───────────────────────────────────── */

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

/* ── Sidebar ───────────────────────────────────────────── */

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
  try { state.base    = await loadImage('assets/base.png');    }
  catch { console.warn('base.png missing — add your character body image.'); }

  try { state.outline = await loadImage('assets/outline.png'); }
  catch { console.warn('outline.png missing.'); }

  refresh();
})();