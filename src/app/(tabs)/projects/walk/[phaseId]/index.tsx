import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { PunchItemCard } from "@/components/punch-item-card";
import { Screen } from "@/components/screen";
import { Button, Card, EmptyState, Meta, Notice, Pill, ProgressBar, Row, SectionHeader } from "@/components/ui";
import { Segmented } from "@/components/segmented";
import { haptic } from "@/lib/device";
import { phaseStatus } from "@/lib/labels";
import { isUnresolved, phaseCounts, sheetProgress } from "@/lib/select";
import { useField, useView } from "@/lib/store";
import { type, usePalette } from "@/lib/theme";

type Filter = "open" | "all";

export default function WalkScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const palette = usePalette();
  const view = useView();
  const { enqueue } = useField();
  const [filter, setFilter] = useState<Filter>("open");
  const [notice, setNotice] = useState<string | null>(null);

  const phase = view.phases.find((candidate) => candidate.id === phaseId);
  if (!phase) {
    return (
      <Screen>
        <EmptyState message="The office may have removed it. Pull to refresh." title="Walk not found" />
      </Screen>
    );
  }
  const project = view.projects.find((candidate) => candidate.id === phase.projectId);
  const counts = phaseCounts(view, phase.id);
  const status = phaseStatus[phase.status];
  const isClosed = phase.status === "CLOSED";
  const items = view.items
    .filter((item) => item.phaseId === phase.id && item.status !== "VOID")
    .filter((item) => filter === "all" || isUnresolved(item))
    .sort((a, b) => b.number - a.number);

  const sheets = view.sheets.filter((sheet) => sheet.phaseId === phase.id);
  const pinTotals = sheets.reduce(
    (total, sheet) => {
      const progress = sheetProgress(view, sheet.id);
      return { checked: total.checked + progress.checked, total: total.total + progress.total };
    },
    { checked: 0, total: 0 }
  );

  function completeWalk() {
    const run = () => {
      const problem = enqueue({ kind: "phase.completeWalk", phaseId: phase!.id });
      if (problem) return setNotice(problem);
      haptic.success();
      setNotice("Walk marked complete. The office will review your items.");
    };
    const message = pinTotals.total && pinTotals.checked < pinTotals.total
      ? `${pinTotals.total - pinTotals.checked} pins are still unchecked. Mark the walk complete anyway?`
      : "The office will review the items you logged.";
    if (Platform.OS === "web") return run();
    Alert.alert("Mark walk complete?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Mark complete", onPress: run }
    ]);
  }

  return (
    <Screen
      footer={
        isClosed ? undefined : (
          <Button
            accessibilityHint="Opens the camera-first form for a new punch item"
            icon="camera"
            label="Log punch item"
            large
            onPress={() => router.push({ pathname: "/log-item", params: { phaseId: phase.id } })}
          />
        )
      }
    >
      <Stack.Screen options={{ title: phase.name }} />
      <Row style={{ flexWrap: "wrap" }}>
        <Pill label={status.label} tone={status.tone} />
        <Meta>{project?.name}</Meta>
      </Row>
      {notice ? <Notice icon="checkCircle" message={notice} tone="done" /> : null}

      {phase.hasDrawings ? (
        <Card
          accessibilityHint="Opens the drawing sheets to walk pin by pin"
          accessibilityLabel={`Drawings, ${pinTotals.checked} of ${pinTotals.total} pins checked`}
          onPress={() => router.push({ pathname: "/projects/walk/[phaseId]/drawings", params: { phaseId: phase.id } })}
        >
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={[type.headline, { color: palette.ink }]}>Walk the drawings</Text>
            <Text style={[type.headline, { color: palette.ink }]}>
              {pinTotals.checked}<Text style={{ color: palette.muted }}> / {pinTotals.total}</Text>
            </Text>
          </Row>
          <ProgressBar value={pinTotals.total ? pinTotals.checked / pinTotals.total : 0} />
          <Meta>{sheets.length} sheet{sheets.length === 1 ? "" : "s"} · tap a pin, then Pass, Punch or N/A</Meta>
        </Card>
      ) : null}

      {isClosed ? (
        <EmptyState icon="checkCircle" message={counts.total ? "Contact the office if more work is found here." : "Nothing was logged on this walk."} title="This phase is closed" />
      ) : null}

      <SectionHeader
        right={
          <Segmented
            onChange={setFilter}
            options={[
              { value: "open", label: `Open ${counts.open}` },
              { value: "all", label: `All ${counts.total}` }
            ]}
            value={filter}
          />
        }
        title="Punch items"
      />

      {items.length ? (
        items.map((item) => <PunchItemCard item={item} key={item.id} />)
      ) : (
        <EmptyState
          icon="punch"
          message={filter === "open" && counts.total ? "Every item on this walk is resolved." : "Use Log punch item below to record what needs correcting."}
          title={filter === "open" && counts.total ? "Nothing open" : "No items yet"}
        />
      )}

      {!isClosed && phase.status !== "WALK_COMPLETE" && counts.total ? (
        <View style={styles.complete}>
          <Button label="Mark walk complete" onPress={completeWalk} variant="secondary" />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  complete: { marginTop: 8 }
});
