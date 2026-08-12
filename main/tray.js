const { Tray, Menu, nativeImage, app } = require('electron');

let tray = null;
let trayState = null;

function buildDefaultTrayMenu({
  appName,
  handlers,
  extraSections = [],
  showHide = true,
  showAlwaysOnTop = true
}) {
  const settings = handlers.getSettings();
  const sections = [
    showHide
      ? [
        { label: `Show ${appName}`, click: () => handlers.showWindow() },
        { label: `Hide ${appName}`, click: () => handlers.hideWindow() }
      ]
      : [{ label: `Show ${appName}`, click: () => handlers.showWindow() }],
    showAlwaysOnTop
      ? [
        {
          label: 'Always on Top',
          type: 'checkbox',
          checked: !!settings.alwaysOnTop,
          click: (item) => handlers.setAlwaysOnTop(item.checked)
        },
        {
          label: 'Start Minimised',
          type: 'checkbox',
          checked: !!settings.startMinimised,
          click: (item) => handlers.setStartMinimised(item.checked)
        }
      ]
      : [{
        label: 'Start Minimised',
        type: 'checkbox',
        checked: !!settings.startMinimised,
        click: (item) => handlers.setStartMinimised(item.checked)
      }],
    ...extraSections,
    [
      { label: 'Check for Updates', click: () => handlers.checkForUpdates(true) },
      { label: `Version ${app.getVersion()}`, enabled: false },
      { label: 'Quit', click: () => handlers.quit() }
    ]
  ];

  const items = [];
  sections.forEach((section, index) => {
    if (index > 0) items.push({ type: 'separator' });
    items.push(...section);
  });
  return Menu.buildFromTemplate(items);
}

function createTray({
  iconPath,
  appName,
  handlers,
  extraSections = [],
  onClick = 'toggle',
  showHide = true,
  showAlwaysOnTop = true
}) {
  if (tray) return tray;
  trayState = { appName, handlers, extraSections, onClick, showHide, showAlwaysOnTop };

  let image = nativeImage.createFromPath(iconPath);
  if (image.isEmpty()) image = nativeImage.createEmpty();
  if (process.platform === 'darwin') {
    image = image.resize({ width: 18, height: 18 });
    image.setTemplateImage(true);
  } else if (!image.isEmpty()) {
    image = image.resize({ width: 16, height: 16 });
  }

  tray = new Tray(image);
  tray.setToolTip(appName);
  updateTrayMenu(trayState);

  if (onClick === 'toggle') {
    tray.on('click', () => handlers.toggleWindow());
    tray.on('double-click', () => handlers.showWindow());
  } else if (onClick === 'show') {
    tray.on('click', () => handlers.showWindow());
  }

  return tray;
}

function updateTrayMenu(state = trayState) {
  if (!tray || tray.isDestroyed() || !state) return;
  trayState = state;
  tray.setContextMenu(buildDefaultTrayMenu({
    appName: state.appName,
    handlers: state.handlers,
    extraSections: typeof state.extraSections === 'function'
      ? state.extraSections(state.handlers)
      : (state.extraSections || []),
    showHide: state.showHide !== false,
    showAlwaysOnTop: state.showAlwaysOnTop !== false
  }));
}

function destroyTray() {
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
    tray = null;
  }
  trayState = null;
}

module.exports = {
  buildDefaultTrayMenu,
  createTray,
  updateTrayMenu,
  destroyTray
};
