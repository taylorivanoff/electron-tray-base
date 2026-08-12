/**
 * Example entry point — copy patterns into your app's main.js.
 * Font Checker / PDF to TXT style migration with a custom store module.
 */
const path = require('path');
const { run } = require('electron-tray-base');

// const appStore = require('./store');

run({
  appName: 'My Utility',
  appId: 'io.github.example.my-utility',
  iconPath: path.join(__dirname, 'resources', 'icon.png'),
  splashPath: path.join(__dirname, 'resources', 'splash.html'),

  store: {
    name: 'my-utility',
    defaults: {
      // app-specific defaults merged with opacity / alwaysOnTop / startMinimised
      featureFlag: true
    }
  },

  window: {
    html: path.join(__dirname, 'renderer', 'index.html'),
    preload: path.join(__dirname, 'preload', 'preload.cjs'),
    minWidth: 420,
    minHeight: 420,
    defaultBounds: { width: 720, height: 560 }
  },

  loginItem: {
    syncOnReady: true,
    enableOnReady: false
  },

  tray: {
    extraSections: () => [[
      { label: 'Custom Action', click: () => { /* ... */ } }
    ]]
  },

  hooks: {
    registerIpc: ({ sendToRenderer }) => {
      const { ipcMain } = require('electron');
      ipcMain.handle('my:action', async () => {
        sendToRenderer('my:event', { ok: true });
        return { ok: true };
      });
    }
  }
});
