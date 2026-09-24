import { Image } from "expo-image";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle
} from "react-native";
import { haptic } from "@/lib/device";
import { toneColors, type Tone } from "@/lib/labels";
import { size, type, usePalette } from "@/lib/theme";
import type { Photo } from "@/lib/types";
import { Icon, type IconName } from "./icon";

export function Card({ children, style, onPress, accessibilityLabel, accessibilityHint }: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}) {
  const palette = usePalette();
  const base = [styles.card, { backgroundColor: palette.surface, borderColor: palette.line }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [...base, pressed && { backgroundColor: palette.surfaceMuted }]}
    >
      {children}
    </Pressable>
  );
}

export function Pill({ label, tone }: { label: string; tone: Tone }) {
  const palette = usePalette();
  const colors = toneColors(palette, tone);
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <Text maxFontSizeMultiplier={1.6} style={[styles.pillText, { color: colors.fg }]}>{label}</Text>
    </View>
  );
}

type ButtonVariant = "primary" | "secondary" | "destructive" | "success" | "plain" | "inverse";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  large,
  style,
  accessibilityHint
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  large?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const palette = usePalette();
  const colors: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: palette.accent, fg: palette.onAccent, border: palette.accent },
    secondary: { bg: palette.surface, fg: palette.ink, border: palette.lineStrong },
    destructive: { bg: palette.dangerSoft, fg: palette.danger, border: palette.dangerSoft },
    success: { bg: palette.ok, fg: "#ffffff", border: palette.ok },
    plain: { bg: "transparent", fg: palette.accent, border: "transparent" },
    inverse: { bg: "rgba(255,255,255,0.08)", fg: "#ffffff", border: "rgba(255,255,255,0.25)" }
  };
  const color = colors[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(inactive), busy: Boolean(loading) }}
      disabled={inactive}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { minHeight: large ? size.tapLarge : size.tap, backgroundColor: color.bg, borderColor: color.border },
        pressed && { opacity: 0.75 },
        inactive && { opacity: 0.5 },
        style
      ]}
    >
      {loading ? <ActivityIndicator color={color.fg} /> : icon ? <Icon color={color.fg} name={icon} size={20} /> : null}
      <Text style={[styles.buttonText, { color: color.fg }]}>{label}</Text>
    </Pressable>
  );
}

export function SectionHeader({ title, detail, right }: { title: string; detail?: string; right?: ReactNode }) {
  const palette = usePalette();
  return (
    <View accessibilityRole="header" style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        <Text style={[type.title, { color: palette.ink }]}>{title}</Text>
        {detail ? <Text style={[type.subhead, { color: palette.muted, marginTop: 2 }]}>{detail}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function EmptyState({ title, message, icon = "info" }: { title: string; message: string; icon?: IconName }) {
  const palette = usePalette();
  return (
    <View style={[styles.empty, { borderColor: palette.lineStrong }]}>
      <Icon color={palette.muted} name={icon} size={28} />
      <Text style={[type.headline, { color: palette.ink, textAlign: "center" }]}>{title}</Text>
      <Text style={[type.subhead, { color: palette.muted, textAlign: "center" }]}>{message}</Text>
    </View>
  );
}

export function ProgressBar({ value, tone = "done" }: { value: number; tone?: "done" | "punch" }) {
  const palette = usePalette();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[styles.track, { backgroundColor: palette.surfaceMuted }]}
    >
      <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: tone === "punch" ? palette.accent : palette.ok }]} />
    </View>
  );
}

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  const palette = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.footnote, { color: palette.inkSoft }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={palette.muted}
        {...input}
        style={[
          styles.input,
          input.multiline && { minHeight: 96, paddingTop: 12, textAlignVertical: "top" },
          { backgroundColor: palette.surface, borderColor: palette.lineStrong, color: palette.ink },
          input.style
        ]}
      />
      {hint ? <Text style={[type.footnote, { color: palette.muted, fontWeight: "400" }]}>{hint}</Text> : null}
    </View>
  );
}

export function Notice({ tone, message, icon }: { tone: Tone; message: string; icon?: IconName }) {
  const palette = usePalette();
  const colors = toneColors(palette, tone);
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.notice, { backgroundColor: colors.bg }]}>
      {icon ? <Icon color={colors.fg} name={icon} size={18} /> : null}
      <Text style={[type.subhead, { color: colors.fg, flex: 1 }]}>{message}</Text>
    </View>
  );
}

export function PhotoStrip({ photos, onRemove }: { photos: Photo[]; onRemove?: (photo: Photo) => void }) {
  const palette = usePalette();
  if (!photos.length) return null;
  return (
    <View style={styles.photoStrip}>
      {photos.map((photo) => (
        <View key={photo.id} style={[styles.thumbWrap, { borderColor: palette.line }]}>
          <Image accessibilityLabel={photo.caption || "Photo"} contentFit="cover" source={{ uri: photo.uri }} style={styles.thumb} />
          {photo.isLocal ? (
            <View style={[styles.thumbBadge, { backgroundColor: palette.warningSoft }]}>
              <Icon color={palette.warning} name="cloudUp" size={12} />
            </View>
          ) : null}
          {onRemove ? (
            <Pressable
              accessibilityLabel="Remove photo"
              hitSlop={10}
              onPress={() => onRemove(photo)}
              style={[styles.thumbRemove, { backgroundColor: palette.overlay }]}
            >
              <Icon color="#fff" name="close" size={14} />
            </Pressable>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: 8 }, style]}>{children}</View>;
}

export function Meta({ children }: { children: ReactNode }) {
  const palette = usePalette();
  return <Text style={[type.subhead, { color: palette.muted }]}>{children}</Text>;
}

export function PressableRow(props: PressableProps & { children: ReactNode }) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={({ pressed }) => [styles.pressableRow, { borderColor: palette.line }, pressed && { backgroundColor: palette.surfaceMuted }]}
    >
      {props.children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: size.radius,
    padding: 16,
    gap: 8,
    borderCurve: "continuous"
  },
  pill: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 13, fontWeight: "700" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    borderRadius: size.radiusSm,
    borderWidth: 1,
    borderCurve: "continuous"
  },
  buttonText: { fontSize: 17, fontWeight: "700" },
  sectionHeader: { flexDirection: "row", alignItems: "flex-end", gap: 12, marginTop: 8 },
  empty: {
    alignItems: "center",
    gap: 8,
    padding: 24,
    borderRadius: size.radius,
    borderWidth: 1,
    borderStyle: "dashed"
  },
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  input: {
    minHeight: size.tap + 4,
    borderWidth: 1,
    borderRadius: size.radiusSm,
    paddingHorizontal: 14,
    // 16pt or larger, or iOS zooms on focus (MOBILE_FIELD_PLAN.md).
    fontSize: 17
  },
  notice: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: size.radiusSm },
  photoStrip: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  thumbWrap: { width: 76, height: 76, borderRadius: 10, overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  thumb: { width: "100%", height: "100%" },
  thumbBadge: { position: "absolute", left: 4, bottom: 4, borderRadius: 8, padding: 3 },
  thumbRemove: { position: "absolute", right: 4, top: 4, borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center" },
  pressableRow: { minHeight: size.tap, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }
});
