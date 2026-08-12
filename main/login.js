const { app } = require('electron');
const { START_MINIMIZED_ARG } = require('./constants');

function hasStartMinimizedArg(argv = process.argv) {
  return argv.some(
    (arg) =>
      arg === START_MINIMIZED_ARG
      || arg.startsWith(`${START_MINIMIZED_ARG}=`)
      || arg === '--start-minimized'
      || arg.startsWith('--start-minimized=')
  );
}

/** True when this process was launched with the login-item minimised flag. */
function wasLaunchedMinimised(argv = process.argv) {
  return hasStartMinimizedArg(argv);
}

function loginItemArgs(getStartMinimised) {
  const minimisedArgs = getStartMinimised() ? [START_MINIMIZED_ARG] : [];
  if (app.isPackaged) return minimisedArgs;
  // Dev: distinguish apps that share the same electron.exe binary.
  return [app.getAppPath(), ...minimisedArgs];
}

function syncLoginItemArgs(getStartMinimised) {
  const login = app.getLoginItemSettings();
  if (!login.openAtLogin) return;
  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath,
    args: loginItemArgs(getStartMinimised)
  });
}

function enableOpenAtLogin(getStartMinimised) {
  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath,
    args: loginItemArgs(getStartMinimised)
  });
}

module.exports = {
  hasStartMinimizedArg,
  wasLaunchedMinimised,
  syncLoginItemArgs,
  enableOpenAtLogin
};
