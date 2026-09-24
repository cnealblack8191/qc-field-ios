import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Linking, Platform, StyleSheet, View } from "react-native";
import { haptic, keepPhoto, newId } from "@/lib/device";
import type { Photo } from "@/lib/types";
import { Button, PhotoStrip } from "./ui";

export const MAX_PHOTOS = 10;

/**
 * Photo-first capture: the camera is the primary button, the library the
 * secondary. Photos are copied into the app's documents directory the moment
 * they are taken, because until they sync they are the only copy.
 *
 * Quality 0.7 keeps an iPhone photo near 1–2 MB — well inside the server's
 * 10 MB per photo / 40 MB per batch limits — without losing legibility of a
 * nameplate or a label.
 */
export function PhotoCapture({ photos, onChange, max = MAX_PHOTOS }: { photos: Photo[]; onChange: (photos: Photo[]) => void; max?: number }) {
  const [busy, setBusy] = useState(false);
  const remaining = max - photos.length;

  async function add(assets: ImagePicker.ImagePickerAsset[]) {
    const kept = await Promise.all(assets.slice(0, remaining).map((asset) => keepPhoto(asset.uri)));
    onChange([...photos, ...kept.map((uri) => ({ id: newId(), uri, isLocal: true }))]);
    haptic.success();
  }

  function explainDenied(what: string) {
    Alert.alert(
      `${what} access is off`,
      `Turn on ${what.toLowerCase()} access for ECI Field QC in Settings to attach photos.`,
      [
        { text: "Not now", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() }
      ]
    );
  }

  async function takePhoto() {
    setBusy(true);
    try {
      if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return explainDenied("Camera");
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7, exif: false });
      if (!result.canceled) await add(result.assets);
    } catch {
      // The simulator and some iPads have no camera; offer the library.
      await chooseFromLibrary();
    } finally {
      setBusy(false);
    }
  }

  async function chooseFromLibrary() {
    setBusy(true);
    try {
      // The system photo picker runs out of process and needs no library
      // permission on iOS 14+, so none is requested.
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 0.7,
        exif: false
      });
      if (!result.canceled) await add(result.assets);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <PhotoStrip onRemove={(photo) => onChange(photos.filter((candidate) => candidate.id !== photo.id))} photos={photos} />
      {remaining > 0 ? (
        <View style={styles.buttons}>
          <Button disabled={busy} icon="camera" label="Take photo" large onPress={takePhoto} style={styles.grow} variant="secondary" />
          <Button disabled={busy} icon="photos" label="Library" large onPress={chooseFromLibrary} variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  buttons: { flexDirection: "row", gap: 10 },
  grow: { flex: 1 }
});
