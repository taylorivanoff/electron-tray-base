const { app } = require('electron');
const { hasStartMinimizedArg } = require('./login');

function setupSingleInstance({ onSecondInstance }) {
  const gotTheLock = app.requestSingleInstanceLock();
  if (!gotTheLock) {
    app.quit();
    return false;
  }

  app.on('second-instance', (_event, argv) => {
    if (hasStartMinimizedArg(argv)) return;
    if (typeof onSecondInstance === 'function') onSecondInstance(argv);
  });

  return true;
}

module.exports = { setupSingleInstance };
