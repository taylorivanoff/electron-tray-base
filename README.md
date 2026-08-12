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
| **Auto-updater** | GitHub releases via `electron-updater`; optional custom feed |
| **IPC** | `app:getState`, `settings:get`, `settings:set` |
| **Sleep/resume** | Optional reload when system wakes (default: reload main window) |
| **Dev** | Optional `electron-reloader` in unpackaged builds |
