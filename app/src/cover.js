// Renders a cover: the layout's panels (each photo cropped and positioned by its crop),
// the colour grade over every panel, a thin poster frame, and the bold caption lettering.
// The same function draws the live preview and the exported PNG at any size, because every
// measurement is a fraction of the canvas size.

import { layoutPanels } from './layouts.js';
import { applyGrade, gradeSaturate } from './grades.js';

const CAPTION_FONT = 'Anton, "Arial Narrow", sans-serif';

/** Draws one photo into a panel rect, cover-fit, with a crop { cx, cy, zoom }. */
export function drawPanelPhoto(ctx, photo, rect, crop, saturate) {
  const { x, y, w, h } = rect;
  const pw = photo.naturalWidth;
  const ph = photo.naturalHeight;
  const base = Math.max(w / pw, h / ph);
  const scale = base * (crop?.zoom ?? 1);
  const dw = pw * scale;
  const dh = ph * scale;
  const dx = x + (w - dw) / 2 + (crop?.cx ?? 0) * w;
  const dy = y + (h - dh) / 2 + (crop?.cy ?? 0) * h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.filter = `saturate(${saturate}) contrast(1.06)`;
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.filter = 'none';
  ctx.restore();
}

/** A soft sun glow behind the caption, in the grade's colours. */
function drawSunGlow(ctx, w, h, zone, gradeId) {
  const cx = w / 2;
  const cy = zone === 'top' ? h * 0.1 : zone === 'center' ? h / 2 : h * 0.84;
  const r = Math.min(w, h) * 0.42;
  const warm = gradeId === 'neon'
    ? ['rgba(255, 41, 117, 0.55)', 'rgba(0, 229, 255, 0.28)']
    : gradeId === 'dusk'
      ? ['rgba(120, 90, 255, 0.5)', 'rgba(40, 20, 90, 0.25)']
      : ['rgba(255, 170, 60, 0.6)', 'rgba(255, 60, 120, 0.3)'];
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, warm[0]);
  g.addColorStop(0.55, warm[1]);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

/** Fits the title to the width, then paints it in the chosen lettering style. */
function drawTitle(ctx, text, w, h, zone, sizeScale, style) {
  const upper = text.trim().toUpperCase();
  if (!upper) return 0;
  // The title sits clear of the frame edge so the subtitle below it never clips.
  const baseline = zone === 'top' ? h * 0.16 : zone === 'center' ? h * 0.48 : h * 0.86;
  let size = h * 0.115 * sizeScale;
  const setFont = () => {
    ctx.font = `400 ${size}px ${CAPTION_FONT}`;
    try { ctx.letterSpacing = `${Math.round(size * 0.03)}px`; } catch { /* older canvas */ }
  };
  setFont();
  while (ctx.measureText(upper).width > w * 0.92 && size > 14) {
    size -= 3;
    setFont();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = size * 0.16;
  ctx.shadowOffsetY = size * 0.05;
  if (style === 'gradient') {
    const g = ctx.createLinearGradient(0, baseline - size * 0.55, 0, baseline + size * 0.55);
    g.addColorStop(0, '#ffd319');
    g.addColorStop(0.5, '#ff7a3d');
    g.addColorStop(1, '#ff2975');
    ctx.fillStyle = g;
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = 'rgba(20, 5, 30, 0.9)';
    ctx.strokeText(upper, w / 2, baseline);
    ctx.fillText(upper, w / 2, baseline);
  } else if (style === 'outline') {
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = '#14101e';
    ctx.strokeText(upper, w / 2, baseline);
    ctx.fillText(upper, w / 2, baseline);
    ctx.shadowBlur = 0;
  } else if (style === 'neon') {
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ff2975';
    ctx.shadowBlur = size * 0.45;
    ctx.fillText(upper, w / 2, baseline);
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = size * 0.2;
    ctx.fillText(upper, w / 2, baseline);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillText(upper, w / 2, baseline);
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  return size;
}

function drawSubtitle(ctx, text, w, h, zone, titleSize) {
  const line = text.trim();
  if (!line) return;
  const size = Math.max(14, titleSize * 0.3);
  const baseline = zone === 'top'
    ? h * 0.16 + titleSize * 0.72
    : zone === 'center'
      ? h * 0.48 + titleSize * 0.72
      : h * 0.86 + titleSize * 0.7;
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(size * 0.28)}px`; } catch { /* older canvas */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9f3';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
  ctx.shadowBlur = size * 0.3;
  ctx.shadowOffsetY = size * 0.08;
  ctx.fillText(line.toUpperCase(), w / 2, baseline);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
}

/**
 * Draws the whole cover onto `canvas` at its own size.
 * `state` holds layout, grade, title, subtitle, captionStyle, captionPosition, captionSize
 * and panels: [{ photo, cx, cy, zoom }] — `photo` is an index into `photos`, or -1 for empty.
 */
export function drawCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const panels = layoutPanels(state.layout, w, h);
  const saturate = gradeSaturate(state.grade);

  ctx.fillStyle = '#160a26';
  ctx.fillRect(0, 0, w, h);

  panels.forEach((rect, i) => {
    const crop = state.panels[i];
    const photo = crop && crop.photo >= 0 ? photos[crop.photo] : null;
    if (photo) {
      drawPanelPhoto(ctx, photo, rect, crop, saturate);
      applyGrade(ctx, state.grade, rect.x, rect.y, rect.w, rect.h);
    } else {
      const g = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      g.addColorStop(0, '#3d1a5e');
      g.addColorStop(1, '#1c0b33');
      ctx.fillStyle = g;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = `600 ${Math.max(13, w * 0.016)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add a photo', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = Math.max(1, w * 0.002);
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  });

  // A thin poster frame around the whole cover.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = Math.max(3, w * 0.008);
  ctx.strokeRect(0, 0, w, h);

  drawSunGlow(ctx, w, h, state.captionPosition, state.grade);
  const titleSize = drawTitle(ctx, state.title, w, h, state.captionPosition, state.captionSize, state.captionStyle);
  drawSubtitle(ctx, state.subtitle, w, h, state.captionPosition, titleSize || h * 0.1);
  return panels;
}

/** The export sizes: label, width and height for each PNG. */
export const EXPORT_SIZES = {
  square: { label: 'Square', width: 1080, height: 1080 },
  portrait: { label: 'Portrait', width: 1080, height: 1350 },
  wide: { label: 'Wide', width: 1920, height: 1080 },
};

/** Renders the cover offscreen at an export size and returns a PNG blob. */
export function exportCoverPng(state, photos, sizeId) {
  const size = EXPORT_SIZES[sizeId] ?? EXPORT_SIZES.square;
  const off = document.createElement('canvas');
  off.width = size.width;
  off.height = size.height;
  drawCover(off, state, photos);
  return new Promise((resolve) => off.toBlob(resolve, 'image/png'));
}
