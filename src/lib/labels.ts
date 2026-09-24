import type { Palette } from "./theme";
import type { EquipmentType, GearPhase, PinStatus, PunchItemStatus, PunchPhaseStatus, ReportStatus } from "./types";

export type Tone = "open" | "sent" | "review" | "done" | "void" | "neutral" | "danger";

export function toneColors(palette: Palette, tone: Tone) {
  switch (tone) {
    case "open":
      return { fg: palette.warning, bg: palette.warningSoft };
    case "sent":
      return { fg: palette.info, bg: palette.infoSoft };
    case "review":
      return { fg: palette.review, bg: palette.reviewSoft };
    case "done":
      return { fg: palette.okInk, bg: palette.okSoft };
    case "danger":
      return { fg: palette.danger, bg: palette.dangerSoft };
    case "void":
    case "neutral":
      return { fg: palette.muted, bg: palette.surfaceMuted };
  }
}

export const punchStatus: Record<PunchItemStatus, { label: string; tone: Tone }> = {
  OPEN: { label: "Open", tone: "open" },
  SENT: { label: "Sent", tone: "sent" },
  AWAITING_VERIFICATION: { label: "Awaiting verification", tone: "review" },
  VERIFIED: { label: "Verified", tone: "done" },
  VOID: { label: "Removed", tone: "void" }
};

export const phaseStatus: Record<PunchPhaseStatus, { label: string; tone: Tone }> = {
  NOT_STARTED: { label: "Not started", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "open" },
  WALK_COMPLETE: { label: "Walk complete", tone: "review" },
  CLOSED: { label: "Closed", tone: "done" }
};

export const reportStatus: Record<ReportStatus, { label: string; tone: Tone }> = {
  READY: { label: "Ready", tone: "neutral" },
  IN_PROGRESS: { label: "In progress", tone: "open" },
  COMPLETED: { label: "Sent to office", tone: "review" },
  APPROVED: { label: "Approved", tone: "done" },
  SUBMITTED: { label: "Delivered", tone: "done" }
};

export const equipmentType: Record<EquipmentType, string> = {
  TRANSFORMER: "Transformer",
  DISCONNECT: "Disconnect",
  ATS: "ATS",
  PANEL_BOARD: "Panelboard",
  SWITCHGEAR: "Switchgear"
};

/** "Interim" is labelled "In Progress" everywhere a user sees it. */
export const gearPhase: Record<GearPhase, string> = {
  ROUGH_IN: "Rough In",
  INTERIM: "In Progress",
  FINAL: "Final"
};

export function pinColors(palette: Palette, status: PinStatus) {
  switch (status) {
    case "PASS":
      return { fill: palette.ok, ink: "#ffffff" };
    case "PUNCH":
      return { fill: palette.accent, ink: "#ffffff" };
    case "NA":
      return { fill: "#8a939c", ink: "#ffffff" };
    case "UNCHECKED":
      return { fill: "#ffffff", ink: "#15191d" };
  }
}

export function relativeTime(iso: string | null, now = Date.now()) {
  if (!iso) return "never";
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString();
}
