import { Stack, useLocalSearchParams } from "expo-router";
import { memo, useRef, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/icon";
import { PhotoCapture } from "@/components/photo-capture";
import { Segmented } from "@/components/segmented";
import { SyncBanner } from "@/components/sync-status";
import { Button, Card, EmptyState, Field, Meta, Notice, PhotoStrip, Pill, ProgressBar, Row } from "@/components/ui";
import { haptic } from "@/lib/device";
import { equipmentType, gearPhase, reportStatus } from "@/lib/labels";
import { isReportEditable, reportGaps } from "@/lib/rules";
import { reportProgress } from "@/lib/select";
import { useField, useView } from "@/lib/store";
import { size, type, usePalette } from "@/lib/theme";
import type { AnswerStatus, ChecklistAnswer, Photo } from "@/lib/types";

const OPTIONS: { value: Exclude<AnswerStatus, "">; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "n/a", label: "N/A" }
];

export default function ReportScreen() {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const palette = usePalette();
  const view = useView();
  const { enqueue } = useField();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef(new Map<string, number>());
  const [filter, setFilter] = useState<"all" | "open">("all");
  const [notes, setNotes] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const report = view.reports.find((candidate) => candidate.id === reportId);
  if (!report) {
    return (
      <View style={{ flex: 1, padding: size.gutter, backgroundColor: palette.bg }}>
        <EmptyState message="It may have been reassigned. Go back and pull to refresh." title="Inspection not found" />
      </View>
    );
  }
  const gear = view.equipment.find((candidate) => candidate.id === report.equipmentId);
  const project = view.projects.find((candidate) => candidate.id === report.projectId);
  const progress = reportProgress(view, report.id);
  const editable = isReportEditable(report, view.user.id);
  const status = reportStatus[report.status];
  const openCount = progress.total - progress.answered;
  const flagged = report.answers.filter((item) => item.status === "no");
  const gaps = reportGaps(report);

  function answer(item: ChecklistAnswer, next: AnswerStatus, comments: string) {
    const result = enqueue({ kind: "report.answer", reportId: report!.id, answerId: item.id, status: next, comments });
    if (result) setProblem(result);
  }

  function jumpToNext() {
    const next = report!.answers.find((item) => !item.status);
    const y = next ? positions.current.get(next.id) : undefined;
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }

  function addPhotos(added: Photo[]) {
    for (const photo of added) {
      const result = enqueue({ kind: "report.photo", reportId: report!.id, photoUri: photo.uri, caption: "" });
      if (result) return setProblem(result);
    }
  }

  function submit() {
    const go = () => {
      const result = enqueue({ kind: "report.submit", reportId: report!.id });
      if (result) return setProblem(result);
      haptic.success();
    };
    const message = "You will not be able to edit after sending.";
    if (Platform.OS === "web") return go();
    Alert.alert("Send to the office?", message, [
      { text: "Keep working", style: "cancel" },
      { text: "Send", onPress: go }
    ]);
  }

  let lastSection = "";

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      ref={scroll}
      style={{ backgroundColor: palette.bg }}
    >
      <Stack.Screen options={{ title: gear?.tag ?? "Inspection" }} />
      <View style={styles.column}>
        <SyncBanner />
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={[type.caption, { color: palette.muted }]}>
              {equipmentType[gear?.type ?? "PANEL_BOARD"].toUpperCase()} · {gearPhase[report.gearPhase].toUpperCase()}
            </Text>
            <Pill label={status.label} tone={status.tone} />
          </Row>
          <Text style={[type.title, { color: palette.ink }]}>{gear?.tag}</Text>
          <Meta>{project?.name} · {gear?.location}</Meta>
          <ProgressBar value={progress.percent} />
          <Meta>{progress.answered} of {progress.total} answered · {report.photos.length} photo{report.photos.length === 1 ? "" : "s"}</Meta>
        </Card>

        {!editable ? (
          <Notice
            icon="info"
            message={report.inspectorId === view.user.id ? "This inspection has been sent to the office. You can review it here." : "This inspection is assigned to another inspector. You have view-only access."}
            tone="sent"
          />
        ) : null}
        {problem ? <Notice icon="warning" message={problem} tone="danger" /> : null}

        {report.openIssues.length ? (
          <Card style={{ borderColor: palette.danger }}>
            <Text style={[type.headline, { color: palette.danger }]}>Open issues from the office</Text>
            {report.openIssues.map((issue) => (
              <Text key={issue.id} style={[type.body, { color: palette.ink }]}>• {issue.description}</Text>
            ))}
          </Card>
        ) : null}

        <Card>
          <Field
            editable={editable}
            label="Jobsite notes (optional)"
            multiline
            onBlur={() => {
              if (notes !== null && notes !== report.notes) enqueue({ kind: "report.notes", reportId: report.id, notes });
            }}
            onChangeText={setNotes}
            placeholder="Overall conditions, coordination notes, follow-up needs…"
            value={notes ?? report.notes}
          />
        </Card>

        <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <Segmented
            onChange={setFilter}
            options={[
              { value: "all", label: `All ${progress.total}` },
              { value: "open", label: `Unanswered ${openCount}` }
            ]}
            value={filter}
          />
          {openCount && filter === "all" ? (
            <Button icon="arrowDown" label="Next unanswered" onPress={jumpToNext} variant="plain" />
          ) : null}
        </Row>

        {filter === "open" && !openCount ? (
          <EmptyState icon="checkCircle" message="Add photos, then send this inspection to the office." title="Every item is answered" />
        ) : null}

        {report.answers.map((item, index) => {
          if (filter === "open" && item.status) return null;
          const heading = item.section !== lastSection ? item.section : null;
          lastSection = item.section;
          return (
            <View key={item.id} onLayout={(event) => positions.current.set(item.id, event.nativeEvent.layout.y)}>
              {heading ? <Text accessibilityRole="header" style={[type.caption, styles.sectionHeading, { color: palette.muted }]}>{heading.toUpperCase()}</Text> : null}
              <AnswerRow editable={editable} index={index} item={item} onAnswer={answer} />
            </View>
          );
        })}

        <Card>
          <Text style={[type.headline, { color: palette.ink }]}>Field photos</Text>
          {report.photos.length ? <PhotoStrip photos={report.photos} /> : <Meta>No photos added yet.</Meta>}
          {editable ? <PhotoCapture onChange={(next) => addPhotos(next)} photos={[]} /> : null}
        </Card>

        {editable ? (
          <Card>
            <Text style={[type.headline, { color: palette.ink }]}>Ready to send to the office?</Text>
            <Meta>{progress.answered}/{progress.total} checklist items · {report.photos.length} photos</Meta>
            {flagged.length ? (
              <Notice
                icon="flag"
                message={`${flagged.length} answered No: ${flagged.map((item) => `#${report.answers.indexOf(item) + 1}`).join(", ")}. Check each has a comment the office can act on.`}
                tone="open"
              />
            ) : null}
            {gaps.unanswered || gaps.noReason ? (
              <Meta>
                Answer every item{gaps.noReason ? " and add a comment to each No" : ""} to send this to the office
                {" "}({[gaps.unanswered ? `${gaps.unanswered} unanswered` : "", gaps.noReason ? `${gaps.noReason} No without a comment` : ""].filter(Boolean).join(", ")}).
              </Meta>
            ) : (
              <Button icon="cloudUp" label="Send to office" large onPress={submit} />
            )}
          </Card>
        ) : null}
      </View>
    </ScrollView>
  );
}

/**
 * One checklist question: answer first, detail second. A No opens the
 * comment on its own, since a No without a reason is not actionable.
 */
const AnswerRow = memo(function AnswerRow({ item, index, editable, onAnswer }: {
  item: ChecklistAnswer;
  index: number;
  editable: boolean;
  onAnswer: (item: ChecklistAnswer, status: AnswerStatus, comments: string) => void;
}) {
  const palette = usePalette();
  const [comments, setComments] = useState(item.comments);
  const [showComment, setShowComment] = useState(Boolean(item.comments) || item.status === "no");

  const tones: Record<Exclude<AnswerStatus, "">, string> = { yes: palette.ok, no: palette.accent, "n/a": "#8a939c" };

  return (
    <View style={[styles.row, { backgroundColor: palette.surface, borderColor: item.status ? palette.line : palette.lineStrong }]}>
      <Row style={{ alignItems: "flex-start" }}>
        <Text style={[styles.number, { color: palette.muted }]}>{index + 1}</Text>
        <Text style={[type.body, { color: palette.ink, flex: 1 }]}>{item.prompt}</Text>
        {item.status ? <Icon color={tones[item.status]} name="checkCircle" size={20} /> : null}
        {!showComment && editable ? (
          <Pressable accessibilityLabel="Add a comment" accessibilityRole="button" hitSlop={8} onPress={() => setShowComment(true)} style={styles.noteToggle}>
            <Icon color={palette.muted} name="pencil" size={18} />
          </Pressable>
        ) : null}
      </Row>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {OPTIONS.map((option) => {
          const selected = item.status === option.value;
          return (
            <Pressable
              accessibilityLabel={`${option.label}: ${item.prompt}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: !editable }}
              disabled={!editable}
              key={option.value}
              onPress={() => {
                haptic.tap();
                const next = selected ? "" : option.value;
                if (next === "no") setShowComment(true);
                onAnswer(item, next, comments);
              }}
              style={[
                styles.option,
                selected
                  ? { backgroundColor: tones[option.value], borderColor: tones[option.value] }
                  : { backgroundColor: palette.surface, borderColor: palette.lineStrong }
              ]}
            >
              <Text style={[styles.optionText, { color: selected ? "#fff" : palette.ink }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {showComment ? (
        <Field
          editable={editable}
          label={item.status === "no" ? "What is wrong" : "Comment"}
          multiline
          onBlur={() => {
            if (comments !== item.comments) onAnswer(item, item.status, comments);
          }}
          onChangeText={setComments}
          value={comments}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  content: { padding: size.gutter, paddingBottom: 64 },
  column: { width: "100%", maxWidth: 760, alignSelf: "center", gap: 12 },
  sectionHeading: { marginTop: 10, marginBottom: 8 },
  row: { borderWidth: 1, borderRadius: size.radius, padding: 14, gap: 12, borderCurve: "continuous" },
  number: { width: 24, fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"], paddingTop: 2 },
  options: { flexDirection: "row", gap: 8 },
  option: { flex: 1, minHeight: size.tap + 4, borderWidth: 1.5, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  noteToggle: { width: size.tap, height: size.tap, marginTop: -10, marginRight: -10, alignItems: "center", justifyContent: "center" },
  optionText: { fontSize: 17, fontWeight: "800" }
});
