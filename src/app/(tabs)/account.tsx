import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { Alert, Platform, Switch, Text, View } from "react-native";
import { AppUpdate } from "@/components/app-update";
import { Screen } from "@/components/screen";
import { Button, Card, Meta, Notice, Row } from "@/components/ui";
import { openPrivacyPolicy } from "@/lib/links";
import { useLock } from "@/lib/lock";
import { useField, useView } from "@/lib/store";
import { type, usePalette } from "@/lib/theme";

export default function AccountScreen() {
  const palette = usePalette();
  const view = useView();
  const { session, pendingCount, signOut, simulateOffline, setSimulateOffline, resetDemo, syncState } = useField();
  const lock = useLock();
  const isDemo = session?.mode === "demo";
  const expires = session?.expiresAt ? new Date(session.expiresAt) : null;

  function confirmSignOut() {
    const message = pendingCount
      ? `${pendingCount} change${pendingCount === 1 ? " has" : "s have"} not synced yet. They stay on this device and sync the next time you sign in${session?.shared ? " on this phone" : ""}.`
      : "You will need your password to sign in again.";
    if (Platform.OS === "web") return void signOut();
    Alert.alert("Sign out?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void signOut() }
    ]);
  }

  return (
    <Screen refreshable={false}>
      <Card>
        <Text style={[type.title, { color: palette.ink }]}>{view.user.name}</Text>
        <Meta>{view.user.email}</Meta>
        <Meta>{view.user.role === "INSPECTOR" ? "Inspector" : "Office"} · {isDemo ? "Demo data on this device" : session?.serverUrl}</Meta>
        {expires ? (
          <Meta>
            {session?.shared
              ? `Shared phone: signs out at ${expires.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
              : `Signed in on this phone until ${expires.toLocaleDateString()}.`}
          </Meta>
        ) : null}
      </Card>

      {syncState === "auth" ? (
        <Card>
          <Text style={[type.headline, { color: palette.ink }]}>Sign in again to sync</Text>
          <Meta>
            Your sign-in on this phone has ended{expires && expires.getTime() <= Date.now() && !session?.shared ? " (45 days are up)" : ""}. Everything you
            recorded is kept and sends as soon as you sign in.
          </Meta>
          <Button label="Sign in again" onPress={() => void signOut()} />
        </Card>
      ) : null}

      {lock.available ? (
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: palette.ink }]}>Unlock with {lock.kind}</Text>
              <Meta>Asked when the app opens, and after 15 minutes away. Your face never leaves this phone.</Meta>
            </View>
            <Switch
              accessibilityLabel={`Unlock with ${lock.kind}`}
              onValueChange={(value) => void lock.setEnabled(value)}
              trackColor={{ true: palette.ok, false: palette.lineStrong }}
              value={lock.enabled}
            />
          </Row>
        </Card>
      ) : null}

      {isDemo ? (
        <Card>
          <Text style={[type.headline, { color: palette.ink }]}>Demo tools</Text>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: palette.ink }]}>Simulate no signal</Text>
              <Meta>Log items and answer checklists, watch them queue, then switch this off to sync.</Meta>
            </View>
            <Switch
              accessibilityLabel="Simulate no signal"
              onValueChange={setSimulateOffline}
              trackColor={{ true: palette.warning, false: palette.lineStrong }}
              value={simulateOffline}
            />
          </Row>
          <Button label="Reset demo data" onPress={() => void resetDemo()} variant="secondary" />
        </Card>
      ) : null}

      {pendingCount ? <Notice icon="cloudUp" message={`${pendingCount} change${pendingCount === 1 ? "" : "s"} waiting to sync.`} tone="open" /> : null}
      <Button label="Sign out" onPress={confirmSignOut} variant="destructive" />
      <Button accessibilityHint="Opens in Safari" label="Privacy policy" onPress={openPrivacyPolicy} variant="plain" />
      <Meta>
        ECI Field QC {Constants.expoConfig?.version ?? ""} · Drawing walks and reinspection are on the web field app.
      </Meta>
      {/* Off in Expo Go, the web preview and development builds. */}
      {Updates.isEnabled ? <AppUpdate /> : null}
    </Screen>
  );
}
