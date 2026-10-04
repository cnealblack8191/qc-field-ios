# Testing and launching ECI Field QC on iOS

What the app does at launch: per project, **log a punch item** and do **gear
inspections** (ECI decision 2026-10-04). Drawing-pin walks and reinspection
stay on the web field app.

## 1. Test on your iPhone today: demo, no Apple account needed

1. On the iPhone, install **Expo Go** from the App Store.
2. On the Windows computer (Node 22):
   ```powershell
   git clone https://github.com/cnealblack8191/qc-field-ios
   cd qc-field-ios
   npm install
   npx expo start --tunnel
   ```
3. Scan the QR code with the iPhone camera. The app opens in Expo Go.
4. Tap **Explore the demo**. The sample data lives only on the phone. Then try
   each of these:
   - **Projects, Oak Ridge Elementary, Log a punch item:** take a photo, add a
     location and description, and save.
   - **Projects, Oak Ridge Elementary, MSB:** answer the switchgear checklist,
     including a **No** with a comment.
   - **Account, Simulate no signal:** log an item, and see it on the **Sync**
     tab. Switch it off and watch it send.

Expo Go can't test Face ID or over-the-air updates. Those need the TestFlight
build in step 3.

## 2. Test against the real server

The app signs in to `https://qcfield.ecinc.us`. That needs the QC server
release that includes the mobile API (`/api/field/v1`, migration 018) and the
photo fix from October 4, 2026. Until it is deployed, **Sign in** says the
server doesn't offer the mobile API yet.

After deploying, sign in in Expo Go with an **inspector** account that is
assigned to a project. Office accounts are refused by design. Then:

1. Log a punch item with a photo from the camera, and one from the library.
2. Answer a gear checklist and send it to the office.
3. Confirm both arrive in the office web app, with their photos.

## 3. TestFlight: the real app on real phones, before Apple review

This needs an **Apple Developer Program** membership for ECI. Enrol as an
organisation, which needs a D-U-N-S number; it costs $99 a year.

```powershell
npm install -g eas-cli
eas login                      # ECI's Expo account
eas init                       # links the project; adds extra.eas.projectId
eas update:configure           # adds updates.url for over-the-air updates
eas build -p ios --profile production
eas submit -p ios --latest     # uploads to App Store Connect
```

Then in **App Store Connect, TestFlight**:

1. Add ECI staff as **internal testers**. Up to 100 people, and no Apple
   review is needed.
2. Each tester installs **TestFlight** from the App Store and accepts the
   invite.

Test Face ID, a shared phone, and no-signal use in a basement on this build.

Over-the-air update **signing** was required by ECI's decision of 2026-09-25.
It needs Expo's Production plan, and should be set up before this first store
build (see "Signing updates" in the QC repo's `docs/FIELD_IOS_DECISIONS.md`).

## 4. Submitting to Apple

### Choose how it is distributed

This is an internal tool for ECI's inspectors. Apple often rejects
single-company apps on the public App Store (guideline 3.2). Two routes avoid
that:

- **Custom App through Apple Business Manager (recommended).** The app is
  private to ECI, and phones get it from ABM or your device management.
- **Unlisted App.** It's on the App Store but only reachable by direct link.
  Request it from Apple.

### App Store Connect checklist

- **Privacy Policy URL:** `https://qc.ecinc.us/privacy`. It is served by the QC
  server and is also linked inside the app (sign-in and Account). ECI should
  review the wording.
- **App Privacy** answers:
  - **Collected and linked to the user, for app functionality:** Name, Email
    Address, Photos, and Other User Content (inspection answers, notes and
    punch items).
  - **Tracking:** none.
- **Export compliance:** the app uses only standard HTTPS. This is already
  declared in `app.json` (`usesNonExemptEncryption: false`).
- **Screenshots:** iPhone 6.9" and iPad 13". iPad screenshots are needed
  because the app supports iPad.
- **Category:** Business. **Age rating:** 4+.

### App Review information

Give the reviewer:

- **A working account:** an inspector account on the production server,
  assigned to a sample project with at least one gear inspection and one open
  phase.
- **These notes:**
  > ECI Field QC is an internal tool for ECI's electrical inspectors. Accounts
  > are created by ECI, so there is no sign-up and no account deletion in the
  > app. Sign in with the account above, or tap "Explore the demo" on the
  > sign-in screen for sample data stored only on the device. Per project the
  > app offers two things: "Log a punch item" (photo, location, description)
  > and the gear inspection checklists assigned to the inspector.

## Before the first store build

- [ ] Deploy the QC server release with the mobile API and the October 4 photo
      fix.
- [ ] Create the App Review inspector account and its sample project.
- [ ] Have ECI review `/privacy`.
- [ ] Run `eas init` and `eas update:configure`, and set up update signing
      (section 3).
- [ ] TestFlight round with 2–3 inspectors: camera and library photos,
      checklists, no signal, Face ID, shared phone.
- [ ] Choose the distribution route (section 4).

## Still in the code, not reachable

The punch walk, drawing walk, sheet viewer, item detail and Punch tab screens
were unlinked on 2026-10-04 but not deleted, so the change is easy to undo.
Nothing in the app opens them. Delete them, or redirect their routes to
`/projects`, once the scope is settled.
