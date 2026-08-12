const { app, ipcMain } = require('electron');
const { createPrefsStore, readCommonSettings, applyCommonSettings } = require('./store');
const { syncLoginItemArgs, enableOpenAtLogin, wasLaunchedMinimised } = require('./login');
const { createSplash } = require('./splash');
const {
  getMainWindow,
  createMainWindow,
  showMainWindow,
  hideMainWindow,
  toggleMainWindow,
  sendToRenderer
} = require('./window');
const { applyWindowOpacity } = require('./window-chrome');
const { createTray, updateTrayMenu, destroyTray } = require('./tray');
const { setupAutoUpdater } = require('./updater');
const { setupSingleInstance } = require('./lifecycle');
const { setupDevReloader } = require('./dev');
const { registerSettingsIpc } = require('./ipc');
const { setupSleepResumeRefresh } = require('./sleep');

/**
 * Run a tray-first Electron utility with a native renderer.
 *
 * @param {{
 *   appName: string;
 *   appId?: string;
 *   iconPath: string;
 *   splashPath?: string;
 *   store?: { name: string; defaults?: object };
 *   window: {
 *     html?: string;
 *     loadURL?: string;
 *     preload?: string;
 *     minWidth?: number;
 *     minHeight?: number;
 *     defaultBounds?: { width: number; height: number };
 *     maximizable?: boolean;
 *     fullscreenable?: boolean;
 *     webPreferences?: object;
 *   };
 *   loginItem?: { syncOnReady?: boolean; enableOnReady?: boolean };
 *   updater?: {
 *     enabled?: boolean;
 *     configureFeed?: (autoUpdater: object) => void;
 *   };
 *   protocol?: string;
 *   tray?: {
 *     extraSections?: (handlers: object) => Array<Array<object>>;
 *     onClick?: 'toggle' | 'show';
 *     showHide?: boolean;
 *     showAlwaysOnTop?: boolean;
 *   };
 *   dev?: { reloader?: boolean | object; entryModule?: object };
 *   sleep?: { enabled?: boolean; onResume?: (win: import('electron').BrowserWindow) => void };
 *   hooks?: {
 *     getSettings?: () => object;
 *     setSettings?: (partial: object) => object;
 *     getAppState?: () => object;
 *     onReady?: (ctx: object) => void;
 *     onWindowCreated?: (win: import('electron').BrowserWindow, ctx: object) => void;
 *     onDidFinishLoad?: (win: import('electron').BrowserWindow, ctx: object) => void;
 *     onSettingsChanged?: (partial: object, settings: object, ctx: object) => void;
 *     onBeforeQuit?: (ctx: object) => void;
 *     registerIpc?: (ctx: object) => void;
 *   };
 * }} config
 */
function run(config) {
  const {
    appName,
    appId,
    protocol,
    iconPath,
    splashPath,
    store: storeConfig,
    window: windowConfig,
    loginItem = {},
    updater = {},
    tray: trayConfig = {},
    dev = {},
    sleep = {},
    hooks = {}
  } = config;

  const isQuittingRef = { current: false };
  let checkForUpdates = () => {};
  let trayHandlers = null;
  let sleepRefresh = null;

  const prefs = storeConfig?.instance
    ? null
    : (storeConfig?.name ? createPrefsStore({ name: storeConfig.name, defaults: storeConfig.defaults }) : null);

  const store = storeConfig?.instance || prefs?.store;

  if (!store) {
    throw new Error('electron-tray-base: provide store.name, store.instance, or a custom store via hooks');
  }

  function readSettings() {
    if (typeof hooks.getSettings === 'function') return hooks.getSettings();
    if (prefs) return prefs.getCommonSettings();
    return readCommonSettings(store);
  }

  function writeSettings(partial) {
    let next;
    if (typeof hooks.setSettings === 'function') {
      next = hooks.setSettings(partial);
    } else if (prefs) {
      next = prefs.setCommonSettings(partial);
    } else {
      applyCommonSettings(store, partial);
      next = readCommonSettings(store);
    }

    if (partial.alwaysOnTop !== undefined) {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) win.setAlwaysOnTop(!!next.alwaysOnTop);
    }
    if (partial.opacity !== undefined) {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) applyWindowOpacity(win, next.opacity);
    }
    if (partial.startMinimised !== undefined) syncLoginItemArgs(() => readSettings().startMinimised);
    if (typeof hooks.onSettingsChanged === 'function') hooks.onSettingsChanged(partial, next, buildContext());
    sendToRenderer('settings:changed', next);
    refreshTray();
    return next;
  }

  function readStartMinimised() {
    return !!readSettings().startMinimised;
  }

  function applyAlwaysOnTop(value) {
    writeSettings({ alwaysOnTop: value });
    const win = getMainWindow();
    if (win && !win.isDestroyed()) win.setAlwaysOnTop(value);
  }

  function setStartMinimised(value) {
    writeSettings({ startMinimised: value });
    if (!value) showMainWindow(createWindow);
  }

  function refreshTray() {
    if (!trayHandlers) return;
    updateTrayMenu({
      appName,
      handlers: trayHandlers,
      extraSections: trayConfig.extraSections,
      onClick: trayConfig.onClick,
      showHide: trayConfig.showHide,
      showAlwaysOnTop: trayConfig.showAlwaysOnTop
    });
  }

  function focusMainWindow() {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) return;
    if (win.isMinimized()) win.restore();
    if (!win.isVisible()) win.show();
    win.focus();
  }

  function handleProtocolUrl(url) {
    if (!url) return;
    showMainWindow(createWindow);
    focusMainWindow();
    if (typeof hooks.onProtocolUrl === 'function') hooks.onProtocolUrl(url, buildContext());
  }

  function buildContext() {
    return {
      app,
      store,
      getMainWindow,
      showWindow: () => showMainWindow(createWindow),
      hideWindow: hideMainWindow,
      toggleWindow: () => toggleMainWindow(createWindow),
      sendToRenderer,
      getSettings: readSettings,
      setSettings: writeSettings,
      applyAlwaysOnTop,
      setStartMinimised,
      syncLoginItemArgs: () => syncLoginItemArgs(readStartMinimised),
      updateTrayMenu: refreshTray,
      checkForUpdates: (manual = true) => checkForUpdates(manual),
      enableOpenAtLogin: () => enableOpenAtLogin(readStartMinimised)
    };
  }

  const boundsOptions = {
    minWidth: windowConfig.minWidth ?? 420,
    minHeight: windowConfig.minHeight ?? 420,
    defaultBounds: windowConfig.defaultBounds ?? { width: 800, height: 600 }
  };

  function createWindow() {
    const win = createMainWindow({
      store,
      boundsOptions,
      windowOptions: {
        html: windowConfig.html,
        loadURL: windowConfig.loadURL,
        icon: iconPath,
        maximizable: windowConfig.maximizable,
        fullscreenable: windowConfig.fullscreenable,
        webPreferences: {
          preload: windowConfig.preload,
          ...windowConfig.webPreferences
        }
      },
      getSettings: readSettings,
      isQuittingRef,
      onCreated: (createdWin) => {
        if (sleep.enabled !== false && sleepRefresh) sleepRefresh.attachShowRefresh(createdWin);
        if (typeof hooks.onWindowCreated === 'function') hooks.onWindowCreated(createdWin, buildContext());
      },
      onDidFinishLoad: (loadedWin) => {
        applyWindowOpacity(loadedWin, readSettings().opacity);
        if (typeof hooks.onDidFinishLoad === 'function') hooks.onDidFinishLoad(loadedWin, buildContext());
      }
    });
    return win;
  }

  if (dev.reloader !== false) {
    setupDevReloader(dev.entryModule || module, typeof dev.reloader === 'object' ? dev.reloader : {});
  }

  if (!setupSingleInstance({
    onSecondInstance: (argv) => {
      showMainWindow(createWindow);
      focusMainWindow();
      if (protocol) {
        const url = argv.find((arg) => arg.startsWith(`${protocol}://`));
        if (url) handleProtocolUrl(url);
      }
    }
  })) {
    return;
  }

  if (protocol) {
    app.setAsDefaultProtocolClient(protocol);
    app.on('open-url', (event, url) => {
      event.preventDefault();
      handleProtocolUrl(url);
    });
  }

  app.whenReady().then(() => {
    if (appId && process.platform === 'win32') app.setAppUserModelId(appId);

    if (loginItem.syncOnReady !== false) syncLoginItemArgs(readStartMinimised);
    if (loginItem.enableOnReady) enableOpenAtLogin(readStartMinimised);

    if (splashPath && !wasLaunchedMinimised()) createSplash(splashPath);

    registerSettingsIpc({
      getSettings: readSettings,
      setSettings: (partial) => writeSettings(partial || {}),
      getAppState: hooks.getAppState
    });

    if (typeof hooks.registerIpc === 'function') hooks.registerIpc(buildContext());

    createWindow();

    trayHandlers = {
      showWindow: () => showMainWindow(createWindow),
      hideWindow: hideMainWindow,
      toggleWindow: () => toggleMainWindow(createWindow),
      getSettings: readSettings,
      setAlwaysOnTop: applyAlwaysOnTop,
      setStartMinimised,
      checkForUpdates: (manual = true) => checkForUpdates(manual),
      quit: () => {
        isQuittingRef.current = true;
        app.quit();
      }
    };

    createTray({
      iconPath,
      appName,
      handlers: trayHandlers,
      extraSections: trayConfig.extraSections,
      onClick: trayConfig.onClick ?? 'toggle',
      showHide: trayConfig.showHide,
      showAlwaysOnTop: trayConfig.showAlwaysOnTop
    });

    if (sleep.enabled !== false) {
      sleepRefresh = setupSleepResumeRefresh({
        getMainWindow,
        onResume: sleep.onResume || ((win) => {
          if (win && !win.isDestroyed()) win.webContents.reloadIgnoringCache();
        })
      });
    }

    ({ checkForUpdates } = setupAutoUpdater({
      appName,
      iconPath,
      enabled: updater.enabled ?? app.isPackaged,
      configureFeed: updater.configureFeed,
      onQuitForInstall: () => {
        isQuittingRef.current = true;
      }
    }));

    if (typeof hooks.onReady === 'function') hooks.onReady(buildContext());
  });

  let quitInProgress = false;
  app.on('before-quit', (event) => {
    isQuittingRef.current = true;
    if (typeof hooks.onBeforeQuit !== 'function') {
      destroyTray();
      return;
    }

    const result = hooks.onBeforeQuit(buildContext());
    if (result && typeof result.then === 'function') {
      if (quitInProgress) return;
      quitInProgress = true;
      event.preventDefault();
      result
        .catch(() => {})
        .finally(() => {
          destroyTray();
          app.exit(0);
        });
      return;
    }

    destroyTray();
  });

  app.on('window-all-closed', (event) => {
    if (!isQuittingRef.current) event.preventDefault();
  });

  app.on('activate', () => {
    showMainWindow(createWindow);
  });
}

module.exports = {
  run,
  createPrefsStore,
  registerSettingsIpc,
  setupAutoUpdater,
  setupSingleInstance,
  setupSleepResumeRefresh,
  setupDevReloader,
  attachWindowBoundsLogger: require('./dev').attachWindowBoundsLogger,
  hasStartMinimizedArg: require('./login').hasStartMinimizedArg,
  wasLaunchedMinimised,
  syncLoginItemArgs,
  enableOpenAtLogin
};
