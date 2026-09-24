import { useColorScheme } from "react-native";

/**
 * The ECI palette from app/globals.css, with a dark variant for gear rooms
 * and night work. Status colours match the web field app's pills: amber open,
 * blue sent, purple waiting on ECI, green verified, grey void.
 */
const light = {
  bg: "#f5f6f8",
  surface: "#ffffff",
  surfaceMuted: "#eef0f2",
  ink: "#15191d",
  inkSoft: "#4b5563",
  muted: "#667085",
  line: "#e6e8eb",
  lineStrong: "#cfd4d9",
  brand: "#15191d",
  accent: "#c2261c",
  accentSoft: "#fbe7e5",
  onAccent: "#ffffff",
  ok: "#2f8f57",
  okInk: "#1f5a34",
  okSoft: "#dcf2e4",
  warning: "#7a4306",
  warningSoft: "#fff1d6",
  info: "#1e40af",
  infoSoft: "#e6efff",
  review: "#5b21b6",
  reviewSoft: "#efeafe",
  danger: "#b42318",
  dangerSoft: "#fbe2de",
  started: "#e3a008",
  overlay: "rgba(21,25,29,0.45)"
};

const dark: typeof light = {
  bg: "#0f1215",
  surface: "#1a1f24",
  surfaceMuted: "#242a30",
  ink: "#f2f4f6",
  inkSoft: "#c5ccd3",
  muted: "#9aa4af",
  line: "#2b3238",
  lineStrong: "#3a434b",
  brand: "#0f1215",
  accent: "#e5483d",
  accentSoft: "#3a1d1a",
  onAccent: "#ffffff",
  ok: "#4cb877",
  okInk: "#a6e3bd",
  okSoft: "#16301f",
  warning: "#f3b25b",
  warningSoft: "#33250f",
  info: "#8fb1ff",
  infoSoft: "#1a2540",
  review: "#c3a6ff",
  reviewSoft: "#2a1f45",
  danger: "#ff8a7a",
  dangerSoft: "#3a1b17",
  started: "#f3c24b",
  overlay: "rgba(0,0,0,0.6)"
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

/**
 * Sizes are the field budgets from docs/MOBILE_FIELD_PLAN.md, raised for a
 * gloved thumb: the HIG minimum is 44pt; primary field actions are 56pt.
 */
export const size = {
  tap: 44,
  tapLarge: 56,
  radius: 14,
  radiusSm: 10,
  gutter: 16
};

export const type = {
  largeTitle: { fontSize: 32, fontWeight: "800" as const, letterSpacing: 0.2 },
  title: { fontSize: 22, fontWeight: "800" as const },
  headline: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 17, fontWeight: "400" as const },
  callout: { fontSize: 16, fontWeight: "500" as const },
  subhead: { fontSize: 15, fontWeight: "500" as const },
  footnote: { fontSize: 13, fontWeight: "600" as const },
  caption: { fontSize: 12, fontWeight: "700" as const, letterSpacing: 0.6 }
};
