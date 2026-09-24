import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Icon } from "@/components/icon";
import { Screen } from "@/components/screen";
import { Card, EmptyState, Meta, Notice, Pill, ProgressBar, Row } from "@/components/ui";
import { sheetProgress } from "@/lib/select";
import { useView } from "@/lib/store";
import { type, usePalette } from "@/lib/theme";

/**
 * Every sheet on the walk and how far each is walked. Like the web screen,
 * this never calls a walk complete while findings logged without a pin are
 * outstanding: those are on no sheet, so no pin count includes them.
 */
export default function DrawingsScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const palette = usePalette();
  const view = useView();
  const sheets = view.sheets.filter((sheet) => sheet.phaseId === phaseId);
  const totals = sheets.reduce(
    (sum, sheet) => {
      const progress = sheetProgress(view, sheet.id);
      return { checked: sum.checked + progress.checked, total: sum.total + progress.total, punch: sum.punch + progress.punch };
    },
    { checked: 0, total: 0, punch: 0 }
  );
  const unpinned = view.items.filter(
    (item) => item.phaseId === phaseId && !item.annotationId && item.status !== "VOID" && item.status !== "VERIFIED"
  );
  const pinsDone = totals.total > 0 && totals.checked === totals.total;

  return (
    <Screen>
      {sheets.length ? (
        <Card>
          <Row style={{ justifyContent: "space-between" }}>
            <Text style={[type.title, { color: palette.ink }]}>
              {totals.checked}
              <Text style={{ color: palette.muted }}> / {totals.total}</Text>
            </Text>
            <Row>
              {totals.punch ? <Pill label={`${totals.punch} punch`} tone="danger" /> : null}
              {pinsDone && !unpinned.length ? <Pill label="Walk complete" tone="done" /> : null}
            </Row>
          </Row>
          <Meta>pins checked across {sheets.length} sheet{sheets.length === 1 ? "" : "s"}</Meta>
        </Card>
      ) : null}

      {unpinned.length ? (
        <Notice
          icon="info"
          message={`${unpinned.length} finding${unpinned.length === 1 ? " on this walk is" : "s on this walk are"} not on a drawing, so no sheet counts ${unpinned.length === 1 ? "it" : "them"}.`}
          tone="sent"
        />
      ) : null}

      {sheets.length ? (
        sheets.map((sheet) => {
          const progress = sheetProgress(view, sheet.id);
          return (
            <Card
              accessibilityLabel={`${sheet.sheetNumber} ${sheet.title}, ${progress.checked} of ${progress.total} checked`}
              key={sheet.id}
              onPress={() => router.push({ pathname: "/sheet/[sheetId]", params: { sheetId: sheet.id } })}
            >
              <Row style={{ justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.headline, { color: palette.ink }]}>{sheet.sheetNumber} · {sheet.title}</Text>
                  <Meta>Rev {sheet.revision}</Meta>
                </View>
                <Icon color={palette.muted} name="chevron" size={16} />
              </Row>
              <ProgressBar tone={progress.punch ? "punch" : "done"} value={progress.total ? progress.checked / progress.total : 0} />
              <Meta>
                {progress.total ? `${progress.checked} / ${progress.total} checked` : "No pins yet"}
                {progress.punch ? ` · ${progress.punch} punch` : ""}
              </Meta>
            </Card>
          );
        })
      ) : (
        <EmptyState icon="drawing" message="The office publishes the sheets for this walk. Log what you find from the walk screen in the meantime." title="No drawings published yet" />
      )}
    </Screen>
  );
}
