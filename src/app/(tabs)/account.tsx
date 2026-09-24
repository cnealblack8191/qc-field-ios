import Constants from "expo-constants";
import { Alert, Platform, Switch, Text, View } from "react-native";
import { Screen } from "@/components/screen";
import { Button, Card, Meta, Notice, Row } from "@/components/ui";
import { useField, useView } from "@/lib/store";
import { type, usePalette } from "@/lib/theme";

export default function AccountScreen() {
  const palette = usePalette();
  const view = useView();
  const { session, pendingCount, signOut, simulateOffline, setSimulateOffline, resetDemo } = useField();
  const isDemo = session?.mode === "demo";

  function confirmSignOut() {
    const message = pendingCount
      ? `${pendingCount} change${pendingCount === 1 ? " has" : "s have"} not synced yet. They stay on this device and sync the next time you sign in.`
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
      </Card>

      {isDemo ? (
        <Card>
          <Text style={[type.headline, { color: palette.ink }]}>Demo tools</Text>
          <Row style={{ justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: palette.ink }]}>Simulate no signal</Text>
              <Meta>Record pins and items, watch them queue, then switch this off to sync.</Meta>
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
      <Meta>
        ECI Field QC {Constants.expoConfig?.version ?? ""} · Placing and scanning pins is done in the office app.
      </Meta>
    </Screen>
  );
}
