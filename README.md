# Fargo Climb - Elite Pool Training PWA

Offline-first training companion for structured one-hour daily pool practice.

## Scripts

- `npm run dev` - Start Vite dev server with HMR.
- `npm run dev:host` - Start dev server on your LAN so your phone can open it.
- `npm run build` - Type-check and create production build.
- `npm run preview` - Serve production build locally.
- `npm run preview:host` - Serve production build on your LAN for install testing.
- `npm run ci` - Run lint and build together (same baseline used in CI).

## Production Readiness

### Automated Guardrails

- GitHub Actions CI runs on every push and pull request via [.github/workflows/ci.yml](.github/workflows/ci.yml).
- Dependabot is configured for npm packages and GitHub Actions via [.github/dependabot.yml](.github/dependabot.yml).

### Release Checklist

1. Run `npm ci`.
2. Run `npm run ci`.
3. Smoke-test install/update flows on iOS Safari and Chrome (Android/Desktop).
4. Verify offline behavior by loading once online, then disabling network.
5. Ship with semantic versioning (`npm version patch|minor|major`) and push tags.

## Run On Desktop and Phone

1. Install dependencies: `npm install`
2. Build the app: `npm run build`
3. Start LAN preview: `npm run preview:host`
4. On your desktop, open the local URL shown in terminal.
5. On your phone (same Wi-Fi), open `http://<your-mac-ip>:4173`

Find your Mac IP with: `ipconfig getifaddr en0`

Important notes:

- For full install prompts on Android/desktop, prefer HTTPS or localhost.
- iOS Safari supports Add to Home Screen without requiring the same install prompt model as Chrome.

## PWA Install

### Desktop (Chrome/Edge)

1. Open the app URL.
2. Click the install icon in the address bar (or browser app menu).
3. Install to launch as a standalone app.

### iOS (Safari)

1. Open the app URL in Safari.
2. Tap Share.
3. Tap Add to Home Screen.
4. Launch from the home screen for standalone mode.

### Android (Chrome)

1. Open the app URL in Chrome.
2. Tap Install App from the address bar or browser menu.
3. Confirm install.

## Data Persistence and Backup

All app state is stored locally in IndexedDB using `idb-keyval`.

Planned Settings actions:

- Export training data to JSON backup.
- Import JSON backup.
- Reset progress and restart program date.

## Offline Behavior

The app uses `vite-plugin-pwa` with Workbox and precaches static assets for offline use after first load.

## PWA Best Practices Implemented

- Service worker update flow with in-app "Update now" prompt.
- In-app install prompt (supported browsers) with graceful fallback.
- Offline-ready notification after initial asset caching.
- PNG + maskable icons for install compatibility across Android/Desktop.
- Apple touch icon and iOS web app metadata for home screen behavior.
- Workbox cache maintenance (`cleanupOutdatedCaches`) and immediate client takeover.
- Manifest shortcuts for fast access to core app flows.

## Production Deployment Notes

- PWA install prompts on Android/Desktop generally require HTTPS or localhost.
- iOS supports Add to Home Screen via Safari Share menu.
- After each release, open the app once online so new assets are cached for offline use.
- Keep your host configured for SPA route fallback to `index.html`.

## Project Notes

- Main app shell uses React 18 + TypeScript + React Router v6.
- State uses Zustand with IndexedDB-backed persistence.
- Charts use Recharts.
# elite-pool-training-app
