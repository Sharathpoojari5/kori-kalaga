# Kori Kalaga (Android + iOS)

A village rooster game. No gambling, no real-money prizes: coins are earned in-game.
The game is HTML/JS wrapped as a native app with Capacitor 8.

## What is where
- `src/game.html`  the whole game (splash, opening, village, stable, shop, fight)
- `scripts/build-www.js`  wraps it into `www/index.html`
- `android/`  native Android project (Android Studio)
- `ios/`  native iOS project (Xcode)
- `assets-src/`  source of the app icon and splash

## One-time setup
1. Install Node 22 or newer.
2. In this folder run: `npm install`

## Android (Windows, Mac or Linux)
1. Install Android Studio (current stable) with SDK 36.
2. `npm run android`  (builds www, syncs, opens Android Studio)
3. Plug in a phone with USB debugging, or start an emulator, and press Run.
4. For a store build: Build > Generate Signed App Bundle.

## iOS (needs a Mac)
1. Install Xcode (current stable) and sign in with an Apple ID.
2. `npm run ios`  (builds www, syncs, opens Xcode)
3. In Signing and Capabilities pick your team, choose a device or simulator, press Run.
4. For the App Store you need a paid Apple developer account.

## After you change the game
Edit `src/game.html`, then run `npm run sync` and press Run again.

## Not done yet (honest list)
- Not compiled in the build sandbox (no Android SDK or Xcode there): first build on your machine may need small fixes.
- No in-app purchases yet (gems), no accounts, no multiplayer.
- Art is vector stand-in; real painted sprites are a later step.
- Fonts load from Google Fonts when online and fall back to system fonts offline.
