/* ═══════════════════════════════════════════════════════════
   Clothing Showcaseinator — Web Edition (Region-Fill Mode)
   Custom template compatible — Nocturne Designs
   ═══════════════════════════════════════════════════════════ */

/* ── Config ────────────────────────────────────────────── */
const CONFIG = {
  saveFilename: 'showcase.png',
};

/* ── Region-fill map ───────────────────────────────────────
   Keys   = exact "R,G,B" of a color in your template.png
   Values = crop region { x, y, w, h } from the uploaded
            clothing image that should fill that shape.
   ────────────────────────────────────────────────────────── */
const REGION_MAP = {
  '255,0,0': {        // 🔴 RED — left arm
    shirt: { x: 151, y: 355, w: 64,  h: 128 },
    pants: { x: 151, y: 355, w: 64,  h: 128 },
  },
  '0,255,0': {        // 🟢 GREEN — front torso (T-shape)
    shirt: { x: 231, y: 74,  w: 128, h: 128 },
    pants: { x: 231, y: 74,  w: 128, h: 128 },
  },
  '0,0,255': {        // 🔵 BLUE — back torso (T-shape)
    shirt: { x: 427, y: 74,  w: 128, h: 128 },
    pants: { x: 427, y: 74,  w: 128, h: 128 },
  },
  '255,255,0': {      // 🟡 YELLOW — right arm
    shirt: { x: 374, y: 355, w: 64,  h: 128 },
    pants: { x: 374, y: 355, w: 64,  h: 128 },
  },
};

/* ── State ─────────────────────────────────────────────── */
const state = {
  shirt:      null, // { img, name }
  pants:      null,
  background: null,
  template:   null, // HTMLImageElement
  outline:    null, // HTMLImageElement
};

/* ── DOM refs ──────────────────────────────────────────── */
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

/* ── Core generation ───────────────────────────────────── */

function generateShowcase() {
  /* Empty state → show outline */
  if (!state.shirt && !state.pants && !state.background) {
    if (state.outline) return imageToCanvas(state.outline);
    const blank = document.createElement('canvas');
    blank.width = 700; blank.height = 450;
    return blank;
  }

  /* No template → fall back to outline or blank */
  if (!state.template) {
    if (state.outline) return imageToCanvas(state.outline);
    const blank = document.createElement('canvas');
    blank.width = 700; blank.height = 450;
    return blank;
  }

  const W = state.template.naturalWidth;
  const H = state.template.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* 1. Stretch background across the whole canvas */
  if (state.background) {
    ctx.drawImage(state.background.img, 0, 0, W, H);
  }

  /* 2. Rasterize the template so we can read its pixels */
  const tmplCanvas = document.createElement('canvas');
  tmplCanvas.width  = W;
  tmplCanvas.height = H;
  const tmplCtx = tmplCanvas.getContext('2d');
  tmplCtx.imageSmoothingEnabled = false;
  tmplCtx.drawImage(state.template, 0, 0);
  const tmplData = tmplCtx.getImageData(0, 0, W, H).data;

  /* 3. For each color, build a mask, then fill it */
  for (const [colorKey, mapping] of Object.entries(REGION_MAP)) {
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width  = W;
    maskCanvas.height = H;
    const maskCtx = maskCanvas.getContext('2d');
    const maskImg = maskCtx.createImageData(W, H);

    let minX = W, minY = H, maxX = -1, maxY = -1;
    let found = false;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        if (tmplData[i + 3] === 0) continue; // transparent
        const key = `${tmplData[i]},${tmplData[i + 1]},${tmplData[i + 2]}`;
        if (key !== colorKey) continue;

        maskImg.data[i]     = 255;
        maskImg.data[i + 1] = 255;
        maskImg.data[i + 2] = 255;
        maskImg.data[i + 3] = 255;

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }

    if (!found) continue; // this color isn't in the template

    maskCtx.putImageData(maskImg, 0, 0);

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;

    /* Draw shirt AND pants into the region */
    for (const type of ['shirt', 'pants']) {
      const item = state[type];
      if (!item) continue;
      const src = mapping[type];
      if (!src) continue;

      /* Texture layer: crop from clothing image, stretch to bbox */
      const texCanvas = document.createElement('canvas');
      texCanvas.width  = W;
      texCanvas.height = H;
      const texCtx = texCanvas.getContext('2d');
      texCtx.imageSmoothingEnabled = false;
      texCtx.drawImage(
        item.img,
        src.x, src.y, src.w, src.h,   // source crop
        minX,  minY,  bboxW, bboxH    // destination (stretched)
      );

      /* Clip to mask shape */
      texCtx.globalCompositeOperation = 'destination-in';
      texCtx.drawImage(maskCanvas, 0, 0);

      /* Composite onto the main canvas */
      ctx.drawImage(texCanvas, 0, 0);
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

/* ── Set / clear helpers ───────────────────────────────── */

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

/* ── Sidebar: upload / clear buttons ───────────────────── */

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
    e.target.value = ''; // allow re-selecting same file
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

/* ── Modal buttons ─────────────────────────────────────── */

document.querySelectorAll('[data-apply]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.apply;
    modal.classList.remove('visible');

    if (action === 'cancel' || !pendingFile) {
      pendingFile = null;
      return;
    }

    try {
      const img = await fileToImage(pendingFile);
      setItem(action, img, pendingFile.name);
    } catch (err) {
      alert(err.message);
    }
    pendingFile = null;
  });
});

/* ── Init ──────────────────────────────────────────────── */

(async function init() {
  try {
    state.template = await loadImage('assets/template.png');
  } catch {
    console.warn('template.png not found — upload clothing to render.');
  }

  try {
    state.outline = await loadImage('assets/outline.png');
  } catch {
    console.warn('outline.png not found — empty state will be blank.');
  }

  refresh();
})();