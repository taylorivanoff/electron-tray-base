const Store = require('electron-store');
const { DEFAULT_OPACITY, MIN_OPACITY } = require('./constants');

const COMMON_DEFAULTS = {
  opacity: DEFAULT_OPACITY,
  alwaysOnTop: false,
  startMinimised: false,
  windowBounds: null
};

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function createPrefsStore({ name, defaults = {} }) {
  const store = new Store({
    name,
    defaults: { ...COMMON_DEFAULTS, ...defaults }
  });

  function getCommonSettings() {
    return readCommonSettings(store);
  }

  function setCommonSettings(partial = {}) {
    applyCommonSettings(store, partial);
    return getCommonSettings();
  }

  return { store, getCommonSettings, setCommonSettings };
}

function readCommonSettings(store) {
  return {
    opacity: clamp(store.get('opacity', DEFAULT_OPACITY), MIN_OPACITY, 1, DEFAULT_OPACITY),
    alwaysOnTop: !!store.get('alwaysOnTop', false),
    startMinimised: !!store.get('startMinimised', false)
  };
}

function applyCommonSettings(store, partial = {}) {
  if (partial.opacity !== undefined) {
    store.set('opacity', clamp(partial.opacity, MIN_OPACITY, 1, DEFAULT_OPACITY));
  }
  if (partial.alwaysOnTop !== undefined) store.set('alwaysOnTop', !!partial.alwaysOnTop);
  if (partial.startMinimised !== undefined) store.set('startMinimised', !!partial.startMinimised);
}

module.exports = {
  COMMON_DEFAULTS,
  createPrefsStore,
  readCommonSettings,
  applyCommonSettings,
  clamp
};
