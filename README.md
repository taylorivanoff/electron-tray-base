# electron-tray-base

Shared **Electron scaffold** for **tray-first utility apps** with a native renderer (local HTML + preload).

## Features

| Area | Included |
|------|----------|
| **Tray** | Show / Hide, Always on Top, Start Minimised, Check for Updates, Quit |
| **Window** | Close-to-tray, bounds persistence, display validation, macOS vibrancy |
| **Splash** | Optional; skipped on login-item `--start-minimised` launch |
| **Login item** | Sync `--start-minimised` args; optional enable-on-ready |
| **Start minimised** | Manual launch always shows; login launch respects toggle |
| **Single instance** | Ignores duplicate boot instances that pass `--start-minimised` |
| **App isolation** | Per-app `userData`, Windows AppUserModelId, session partitions, and login-item args |
| **Auto-updater** | GitHub releases via `electron-updater`; optional custom feed |
| **IPC** | `app:getState`, `settings:get`, `settings:set` |
| **Sleep/resume** | Optional reload when system wakes (default: reload main window) |
| **Dev** | Optional `electron-reloader` in unpackaged builds |

Also used by [`icloud-windows-base`](https://github.com/taylorivanoff/icloud-windows-base) for iCloud / Apple web wrappers (`window.loadURL`, custom protocol, silent updater).

### Web-wrapper options

| Field | Default | Description |
|-------|---------|-------------|
| `protocol` | — | Custom URL scheme; focuses window on `protocol://` open |
| `tray.showHide` | `true` | Show/Hide menu items (web wrappers often use `false`) |
| `tray.showAlwaysOnTop` | `true` | Always on Top toggle (web wrappers often use `false`) |
| `updater.silent` | `false` | Skip update-available notification |

`hooks.onBeforeQuit` may return a Promise to delay quit until async work finishes (e.g. cookie flush).

## Windows / multi-app isolation

Call `configureAppIsolation({ appId, appName })` **before** any module that reads `app.getPath('userData')` (including `electron-store`). `run()` also calls it, but stores loaded earlier would miss the isolated path.

Each app should pass a unique `build.appId` from `package.json`. Electron-tray-base then:

- Pins `%APPDATA%/<appId>` as `userData` (migrates legacy data on first run)
- Sets Windows `AppUserModelId` for taskbar / toast grouping
- Uses per-app single-instance mutexes (derived from `userData`)
- Registers dev-mode login items with `electron.exe <appPath>` so sibling tray apps do not clobber each other

iCloud wrappers additionally use an `appId`-derived Chromium session partition instead of a shared `persist:icloud` name.

## Relationship to icloud-windows-base

| | icloud-windows-base | electron-tray-base |
|--|---------------------|-------------------|
| Content | Remote URL (iCloud) | Local renderer |
| Session | Apple cookie persistence | — |
| Default start minimised | `true` | `false` |
| Toolbar / Safari UA | Yes | — |

`icloud-windows-base` delegates tray, window bounds, splash, login item, updater, and lifecycle here, and adds iCloud session/navigation logic.
