/* ═══════════════════════════════════════════════════════════
   Clothing Showcaseinator — Web Edition
   Faithful port of mathew1521/clothing-showcaseinator (Go)
   Anchor-based scanning, same coordinate map, same behavior.
   ═══════════════════════════════════════════════════════════ */

/* ── Coordinate map (1:1 port from main.go) ────────────── */
/* Key = "R,G,B" anchor color found in template.png        */
/* Each entry: { imageType, sourceX, sourceY,               */
/*               offsetX, offsetY, width }                  */
/* Height is always 128.                                    */
const sideDrawingCoordinates = {
  '255,0,0': [ // RED
    { imageType: 'pants', sourceX: 151, sourceY: 355, offsetX: 0,   offsetY: 128, width: 64  },
    { imageType: 'shirt', sourceX: 151, sourceY: 355, offsetX: 0,   offsetY: 0,   width: 64  },
  ],
  '0,255,0': [ // GREEN
    { imageType: 'pants', sourceX: 217, sourceY: 355, offsetX: 64,  offsetY: 128, width: 64  },
    { imageType: 'pants', sourceX: 231, sourceY: 74,  offsetX: 64,  offsetY: 0,   width: 128 },
    { imageType: 'pants', sourceX: 308, sourceY: 355, offsetX: 128, offsetY: 128, width: 64  },
    { imageType: 'shirt', sourceX: 217, sourceY: 355, offsetX: 0,   offsetY: 0,   width: 64  },
    { imageType: 'shirt', sourceX: 231, sourceY: 74,  offsetX: 64,  offsetY: 0,   width: 128 },
    { imageType: 'shirt', sourceX: 308, sourceY: 355, offsetX: 192, offsetY: 0,   width: 64  },
  ],
  '0,0,255': [ // BLUE
    { imageType: 'pants', sourceX: 440, sourceY: 355, offsetX: 64,  offsetY: 128, width: 64  },
    { imageType: 'pants', sourceX: 427, sourceY: 74,  offsetX: 64,  offsetY: 0,   width: 128 },
    { imageType: 'pants', sourceX: 85,  sourceY: 355, offsetX: 128, offsetY: 128, width: 64  },
    { imageType: 'shirt', sourceX: 440, sourceY: 355, offsetX: 0,   offsetY: 0,   width: 64  },
    { imageType: 'shirt', sourceX: 427, sourceY: 74,  offsetX: 64,  offsetY: 0,   width: 128 },
    { imageType: 'shirt', sourceX: 85,  sourceY: 355, offsetX: 192, offsetY: 0,   width: 64  },
  ],
  '255,255,0': [ // YELLOW
    { imageType: 'pants', sourceX: 374, sourceY: 355, offsetX: 0,   offsetY: 128, width: 64  },
    { imageType: 'shirt', sourceX: 374, sourceY: 355, offsetX: 0,   offsetY: 0,   width: 64  },
  ],
};

/* ── State ─────────────────────────────────────────────── */
const state = {
  shirt:      null,  // { img, name }
  pants:      null,
  background: null,
  template:   null,  // HTMLImageElement
  outline:    null,  // HTMLImageElement
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

function blankCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* Read full pixel buffer from an image */
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

/* ── Core generation (1:1 port of generateShowcase) ────── */

function generateShowcase() {
  /* Empty state → show outline */
  if (!state.shirt && !state.pants && !state.background) {
    if (state.outline) return imageToCanvas(state.outline);
    return blankCanvas(700, 450);
  }

  /* No template → blank */
  if (!state.template) {
    return blankCanvas(700, 450);
  }

  const W = state.template.naturalWidth;
  const H = state.template.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  /* 1. Stretch background to fill bounds */
  let stretchedBg = null;
  if (state.background) {
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width  = W;
    bgCanvas.height = H;
    const bgCtx = bgCanvas.getContext('2d');
    bgCtx.imageSmoothingEnabled = false;
    bgCtx.drawImage(state.background.img, 0, 0, W, H);
    stretchedBg = bgCtx.getImageData(0, 0, W, H).data;
    ctx.drawImage(bgCanvas, 0, 0);
  }

  /* 2. Draw template over the top (source-over, matches draw.Over) */
  ctx.drawImage(state.template, 0, 0);

  /* 3. Read the composited pixels */
  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;

  /* 4. Rasterize uploaded clothing */
  const shirtPix = state.shirt ? rasterize(state.shirt.img) : null;
  const pantsPix = state.pants ? rasterize(state.pants.img) : null;
  const clothing = { shirt: shirtPix, pants: pantsPix };

  /* 5. Scan every pixel */
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] === 0) continue;  // transparent → skip

      const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      const coords = sideDrawingCoordinates[key];
      if (!coords) continue;

      /* ── Erase step: fill every coord's region with bg or transparent ── */
      for (const c of coords) {
        const x0 = x + c.offsetX;
        const y0 = y + c.offsetY;
        for (let cy = y0; cy < y0 + 128; cy++) {
          if (cy < 0 || cy >= H) continue;
          for (let cx = x0; cx < x0 + c.width; cx++) {
            if (cx < 0 || cx >= W) continue;
            const di = (cy * W + cx) * 4;
            if (stretchedBg) {
              data[di]     = stretchedBg[di];
              data[di + 1] = stretchedBg[di + 1];
              data[di + 2] = stretchedBg[di + 2];
              data[di + 3] = stretchedBg[di + 3];
            } else {
              data[di] = 0; data[di + 1] = 0; data[di + 2] = 0; data[di + 3] = 0;
            }
          }
        }
      }

      /* ── Stamp step: paste clothing pixels where alpha > 0 ── */
      for (const c of coords) {
        const img = clothing[c.imageType];
        if (!img) continue;

        for (let cy = 0; cy < 128; cy++) {
          for (let cx = 0; cx < c.width; cx++) {
            const sx = c.sourceX + cx;
            const sy = c.sourceY + cy;
            if (sx < 0 || sx >= img.width || sy < 0 || sy >= img.height) continue;

            const si = (sy * img.width + sx) * 4;
            if (img.data[si + 3] === 0) continue;  // skip transparent source

            const dx = x + c.offsetX + cx;
            const dy = y + c.offsetY + cy;
            if (dx < 0 || dx >= W || dy < 0 || dy >= H) continue;

            const di = (dy * W + dx) * 4;
            data[di]     = img.data[si];
            data[di + 1] = img.data[si + 1];
            data[di + 2] = img.data[si + 2];
            data[di + 3] = img.data[si + 3];
          }
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
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

/* ── Sidebar: upload / clear ───────────────────────────── */

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
      a.download = 'showcase.png';
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