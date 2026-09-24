import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Button, Card, EmptyState, Meta, Notice, Row } from "@/components/ui";
import { relativeTime } from "@/lib/labels";
import { describeOp } from "@/lib/ops";
import { useField, useView } from "@/lib/store";
import { type, usePalette } from "@/lib/theme";

/**
 * What is on this device and not yet on the server. The inspector can always
 * see the exact list — "Not yet synced" is a fact to show, not a spinner.
 */
export default function SyncScreen() {
  const palette = usePalette();
  const view = useView();
  const { outbox, online, syncState, lastSyncedAt, syncNow, dismiss, pendingCount } = useField();

  const headline = syncState === "auth"
    ? "Sign in again to sync"
    : !online
      ? "Offline"
      : syncState === "syncing"
        ? "Syncing…"
        : pendingCount
          ? "Waiting to retry"
          : "Everything is synced";

  return (
    <Screen>
      <Card>
        <Row>
          <Icon color={!online || pendingCount ? palette.warning : palette.ok} name={!online ? "cloudOff" : pendingCount ? "cloudUp" : "cloudOk"} size={28} />
          <View style={{ flex: 1 }}>
            <Text style={[type.headline, { color: palette.ink }]}>{headline}</Text>
            <Meta>Last synced {relativeTime(lastSyncedAt)}</Meta>
          </View>
        </Row>
        <Meta>
          {pendingCount
            ? `${pendingCount} change${pendingCount === 1 ? " is" : "s are"} saved on this device${online ? "" : " and will send when you have a signal"}.`
            : "All of your work is on the server."}
        </Meta>
        <Button disabled={!online || syncState === "syncing"} icon="sync" label="Sync now" loading={syncState === "syncing"} onPress={() => void syncNow()} variant="secondary" />
      </Card>

      {outbox.length ? (
        outbox.map((entry) => (
          <Card key={entry.op.id} style={entry.rejected ? { borderColor: palette.danger } : undefined}>
            <Row style={{ justifyContent: "space-between" }}>
              <Text style={[type.headline, { color: palette.ink, flex: 1 }]}>{describeOp(entry.op, view)}</Text>
              <Icon color={entry.rejected ? palette.danger : palette.warning} name={entry.rejected ? "warning" : "cloudUp"} size={18} />
            </Row>
            <Meta>Saved {relativeTime(entry.op.createdAt)}{entry.attempts ? ` · ${entry.attempts} attempt${entry.attempts === 1 ? "" : "s"}` : ""}</Meta>
            {entry.rejected ? (
              <>
                <Notice icon="warning" message={`The server refused this: ${entry.rejected}`} tone="danger" />
                <Button label="Dismiss" onPress={() => dismiss(entry.op.id)} variant="destructive" />
              </>
            ) : entry.lastError ? (
              <Text style={[type.footnote, styles.error, { color: palette.muted }]}>Last try: {entry.lastError}</Text>
            ) : null}
          </Card>
        ))
      ) : (
        <EmptyState icon="cloudOk" message="Anything you record while offline appears here until it reaches the server." title="Nothing waiting" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ error: { fontWeight: "400" } });
