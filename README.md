# Guitar Tuner PWA

A no-build Progressive Web App that tunes your guitar using your device microphone.

## Use it locally
1. Unzip the folder.
2. Serve it over HTTPS (required for microphone). Easiest:
   - Use VS Code Live Server (not HTTPS by default) or
   - `python -m http.server 8000` (not HTTPS) then use a local HTTPS proxy like `mkcert`
   - Or deploy to GitHub Pages / Netlify / Vercel (recommended).

## Add to Home screen (Android)
1. Deploy the folder to any HTTPS host (GitHub Pages works great).
2. Visit the URL in Chrome on Android.
3. Tap the three-dot menu → **Install app** (or **Add to Home screen**).
4. Open from your home screen; it runs fullscreen and works offline after the first load.

## Notes
- Grant microphone permission when prompted.
- Tuner range ~40–1400 Hz. Adjust A4 (default 440) as needed.
- Calibration button estimates A4 from a currently ringing **E2** low string.
