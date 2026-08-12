# electron-tray-base

Shared **Electron scaffold** for **tray-first utility apps** with a native renderer (local HTML + preload). Consolidates the duplicated lifecycle code from CmdDeck, Font Checker, PDF to TXT, GhStats, and related projects.

For **web-wrapper** apps that load remote URLs (iCloud, Apple web apps), keep using [`icloud-windows-base`](https://github.com/taylorivanoff/icloud-windows-base).

## Features

| Area | Included |
|------|----------|
| **Tray** | Show / Hide, Always on Top, Start Minimised, Check for Updates, Quit |
| **Window** | Close-to-tray, bounds persistence, display validation, macOS vibrancy |
| **Splash** | Optional; skipped on login-item `--start-minimised` launch |
| **Login item** | Sync `--start-minimised` args; optional enable-on-ready |
| **Start minimised** | Manual launch always shows; login launch respects toggle |
| **Single instance** | Ignores duplicate boot instances that pass `--start-minimised` |
| **Auto-updater** | GitHub releases via `electron-updater`; optional custom feed |
| **IPC** | `app:getState`, `settings:get`, `settings:set` |
| **Sleep/resume** | Optional reload when system wakes (default: reload main window) |
| **Dev** | Optional `electron-reloader` in unpackaged builds |

## Quick start

**main.js**

```js
const path = require('path');
require('electron-tray-base').run({
  appName: 'Font Checker',
  appId: 'io.github.taylorivanoff.font-checker',
  iconPath: path.join(__dirname, 'resources', 'icon.png'),
  splashPath: path.join(__dirname, 'resources', 'splash.html'),
  store: { name: 'font-checker', defaults: { mode: 'convert' } },
  window: {
    html: path.join(__dirname, 'renderer', 'index.html'),
    preload: path.join(__dirname, 'preload', 'preload.cjs'),
    minWidth: 460,
    minHeight: 460,
    defaultBounds: { width: 760, height: 620 }
  },
  hooks: {
    registerIpc: ({ sendToRenderer }) => {
      // app-specific ipcMain.handle(...) calls
    }
  }
});
```

**package.json**

```json
"dependencies": {
  "electron-tray-base": "github:taylorivanoff/electron-tray-base",
  "electron-store": "^8.2.0",
  "electron-updater": "^6.8.9"
}
```

## Config reference

### Required

| Field | Description |
|-------|-------------|
| `appName` | Display name (tray menu, notifications) |
| `iconPath` | Tray/window icon |
| `window.html` or `window.loadURL` | Main BrowserWindow content |
| `store.name` or `store.instance` | `electron-store` for window bounds + common prefs |

### Optional

| Field | Default | Description |
|-------|---------|-------------|
| `appId` | — | Windows `setAppUserModelId` |
| `splashPath` | none | Splash HTML file |
| `store.defaults` | opacity, alwaysOnTop, startMinimised | Merged into electron-store defaults |
| `loginItem.syncOnReady` | `true` | Keep login-item args in sync with toggle |
| `loginItem.enableOnReady` | `false` | Register app at Windows login on first run |
| `updater.enabled` | `app.isPackaged` | Auto-update |
| `updater.configureFeed` | — | e.g. standupmate license feed |
| `tray.extraSections` | `[]` | `(handlers) => [[menu items], ...]` inserted before Updates |
| `tray.onClick` | `'toggle'` | `'toggle'` or `'show'` |
| `sleep.enabled` | `true` | Reload on wake |
| `sleep.onResume` | reload | Custom `(win) => void` |
| `dev.reloader` | `true` | `electron-reloader` when unpackaged |

### Hooks

| Hook | When |
|------|------|
| `getSettings()` | Override merged settings (use with custom store module) |
| `setSettings(partial)` | Override settings write |
| `onReady(ctx)` | After tray, window, updater are set up |
| `onWindowCreated(win, ctx)` | Main window created |
| `onSettingsChanged(partial, settings, ctx)` | Tray or renderer changed settings |
| `onBeforeQuit(ctx)` | App quitting |
| `registerIpc(ctx)` | Register app-specific `ipcMain` handlers |

### Context (`ctx`)

```js
{
  app, store,
  getMainWindow, showWindow, hideWindow, toggleWindow,
  sendToRenderer, getSettings, setSettings,
  applyAlwaysOnTop, setStartMinimised,
  syncLoginItemArgs, enableOpenAtLogin,
  updateTrayMenu, checkForUpdates
}
```

## Custom store (Font Checker, PDF to TXT, CmdDeck)

When the app already has a store module with extra fields:

```js
const store = require('./store');

require('electron-tray-base').run({
  appName: 'Font Checker',
  // ...
  store: { instance: store.store }, // electron-store instance
  hooks: {
    getSettings: () => store.getSettings(),
    setSettings: (partial) => store.setSettings(partial),
    registerIpc: (ctx) => { /* fonts:scan, etc. */ }
  }
});
```

Ensure `getSettings()` returns at least `{ opacity, alwaysOnTop, startMinimised }` for tray toggles.

## Tray extras (CmdDeck, GhStats)

```js
tray: {
  extraSections: (handlers) => [[
    { label: 'Reload PATH', click: () => handlers.reloadPath?.() },
    { label: 'Refresh data', click: () => handlers.refresh?.() }
  ]]
}
```

Pass extra handler methods via `hooks.onReady`:

```js
hooks: {
  onReady: (ctx) => {
    Object.assign(trayHandlersRef, {
      reloadPath: () => { /* ... */ }
    });
  }
}
```

Or extend `trayHandlers` by storing a ref — cleaner pattern: add items in `extraSections` that close over app modules directly.

## Migration map

| App | Package |
|-----|---------|
| CmdDeck, Font Checker, PDF to TXT, GhStats, Tidy Tray | **electron-tray-base** |
| iCloud / Apple web wrappers (15 apps) | **icloud-windows-base** |

### Stay in the app (not base)

- Domain logic (PDF extraction, font scanning, macros, file watcher)
- Multi-window managers (settings, terminal, log)
- License / auth flows
- Custom updater feeds (wrap via `updater.configureFeed`)

## Granular imports

```js
const {
  run,
  createPrefsStore,
  wasLaunchedMinimised,
  syncLoginItemArgs,
  setupSleepResumeRefresh
} = require('electron-tray-base');
```

## Local development

In an app:

```json
"electron-tray-base": "file:../electron-tray-base"
```

Run `npm install` / `bun install`, then `npm start`.

## Relationship to icloud-windows-base

| | icloud-windows-base | electron-tray-base |
|--|---------------------|-------------------|
| Content | Remote URL (iCloud) | Local renderer |
| Session | Shared Apple cookies | — |
| Default start minimised | `true` | `false` |
| Toolbar / Safari UA | Yes | — |
| Opacity / Always on top | — | Yes |

Both share the same **start minimised** semantics: toggle controls login-item args; manual opens always show the window.

## License

See repository license file if present.
