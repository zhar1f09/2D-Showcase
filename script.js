/* ═══════════════════════════════════════════════════════════
   Clothing Showcaseinator — Web Edition
   Ported from the original Go/Fyne desktop app by mathew1521
   ═══════════════════════════════════════════════════════════ */

/* ── Config (edit freely — make it yours!) ─────────────── */
const CONFIG = {
  saveFilename: 'showcase.png',
};

/* ── Coordinate map (1:1 port from the Go source) ──────── */
/* Key = "R,G,B" of the anchor color in template.png       */
/* Each entry: { type, sx, sy, ox, oy, w }                 */
/*   type = 'shirt' | 'pants'                              */
/*   sx,sy = source top-left in the clothing PNG           */
/*   ox,oy = offset from the anchor pixel                  */
/*   w     = width (height is always 128)                  */
const COORDS = {
  '255,0,0': [ // RED
    { type: 'pants', sx: 151, sy: 355, ox: 0,   oy: 128, w: 64  },
    { type: 'shirt', sx: 151, sy: 355, ox: 0,   oy: 0,   w: 64  },
  ],
  '0,255,0': [ // GREEN
    { type: 'pants', sx: 217, sy: 355, ox: 64,  oy: 128, w: 64  },
    { type: 'pants', sx: 231, sy: 74,  ox: 64,  oy: 0,   w: 128 },
    { type: 'pants', sx: 308, sy: 355, ox: 128, oy: 128, w: 64  },
    { type: 'shirt', sx: 217, sy: 355, ox: 0,   oy: 0,   w: 64  },
    { type: 'shirt', sx: 231, sy: 74,  ox: 64,  oy: 0,   w: 128 },
    { type: 'shirt', sx: 308, sy: 355, ox: 192, oy: 0,   w: 64  },
  ],
  '0,0,255': [ // BLUE
    { type: 'pants', sx: 440, sy: 355, ox: 64,  oy: 128, w: 64  },
    { type: 'pants', sx: 427, sy: 74,  ox: 64,  oy: 0,   w: 128 },
    { type: 'pants', sx: 85,  sy: 355, ox: 128, oy: 128, w: 64  },
    { type: 'shirt', sx: 440, sy: 355, ox: 0,   oy: 0,   w: 64  },
    { type: 'shirt', sx: 427, sy: 74,  ox: 64,  oy: 0,   w: 128 },
    { type: 'shirt', sx: 85,  sy: 355, ox: 192, oy: 0,   w: 64  },
  ],
  '255,255,0': [ // YELLOW
    { type: 'pants', sx: 374, sy: 355, ox: 0,   oy: 128, w: 64  },
    { type: 'shirt', sx: 374, sy: 355, ox: 0,   oy: 0,   w: 64  },
  ],
};

const CLOTHING_HEIGHT = 128;

/* ── State ─────────────────────────────────────────────── */
const state = {
  shirt:      null, // { img, name }
  pants:      null,
  background: null,
  template:   null, // HTMLImageElement
  outline:    null, // HTMLImageElement
};

/* ── DOM refs ──────────────────────────────────────────── */
const preview      = document.getElementById('preview');
const dropOverlay  = document.getElementById('drop-overlay');
const modal        = document.getElementById('modal');
const modalName    = document.getElementById('modal-filename');

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

/* ── Core generation (mirrors generateShowcase() in Go) ── */

function generateShowcase() {
  // Empty state → show outline (or blank)
  if (!state.shirt && !state.pants && !state.background) {
    if (state.outline) return imageToCanvas(state.outline);
    const blank = document.createElement('canvas');
    blank.width = 700; blank.height = 450;
    return blank;
  }

  if (!state.template) {
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

  /* 1. Stretched background */
  let bgCanvas = null;
  if (state.background) {
    bgCanvas = document.createElement('canvas');
    bgCanvas.width  = W;
    bgCanvas.height = H;
    const bgCtx = bgCanvas.getContext('2d');
    bgCtx.imageSmoothingEnabled = false;
    bgCtx.drawImage(state.background.img, 0, 0, W, H);
    ctx.drawImage(bgCanvas, 0, 0);
  }

  /* 2. Template overlay */
  ctx.drawImage(state.template, 0, 0);

  /* 3. Scan for anchor pixels */
  const data    = ctx.getImageData(0, 0, W, H).data;
  const anchors = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] === 0) continue; // transparent
      const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      if (COORDS[key]) anchors.push({ x, y, coords: COORDS[key] });
    }
  }

  /* 4. Erase + stamp for each anchor */
  for (const anchor of anchors) {
    for (const c of anchor.coords) {
      const dx = anchor.x + c.ox;
      const dy = anchor.y + c.oy;

      // Erase the region (fill with background or clear)
      if (bgCanvas) {
        ctx.drawImage(bgCanvas, dx, dy, c.w, CLOTHING_HEIGHT,
                                dx, dy, c.w, CLOTHING_HEIGHT);
      } else {
        ctx.clearRect(dx, dy, c.w, CLOTHING_HEIGHT);
      }

      // Stamp the clothing region on top
      const item = c.type === 'shirt' ? state.shirt : state.pants;
      if (item) {
        ctx.drawImage(item.img,
                      c.sx, c.sy, c.w, CLOTHING_HEIGHT,
                      dx,   dy,   c.w, CLOTHING_HEIGHT);
      }
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
  label.textContent = name;
  refresh();
}

function clearItem(kind) {
  state[kind] = null;
  document.getElementById(`${kind}-filename`).textContent = '';
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
  document.getElementById(`${kind}-input`).addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await fileToImage(file);
      setItem(kind, img, file.name);
    } catch (err) {
      alert(err.message);
    }
    e.target.value = ''; // reset so same file can be re-selected
  });
});

/* ── Save ──────────────────────────────────────────────── */

document.getElementById('save').addEventListener('click', () => {
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
  try { state.template = await loadImage('assets/template.png'); }
  catch { console.warn('template.png not found — upload clothing to render.'); }

  try { state.outline  = await loadImage('assets/outline.png'); }
  catch { console.warn('outline.png not found — empty state will be blank.'); }

  refresh();
})();