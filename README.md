# ECI Field QC — iOS

The native iOS app for ECI field inspectors: assigned projects, punch walks,
drawing-pin walks and equipment checklists, built to keep working with no
signal. Expo (SDK 57) + React Native + TypeScript, Expo Router.

It does what the `/field` web app does, natively — and nothing the office does.
Pins are placed and scanned in the office app only.

## Try the demo on an iPhone (no Mac needed)

1. Install **Expo Go** from the App Store on the iPhone.
2. On any computer with Node 22 (the Windows machine works):
   ```bash
   cd field-ios
   npm install
   npx expo start --tunnel
   ```
3. Scan the QR code with the iPhone camera. The app opens in Expo Go.
4. Tap **Explore the demo**. Sample data lives only on the phone.

Things to try:

- **Projects → Oak Ridge Elementary → Mason → Walk the drawings → E-101.**
  Tap *Next unchecked pin*, then *Pass*: the next pin comes up by itself.
  *Punch* asks for a note and photos and raises a punch item.
- **Account → Simulate no signal**, then log items or record pins. Everything
  saves instantly, shows *Not yet synced*, and appears on the **Sync** tab.
  Switch it off and watch the queue drain.
- **Projects → Oak Ridge → MSB** for a switchgear Final checklist.
- **Punch → Reinspect** for items a contractor says are done.

The browser demo (`npm run export:web`) is the same code, for a quick look; the
camera, haptics and SF Symbols only appear on the phone.

## How it works

Every write is an op (`src/lib/ops.ts`) written to an on-device outbox before
anything is sent. Screens render the last server snapshot with the outbox laid
on top, so nothing waits on the network and nothing is ever rolled back. The
sync loop sends ops in order when there is a signal, retries with backoff, and
the server de-duplicates by the op's client id.

- Session token: iOS Keychain (`expo-secure-store`, this device only).
- Queued photos: copied into the app's documents directory the moment they are
  taken, because until they sync they are the only copy.
- Outbox and cache are per user, so a shared iPad never shows one inspector's
  queued work to the next. Signing out keeps unsynced work for that inspector.

## Signing in for real

Needs the mobile API on the QC server — see `docs/FIELD_IOS_API.md` in the QC server repo (`cnealblack8191/qc`). Until it
exists, *Sign in* reports that the server does not offer it yet; use the demo.

## Shipping to inspectors

Builds are made in the cloud with EAS (`eas.json`): `preview` for internal
TestFlight-style installs, `production` for the App Store. Bundle id
`us.ecinc.qcfield`. Needs an Apple Developer account for ECI.

Over-the-air updates are **not enabled** yet. The constraints, risks and a
recommended setup are in `docs/FIELD_IOS_DECISIONS.md` in the QC server repo, with the other
decisions and open questions.

## Checks

```bash
npm run typecheck
npx expo-doctor
```
