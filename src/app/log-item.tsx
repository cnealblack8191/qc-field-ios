import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { PhotoCapture } from "@/components/photo-capture";
import { Button, Field, Notice } from "@/components/ui";
import { haptic } from "@/lib/device";
import { useField, useView } from "@/lib/store";
import { size, type, usePalette } from "@/lib/theme";
import type { Photo } from "@/lib/types";

/**
 * Logging a punch item, photo first — the order it happens on site: see it,
 * shoot it, say where and what. Saves to the device instantly; it never waits
 * for a signal.
 */
export default function LogItemScreen() {
  const { phaseId } = useLocalSearchParams<{ phaseId: string }>();
  const palette = usePalette();
  const view = useView();
  const { enqueue, online } = useField();
  const phase = view.phases.find((candidate) => candidate.id === phaseId);
  const equipment = view.equipment.filter((candidate) => candidate.projectId === phase?.projectId);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [equipmentId, setEquipmentId] = useState<string | null>(null);
  const [responsibleParty, setResponsibleParty] = useState("");
  const [problem, setProblem] = useState<string | null>(null);

  // The last locations used on this walk, one tap away: an inspector logs
  // several items in the same room.
  const recentLocations = [...new Set(view.items.filter((item) => item.phaseId === phaseId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((item) => item.location))].slice(0, 3);

  function save(another: boolean) {
    const result = enqueue({
      kind: "punch.create",
      phaseId,
      location: location.trim(),
      description: description.trim(),
      equipmentId,
      responsibleParty: responsibleParty.trim() || null,
      photoUris: photos.map((photo) => photo.uri)
    });
    if (result) {
      haptic.warning();
      return setProblem(result);
    }
    haptic.success();
    if (another) {
      setPhotos([]);
      setDescription("");
      setEquipmentId(null);
      setProblem(null);
      return;
    }
    router.back();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: palette.bg }}>
      <Stack.Screen
        options={{
          title: "Log punch item",
          headerLeft: () => <Button label="Cancel" onPress={() => router.back()} variant="plain" />
        }}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          <Text style={[type.subhead, { color: palette.muted }]}>
            {phase?.name} · {online ? "Saves instantly and syncs." : "No signal — saves on this device and syncs later."}
          </Text>
          {problem ? <Notice icon="warning" message={problem} tone="danger" /> : null}

          <PhotoCapture onChange={setPhotos} photos={photos} />

          <Field label="Location" maxLength={300} onChangeText={setLocation} placeholder="Room, grid line or area" returnKeyType="next" value={location} />
          {recentLocations.length && !location ? (
            <View style={styles.chips}>
              {recentLocations.map((recent) => (
                <Pressable
                  accessibilityLabel={`Use location ${recent}`}
                  accessibilityRole="button"
                  key={recent}
                  onPress={() => setLocation(recent)}
                  style={[styles.chip, { backgroundColor: palette.surfaceMuted }]}
                >
                  <Text numberOfLines={1} style={[type.subhead, { color: palette.ink }]}>{recent}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Field label="What needs correcting" maxLength={4000} multiline onChangeText={setDescription} placeholder="Describe the deficiency" value={description} />

          {equipment.length ? (
            <View style={{ gap: 6 }}>
              <Text style={[type.footnote, { color: palette.inkSoft }]}>Equipment (optional)</Text>
              <View style={styles.chips}>
                {equipment.map((gear) => {
                  const selected = gear.id === equipmentId;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={gear.id}
                      onPress={() => setEquipmentId(selected ? null : gear.id)}
                      style={[styles.chip, { backgroundColor: selected ? palette.ink : palette.surfaceMuted }]}
                    >
                      <Text style={[type.subhead, { color: selected ? palette.bg : palette.ink, fontWeight: "700" }]}>{gear.tag}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Field label="Responsible party (optional)" maxLength={200} onChangeText={setResponsibleParty} placeholder="Trade or subcontractor" value={responsibleParty} />

          <Button icon="check" label="Save item" large onPress={() => save(false)} />
          <Button label="Save and log another" onPress={() => save(true)} variant="secondary" />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: size.gutter, paddingBottom: 48 },
  column: { width: "100%", maxWidth: 640, alignSelf: "center", gap: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: size.tap, paddingHorizontal: 14, borderRadius: 22, justifyContent: "center", maxWidth: "100%" }
});
