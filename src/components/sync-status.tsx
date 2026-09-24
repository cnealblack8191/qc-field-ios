import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { relativeTime } from "@/lib/labels";
import { useField } from "@/lib/store";
import { type, usePalette } from "@/lib/theme";
import { Icon } from "./icon";

/**
 * Save and sync state, always visible. An inspector must never wonder whether
 * a result was kept: "Saved on this device" is as definite as "Synced".
 */
export function SyncButton() {
  const palette = usePalette();
  const { pendingCount, rejectedCount, online, syncState } = useField();
  const problem = rejectedCount > 0 || syncState === "auth";
  const icon = problem ? "warning" : !online ? "cloudOff" : pendingCount ? "cloudUp" : "cloudOk";
  const color = problem ? palette.danger : !online || pendingCount ? palette.warning : palette.ok;
  const label = problem
    ? `${rejectedCount || "Sign-in"} needs attention`
    : !online
      ? pendingCount ? `Offline, ${pendingCount} waiting to sync` : "Offline"
      : pendingCount ? `${pendingCount} syncing` : "All synced";

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => router.navigate("/sync")}
      style={styles.button}
    >
      <Icon color={color} name={icon} size={22} />
      {pendingCount || rejectedCount ? (
        <Text style={[styles.count, { color }]}>{rejectedCount || pendingCount}</Text>
      ) : null}
    </Pressable>
  );
}

export function SyncBanner() {
  const palette = usePalette();
  const { online, pendingCount, lastSyncedAt, syncState } = useField();
  if (syncState === "auth") {
    return (
      <Pressable accessibilityRole="button" onPress={() => router.navigate("/account")} style={[styles.banner, { backgroundColor: palette.dangerSoft }]}>
        <Icon color={palette.danger} name="warning" size={18} />
        <Text style={[type.subhead, { color: palette.danger, flex: 1 }]}>Your session ended. Sign in again to sync — your work is kept.</Text>
      </Pressable>
    );
  }
  if (online) return null;
  return (
    <View accessibilityLiveRegion="polite" style={[styles.banner, { backgroundColor: palette.warningSoft }]}>
      <Icon color={palette.warning} name="cloudOff" size={18} />
      <Text style={[type.subhead, { color: palette.warning, flex: 1 }]}>
        No signal. Keep working — {pendingCount ? `${pendingCount} change${pendingCount === 1 ? "" : "s"} saved on this device` : "changes save on this device"} and sync when you are back in coverage. Last synced {relativeTime(lastSyncedAt)}.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 44, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 6 },
  count: { fontSize: 15, fontWeight: "800" },
  banner: { flexDirection: "row", gap: 10, alignItems: "center", padding: 12, borderRadius: 10 }
});
