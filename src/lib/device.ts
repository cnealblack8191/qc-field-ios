import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

/** Client ids the server treats as unique, so a retried op is a no-op. */
export function newId() {
  return Crypto.randomUUID();
}

/**
 * The session token lives in the iOS Keychain, readable only on this device
 * after first unlock — never in AsyncStorage, which is a plain file. The web
 * build (used only for the browser demo) has no Keychain and keeps it in
 * storage instead.
 */
export const secureSession = {
  async get(key: string) {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  },
  async remove(key: string) {
    if (Platform.OS === "web") return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  }
};

/**
 * Photos from the camera land in a cache directory iOS may purge. A queued
 * photo is the only copy of the evidence until it syncs, so it is moved into
 * the app's documents directory first.
 */
export async function keepPhoto(uri: string): Promise<string> {
  if (Platform.OS === "web") return uri;
  try {
    const directory = new Directory(Paths.document, "queued-photos");
    if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
    const extension = uri.split(".").pop()?.toLowerCase() === "png" ? "png" : "jpg";
    const target = new File(directory, `${newId()}.${extension}`);
    await new File(uri).copy(target);
    return target.uri;
  } catch {
    // Falling back to the original URI is still better than losing the photo.
    return uri;
  }
}

export async function forgetPhoto(uri: string) {
  if (Platform.OS === "web" || !uri.includes("queued-photos")) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone.
  }
}

/** Haptics are confirmation a gloved hand can feel; silent where unsupported. */
export const haptic = {
  tap() {
    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => undefined);
  },
  success() {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning() {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
  impact() {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  }
};
