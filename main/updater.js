const { autoUpdater } = require('electron-updater');
const { app, Notification } = require('electron');
const { UPDATE_CHECK_INTERVAL_MS } = require('./constants');

function setupAutoUpdater({
  appName,
  iconPath,
  enabled = app.isPackaged,
  silent = false,
  configureFeed,
  onUpdateFound,
  onQuitForInstall
}) {
  async function checkForUpdates(_manual = false) {
    if (!enabled) return;
    try {
      await autoUpdater.checkForUpdates();
    } catch (_) {
      // Ignore transient network or feed errors; next interval will retry.
    }
  }

  if (!enabled) return { checkForUpdates };

  if (typeof configureFeed === 'function') configureFeed(autoUpdater);

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    if (typeof onUpdateFound === 'function') onUpdateFound(info);
    if (silent || !Notification.isSupported()) return;
    new Notification({
      title: appName,
      body: `Update ${info.version} found. The app will update and restart.`,
      icon: iconPath
    }).show();
  });

  autoUpdater.on('update-downloaded', () => {
    if (typeof onQuitForInstall === 'function') onQuitForInstall();
    autoUpdater.quitAndInstall(true, true);
  });

  checkForUpdates(false);
  setInterval(() => checkForUpdates(false), UPDATE_CHECK_INTERVAL_MS);

  return { checkForUpdates };
}

module.exports = { setupAutoUpdater };
