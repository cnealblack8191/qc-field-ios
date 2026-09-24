import { Pressable, StyleSheet, Text, View } from "react-native";
import { haptic } from "@/lib/device";
import { size, usePalette } from "@/lib/theme";

/** An iOS-style segmented control with 44pt segments. */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const palette = usePalette();
  return (
    <View accessibilityRole="tablist" style={[styles.group, { backgroundColor: palette.surfaceMuted }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => {
              haptic.tap();
              onChange(option.value);
            }}
            style={[styles.segment, selected && [styles.selected, { backgroundColor: palette.surface }]]}
          >
            <Text style={[styles.label, { color: selected ? palette.ink : palette.muted }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: "row", borderRadius: 10, padding: 3, gap: 2 },
  segment: { minHeight: size.tap - 6, minWidth: 64, paddingHorizontal: 12, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  selected: { shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  label: { fontSize: 15, fontWeight: "700" }
});
