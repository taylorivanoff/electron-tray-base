const { ipcMain } = require('electron');

function registerSettingsIpc({ getSettings, setSettings, onChanged, getAppState }) {
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:set', (_event, partial) => {
    const next = setSettings(partial || {});
    if (typeof onChanged === 'function') onChanged(partial || {}, next);
    return next;
  });
  ipcMain.handle('app:getState', () => {
    if (typeof getAppState === 'function') return getAppState();
    return {
      version: require('electron').app.getVersion(),
      settings: getSettings()
    };
  });
}

module.exports = { registerSettingsIpc };
