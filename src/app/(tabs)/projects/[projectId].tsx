import { router, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Card, EmptyState, Meta, Pill, ProgressBar, Row, SectionHeader } from "@/components/ui";
import { equipmentType, gearPhase, phaseStatus, reportStatus } from "@/lib/labels";
import { phaseCounts, reportProgress } from "@/lib/select";
import { useView } from "@/lib/store";
import { type, usePalette } from "@/lib/theme";

export default function ProjectScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const palette = usePalette();
  const view = useView();
  const project = view.projects.find((candidate) => candidate.id === projectId);

  if (!project) {
    return (
      <Screen>
        <EmptyState message="It may have been unassigned. Pull to refresh." title="Project not found" />
      </Screen>
    );
  }

  const phases = view.phases.filter((phase) => phase.projectId === project.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const reports = view.reports.filter((report) => report.projectId === project.id);
  const openTotal = phases.reduce((total, phase) => total + phaseCounts(view, phase.id).open, 0);

  return (
    <Screen>
      <Stack.Screen options={{ title: project.name }} />
      <Meta>{project.jobNumber} · {project.address}</Meta>

      <SectionHeader detail="Walk a phase to log and verify punch items." right={<Pill label={`${openTotal} open`} tone={openTotal ? "open" : "done"} />} title="Punch walks" />
      <Card style={{ paddingVertical: 4 }}>
        {phases.map((phase, index) => {
          const counts = phaseCounts(view, phase.id);
          const status = phaseStatus[phase.status];
          return (
            <View key={phase.id}>
              {index ? <View style={[styles.divider, { backgroundColor: palette.line }]} /> : null}
              <Card
                accessibilityLabel={`${phase.name}, ${status.label}, ${counts.open} open`}
                onPress={() => router.push({ pathname: "/projects/walk/[phaseId]", params: { phaseId: phase.id } })}
                style={styles.row}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Row>
                    <Text style={[type.headline, { color: palette.ink }]}>{phase.name}</Text>
                    {phase.hasDrawings ? <Icon color={palette.muted} name="drawing" size={16} /> : null}
                  </Row>
                  <Meta>
                    {status.label}
                    {counts.total ? ` · ${counts.total} logged · ${counts.verified} verified` : ""}
                  </Meta>
                </View>
                {counts.open ? <Pill label={`${counts.open} open`} tone="open" /> : null}
                <Icon color={palette.muted} name="chevron" size={16} />
              </Card>
            </View>
          );
        })}
      </Card>

      <SectionHeader detail="Gear checklists assigned to you on this project." title="Equipment" />
      {reports.length ? (
        reports.map((report) => {
          const gear = view.equipment.find((candidate) => candidate.id === report.equipmentId);
          const progress = reportProgress(view, report.id);
          const status = reportStatus[report.status];
          return (
            <Card
              accessibilityLabel={`${gear?.tag}, ${equipmentType[gear?.type ?? "PANEL_BOARD"]}, ${status.label}, ${progress.answered} of ${progress.total} answered`}
              key={report.id}
              onPress={() => router.push({ pathname: "/projects/report/[reportId]", params: { reportId: report.id } })}
            >
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={[type.caption, { color: palette.muted }]}>
                  {equipmentType[gear?.type ?? "PANEL_BOARD"].toUpperCase()} · {gearPhase[report.gearPhase].toUpperCase()}
                </Text>
                <Pill label={status.label} tone={status.tone} />
              </Row>
              <Row>
                <Icon color={palette.accent} name="gear" size={18} />
                <Text style={[type.headline, { color: palette.ink, fontSize: 19 }]}>{gear?.tag}</Text>
              </Row>
              <Meta>{gear?.location}</Meta>
              <ProgressBar value={progress.percent} />
              <Row style={{ justifyContent: "space-between" }}>
                <Meta>{progress.answered} of {progress.total} answered</Meta>
                {report.openIssues.length ? <Pill label={`${report.openIssues.length} office issue`} tone="danger" /> : null}
              </Row>
            </Card>
          );
        })
      ) : (
        <EmptyState icon="gear" message="The office assigns equipment inspections." title="No inspections assigned" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 0, paddingHorizontal: 0, paddingVertical: 12 },
  divider: { height: StyleSheet.hairlineWidth }
});
