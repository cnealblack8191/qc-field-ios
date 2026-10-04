# ECI Field QC — iOS

The native iOS app for ECI field inspectors. Per project it offers two things:
log a punch item, and the gear inspection checklists assigned to the
inspector. It is built to keep working with no signal. Testing and App Store
steps are in [LAUNCH.md](LAUNCH.md). Expo (SDK 57) + React Native + TypeScript, Expo Router.

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

- **Projects → Oak Ridge Elementary → Log a punch item.** Photo first, then
  where and what.
- **Account → Simulate no signal**, then log items or answer checklists. Everything
  saves instantly, shows *Not yet synced*, and appears on the **Sync** tab.
  Switch it off and watch the queue drain.
- **Projects → Oak Ridge → MSB** for a switchgear Final checklist.

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

Inspectors sign in with their normal QC email and password. The phone stays
signed in for 45 days; after the first sign-in the app offers Face ID, which is
asked when the app opens and after 15 minutes away. The office can sign a phone
out from Settings → Signed-in phones. The server side is `docs/FIELD_IOS_API.md`
in the QC repo (`cnealblack8191/qc`); until it is deployed, *Sign in* reports
that the server does not offer it yet.

A phone passed between inspectors is uncommon but allowed: ticking **Shared
phone** at sign-in gets a 12-hour sign-in from the server, no Face ID, and an
automatic sign-out when the 12 hours are up. The phone remembers the setting for
the next person. Unsynced work stays on the phone under its owner.

## Shipping to inspectors

Builds are made in the cloud with EAS (`eas.json`): `preview` for internal
TestFlight-style installs, `production` for the App Store. Bundle id
`us.ecinc.qcfield`. Needs an Apple Developer account for ECI.

### Over-the-air updates

Approved by ECI (2026-09-25) and configured (`expo-updates`): screens, wording
and logic can reach installed phones without a new App Store version. Anything
native (a permission, a native library, the icon, an Expo SDK upgrade) still
needs a store build.

- `runtimeVersion` uses the `fingerprint` policy, so an update only reaches
  builds whose native code matches it.
- Checked when the app opens, downloaded in the background, used from the next
  launch (`fallbackToCacheTimeout: 0`): a walk is never interrupted and no
  signal never delays opening. Account shows "Restart to update", disabled while
  changes are sending, and the running update's id for support.
- Channels: `preview` (internal testers) and `production` (App Store), set per
  build profile in `eas.json`. Publish to testers first:

  ```bash
  eas update --channel preview --message "What changed"
  eas update --channel production --message "What changed" --rollout-percentage 10
  ```

- Still to do before the first store build, needing ECI's accounts: `eas init`
  (links the Expo project and adds the update URL) and **code signing**, so a
  phone rejects any update not signed with ECI's key. See "Signing updates"
  in `docs/FIELD_IOS_DECISIONS.md` in the QC repo.

Rules for every update: only additive changes to the stored outbox and snapshot,
and the server keeps accepting older op shapes, because phones offline for days
run older versions.

## Checks

```bash
npm run typecheck
npx expo-doctor
```
