# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"BIDV Staff": a mobile-first, offline-capable PWA with two screens — a staff directory and an employee profile with a contact QR code. Plain HTML/CSS/JS with **no build step, no package.json, no test suite, no linter**. UI copy is Vietnamese. See `README.md` for the file table and install/deploy notes.

## Commands

```bash
python -m http.server 8765      # serve from the repo root, open http://localhost:8765
node --check app.js             # the only "lint": CI runs this on app.js, data.js, sw.js, vendor/qrcode.js
```

(`README.md` says `cd bidv-staff` first; that is stale — run from the repo root.)

Service workers and install only work on `localhost` or HTTPS, so test on a phone through a TLS host or a tunnel (`ngrok http 8765`).

CI (`.github/workflows/deploy.yml`) runs on push to `develop` (the default branch): `node --check` on the JS files, `JSON.parse` on the manifest, a check that required files exist, then it publishes to GitHub Pages.

## Architecture

Scripts are classic (non-module) and load in this order from `index.html`: `vendor/qrcode.js` → `data.js` → `app.js`. They communicate through globals: `qrcode()` and `EMPLOYEES`. `app.js` is a single IIFE.

- **Routing** is hash-based in `app.js`: `#/` renders the directory, `#/nv/<id>` renders a profile (an unknown id redirects to `#/`). `route()` runs on every `hashchange` and closes the QR sheet first.
- **Rendering** replaces `#app.innerHTML` with template strings. Every employee field must go through `esc()`; the `photo` `onerror` handler in `avatar()` swaps in the hoa mai emblem.
- **Search** uses `fold()`, which strips Vietnamese diacritics and maps `đ`→`d`, so queries match with or without accents. It matches name, department, title and id.
- **Two vCard builders** exist on purpose:
  - `vCard()` is vCard 3.0 UTF-8, used for the shared `.vcf` file.
  - `vCardQr()` is vCard 2.1 with `ENCODING=QUOTED-PRINTABLE` (via `qp()`), so the QR payload is pure ASCII and scanner apps cannot mis-guess the charset. Don't "simplify" the QR one to plain UTF-8.
  - Names are split Vietnamese-style by `nameParts()`: family name first, given name last.
- **Install banner**: Android/desktop use `beforeinstallprompt`; iOS Safari has no prompt, so the banner shows manual instructions. Dismissal is stored in `localStorage` under `bidv-staff-install-dismissed`.

## Service worker and the shipped-file lists

`sw.js` is cache-first with `ignoreSearch`, so clients keep serving cached files until `VERSION` changes. **Bump `VERSION` in `sw.js` with any change to a shipped file**, or installed clients (and your own browser on localhost) will keep the old build. While developing, unregister the worker or clear site data in DevTools.

The list of shipped files lives in three places that have to be kept in sync by hand when you add, rename or remove a file:

1. `SHELL` in `sw.js`, which is precached for offline use. Same-origin files fetched later, such as employee photos, are cached at runtime.
2. The "Check manifest and referenced files" step in `deploy.yml`.
3. The `cp -r` step ("Collect site files") in `deploy.yml`. Only the files and directories named there are published. For example, `README.md` is not.

## Data

`data.js` holds fake sample employees in the `EMPLOYEES` array (`id`, `fullName`, `title`, `phone`, `email`, `department`, optional `photo` such as `"images/xxx.jpg"`). Email convention: given name plus the initials of the family and middle names, no diacritics, `@bidv.com.vn` (Nguyễn Bình An → `annb@bidv.com.vn`). `data.js` is meant to be replaced by an API call once a backend exists.

`image.png` (the original design reference) is git-ignored because it contains a real person's name and phone number. Don't commit it or copy its contents into the repo.
