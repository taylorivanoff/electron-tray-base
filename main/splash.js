const { BrowserWindow } = require('electron');

let splashWindow = null;

function createSplash(splashPath) {
  if (splashWindow) return splashWindow;

  splashWindow = new BrowserWindow({
    width: 280,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: { nodeIntegration: false }
  });

  const show = () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.center();
      splashWindow.show();
    }
  };

  splashWindow.webContents.once('did-finish-load', show);
  splashWindow.loadFile(splashPath).catch(show);
  return splashWindow;
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.destroy();
    splashWindow = null;
  }
}

module.exports = { createSplash, closeSplash };
