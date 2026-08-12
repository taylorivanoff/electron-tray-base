const { BrowserWindow } = require('electron');
const { getWindowBounds, createBoundsSaver } = require('./bounds');
const { applyWindowOpacity, platformWindowOptions } = require('./window-chrome');
const { closeSplash } = require('./splash');
const { wasLaunchedMinimised } = require('./login');

let mainWindow = null;

function getMainWindow() {
  return mainWindow;
}

function createMainWindow({
  store,
  boundsOptions,
  windowOptions,
  getSettings,
  isQuittingRef,
  onCreated,
  onDidFinishLoad
}) {
  if (mainWindow) return mainWindow;

  const bounds = getWindowBounds(store, boundsOptions);
  const settings = getSettings();

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    show: false,
    alwaysOnTop: settings.alwaysOnTop,
    minimizable: true,
    maximizable: windowOptions.maximizable !== false,
    fullscreenable: windowOptions.fullscreenable === true,
    minWidth: boundsOptions.minWidth,
    minHeight: boundsOptions.minHeight,
    icon: windowOptions.icon,
    ...platformWindowOptions(),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      ...windowOptions.webPreferences
    }
  });

  if (Number.isFinite(bounds.x) && Number.isFinite(bounds.y)) {
    mainWindow.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    }, false);
  } else {
    mainWindow.setSize(bounds.width, bounds.height, false);
  }

  mainWindow.setMenu(null);
  applyWindowOpacity(mainWindow, settings.opacity);

  const boundsSaver = createBoundsSaver(store, getMainWindow, boundsOptions);
  boundsSaver.attach(mainWindow);

  mainWindow.webContents.on('did-finish-load', () => {
    closeSplash();
    applyWindowOpacity(mainWindow, getSettings().opacity);
    if (!wasLaunchedMinimised()) {
      mainWindow.show();
      mainWindow.focus();
    }
    if (typeof onDidFinishLoad === 'function') onDidFinishLoad(mainWindow);
  });

  mainWindow.on('close', (event) => {
    boundsSaver.persist(true);
    if (!isQuittingRef.current) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (windowOptions.loadURL) mainWindow.loadURL(windowOptions.loadURL);
  else if (windowOptions.html) mainWindow.loadFile(windowOptions.html);

  if (typeof onCreated === 'function') onCreated(mainWindow);

  return mainWindow;
}

function showMainWindow(createFn) {
  if (!mainWindow && typeof createFn === 'function') createFn();
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function hideMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
}

function toggleMainWindow(createFn) {
  if (!mainWindow || !mainWindow.isVisible()) showMainWindow(createFn);
  else hideMainWindow();
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

module.exports = {
  getMainWindow,
  createMainWindow,
  showMainWindow,
  hideMainWindow,
  toggleMainWindow,
  sendToRenderer
};
