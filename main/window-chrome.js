const { nativeTheme } = require('electron');
const { MIN_OPACITY } = require('./constants');

function platformWindowOptions() {
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 10, y: 7 },
      vibrancy: 'under-window',
      visualEffectState: 'active',
      backgroundColor: '#00000000'
    };
  }
  return {
    frame: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1c1c1e' : '#f3f3f3',
    autoHideMenuBar: true
  };
}

function applyWindowOpacity(mainWindow, value) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const opacity = Math.min(1, Math.max(MIN_OPACITY, Number(value) || 1));
  mainWindow.setOpacity(opacity);
}

module.exports = { platformWindowOptions, applyWindowOpacity };
