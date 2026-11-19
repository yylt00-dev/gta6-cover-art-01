// Fixed scenes for screenshots and demos, driven by the URL query:
//   ?demo=editor — the editor with a sample photo loaded, ready to tweak.
//   ?demo=cover  — a finished cover, full screen, at an export size.
//   ?shot=cover / ?shot=editor — the same scenes (the starter's names).
// Extra params: photo (pier|boulevard), caption, subtitle, layout, grade, size.
// window.__shotReady is set once the scene has painted, so a screenshot knows when to fire.

export function parseDemo() {
  const q = new URLSearchParams(location.search);
  const mode = q.get('demo') ?? q.get('shot') ?? '';
  return {
    mode,
    photo: q.get('photo') ?? 'pier',
    photo2: q.get('photo2') ?? 'boulevard',
    caption: q.get('caption') ?? 'Vice City Nights',
    subtitle: q.get('subtitle') ?? 'A story in neon',
    layout: q.get('layout') ?? 'hero3',
    grade: q.get('grade') ?? 'sunset',
    size: q.get('size') ?? 'square',
    captionStyle: q.get('style') ?? 'gradient',
  };
}

export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
