const { app } = require('electron');

function setupDevReloader(entryModule, options = {}) {
  if (app.isPackaged) return;
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

module.exports = { setupDevReloader };
