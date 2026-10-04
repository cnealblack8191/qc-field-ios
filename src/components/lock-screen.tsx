import { Image } from "expo-image";
import { useEffect } from "react";
import { Modal, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLock } from "@/lib/lock";
import { useField } from "@/lib/store";
import { size, type, usePalette } from "@/lib/theme";
import { Button } from "./ui";

/** Covers the app until Face ID (or the passcode) says it is this inspector. */
export function LockScreen() {
  const palette = usePalette();
  const { locked, unlock, kind } = useLock();
  const { session, pendingCount, signOut } = useField();

  // Ask straight away; the button is there for a second try.
  useEffect(() => {
    if (locked) void unlock();
  }, [locked, unlock]);

  if (!locked) return null;

  // A native full-screen modal, so the cover sits above everything,
  // including a form already open as a modal (Log punch item).
  return (
    <Modal animationType="none" onRequestClose={() => undefined} presentationStyle="fullScreen" visible>
    <View style={[styles.cover, { backgroundColor: palette.brand }]}>
      <SafeAreaView style={styles.content}>
        <Image accessibilityIgnoresInvertColors source={require("../../assets/icon.png")} style={styles.logo} />
        <Text accessibilityRole="header" style={[type.title, { color: "#fff" }]}>ECI Field QC</Text>
        <Text style={[type.callout, { color: "#9aa4af", textAlign: "center" }]}>
          {session?.user.name}
          {pendingCount ? ` · ${pendingCount} change${pendingCount === 1 ? "" : "s"} waiting to sync` : ""}
        </Text>
        <View style={styles.actions}>
          <Button label={`Unlock with ${kind}`} large onPress={() => void unlock()} />
          <Button
            accessibilityHint="Signs out on this phone. Unsynced work is kept and sends after you sign in."
            label="Use password instead"
            onPress={() => void signOut()}
            variant="inverse"
          />
        </View>
      </SafeAreaView>
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cover: { flex: 1 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: size.gutter },
  logo: { width: 96, height: 96, borderRadius: 22 },
  actions: { alignSelf: "stretch", maxWidth: 420, width: "100%", marginTop: 24, gap: 12, alignItems: "stretch" }
});
