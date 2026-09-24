import Ionicons from "@expo/vector-icons/Ionicons";
import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { Platform, type ColorValue } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";

/**
 * SF Symbols on iOS, so icons match the system and scale with it; Ionicons
 * elsewhere (the browser demo).
 */
const ICONS = {
  projects: { sf: "building.2", ion: "business-outline" },
  punch: { sf: "checklist", ion: "list-outline" },
  sync: { sf: "arrow.triangle.2.circlepath", ion: "sync-outline" },
  account: { sf: "person.crop.circle", ion: "person-circle-outline" },
  chevron: { sf: "chevron.right", ion: "chevron-forward" },
  camera: { sf: "camera.fill", ion: "camera" },
  photos: { sf: "photo.on.rectangle", ion: "images-outline" },
  plus: { sf: "plus", ion: "add" },
  check: { sf: "checkmark", ion: "checkmark" },
  checkCircle: { sf: "checkmark.circle.fill", ion: "checkmark-circle" },
  xCircle: { sf: "xmark.circle.fill", ion: "close-circle" },
  close: { sf: "xmark", ion: "close" },
  warning: { sf: "exclamationmark.triangle.fill", ion: "warning" },
  cloudOff: { sf: "icloud.slash", ion: "cloud-offline-outline" },
  cloudOk: { sf: "checkmark.icloud", ion: "cloud-done-outline" },
  cloudUp: { sf: "icloud.and.arrow.up", ion: "cloud-upload-outline" },
  drawing: { sf: "map", ion: "map-outline" },
  gear: { sf: "bolt.fill", ion: "flash" },
  location: { sf: "mappin.and.ellipse", ion: "location-outline" },
  search: { sf: "magnifyingglass", ion: "search" },
  trash: { sf: "trash", ion: "trash-outline" },
  pencil: { sf: "pencil", ion: "pencil" },
  arrowDown: { sf: "arrow.down", ion: "arrow-down" },
  next: { sf: "forward.fill", ion: "play-forward" },
  flag: { sf: "flag.fill", ion: "flag" },
  minus: { sf: "minus.circle.fill", ion: "remove-circle" },
  info: { sf: "info.circle", ion: "information-circle-outline" },
  zoomReset: { sf: "arrow.up.left.and.down.right.magnifyingglass", ion: "scan-outline" }
} satisfies Record<string, { sf: SFSymbol; ion: ComponentProps<typeof Ionicons>["name"] }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: ColorValue }) {
  const icon = ICONS[name];
  const fallback = <Ionicons color={color as string} name={icon.ion} size={size} />;
  if (Platform.OS !== "ios") return fallback;
  return <SymbolView fallback={fallback} name={icon.sf} size={size} tintColor={color} weight="semibold" />;
}
