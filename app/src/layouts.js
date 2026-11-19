// Poster layouts: each one turns a canvas size into the panels of a GTA-style multi-panel
// cover. Every rect is { x, y, w, h } in canvas pixels, with a thin gap between panels so
// the poster reads as separate frames, and a captionZone where the lettering sits.

const GAP = 0.007; // panel gap, as a fraction of the canvas width

function gap(w) {
  return Math.max(4, Math.round(w * GAP));
}

function heroTop(w, h, heroH) {
  const g = gap(w);
  return [
    { x: 0, y: 0, w, h: heroH },
    { x: 0, y: heroH + g, w: (w - 2 * g) / 3, h: h - heroH - g },
    { x: (w - 2 * g) / 3 + g, y: heroH + g, w: (w - 2 * g) / 3, h: h - heroH - g },
    { x: 2 * ((w - 2 * g) / 3) + 2 * g, y: heroH + g, w: (w - 2 * g) / 3, h: h - heroH - g },
  ];
}

/** Every layout: a name, a short label for the button, and a function of (w, h) returning panels. */
export const LAYOUTS = {
  hero3: {
    label: 'Hero + 3',
    panels(w, h) {
      return heroTop(w, h, Math.round(h * 0.58));
    },
  },
  hero2: {
    label: 'Hero + 2',
    panels(w, h) {
      const g = gap(w);
      const heroH = Math.round(h * 0.58);
      return [
        { x: 0, y: 0, w, h: heroH },
        { x: 0, y: heroH + g, w: (w - g) / 2, h: h - heroH - g },
        { x: (w - g) / 2 + g, y: heroH + g, w: (w - g) / 2, h: h - heroH - g },
      ];
    },
  },
  grid2x2: {
    label: '2 × 2 grid',
    panels(w, h) {
      const g = gap(w);
      const cw = (w - g) / 2;
      const ch = (h - g) / 2;
      return [
        { x: 0, y: 0, w: cw, h: ch },
        { x: cw + g, y: 0, w: cw, h: ch },
        { x: 0, y: ch + g, w: cw, h: ch },
        { x: cw + g, y: ch + g, w: cw, h: ch },
      ];
    },
  },
  grid9: {
    label: '9-panel grid',
    panels(w, h) {
      const g = gap(w);
      const cw = (w - 2 * g) / 3;
      const ch = (h - 2 * g) / 3;
      const out = [];
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 3; col += 1) {
          out.push({ x: col * (cw + g), y: row * (ch + g), w: cw, h: ch });
        }
      }
      return out;
    },
  },
  duo: {
    label: 'Duo split',
    panels(w, h) {
      const g = gap(w);
      const leftW = Math.round(w * 0.6);
      return [
        { x: 0, y: 0, w: leftW, h },
        { x: leftW + g, y: 0, w: w - leftW - g, h: (h - g) / 2 },
        { x: leftW + g, y: (h - g) / 2 + g, w: w - leftW - g, h: (h - g) / 2 },
      ];
    },
  },
  fullbleed: {
    label: 'Full bleed',
    panels(w, h) {
      return [{ x: 0, y: 0, w, h }];
    },
  },
};

export const LAYOUT_IDS = Object.keys(LAYOUTS);

/** Panels for a layout id at a canvas size, falling back to hero3. */
export function layoutPanels(id, w, h) {
  return (LAYOUTS[id] ?? LAYOUTS.hero3).panels(w, h);
}
