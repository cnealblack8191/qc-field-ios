import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, EmptyState, Field, Meta, Notice, Pill, Row } from "@/components/ui";
import { haptic } from "@/lib/device";
import { punchStatus } from "@/lib/labels";
import { canEditItem, canVerifyItem } from "@/lib/rules";
import { useField, useView } from "@/lib/store";
import { size, type, usePalette } from "@/lib/theme";

export default function PunchItemScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const palette = usePalette();
  const view = useView();
  const { enqueue } = useField();
  const item = view.items.find((candidate) => candidate.id === itemId);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    location: item?.location ?? "",
    description: item?.description ?? "",
    responsibleParty: item?.responsibleParty ?? ""
  });
  const [reason, setReason] = useState("");

  if (!item) {
    return (
      <View style={[styles.fill, { backgroundColor: palette.bg, padding: size.gutter }]}>
        <EmptyState message="It may have been removed by the office." title="Item not found" />
      </View>
    );
  }

  const phase = view.phases.find((candidate) => candidate.id === item.phaseId);
  const project = view.projects.find((candidate) => candidate.id === phase?.projectId);
  const equipment = item.equipmentId ? view.equipment.find((candidate) => candidate.id === item.equipmentId) : null;
  const pin = item.annotationId ? view.pins.find((candidate) => candidate.id === item.annotationId) : null;
  const status = punchStatus[item.status];
  const editable = canEditItem(item, phase, view.user.id);
  const verifiable = canVerifyItem(item, phase);

  function run(result: string | null, onDone?: () => void) {
    if (result) {
      haptic.warning();
      setProblem(result);
      return;
    }
    haptic.success();
    setProblem(null);
    onDone?.();
  }

  function verify() {
    const go = () => run(enqueue({ kind: "punch.verify", itemId: item!.id }));
    if (Platform.OS === "web") return go();
    Alert.alert("Verify complete?", "Confirm the correction is done and acceptable.", [
      { text: "Cancel", style: "cancel" },
      { text: "Verify", onPress: go }
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" style={{ backgroundColor: palette.bg }}>
      <Stack.Screen options={{ title: item.number ? `Item ${item.number}` : "New item" }} />
      <View style={styles.column}>
        <Row style={{ flexWrap: "wrap" }}>
          <Pill label={status.label} tone={status.tone} />
          {item.isLocal ? <Pill label="Not yet synced" tone="open" /> : null}
        </Row>
        <Meta>{project?.name} · {phase?.name}</Meta>
        {problem ? <Notice icon="warning" message={problem} tone="danger" /> : null}

        {editing ? (
          <Card>
            <Field label="Location" maxLength={300} onChangeText={(location) => setDraft({ ...draft, location })} value={draft.location} />
            <Field label="What needs correcting" maxLength={4000} multiline onChangeText={(description) => setDraft({ ...draft, description })} value={draft.description} />
            <Field label="Responsible party" maxLength={200} onChangeText={(responsibleParty) => setDraft({ ...draft, responsibleParty })} value={draft.responsibleParty} />
            <Row>
              <Button label="Cancel" onPress={() => setEditing(false)} style={{ flex: 1 }} variant="secondary" />
              <Button
                label="Save changes"
                onPress={() =>
                  run(
                    enqueue({
                      kind: "punch.update",
                      itemId: item.id,
                      location: draft.location.trim(),
                      description: draft.description.trim(),
                      equipmentId: item.equipmentId,
                      responsibleParty: draft.responsibleParty.trim() || null
                    }),
                    () => setEditing(false)
                  )
                }
                style={{ flex: 1 }}
              />
            </Row>
          </Card>
        ) : (
          <Card>
            <Text style={[type.caption, { color: palette.muted }]}>LOCATION</Text>
            <Text style={[type.headline, { color: palette.ink, fontSize: 19 }]}>{item.location}</Text>
            <Text style={[type.caption, { color: palette.muted, marginTop: 8 }]}>WHAT NEEDS CORRECTING</Text>
            <Text selectable style={[type.body, { color: palette.ink }]}>{item.description}</Text>
            {equipment ? (
              <>
                <Text style={[type.caption, { color: palette.muted, marginTop: 8 }]}>EQUIPMENT</Text>
                <Text style={[type.body, { color: palette.ink }]}>{equipment.tag} · {equipment.location}</Text>
              </>
            ) : null}
            {item.responsibleParty ? (
              <>
                <Text style={[type.caption, { color: palette.muted, marginTop: 8 }]}>RESPONSIBLE PARTY</Text>
                <Text style={[type.body, { color: palette.ink }]}>{item.responsibleParty}</Text>
              </>
            ) : null}
          </Card>
        )}

        {item.photos.length ? (
          <View style={styles.photos}>
            {item.photos.map((photo) => (
              <Image accessibilityLabel="Reported condition" contentFit="cover" key={photo.id} source={{ uri: photo.uri }} style={[styles.photo, { backgroundColor: palette.surfaceMuted }]} />
            ))}
          </View>
        ) : null}

        {pin ? (
          <Button
            icon="drawing"
            label={`Show pin ${pin.number} on the drawing`}
            onPress={() => router.push({ pathname: "/projects/sheet/[sheetId]", params: { sheetId: pin.sheetId, pin: pin.id } })}
            variant="secondary"
          />
        ) : null}

        {verifiable ? <Button icon="checkCircle" label="Verify complete" large onPress={verify} variant="success" /> : null}

        {editable && !editing ? (
          <Button icon="pencil" label="Fix this item" onPress={() => setEditing(true)} variant="secondary" />
        ) : null}

        {editable ? (
          removing ? (
            <Card>
              <Field label="Logged by mistake? Say why" maxLength={500} onChangeText={setReason} placeholder="Duplicate, wrong area, already fixed…" value={reason} />
              <Row>
                <Button label="Keep it" onPress={() => setRemoving(false)} style={{ flex: 1 }} variant="secondary" />
                <Button
                  label="Remove item"
                  onPress={() => run(enqueue({ kind: "punch.void", itemId: item.id, reason: reason.trim() }), () => router.back())}
                  style={{ flex: 1 }}
                  variant="destructive"
                />
              </Row>
            </Card>
          ) : (
            <Button icon="trash" label="Remove item" onPress={() => setRemoving(true)} variant="destructive" />
          )
        ) : item.status !== "VERIFIED" && item.status !== "VOID" ? (
          <Meta>{item.status === "OPEN" ? "Another inspector logged this item; the office or they can change it." : "The office has this item now; ask them to change it."}</Meta>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: size.gutter, paddingBottom: 48 },
  column: { width: "100%", maxWidth: 760, alignSelf: "center", gap: 14 },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: "48%", aspectRatio: 4 / 3, borderRadius: 12 }
});
