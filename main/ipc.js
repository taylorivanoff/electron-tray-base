const { ipcMain } = require('electron');

function registerSettingsIpc({ getSettings, setSettings, onChanged }) {
  ipcMain.handle('settings:get', () => getSettings());
  ipcMain.handle('settings:set', (_event, partial) => {
    const next = setSettings(partial || {});
    if (typeof onChanged === 'function') onChanged(partial || {}, next);
    return next;
  });
  ipcMain.handle('app:getState', () => ({
    version: require('electron').app.getVersion(),
    settings: getSettings()
  }));
}

module.exports = { registerSettingsIpc };
