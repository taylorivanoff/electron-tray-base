const { powerMonitor } = require('electron');

function setupSleepResumeRefresh({ getMainWindow, onResume }) {
  let staleAfterSleep = false;

  powerMonitor.on('resume', () => {
    staleAfterSleep = true;
    const win = getMainWindow();
    if (win && !win.isDestroyed() && win.isVisible()) {
      staleAfterSleep = false;
      if (typeof onResume === 'function') onResume(win);
    }
  });

  function attachShowRefresh(win) {
    win.on('show', () => {
      if (!staleAfterSleep) return;
      staleAfterSleep = false;
      if (typeof onResume === 'function') onResume(win);
    });
  }

  return { attachShowRefresh };
}

module.exports = { setupSleepResumeRefresh };
