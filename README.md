# BIDV Staff

Mobile-first web app (PWA) with two screens: staff directory (home) and employee profile with a contact QR code. Can be added to the phone's home screen and opens offline.

No build step — plain HTML/CSS/JS.

## Run locally

```bash
cd bidv-staff
python -m http.server 8765
# open http://localhost:8765
```

To test on a phone, the app must be served over **HTTPS** (service workers and "install" only work on HTTPS or localhost). Easiest options: deploy the folder to any static host (GitHub Pages, Netlify, Nginx with TLS), or tunnel with `ngrok http 8765`.

## Add to home screen

- **Android (Chrome/Edge/Samsung Internet):** an install banner appears at the bottom → tap **Cài đặt**. Or browser menu → *Add to Home screen*.
- **iPhone (Safari):** the banner shows instructions → tap **Share** → **Add to Home Screen**.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page shell, PWA meta tags |
| `app.js` | Routing (`#/` home, `#/nv/<id>` detail), QR sheet, share, install banner |
| `data.js` | Employee data (fake sample data) — edit here |
| `styles.css` | Styles |
| `manifest.webmanifest`, `icons/` | Home screen name and icons |
| `sw.js` | Offline cache — bump `VERSION` after changing any file |
| `vendor/qrcode.js` | QR generator (qrcode-generator 1.4.4, MIT) |
| `images/` | Employee photos; set `photo: "images/xxx.jpg"` in `data.js` |
| `image.png` | Original design reference (local only, git-ignored: contains real contact data) |
| `.github/workflows/deploy.yml` | On push to `develop`: syntax/file checks, then deploy to GitHub Pages |

## Deploy

Pushing to `develop` runs the workflow and publishes the site to GitHub Pages
(`https://<user>.github.io/<repo>/`). One-time setup: repo **Settings → Pages → Source: GitHub Actions**.

The QR code holds the contact as a vCard 2.1 with Vietnamese fields in `CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE` (e.g. `Tr=E1=BA=A7n`). The payload is pure ASCII, so scanner apps cannot mis-guess the charset (`Tráº§n`, `Tr?n`); vCard-aware scanners and contact apps decode it back to Vietnamese. The profile page also has a **Lưu vào danh bạ** button that downloads a UTF-8 `.vcf` file.
