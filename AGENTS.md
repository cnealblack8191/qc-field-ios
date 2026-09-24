# ECI Field QC — iOS app

The native field app for inspectors. The server, its rules and the API this
app talks to live in the QC repo (`cnealblack8191/qc`); its `AGENTS.md` still
applies here: pins are placed by the office, inspectors reach only assigned
work, and the server authorizes every mutation. This app never offers office
functions.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. Before touching an Expo, EAS or
React Native API, read the `expo` major in `package.json` and check the matching
docs at `https://docs.expo.dev/versions/v<major>.0.0/`, or read the installed
package's `.d.ts` in `node_modules`.

## Commands

```bash
npx expo install <package>  # never npm add — resolves SDK-compatible versions
npx expo start              # dev server; scan the QR with Expo Go on an iPhone
npm run typecheck           # tsc --noEmit
npx expo-doctor             # dependency and config checks
npm run export:web          # the browser demo bundle
```

Run the typecheck and expo-doctor before declaring a change done.

## Structure

- `src/app/` — routes only (Expo Router). Every file is a screen.
- `src/lib/ops.ts` — every write the app makes, as a value, and `applyOp`.
  Screens render `applyOps(lastSnapshot, outbox)`; nothing waits on the network.
- `src/lib/rules.ts` — what an inspector may do. Mirrors the server's rules so
  the UI never offers an action that will bounce; the server stays the authority.
- `src/lib/store.tsx` — session, cached snapshot, outbox and the sync loop.
- `src/lib/api/` — the API seam: `demo.ts` (on-device) and `http.ts`
  (`/api/field/v1`, contract in the QC repo's `docs/FIELD_IOS_API.md`).
- `src/components/` — shared UI. `src/demo/` — demo data and sheets.

## Rules

- `ios/` and `android/` are generated (Continuous Native Generation). Configure
  native behaviour in `app.json`, never by hand.
- Adding a library with native code means Expo Go can no longer run the app;
  a development build is needed from then on. Prefer modules Expo Go bundles.
- Tap targets ≥ 44pt (primary field actions 56pt), input text ≥ 16pt — the
  budgets in the QC repo's `docs/MOBILE_FIELD_PLAN.md`.
- A change to the stored shape of the outbox or snapshot must keep reading the
  old shape: an inspector may update the app with unsynced work on the device.
