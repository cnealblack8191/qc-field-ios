import type { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useState } from "react";
import { useField } from "@/lib/store";
import { size, usePalette } from "@/lib/theme";
import { SyncBanner } from "./sync-status";
import { Notice } from "./ui";

/**
 * The scroll container every list screen uses: large-title aware, pull to
 * refresh (which also drains the outbox), content capped at a readable width
 * on an iPad, and the offline banner on top when there is no signal.
 */
export function Screen({ children, refreshable = true, footer }: { children: ReactNode; refreshable?: boolean; footer?: ReactNode }) {
  const palette = usePalette();
  const { syncNow, session } = useField();
  const [refreshing, setRefreshing] = useState(false);

  const scroll = (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        refreshable ? (
          <RefreshControl
            onRefresh={async () => {
              setRefreshing(true);
              await syncNow().finally(() => setRefreshing(false));
            }}
            refreshing={refreshing}
            tintColor={palette.muted}
          />
        ) : undefined
      }
      style={{ backgroundColor: palette.bg }}
    >
      <View style={styles.column}>
        {session?.mode === "demo" ? (
          // On every screen, so nobody, App Review included, mistakes sample
          // data for a real job.
          <Notice icon="info" message="Demo: sample data on this phone only. Nothing is sent to ECI." tone="review" />
        ) : null}
        <SyncBanner />
        {children}
      </View>
    </ScrollView>
  );
  if (!footer) return scroll;
  // A footer holds the screen's primary action in the thumb zone, above the
  // tab bar, so it is reachable one-handed however far the list scrolls.
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      {scroll}
      <View style={[styles.footer, { backgroundColor: palette.surface, borderTopColor: palette.line }]}>
        <View style={styles.column}>{footer}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: size.gutter, paddingBottom: 48 },
  footer: { paddingHorizontal: size.gutter, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  column: { width: "100%", maxWidth: 760, alignSelf: "center", gap: 14 }
});
