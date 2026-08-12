const { app } = require('electron');

function isDev() {
  return !app.isPackaged;
}

function setupDevReloader(entryModule, options = {}) {
  if (!isDev()) return;
  try {
    require('electron-reloader')(entryModule, {
      watchRenderer: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/bun.lock', '**/package-lock.json'],
      ...options
    });
  } catch (_) {
    // electron-reloader is optional in consuming apps
  }
}

function attachWindowBoundsLogger(win, label = 'window') {
  if (!isDev() || !win) return;

  const logSize = (event) => {
    if (win.isDestroyed()) return;
    const { width, height } = win.getBounds();
    console.log(`[dev] ${label} ${event}: ${width}x${height}`);
  };

  logSize('size');
  win.on('resize', () => logSize('resize'));
  win.on('resized', () => logSize('resized'));
}

module.exports = { isDev, setupDevReloader, attachWindowBoundsLogger };
