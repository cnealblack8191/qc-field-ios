import { router, Stack, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Button, Card, EmptyState, Meta, Notice, Pill, ProgressBar, Row, SectionHeader } from "@/components/ui";
import { equipmentType, gearPhase, reportStatus } from "@/lib/labels";
import { reportProgress } from "@/lib/select";
import { useField, useView } from "@/lib/store";
import { type, usePalette } from "@/lib/theme";

/**
 * A project offers two things in the field, by ECI's decision (2026-10-04):
 * log a punch item, and inspect the gear assigned to you. Drawing-pin walks
 * and reinspection are done on the web field app, not here.
 */
export default function ProjectScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const palette = usePalette();
  const view = useView();
  // Every hook before the early return below: a project unassigned while
  // this screen is open must not change the number of hooks run.
  const { pendingCount } = useField();
  const project = view.projects.find((candidate) => candidate.id === projectId);

  if (!project) {
    return (
      <Screen>
        <EmptyState message="It may have been unassigned. Pull to refresh." title="Project not found" />
      </Screen>
    );
  }

  const openPhases = view.phases.filter((phase) => phase.projectId === project.id && phase.status !== "CLOSED");
  const projectPhaseIds = new Set(view.phases.filter((phase) => phase.projectId === project.id).map((phase) => phase.id));
  const mine = view.items.filter((item) => projectPhaseIds.has(item.phaseId) && item.createdById === view.user.id && item.status !== "VOID");
  const reports = view.reports.filter((report) => report.projectId === project.id);

  return (
    <Screen>
      <Stack.Screen options={{ title: project.name }} />
      <Meta>{project.jobNumber} · {project.address}</Meta>

      <SectionHeader
        detail={mine.length ? `${mine.length} logged by you on this project${pendingCount ? "; unsent changes are on the Sync tab" : ""}.` : "Photo first, then where and what."}
        title="Punch items"
      />
      {openPhases.length ? (
        <Button
          accessibilityHint="Opens the camera-first form for a new punch item"
          icon="camera"
          label="Log a punch item"
          large
          onPress={() => router.push({ pathname: "/log-item", params: { projectId: project.id } })}
        />
      ) : (
        <Notice icon="checkCircle" message="The office has closed every phase on this project. Contact the office if more work is found." tone="done" />
      )}

      <SectionHeader detail="Gear checklists assigned to you on this project." title="Gear inspections" />
      {reports.length ? (
        reports.map((report) => {
          const gear = view.equipment.find((candidate) => candidate.id === report.equipmentId);
          const progress = reportProgress(view, report.id);
          const status = reportStatus[report.status] ?? { label: String(report.status), tone: "neutral" as const };
          return (
            <Card
              accessibilityLabel={`${gear?.tag ?? "Equipment"}, ${equipmentType[gear?.type ?? "PANEL_BOARD"] ?? "Equipment"}, ${status.label}, ${progress.answered} of ${progress.total} answered`}
              key={report.id}
              onPress={() => router.push({ pathname: "/projects/report/[reportId]", params: { reportId: report.id } })}
            >
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={[type.caption, { color: palette.muted }]}>
                  {(equipmentType[gear?.type ?? "PANEL_BOARD"] ?? "Equipment").toUpperCase()} · {(gearPhase[report.gearPhase] ?? String(report.gearPhase)).toUpperCase()}
                </Text>
                <Pill label={status.label} tone={status.tone} />
              </Row>
              <Row>
                <Icon color={palette.accent} name="gear" size={18} />
                <Text style={[type.headline, { color: palette.ink, fontSize: 19 }]}>{gear?.tag ?? "Equipment"}</Text>
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

