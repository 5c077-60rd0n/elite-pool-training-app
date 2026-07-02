# Fargo Climb - Elite Pool Training PWA

Offline-first training companion for structured one-hour daily pool practice.

## Scripts

- `npm run dev` - Start Vite dev server with HMR.
- `npm run build` - Type-check and create production build.
- `npm run preview` - Serve production build locally.

## PWA Install

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

## Project Notes

- Main app shell uses React 18 + TypeScript + React Router v6.
- State uses Zustand with IndexedDB-backed persistence.
- Charts use Recharts.
# elite-pool-training-app
