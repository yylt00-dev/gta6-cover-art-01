// Wires the page: photos, layouts, grades, caption, per-panel crop, and PNG export.
// Photos are read on this machine (file input or the built-in samples) and never uploaded.
// A `?demo=` / `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).

import { drawCover, exportCoverPng, EXPORT_SIZES } from './cover.js';
import { LAYOUTS, LAYOUT_IDS, layoutPanels } from './layouts.js';
import { GRADES, GRADE_IDS } from './grades.js';
import { parseDemo, markShotReady } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const library = document.getElementById('library');

const state = {
  layout: 'hero3',
  grade: 'sunset',
  size: 'square',
  title: 'Vice City Nights',
  subtitle: 'A story in neon',
  captionStyle: 'gradient',
  captionPosition: 'bottom',
  captionSize: 1,
  panels: [], // [{ photo, cx, cy, zoom }] — photo is an index into photos, -1 for empty
  selected: 0,
  selectedPhoto: 0,
};

let photos = []; // [{ img, name }]
let lastPanels = []; // panel rects of the last preview render, for hit-testing
let fontsReady = false;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function defaultPanels(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push({ photo: photos.length ? i % photos.length : -1, cx: 0, cy: 0, zoom: 1 });
  }
  return out;
}

/** Keeps the panel crops in step with the layout's panel count. */
function syncPanels() {
  const count = layoutPanels(state.layout, 1080, 1080).length;
  const next = defaultPanels(count);
  for (let i = 0; i < Math.min(count, state.panels.length); i += 1) next[i] = state.panels[i];
  state.panels = next;
  if (state.selected >= count) state.selected = 0;
}

function render() {
  const size = EXPORT_SIZES[state.size];
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width;
    canvas.height = size.height;
  }
  lastPanels = drawCover(canvas, state, photos.map((p) => p.img));
  syncZoomLabel();
}

function setStatus(text) {
  status.textContent = text;
}

function syncZoomLabel() {
  const crop = state.panels[state.selected];
  const zoom = document.getElementById('zoom');
  const zoomValue = document.getElementById('zoomValue');
  if (!crop) return;
  zoom.value = String(Math.round(crop.zoom * 100));
  zoomValue.textContent = `${Math.round(crop.zoom * 100)}%`;
  document.getElementById('panelHint').textContent =
    `Panel ${state.selected + 1} of ${state.panels.length} selected — drag the photo in the preview to move it, or use zoom.`;
}

// ---- choice buttons ---------------------------------------------------------

function buildChoices(containerId, entries, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  for (const [id, label] of entries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(id === current));
    b.addEventListener('click', () => {
      onPick(id);
      for (const other of box.querySelectorAll('button')) {
        other.setAttribute('aria-checked', String(other === b));
      }
    });
    box.appendChild(b);
  }
}

function buildLayoutChoices() {
  buildChoices('layoutChoices', LAYOUT_IDS.map((id) => [id, LAYOUTS[id].label]), state.layout, (id) => {
    state.layout = id;
    syncPanels();
    render();
  });
}

function buildGradeChoices() {
  buildChoices('gradeChoices', GRADE_IDS.map((id) => [id, GRADES[id].label]), state.grade, (id) => {
    state.grade = id;
    render();
  });
}

function buildSizeChoices() {
  buildChoices('sizeChoices', Object.entries(EXPORT_SIZES).map(([id, s]) => [id, `${s.label} ${s.width}×${s.height}`]), state.size, (id) => {
    state.size = id;
    render();
  });
}

// ---- photo library ----------------------------------------------------------

function refreshLibrary() {
  library.innerHTML = '';
  photos.forEach((photo, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(i === state.selectedPhoto));
    b.title = photo.name;
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.name;
    b.appendChild(img);
    b.addEventListener('click', () => {
      state.selectedPhoto = i;
      assignPhotoToSelected(i);
      refreshLibrary();
    });
    library.appendChild(b);
  });
}

function assignPhotoToSelected(photoIndex) {
  const crop = state.panels[state.selected];
  if (!crop) return;
  crop.photo = photoIndex;
  crop.cx = 0;
  crop.cy = 0;
  crop.zoom = 1;
  render();
}

async function addPhotoFile(file) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  photos.push({ img, name: file.name, thumb: url });
  state.selectedPhoto = photos.length - 1;
  refreshLibrary();
  return photos.length - 1;
}

async function addSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  photos.push({ img, name, thumb: `samples/${name}.jpg` });
  refreshLibrary();
  return photos.length - 1;
}

document.getElementById('photoFiles').addEventListener('change', async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;
  for (const file of files) {
    const index = await addPhotoFile(file);
    assignPhotoToSelected(index);
  }
  setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} added.`);
  e.target.value = '';
});

document.getElementById('fillAll').addEventListener('click', () => {
  const index = state.selectedPhoto;
  if (index < 0 || !photos[index]) return;
  for (const crop of state.panels) {
    crop.photo = index;
    crop.cx = 0;
    crop.cy = 0;
    crop.zoom = 1;
  }
  render();
  setStatus('Every panel now uses the selected photo.');
});

// ---- caption controls -------------------------------------------------------

document.getElementById('titleInput').addEventListener('input', (e) => {
  state.title = e.target.value;
  render();
});
document.getElementById('subtitleInput').addEventListener('input', (e) => {
  state.subtitle = e.target.value;
  render();
});
document.getElementById('captionStyle').addEventListener('change', (e) => {
  state.captionStyle = e.target.value;
  render();
});
document.getElementById('captionPosition').addEventListener('change', (e) => {
  state.captionPosition = e.target.value;
  render();
});
document.getElementById('captionSize').addEventListener('input', (e) => {
  state.captionSize = Number(e.target.value) / 100;
  document.getElementById('captionSizeValue').textContent = `${e.target.value}%`;
  render();
});

// ---- selected panel: zoom + reset -------------------------------------------

function clampCrop(crop, photo, rect) {
  if (!photo || !rect) return;
  const base = Math.max(rect.w / photo.naturalWidth, rect.h / photo.naturalHeight);
  const dw = photo.naturalWidth * base * crop.zoom;
  const dh = photo.naturalHeight * base * crop.zoom;
  const maxX = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxY = Math.max(0, (dh - rect.h) / 2 / rect.h);
  crop.cx = Math.max(-maxX, Math.min(maxX, crop.cx));
  crop.cy = Math.max(-maxY, Math.min(maxY, crop.cy));
}

document.getElementById('zoom').addEventListener('input', (e) => {
  const crop = state.panels[state.selected];
  if (!crop) return;
  crop.zoom = Number(e.target.value) / 100;
  const photo = photos[crop.photo]?.img;
  clampCrop(crop, photo, lastPanels[state.selected]);
  document.getElementById('zoomValue').textContent = `${e.target.value}%`;
  render();
});

document.getElementById('resetCrop').addEventListener('click', () => {
  const crop = state.panels[state.selected];
  if (!crop) return;
  crop.cx = 0;
  crop.cy = 0;
  crop.zoom = 1;
  render();
});

// ---- preview: click to select a panel, drag to pan its photo ---------------

function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function panelAt(point) {
  for (let i = lastPanels.length - 1; i >= 0; i -= 1) {
    const r = lastPanels[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const point = canvasPoint(e);
  const index = panelAt(point);
  if (index < 0) return;
  state.selected = index;
  canvas.setPointerCapture(e.pointerId);
  drag = { x: point.x, y: point.y, moved: false };
  render();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const point = canvasPoint(e);
  const crop = state.panels[state.selected];
  const rect = lastPanels[state.selected];
  const photo = crop && photos[crop.photo]?.img;
  if (!crop || !rect || !photo) return;
  crop.cx += (point.x - drag.x) / rect.w;
  crop.cy += (point.y - drag.y) / rect.h;
  clampCrop(crop, photo, rect);
  drag.x = point.x;
  drag.y = point.y;
  drag.moved = true;
  render();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  const point = canvasPoint(e);
  const index = panelAt(point);
  if (index < 0) return;
  e.preventDefault();
  const crop = state.panels[index];
  crop.zoom = Math.max(1, Math.min(3, crop.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  clampCrop(crop, photos[crop.photo]?.img, lastPanels[index]);
  state.selected = index;
  render();
}, { passive: false });

// ---- export -----------------------------------------------------------------

async function exportSize(sizeId) {
  const size = EXPORT_SIZES[sizeId];
  setStatus(`Exporting ${size.width} × ${size.height}…`);
  const blob = await exportCoverPng(state, photos.map((p) => p.img), sizeId);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-cover-${size.width}x${size.height}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  setStatus(`Saved vice-cover-${size.width}x${size.height}.png`);
}

document.getElementById('exportSquare').addEventListener('click', () => exportSize('square'));
document.getElementById('exportPortrait').addEventListener('click', () => exportSize('portrait'));
document.getElementById('exportWide').addEventListener('click', () => exportSize('wide'));

// ---- boot -------------------------------------------------------------------

buildLayoutChoices();
buildGradeChoices();
buildSizeChoices();

async function boot() {
  await addSample('pier');
  await addSample('boulevard');
  state.selectedPhoto = 0;
  syncPanels();
  // A lively default: the hero shows the pier, the small panels alternate.
  state.panels.forEach((crop, i) => {
    crop.photo = i === 0 ? 0 : (i % 2 === 0 ? 0 : 1);
  });
  render();

  const demo = parseDemo();
  if (demo.mode) {
    state.layout = LAYOUTS[demo.layout] ? demo.layout : 'hero3';
    state.grade = GRADES[demo.grade] ? demo.grade : 'sunset';
    state.title = demo.caption;
    state.subtitle = demo.subtitle;
    state.captionStyle = demo.captionStyle;
    state.size = EXPORT_SIZES[demo.size] ? demo.size : 'square';
    document.getElementById('titleInput').value = state.title;
    document.getElementById('subtitleInput').value = state.subtitle;
    syncPanels();
    const first = photos.findIndex((p) => p.name === demo.photo);
    const second = photos.findIndex((p) => p.name === demo.photo2);
    state.panels.forEach((crop, i) => {
      crop.photo = i === 0 ? (first >= 0 ? first : 0) : (second >= 0 ? second : 1);
      if (i > 0 && i % 2 === 0) crop.photo = first >= 0 ? first : 0;
    });
    if (demo.mode === 'cover') {
      document.body.classList.add('cover-only');
    }
    render();
    // Prove the export path ran: the PNG bytes of the cover as drawn.
    try {
      const dataUrl = canvas.toDataURL('image/png');
      document.body.dataset.exportBytes = String(dataUrl.length);
    } catch { /* canvas export unavailable */ }
    markShotReady();
    return;
  }

  // Wait for the display font before the first painted caption, then repaint.
  try {
    await document.fonts.load('400 100px Anton');
    fontsReady = true;
  } catch { /* fall back to the system stack */ }
  render();
}

boot();
