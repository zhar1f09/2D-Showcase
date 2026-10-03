/* ═══════════════════════════════════════════════════════════
   Clothing Showcaseinator — Single + Multi Mode
   Single: 1 template, 1 shirt, 1 pants (original behavior)
   Multi:  3 slots, each with its own template + shirt + pants
   ═══════════════════════════════════════════════════════════ */

/* ── Coordinate map (from mathew1521) ──────────────────── */
const sideDrawingCoordinates = {
  '255,0,0': [
    { imageType: 'pants', sourceX: 151, sourceY: 355, offsetX: 0,   offsetY: 128, width: 64  },
    { imageType: 'shirt', sourceX: 151, sourceY: 355, offsetX: 0,   offsetY: 0,   width: 64  },
  ],
  '0,255,0': [
    { imageType: 'pants', sourceX: 217, sourceY: 355, offsetX: 64,  offsetY: 128, width: 64  },
    { imageType: 'pants', sourceX: 231, sourceY: 74,  offsetX: 64,  offsetY: 0,   width: 128 },
    { imageType: 'pants', sourceX: 308, sourceY: 355, offsetX: 128, offsetY: 128, width: 64  },
    { imageType: 'shirt', sourceX: 217, sourceY: 355, offsetX: 0,   offsetY: 0,   width: 64  },
    { imageType: 'shirt', sourceX: 231, sourceY: 74,  offsetX: 64,  offsetY: 0,   width: 128 },
    { imageType: 'shirt', sourceX: 308, sourceY: 355, offsetX: 192, offsetY: 0,   width: 64  },
  ],
  '0,0,255': [
    { imageType: 'pants', sourceX: 440, sourceY: 355, offsetX: 64,  offsetY: 128, width: 64  },
    { imageType: 'pants', sourceX: 427, sourceY: 74,  offsetX: 64,  offsetY: 0,   width: 128 },
    { imageType: 'pants', sourceX: 85,  sourceY: 355, offsetX: 128, offsetY: 128, width: 64  },
    { imageType: 'shirt', sourceX: 440, sourceY: 355, offsetX: 0,   offsetY: 0,   width: 64  },
    { imageType: 'shirt', sourceX: 427, sourceY: 74,  offsetX: 64,  offsetY: 0,   width: 128 },
    { imageType: 'shirt', sourceX: 85,  sourceY: 355, offsetX: 192, offsetY: 0,   width: 64  },
  ],
  '255,255,0': [
    { imageType: 'pants', sourceX: 374, sourceY: 355, offsetX: 0,   offsetY: 128, width: 64  },
    { imageType: 'shirt', sourceX: 374, sourceY: 355, offsetX: 0,   offsetY: 0,   width: 64  },
  ],
};

/* ── Available templates ──────────────────────────────── */
const TEMPLATES = [
  { id: 'blocks', label: 'Colored Blocks', path: 'assets/template-blocks.png' },
  { id: 'ile',    label: 'ILE Packages',   path: 'assets/template-ile.png'    },
];

/* ── App state ────────────────────────────────────────── */
const app = {
  mode: 'single',   // 'single' | 'multi'

  single: {
    templateId: TEMPLATES[0].id,
    template:   null,
    shirt:      null,
    pants:      null,
  },

  multi: {
    slots: Array.from({ length: 3 }, (_, i) => ({
      index: i,
      templateId: TEMPLATES[0].id,
      template:   null,
      shirt:      null,
      pants:      null,
    })),
  },

  outline: null,
};

/* ── DOM ──────────────────────────────────────────────── */
const preview      = document.getElementById('preview');
const dropOverlay  = document.getElementById('drop-overlay');
const modal        = document.getElementById('modal');
const modalName    = document.getElementById('modal-filename');
const modalButtons = document.getElementById('modal-buttons');
const saveBtn      = document.getElementById('save');

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

/* ── Core render (shared by both modes) ────────────────── */
/* Pass in { template, shirt, pants }. Returns canvas or null. */

function renderOutfit({ template, shirt, pants }) {
  if (!shirt && !pants) return null;
  if (!template) return null;

  const W = template.naturalWidth;
  const H = template.naturalHeight;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.drawImage(template, 0, 0);

  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;

  const shirtPix = shirt ? rasterize(shirt.img) : null;
  const pantsPix = pants ? rasterize(pants.img) : null;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] === 0) continue;

      const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      const coords = sideDrawingCoordinates[key];
      if (!coords) continue;

      /* Erase */
      for (const c of coords) {
        const x0 = x + c.offsetX;
        const y0 = y + c.offsetY;
        for (let cy = y0; cy < y0 + 128; cy++) {
          if (cy < 0 || cy >= H) continue;
          for (let cx = x0; cx < x0 + c.width; cx++) {
            if (cx < 0 || cx >= W) continue;
            const di = (cy * W + cx) * 4;
            data[di] = 0; data[di + 1] = 0; data[di + 2] = 0; data[di + 3] = 0;
          }
        }
      }

      /* Stamp — skip if that clothing is missing */
      for (const c of coords) {
        const img = c.imageType === 'shirt' ? shirtPix : pantsPix;
        if (!img) continue;

        for (let cy = 0; cy < 128; cy++) {
          for (let cx = 0; cx < c.width; cx++) {
            const sx = c.sourceX + cx;
            const sy = c.sourceY + cy;
            if (sx < 0 || sx >= img.width || sy < 0 || sy >= img.height) continue;

            const si = (sy * img.width + sx) * 4;
            if (img.data[si + 3] === 0) continue;

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

/* ── Compose final showcase based on mode ─────────────── */

function generateShowcase() {
  if (app.mode === 'single') {
    const c = renderOutfit(app.single);
    if (c) return c;
    return app.outline ? imageToCanvas(app.outline) : blankCanvas(700, 450);
  }

  /* Multi mode */
  const activeCanvases = [];
  for (const slot of app.multi.slots) {
    const c = renderOutfit(slot);
    if (c) activeCanvases.push(c);
  }

  if (activeCanvases.length === 0) {
    return app.outline ? imageToCanvas(app.outline) : blankCanvas(700, 450);
  }

  if (activeCanvases.length === 1) return activeCanvases[0];

  /* Grid: 2 columns */
  const gap  = 20;
  const cols = 2;
  const rows = Math.ceil(activeCanvases.length / cols);

  const cellW = Math.max(...activeCanvases.map(c => c.width));
  const cellH = Math.max(...activeCanvases.map(c => c.height));

  const outW = cols * cellW + (cols + 1) * gap;
  const outH = rows * cellH + (rows + 1) * gap;

  const out = document.createElement('canvas');
  out.width  = outW;
  out.height = outH;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  for (let i = 0; i < activeCanvases.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gap + col * (cellW + gap);
    const y = gap + row * (cellH + gap);
    const c = activeCanvases[i];
    const cx = x + (cellW - c.width)  / 2;
    const cy = y + (cellH - c.height) / 2;
    ctx.drawImage(c, cx, cy);
  }

  return out;
}

/* ── Refresh ───────────────────────────────────────────── */

function refresh() {
  const result = generateShowcase();
  preview.width  = result.width;
  preview.height = result.height;
  const ctx = preview.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, result.width, result.height);
  ctx.drawImage(result, 0, 0);
}

/* ── Build multi-slot UI ───────────────────────────────── */

function buildMultiSlots() {
  const panel = document.querySelector('[data-panel="multi"]');
  panel.innerHTML = '';

  for (const slot of app.multi.slots) {
    const card = document.createElement('div');
    card.className = 'slot';

    card.innerHTML = `
      <div class="slot-header">
        <span class="slot-title">Slot ${slot.index + 1}</span>
        <select class="slot-template" data-slot="${slot.index}">
          ${TEMPLATES.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
        </select>
      </div>

      <div class="slot-row">
        <div class="slot-row-header">
          <span>Shirt</span>
          <span class="slot-filename" id="slot-${slot.index}-shirt-name"></span>
        </div>
        <div class="slot-buttons">
          <button class="btn" data-upload="slot-${slot.index}-shirt">Upload</button>
          <button class="btn" data-clear="slot-${slot.index}-shirt">Clear</button>
        </div>
      </div>

      <div class="slot-row">
        <div class="slot-row-header">
          <span>Pants</span>
          <span class="slot-filename" id="slot-${slot.index}-pants-name"></span>
        </div>
        <div class="slot-buttons">
          <button class="btn" data-upload="slot-${slot.index}-pants">Upload</button>
          <button class="btn" data-clear="slot-${slot.index}-pants">Clear</button>
        </div>
      </div>

      <div class="gap-8"></div>
    `;

    panel.appendChild(card);

    /* Hidden file inputs */
    for (const type of ['shirt', 'pants']) {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = '.png,image/png';
      inp.id = `slot-${slot.index}-${type}`;
      inp.hidden = true;
      panel.appendChild(inp);
    }
  }
}

/* ── Mode toggle ───────────────────────────────────────── */

function setupModeToggle() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      app.mode = mode;

      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.mode-panel').forEach(p => {
        p.classList.toggle('hidden', p.dataset.panel !== mode);
      });

      refresh();
    });
  });
}

/* ── Single mode template dropdown ─────────────────────── */

function setupSingleTemplate() {
  const sel = document.getElementById('single-template');
  sel.innerHTML = TEMPLATES.map(t => `<option value="${t.id}">${t.label}</option>`).join('');
  sel.value = app.single.templateId;

  sel.addEventListener('change', async () => {
    const t = TEMPLATES.find(t => t.id === sel.value);
    try {
      app.single.templateId = t.id;
      app.single.template = await loadImage(t.path);
      refresh();
    } catch {
      alert(`Could not load template: ${t.path}`);
    }
  });
}

/* ── Wire up all buttons ───────────────────────────────── */

function wireControls() {
  /* Template dropdowns in multi slots */
  document.querySelectorAll('.slot-template').forEach(sel => {
    sel.addEventListener('change', async () => {
      const idx = Number(sel.dataset.slot);
      const t = TEMPLATES.find(t => t.id === sel.value);
      try {
        app.multi.slots[idx].templateId = t.id;
        app.multi.slots[idx].template = await loadImage(t.path);
        refresh();
      } catch {
        alert(`Could not load template: ${t.path}`);
      }
    });
  });

  /* Upload buttons */
  document.querySelectorAll('[data-upload]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById(btn.dataset.upload).click();
    });
  });

  /* Clear buttons */
  document.querySelectorAll('[data-clear]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.clear;

      /* Single mode: "single-shirt" / "single-pants" */
      if (id.startsWith('single-')) {
        const type = id.split('-')[1];
        app.single[type] = null;
        const nameEl = document.getElementById(`single-${type}-name`);
        if (nameEl) nameEl.textContent = '';
        refresh();
        return;
      }

      /* Multi mode: "slot-N-type" */
      const m = id.match(/slot-(\d+)-(shirt|pants)/);
      if (!m) return;
      const idx = Number(m[1]);
      const type = m[2];
      app.multi.slots[idx][type] = null;
      const nameEl = document.getElementById(`slot-${idx}-${type}-name`);
      if (nameEl) nameEl.textContent = '';
      refresh();
    });
  });

  /* Single mode file inputs */
  for (const type of ['shirt', 'pants']) {
    const input = document.getElementById(`single-${type}`);
    input.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const img = await fileToImage(file);
        app.single[type] = { img, name: file.name };
        const nameEl = document.getElementById(`single-${type}-name`);
        if (nameEl) nameEl.textContent = file.name;
        refresh();
      } catch (err) {
        alert(err.message);
      }
      e.target.value = '';
    });
  }

  /* Multi slot file inputs */
  for (let i = 0; i < app.multi.slots.length; i++) {
    for (const type of ['shirt', 'pants']) {
      const input = document.getElementById(`slot-${i}-${type}`);
      if (!input) continue;
      input.addEventListener('change', async e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          const img = await fileToImage(file);
          app.multi.slots[i][type] = { img, name: file.name };
          const nameEl = document.getElementById(`slot-${i}-${type}-name`);
          if (nameEl) nameEl.textContent = file.name;
          refresh();
        } catch (err) {
          alert(err.message);
        }
        e.target.value = '';
      });
    }
  }
}

/* ── Save ──────────────────────────────────────────────── */

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
  modalButtons.innerHTML = '';

  const targets = [];

  /* Single mode targets */
  targets.push({ label: 'Single — Shirt', apply: () => { app.single.shirt = { img: null, name: pendingFile.name }; } , type: 'shirt', scope: 'single' });
  targets.push({ label: 'Single — Pants', apply: () => { app.single.pants = { img: null, name: pendingFile.name }; } , type: 'pants', scope: 'single' });

  /* Multi mode targets */
  for (const slot of app.multi.slots) {
    targets.push({ label: `Slot ${slot.index + 1} — Shirt`, type: 'shirt', slotIdx: slot.index });
    targets.push({ label: `Slot ${slot.index + 1} — Pants`, type: 'pants', slotIdx: slot.index });
  }

  for (const t of targets) {
    const b = document.createElement('button');
    b.className = 'btn';
    b.textContent = t.label;
    b.addEventListener('click', async () => {
      modal.classList.remove('visible');
      if (!pendingFile) return;
      try {
        const img = await fileToImage(pendingFile);
        if (t.scope === 'single') {
          app.single[t.type] = { img, name: pendingFile.name };
          const nameEl = document.getElementById(`single-${t.type}-name`);
          if (nameEl) nameEl.textContent = pendingFile.name;
        } else {
          const slot = app.multi.slots[t.slotIdx];
          slot[t.type] = { img, name: pendingFile.name };
          const nameEl = document.getElementById(`slot-${slot.index}-${t.type}-name`);
          if (nameEl) nameEl.textContent = pendingFile.name;
        }
        refresh();
      } catch (err) { alert(err.message); }
      pendingFile = null;
    });
    modalButtons.appendChild(b);
  }

  const div = document.createElement('div');
  div.className = 'divider';
  modalButtons.appendChild(div);

  const cancel = document.createElement('button');
  cancel.className = 'btn';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => {
    modal.classList.remove('visible');
    pendingFile = null;
  });
  modalButtons.appendChild(cancel);

  modal.classList.add('visible');
});

/* ── Init ──────────────────────────────────────────────── */

(async function init() {
  buildMultiSlots();
  setupModeToggle();
  setupSingleTemplate();

  /* Load default template for single mode */
  {
    const t = TEMPLATES.find(t => t.id === app.single.templateId);
    try { app.single.template = await loadImage(t.path); }
    catch { console.warn(`Missing: ${t.path}`); }
  }

  /* Load default template for each multi slot */
  for (const slot of app.multi.slots) {
    const t = TEMPLATES.find(t => t.id === slot.templateId);
    try { slot.template = await loadImage(t.path); }
    catch { console.warn(`Missing: ${t.path}`); }
  }

  /* Outline (empty state) */
  try { app.outline = await loadImage('assets/outline.png'); }
  catch { console.warn('outline.png missing.'); }

  /* Wire all controls AFTER buildMultiSlots() created the DOM */
  wireControls();

  refresh();
})();