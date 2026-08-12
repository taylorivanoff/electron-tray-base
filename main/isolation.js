const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let configured = false;

function readAppIdFromPackage(appPath) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(appPath, 'package.json'), 'utf8'));
    return pkg.build?.appId || undefined;
  } catch {
    return undefined;
  }
}

function userDataDirName(appId, appName) {
  if (appId) return appId;
  const fallback = (appName || app.getName() || 'electron-app').trim();
  return fallback.replace(/[<>:"/\\|?*]+/g, '-');
}

function copyDirContents(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) {
      if (!fs.existsSync(dest)) fs.cpSync(src, dest, { recursive: true });
    } else if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  }
}

function migrateLegacyUserData(from, to) {
  if (from === to || !from || !to) return;
  try {
    if (!fs.existsSync(from)) return;
    const toEntries = fs.existsSync(to) ? fs.readdirSync(to) : [];
    if (toEntries.length > 0) return;
    copyDirContents(from, to);
  } catch {
    /* best-effort */
  }
}

/**
 * Pin userData, Windows AppUserModelId, and the process display name before other
 * modules read app.getPath('userData') or requestSingleInstanceLock().
 *
 * Call this as the first require in each app's main entry (before electron-store).
 */
function configureAppIsolation({ appId, appName, appPath } = {}) {
  if (configured) {
    return { appId, appName, userDataPath: app.getPath('userData') };
  }
  configured = true;

  const resolvedAppId = appId || readAppIdFromPackage(appPath || app.getAppPath());
  if (!resolvedAppId) {
    console.warn(
      '[electron-tray-base] configureAppIsolation: missing appId — userData and single-instance locks may collide with other Electron apps'
    );
  }

  if (appName) app.setName(appName);

  const legacyUserData = app.getPath('userData');
  const isolatedUserData = path.join(
    app.getPath('appData'),
    userDataDirName(resolvedAppId, appName)
  );

  if (legacyUserData !== isolatedUserData) {
    migrateLegacyUserData(legacyUserData, isolatedUserData);
    app.setPath('userData', isolatedUserData);
  }

  if (resolvedAppId && process.platform === 'win32') {
    app.setAppUserModelId(resolvedAppId);
  }

  try {
    const crashDir = path.join(app.getPath('userData'), 'crashDumps');
    fs.mkdirSync(crashDir, { recursive: true });
    app.setPath('crashDumps', crashDir);
  } catch {
    /* optional on older Electron builds */
  }

  return {
    appId: resolvedAppId,
    appName,
    userDataPath: app.getPath('userData')
  };
}

/** Stable Chromium session partition name derived from appId. */
function sessionPartition(appId, { persist = true } = {}) {
  const slug = userDataDirName(appId).replace(/\./g, '-');
  return persist ? `persist:${slug}` : slug;
}

module.exports = {
  configureAppIsolation,
  readAppIdFromPackage,
  sessionPartition,
  userDataDirName
};
