import { Image } from "expo-image";
import { forwardRef, memo, useImperativeHandle, useState } from "react";
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { pinColors } from "@/lib/labels";
import { pinStatusLabel } from "@/lib/ops";
import { useField } from "@/lib/store";
import { usePalette } from "@/lib/theme";
import type { Pin, Sheet } from "@/lib/types";

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const PIN = 30;

export interface SheetViewerHandle {
  focusPin(pin: Pin): void;
  reset(): void;
}

/**
 * A drawing sheet you can pinch, pan and double-tap, with pins on top.
 *
 * Pins are laid out from their normalized coordinates, never pixels, and are
 * counter-scaled so they stay a thumb's width whatever the zoom. There is no
 * placement here: pins are placed by the office (AGENTS.md), and a tap on the
 * sheet itself does nothing but zoom.
 */
export const SheetViewer = forwardRef<SheetViewerHandle, {
  sheet: Sheet;
  pins: Pin[];
  selectedId: string | null;
  queuedIds: Set<string>;
  onSelect: (pin: Pin) => void;
}>(function SheetViewer({ sheet, pins, selectedId, queuedIds, onSelect }, ref) {
  const palette = usePalette();
  const { imageSource } = useField();
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  // Fit the sheet inside the frame.
  const fitByWidth = frame.width / Math.max(frame.height, 1) < sheet.aspect;
  const contentWidth = fitByWidth ? frame.width : frame.height * sheet.aspect;
  const contentHeight = fitByWidth ? frame.width / sheet.aspect : frame.height;

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const start = useSharedValue({ scale: 1, tx: 0, ty: 0, fx: 0, fy: 0 });

  const bounds = (s: number) => {
    "worklet";
    return {
      x: Math.max(0, (contentWidth * s - frame.width) / 2),
      y: Math.max(0, (contentHeight * s - frame.height) / 2)
    };
  };
  const clampT = (value: number, limit: number) => {
    "worklet";
    return Math.min(limit, Math.max(-limit, value));
  };

  const pinch = Gesture.Pinch()
    .onStart((event) => {
      start.value = { scale: scale.value, tx: tx.value, ty: ty.value, fx: event.focalX - frame.width / 2, fy: event.focalY - frame.height / 2 };
    })
    .onUpdate((event) => {
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE * 0.9, start.value.scale * event.scale));
      // Keep the point under the fingers under the fingers.
      const px = (start.value.fx - start.value.tx) / start.value.scale;
      const py = (start.value.fy - start.value.ty) / start.value.scale;
      scale.value = s;
      tx.value = start.value.fx - px * s;
      ty.value = start.value.fy - py * s;
    })
    .onEnd(() => {
      const s = Math.max(MIN_SCALE, scale.value);
      const limit = bounds(s);
      scale.value = withTiming(s);
      tx.value = withTiming(clampT(tx.value, limit.x));
      ty.value = withTiming(clampT(ty.value, limit.y));
    });

  const pan = Gesture.Pan()
    .minDistance(8)
    .averageTouches(true)
    .onStart(() => {
      start.value = { ...start.value, tx: tx.value, ty: ty.value };
    })
    .onUpdate((event) => {
      tx.value = start.value.tx + event.translationX;
      ty.value = start.value.ty + event.translationY;
    })
    .onEnd((event) => {
      const limit = bounds(scale.value);
      tx.value = withTiming(clampT(tx.value + event.velocityX * 0.08, limit.x));
      ty.value = withTiming(clampT(ty.value + event.velocityY * 0.08, limit.y));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (scale.value > 1.2) {
        scale.value = withTiming(1);
        tx.value = withTiming(0);
        ty.value = withTiming(0);
        return;
      }
      const s = 2.5;
      const fx = event.x - frame.width / 2;
      const fy = event.y - frame.height / 2;
      const limit = bounds(s);
      scale.value = withTiming(s);
      tx.value = withTiming(clampT(fx - ((fx - tx.value) / scale.value) * s, limit.x));
      ty.value = withTiming(clampT(fy - ((fy - ty.value) / scale.value) * s, limit.y));
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  useImperativeHandle(ref, () => ({
    focusPin(pin: Pin) {
      const s = Math.max(scale.value, 2.2);
      const limit = bounds(s);
      const px = (pin.x - 0.5) * contentWidth;
      const py = (pin.y - 0.5) * contentHeight;
      scale.value = withTiming(s, { duration: 280 });
      tx.value = withTiming(clampT(-px * s, limit.x), { duration: 280 });
      ty.value = withTiming(clampT(-py * s, limit.y), { duration: 280 });
    },
    reset() {
      scale.value = withTiming(1);
      tx.value = withTiming(0);
      ty.value = withTiming(0);
    }
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }]
  }));

  function onLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setFrame({ width, height });
  }

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessibilityHint="Pinch or double-tap to zoom. Pins are listed as buttons."
        accessibilityLabel={`Sheet ${sheet.sheetNumber}, ${sheet.title}`}
        onLayout={onLayout}
        style={[styles.frame, { backgroundColor: palette.surfaceMuted }]}
      >
        {frame.width ? (
          <Animated.View style={[{ width: contentWidth, height: contentHeight }, contentStyle]}>
            <Image
              accessibilityIgnoresInvertColors
              contentFit="contain"
              source={sheet.imageAsset ?? imageSource(sheet.imageUri)}
              cachePolicy="disk"
              style={StyleSheet.absoluteFill}
              transition={150}
            />
            {pins.map((pin) => (
              <PinMarker
                height={contentHeight}
                isQueued={queuedIds.has(pin.id)}
                isSelected={pin.id === selectedId}
                key={pin.id}
                onPress={onSelect}
                pin={pin}
                scale={scale}
                width={contentWidth}
              />
            ))}
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
});

const PinMarker = memo(function PinMarker({ pin, width, height, scale, isSelected, isQueued, onPress }: {
  pin: Pin;
  width: number;
  height: number;
  scale: SharedValue<number>;
  isSelected: boolean;
  isQueued: boolean;
  onPress: (pin: Pin) => void;
}) {
  const palette = usePalette();
  const colors = pinColors(palette, pin.status);
  const counter = useAnimatedStyle(() => ({ transform: [{ scale: 1 / scale.value }] }));
  const size = isSelected ? PIN + 10 : PIN;

  return (
    <Animated.View
      style={[
        styles.pinSlot,
        { left: pin.x * width - 22, top: pin.y * height - 22 },
        counter
      ]}
    >
      <Pressable
        accessibilityLabel={`Pin ${pin.number}, ${pin.deviceLabel}, ${pin.roomArea ?? ""}, ${pinStatusLabel[pin.status]}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected }}
        hitSlop={6}
        onPress={() => onPress(pin)}
        style={styles.pinHit}
      >
        <View
          style={[
            styles.pin,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.fill,
              borderColor: isSelected ? palette.info : pin.status === "UNCHECKED" ? "#15191d" : "#ffffff",
              borderWidth: isSelected ? 4 : 2
            }
          ]}
        >
          <Text style={[styles.pinText, { color: colors.ink }]}>{pin.number}</Text>
        </View>
        {/* A shape as well as a colour: legible in sunlight and without colour vision. */}
        {pin.status !== "UNCHECKED" ? (
          <View style={[styles.mark, { backgroundColor: colors.fill }]}>
            <Text style={styles.markText}>{pin.status === "PASS" ? "✓" : pin.status === "PUNCH" ? "!" : "–"}</Text>
          </View>
        ) : null}
        {isQueued ? <View style={[styles.queued, { backgroundColor: palette.started }]} /> : null}
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  pinSlot: { position: "absolute", width: 44, height: 44 },
  pinHit: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pin: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3
  },
  pinText: { fontSize: 13, fontWeight: "800" },
  mark: { position: "absolute", left: 0, bottom: 0, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#fff", alignItems: "center", justifyContent: "center" },
  markText: { color: "#fff", fontSize: 11, fontWeight: "900", lineHeight: 13 },
  queued: { position: "absolute", right: 2, top: 2, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: "#fff" }
});
