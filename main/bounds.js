const { screen } = require('electron');
const { BOUNDS_SAVE_DEBOUNCE_MS } = require('./constants');

function normalizeBounds(raw, { minWidth, minHeight, defaultBounds }) {
  const defaults = {
    width: defaultBounds?.width ?? 800,
    height: defaultBounds?.height ?? 600
  };
  if (!raw || typeof raw !== 'object') return { ...defaults };
  return {
    x: Number.isFinite(raw.x) ? Math.round(raw.x) : undefined,
    y: Number.isFinite(raw.y) ? Math.round(raw.y) : undefined,
    width: Math.max(minWidth, Math.round(raw.width || defaults.width)),
    height: Math.max(minHeight, Math.round(raw.height || defaults.height))
  };
}

function boundsVisibleOnAnyDisplay(bounds) {
  const displays = screen.getAllDisplays();
  if (!displays.length) return true;
  const cx = (bounds.x ?? 0) + bounds.width / 2;
  const cy = (bounds.y ?? 0) + bounds.height / 2;
  return displays.some((d) => {
    const { x, y, width, height } = d.bounds;
    const onCenter = cx >= x && cx < x + width && cy >= y && cy < y + height;
    const onOrigin = Number.isFinite(bounds.x)
      && Number.isFinite(bounds.y)
      && bounds.x < x + width
      && bounds.x + bounds.width > x
      && bounds.y < y + height
      && bounds.y + bounds.height > y;
    return onCenter || onOrigin;
  });
}

function getWindowBounds(store, options) {
  const saved = normalizeBounds(store.get('windowBounds'), options);
  if (!Number.isFinite(saved.x) || !Number.isFinite(saved.y)) {
    return { width: saved.width, height: saved.height };
  }
  if (!boundsVisibleOnAnyDisplay(saved)) {
    return { width: saved.width, height: saved.height };
  }
  return saved;
}

function createBoundsSaver(store, getMainWindow, options) {
  let timer = null;

  function persist(immediate = false) {
    const save = () => {
      timer = null;
      const win = getMainWindow();
      if (!win || win.isDestroyed() || win.isMinimized()) return;
      store.set('windowBounds', normalizeBounds(win.getBounds(), options));
    };

    if (immediate) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      save();
      return;
    }

    if (timer) clearTimeout(timer);
    timer = setTimeout(save, BOUNDS_SAVE_DEBOUNCE_MS);
  }

  function attach(win) {
    win.on('resize', () => persist(false));
    win.on('move', () => persist(false));
    win.on('resized', () => persist(true));
    win.on('moved', () => persist(true));
    win.on('hide', () => persist(true));
    win.on('close', () => persist(true));
  }

  return { persist, attach };
}

module.exports = {
  normalizeBounds,
  boundsVisibleOnAnyDisplay,
  getWindowBounds,
  createBoundsSaver
};
