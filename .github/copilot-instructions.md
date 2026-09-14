# Copilot instructions for this repository

## Project overview

This repository is a desktop password manager built with Electron and the `kdbxweb` library for reading and writing KeePass databases (`.kdbx`). The UI is a single-window desktop app: the main process owns native OS dialogs and secure clipboard behavior, while the renderer handles DOM updates and user interactions.

The app is intentionally organized around a few central files:

- `main.js`: Electron startup, window creation, IPC handlers, file dialog integration, and secure clipboard handling.
- `preload.js`: exposes a safe `window.kdbxAPI` bridge to the renderer so the renderer can call Electron APIs without direct Node access.
- `kdbx-service.js`: the real database logic, including opening, creating, saving, grouping, and entry management. This is the most important file for DB changes.
- `renderer.js`: UI logic for lock screen, dashboard, modals, password generation, search/filtering, and events tied to the browser DOM.
- `database.js`: CLI smoke-test script for opening a KeePass file from the terminal without the Electron UI.
- `index.html` and `styles.css`: structure and styling for the desktop interface.

## Build, test, and validation commands

From the repo root:

- Install dependencies:
  - `npm install`
- Start the Electron app in development mode:
  - `npm start`
- Package the app for distribution:
  - `npm run dist`
- Create an unpacked build directory without packaging:
  - `npm run pack`

There is no dedicated `test` or `lint` script in `package.json` today. The project also has no JS unit-test runner configured. For a practical smoke check, open a database through the app or run the CLI helper:

- `node database.js "SUA_SENHA_MESTRA"`

The GitHub Actions workflow in `.github/workflows/build.yml` runs the packaging build on Node 22 with:

- `npm install`
- `npm run dist`

If you need to validate a DB-related change without running the full UI, prefer the lower-level `kdbx-service.js` path and the CLI helper above instead of creating a new test framework.

## High-level architecture

### Electron main vs. renderer split

This repo follows the standard Electron pattern:

- `main.js` handles privileged tasks and exposes IPC endpoints such as `kdbx:unlock`, `kdbx:save`, `clipboard:write`, and `shell:openExternal`.
- `preload.js` defines `window.kdbxAPI`, which is the only API surface the renderer uses.
- `renderer.js` does not interact with the filesystem or privileged Node APIs directly. It calls the preload bridge and updates the DOM.

When changing behavior, keep the logic in the correct layer: database file access and crypto belong in `kdbx-service.js`; UI flow belongs in `renderer.js`.

### KeePass database flow

The app uses `kdbxweb` plus `hash-wasm` to support KeePass database formats, including Argon2-based KDBX v4. The `CryptoEngine.setArgon2Impl` setup in `kdbx-service.js` is the key integration point for KDBX v4 compatibility.

The main DB lifecycle is:

1. User selects a `.kdbx` file and optional key file.
2. `main.js` calls `kdbxService.openDatabase(...)`.
3. `kdbx-service.js` decrypts metadata, loads the database, and returns serialized entries/groups.
4. `renderer.js` renders the lock screen/dashboard state and user interactions.
5. Changes are tracked via `hasUnsavedChanges` before a save writes the DB back to disk.

### Save safety and security conventions

This project takes a few security-sensitive steps that are important to preserve:

- Passwords are stored with `kdbxweb.ProtectedValue.fromString(...)` when loading or creating DB entries.
- Clipboard writes are automatically cleared after 30s for sensitive values.
- `saveDatabase()` writes to `*.tmp` and then renames it into place, and it also creates a `.bak` backup before overwriting the original file.

These are not incidental details; they are core repository conventions and should be preserved when touching save or clipboard logic.

## Key conventions

- Preserve the app’s current architecture: keep file-system and crypto logic in `kdbx-service.js`, not in `renderer.js`.
- Prefer the existing IPC pattern in `main.js` and the preload bridge in `preload.js` for any new main-process actions.
- Treat `renderer.js` as the DOM orchestration layer rather than the source of truth for DB state.
- The app uses Portuguese user-facing strings in many dialogs and toasts; keep new UI copy consistent with the current interface unless there is a strong reason not to.
- The project is a compact, single-window desktop app, not a multi-package app. Changes should stay minimal and clear rather than introducing a larger framework structure.
- Use the current naming pattern: `kdbx:unlock`, `kdbx:save`, `kdbx:addEntry`, etc. Maintain naming consistency when adding new IPC handlers.
- When editing DB-related behavior, validate the relevant flow in the real app or via the terminal helper rather than assuming a generic JS approach will work.

## Relevant repo notes

- `package.json` defines the Electron app and packaging setup; `electron-builder` is used for `.deb` packaging on Linux.
- The build workflow is intentionally simple and tied to `npm run dist` on Ubuntu.
- The repo includes a working local database file (`Database.kdbx`) and a backup (`Database.kdbx.bak`), so local validation can be done without creating new fixtures.

## Working assumptions for changes

- Use the existing app structure and avoid introducing unrelated build systems or test frameworks.
- Prefer targeted, low-risk edits over refactors that cross layers without clear benefit.
- If changing save, unlock, or clipboard behavior, validate security-sensitive paths carefully because they affect user data and sensitive values.
