import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/icon";
import { PhotoCapture } from "@/components/photo-capture";
import { SheetViewer, type SheetViewerHandle } from "@/components/sheet-viewer";
import { SyncBanner } from "@/components/sync-status";
import { Button, EmptyState, Field, Meta, Notice, Pill, Row } from "@/components/ui";
import { haptic } from "@/lib/device";
import { pinColors } from "@/lib/labels";
import { pinStatusLabel } from "@/lib/ops";
import { sheetProgress } from "@/lib/select";
import { useField, useView } from "@/lib/store";
import { size, type, usePalette } from "@/lib/theme";
import type { Photo, Pin, PinStatus } from "@/lib/types";

const CHOICES: { value: Exclude<PinStatus, "UNCHECKED">; label: string; hint: string }[] = [
  { value: "PASS", label: "Pass", hint: "Correct" },
  { value: "PUNCH", label: "Punch", hint: "Needs correcting" },
  { value: "NA", label: "N/A", hint: "Does not apply" }
];

/**
 * Walking a sheet: tap a pin, tap Pass, and the next unchecked pin comes up
 * on its own. Punch stops to collect a note and photos, because a punch has
 * to carry those to be worth anything downstream. Nothing here waits on the
 * network.
 */
export default function SheetScreen() {
  const { sheetId, pin: initialPin } = useLocalSearchParams<{ sheetId: string; pin?: string }>();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const view = useView();
  const { enqueue, outbox } = useField();
  const viewer = useRef<SheetViewerHandle>(null);

  const sheet = view.sheets.find((candidate) => candidate.id === sheetId);
  const phase = view.phases.find((candidate) => candidate.id === sheet?.phaseId);
  const pins = useMemo(() => view.pins.filter((pin) => pin.sheetId === sheetId).sort((a, b) => a.number - b.number), [view.pins, sheetId]);
  const queuedIds = useMemo(
    () => new Set(outbox.flatMap((entry) => (entry.op.kind === "pin.inspect" && !entry.rejected ? [entry.op.pinId] : []))),
    [outbox]
  );

  const [selectedId, setSelectedId] = useState<string | null>(initialPin ?? null);
  const [punching, setPunching] = useState(false);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ text: string; undo: { pin: Pin } } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = pins.find((pin) => pin.id === selectedId) ?? null;
  const progress = sheetProgress(view, sheetId);
  const isClosed = phase?.status === "CLOSED";
  const wide = width >= 900;

  useEffect(() => {
    if (initialPin) {
      const pin = pins.find((candidate) => candidate.id === initialPin);
      if (pin) setTimeout(() => viewer.current?.focusPin(pin), 350);
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!sheet) {
    return (
      <View style={{ flex: 1, padding: size.gutter, backgroundColor: palette.bg }}>
        <EmptyState icon="drawing" message="It may have been superseded by a new issue. Go back and pull to refresh." title="Sheet not found" />
      </View>
    );
  }

  function select(pin: Pin | null, focus = true) {
    setSelectedId(pin?.id ?? null);
    setPunching(false);
    setProblem(null);
    setNote(pin?.status === "PUNCH" ? pin.note ?? "" : "");
    setPhotos([]);
    if (pin && focus) viewer.current?.focusPin(pin);
    if (pin) haptic.tap();
  }

  function nextUnchecked(after: Pin | null) {
    const start = after ? pins.findIndex((pin) => pin.id === after.id) : -1;
    const ordered = [...pins.slice(start + 1), ...pins.slice(0, start + 1)];
    return ordered.find((pin) => pin.status === "UNCHECKED" && pin.id !== after?.id) ?? null;
  }

  function record(status: Exclude<PinStatus, "UNCHECKED">) {
    if (!selected) return;
    if (status === "PUNCH" && !punching) {
      setPunching(true);
      setNote(selected.note ?? "");
      return;
    }
    const result = enqueue({
      kind: "pin.inspect",
      pinId: selected.id,
      status,
      note: status === "PUNCH" ? note.trim() : null,
      photoUris: status === "PUNCH" ? photos.map((photo) => photo.uri) : []
    });
    if (result) {
      haptic.warning();
      setProblem(result);
      return;
    }
    status === "PUNCH" ? haptic.warning() : haptic.success();
    // Auto-advance is fast, so the last result stays one tap from undone.
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlash({ text: `Pin ${selected.number} · ${pinStatusLabel[status]} — saved`, undo: { pin: selected } });
    flashTimer.current = setTimeout(() => setFlash(null), 6000);
    select(nextUnchecked(selected));
  }

  function undo() {
    if (!flash) return;
    const previous = flash.undo.pin;
    enqueue({ kind: "pin.inspect", pinId: previous.id, status: previous.status, note: previous.note, photoUris: [] });
    haptic.tap();
    setFlash(null);
    select(pins.find((pin) => pin.id === previous.id) ?? null);
  }

  const panel = (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100} style={wide ? styles.sidePanelWrap : undefined}>
      <ScrollView
        contentContainerStyle={[styles.panel, { paddingBottom: 12 + (wide ? insets.bottom : 0) }]}
        keyboardShouldPersistTaps="handled"
        style={[
          wide ? styles.sidePanel : styles.bottomPanel,
          { backgroundColor: palette.surface, borderColor: palette.line },
          !wide && { maxHeight: punching ? 460 : 280 }
        ]}
      >
        {flash ? (
          <Row style={[styles.flash, { backgroundColor: palette.okSoft }]}>
            <Icon color={palette.okInk} name="checkCircle" size={18} />
            <Text accessibilityLiveRegion="polite" style={[type.subhead, { color: palette.okInk, flex: 1 }]}>{flash.text}</Text>
            <Button label="Undo" onPress={undo} variant="plain" />
          </Row>
        ) : null}
        {problem ? <Notice icon="warning" message={problem} tone="danger" /> : null}

        {selected ? (
          <>
            <Row style={{ justifyContent: "space-between" }}>
              <Row style={{ flex: 1 }}>
                <View style={[styles.badge, { backgroundColor: pinColors(palette, selected.status).fill, borderColor: palette.ink }]}>
                  <Text style={{ color: pinColors(palette, selected.status).ink, fontWeight: "800" }}>{selected.number}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[type.headline, { color: palette.ink }]}>{selected.deviceLabel}</Text>
                  <Meta>{selected.roomArea}</Meta>
                </View>
              </Row>
              <Pressable accessibilityLabel="Close pin" accessibilityRole="button" hitSlop={8} onPress={() => select(null, false)} style={styles.close}>
                <Icon color={palette.muted} name="close" size={20} />
              </Pressable>
            </Row>
            <Text style={[type.body, { color: palette.inkSoft }]}>{selected.description}</Text>
            {selected.status !== "UNCHECKED" ? (
              <Row>
                <Pill label={`Recorded: ${pinStatusLabel[selected.status]}`} tone={selected.status === "PASS" ? "done" : selected.status === "PUNCH" ? "danger" : "neutral"} />
                {queuedIds.has(selected.id) ? <Pill label="Not yet synced" tone="open" /> : null}
              </Row>
            ) : null}

            {isClosed ? (
              <Meta>The office has closed this phase.</Meta>
            ) : punching ? (
              <View style={{ gap: 12 }}>
                <Field autoFocus label="What needs correcting" maxLength={4000} multiline onChangeText={setNote} placeholder="e.g. Box set 4&quot; low; reset to 46&quot; AFF" value={note} />
                <PhotoCapture onChange={setPhotos} photos={photos} />
                <Row>
                  <Button label="Cancel" onPress={() => setPunching(false)} style={{ flex: 1 }} variant="secondary" />
                  <Button label="Save punch" large onPress={() => record("PUNCH")} style={{ flex: 2 }} />
                </Row>
              </View>
            ) : (
              <View style={styles.choices}>
                {CHOICES.map((choice) => {
                  const colors = pinColors(palette, choice.value);
                  const current = selected.status === choice.value;
                  return (
                    <Pressable
                      accessibilityHint={choice.hint}
                      accessibilityLabel={choice.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: current }}
                      key={choice.value}
                      onPress={() => record(choice.value)}
                      style={({ pressed }) => [
                        styles.choice,
                        { backgroundColor: colors.fill, opacity: pressed ? 0.8 : 1 },
                        current && styles.choiceCurrent
                      ]}
                    >
                      <Text style={styles.choiceLabel}>{choice.label}</Text>
                      <Text style={styles.choiceHint}>{choice.hint}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        ) : (
          <View style={{ gap: 10 }}>
            <Text style={[type.headline, { color: palette.ink }]}>
              {progress.checked} of {progress.total} pins checked
            </Text>
            <Meta>Tap a pin on the sheet, or start with the next one not yet checked.</Meta>
            {nextUnchecked(null) ? (
              <Button icon="next" label="Next unchecked pin" large onPress={() => select(nextUnchecked(null))} />
            ) : (
              <Notice icon="checkCircle" message="Every pin on this sheet is checked." tone="done" />
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={[styles.fill, { backgroundColor: palette.bg }]}>
      <Stack.Screen
        options={{
          title: `${sheet.sheetNumber} · ${progress.checked}/${progress.total}`,
          headerRight: () => (
            <Pressable accessibilityLabel="Fit sheet to screen" accessibilityRole="button" hitSlop={8} onPress={() => viewer.current?.reset()} style={styles.close}>
              <Icon color={palette.accent} name="zoomReset" size={22} />
            </Pressable>
          )
        }}
      />
      <View style={styles.banner}>
        <SyncBanner />
      </View>
      <View style={[styles.fill, wide && { flexDirection: "row" }]}>
        <View style={styles.fill}>
          <SheetViewer onSelect={(pin) => select(pin)} pins={pins} queuedIds={queuedIds} ref={viewer} selectedId={selectedId} sheet={sheet} />
          <View pointerEvents="none" style={[styles.legend, { backgroundColor: palette.surface }]}>
            {(["UNCHECKED", "PASS", "PUNCH", "NA"] as PinStatus[]).map((status) => (
              <Row key={status} style={{ gap: 4 }}>
                <View style={[styles.legendDot, { backgroundColor: pinColors(palette, status).fill, borderColor: palette.ink }]} />
                <Text style={[type.footnote, { color: palette.inkSoft }]}>{pinStatusLabel[status]}</Text>
              </Row>
            ))}
          </View>
        </View>
        {panel}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  banner: { position: "absolute", top: 8, left: 8, right: 8, zIndex: 2 },
  bottomPanel: { flexGrow: 0, borderTopWidth: StyleSheet.hairlineWidth },
  sidePanelWrap: { width: 380 },
  sidePanel: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth },
  panel: { padding: size.gutter, gap: 12 },
  badge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  close: { minWidth: size.tap, minHeight: size.tap, alignItems: "center", justifyContent: "center" },
  choices: { flexDirection: "row", gap: 10 },
  choice: { flex: 1, minHeight: 64, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 8, borderCurve: "continuous" },
  choiceCurrent: { borderWidth: 3, borderColor: "#1e40af" },
  choiceLabel: { color: "#fff", fontSize: 19, fontWeight: "800" },
  choiceHint: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "600" },
  flash: { borderRadius: 10, paddingLeft: 12, minHeight: size.tap },
  legend: { position: "absolute", left: 8, bottom: 8, flexDirection: "row", gap: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, opacity: 0.92 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1 }
});
