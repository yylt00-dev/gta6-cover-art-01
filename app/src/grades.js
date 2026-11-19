// Colour grades: each one is a Vice City-flavoured look applied on top of a photo panel
// with canvas gradient overlays and composite operations — no filter library, no network.
// `saturate` is applied to the photo itself while it is drawn; `overlays` run after it.

function linear(ctx, x, y, w, h, stops) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

function radial(ctx, cx, cy, r, stops) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

function vignette(ctx, x, y, w, h) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = radial(ctx, x + w / 2, y + h / 2, Math.max(w, h) * 0.72, [
    [0.55, 'rgba(0, 0, 0, 0)'],
    [1, 'rgba(10, 2, 20, 0.42)'],
  ]);
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Every grade: label for the button, photo saturation, and an overlay painter. */
export const GRADES = {
  sunset: {
    label: 'Vice sunset',
    saturate: 1.28,
    overlay(ctx, x, y, w, h) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = linear(ctx, x, y, 0, h, [
        [0, 'rgba(255, 170, 60, 0.10)'],
        [1, 'rgba(255, 60, 120, 0.34)'],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255, 120, 40, 0.22)';
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      vignette(ctx, x, y, w, h);
    },
  },
  neon: {
    label: 'Neon pink / teal',
    saturate: 1.35,
    overlay(ctx, x, y, w, h) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = linear(ctx, x, y, w, 0, [
        [0, 'rgba(255, 41, 117, 0.30)'],
        [1, 'rgba(0, 229, 255, 0.26)'],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = linear(ctx, x, y, 0, h, [
        [0, 'rgba(140, 30, 255, 0.16)'],
        [1, 'rgba(255, 41, 117, 0.22)'],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      vignette(ctx, x, y, w, h);
    },
  },
  golden: {
    label: 'Golden hour',
    saturate: 1.18,
    overlay(ctx, x, y, w, h) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255, 190, 80, 0.30)';
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = linear(ctx, x, y, 0, h, [
        [0, 'rgba(255, 230, 150, 0.14)'],
        [1, 'rgba(200, 90, 20, 0.26)'],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      vignette(ctx, x, y, w, h);
    },
  },
  dusk: {
    label: 'Cool dusk',
    saturate: 1.1,
    overlay(ctx, x, y, w, h) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(60, 80, 200, 0.16)';
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = linear(ctx, x, y, 0, h, [
        [0, 'rgba(120, 90, 255, 0.22)'],
        [1, 'rgba(10, 20, 60, 0.30)'],
      ]);
      ctx.fillRect(x, y, w, h);
      ctx.restore();
      vignette(ctx, x, y, w, h);
    },
  },
  original: {
    label: 'Original',
    saturate: 1,
    overlay(ctx, x, y, w, h) {
      vignette(ctx, x, y, w, h);
    },
  },
};

export const GRADE_IDS = Object.keys(GRADES);

/** Paints a grade over one panel rect. */
export function applyGrade(ctx, gradeId, x, y, w, h) {
  (GRADES[gradeId] ?? GRADES.sunset).overlay(ctx, x, y, w, h);
}

/** Saturation for a grade, used while the photo is drawn. */
export function gradeSaturate(gradeId) {
  return (GRADES[gradeId] ?? GRADES.sunset).saturate;
}
