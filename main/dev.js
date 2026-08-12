const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function isDev() {
  return !app.isPackaged;
}

function getAppRoot(entryFilename) {
  let dir = path.dirname(entryFilename);
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

function loadElectronReloader(entryFilename) {
  const { createRequire } = require('module');
  const appRoot = getAppRoot(entryFilename);
  const req = createRequire(path.join(appRoot, 'package.json'));
  return req('electron-reloader');
}

function normalizeEntryModule(entryModule) {
  if (!entryModule) return module;
  if (Array.isArray(entryModule.children) && entryModule.children.length) return entryModule;

  const filename = typeof entryModule === 'string'
    ? entryModule
    : entryModule.filename;
  if (!filename) return module;

  const rootDir = path.dirname(path.dirname(filename));
  const children = [];

  for (const dir of ['main', 'preload', 'src']) {
    const absDir = path.join(rootDir, dir);
    if (!fs.existsSync(absDir)) continue;
    for (const file of fs.readdirSync(absDir)) {
      if (/\.(js|cjs|mjs)$/.test(file)) {
        children.push({ filename: path.join(absDir, file), children: [] });
      }
    }
  }

  return { filename, children: children.length ? children : [] };
}

function setupDevReloader(entryModule, options = {}) {
  if (!isDev()) return;
  try {
    const normalized = normalizeEntryModule(entryModule);
    loadElectronReloader(normalized.filename)(normalized, {
      watchRenderer: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/bun.lock', '**/package-lock.json'],
      ...options
    });
  } catch (err) {
    console.warn('[dev] electron-reloader failed:', err?.message || err);
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
