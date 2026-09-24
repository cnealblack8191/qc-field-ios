import type { FieldOp } from "./ops";
import type { FieldSnapshot, InspectionReport, PunchItem, PunchPhase } from "./types";

/**
 * What an inspector may do, stated once.
 *
 * The server is the authority (AGENTS.md: authorize every mutation on the
 * server) and re-checks all of this. The device checks too, for two reasons:
 * so the screens never offer an action that will bounce, and so the demo
 * server rejects exactly what the real one would.
 */

export function canEditItem(item: PunchItem, phase: PunchPhase | undefined, userId: string) {
  // The inspector who logged an item can fix or remove it while it is still
  // OPEN; once sent or evidenced, only the office changes it.
  return item.status === "OPEN" && item.createdById === userId && phase?.status !== "CLOSED";
}

export function canVerifyItem(item: PunchItem, phase: PunchPhase | undefined) {
  return (item.status === "OPEN" || item.status === "SENT" || item.status === "AWAITING_VERIFICATION") && phase?.status !== "CLOSED";
}

export function isReportEditable(report: InspectionReport, userId: string) {
  return report.inspectorId === userId && (report.status === "READY" || report.status === "IN_PROGRESS");
}

/** The server will not complete a walk with pins left unchecked (completePhaseWalk). */
export function uncheckedPins(snapshot: FieldSnapshot, phaseId: string) {
  const sheetIds = new Set(snapshot.sheets.filter((sheet) => sheet.phaseId === phaseId).map((sheet) => sheet.id));
  return snapshot.pins.filter((pin) => sheetIds.has(pin.sheetId) && pin.status === "UNCHECKED").length;
}

export function validateOp(snapshot: FieldSnapshot, op: FieldOp, userId: string): string | null {
  const phaseOf = (phaseId: string) => snapshot.phases.find((phase) => phase.id === phaseId);
  const itemOf = (itemId: string) => snapshot.items.find((item) => item.id === itemId);
  const reportOf = (reportId: string) => snapshot.reports.find((report) => report.id === reportId);

  switch (op.kind) {
    case "punch.create": {
      const phase = phaseOf(op.phaseId);
      if (!phase) return "That walk is no longer assigned to you.";
      if (phase.status === "CLOSED") return "The office has closed this phase.";
      if (!op.location.trim() || !op.description.trim()) return "Location and what needs correcting are both required.";
      if (op.photoUris.length > 10) return "Attach no more than 10 photos.";
      return null;
    }
    case "punch.update":
    case "punch.void": {
      const item = itemOf(op.itemId);
      if (!item) return "That item is no longer on this walk.";
      if (!canEditItem(item, phaseOf(item.phaseId), userId)) return "The office has this item now; ask them to change it.";
      if (op.kind === "punch.void" && !op.reason.trim()) return "Say why the item is being removed.";
      return null;
    }
    case "punch.verify": {
      const item = itemOf(op.itemId);
      if (!item) return "That item is no longer on this walk.";
      if (item.status === "VERIFIED") return "That item is already verified.";
      if (!canVerifyItem(item, phaseOf(item.phaseId))) return "That item is already closed.";
      return null;
    }
    case "phase.completeWalk": {
      const phase = phaseOf(op.phaseId);
      if (!phase) return "That walk is no longer assigned to you.";
      if (phase.status === "CLOSED") return "The office has closed this phase.";
      const unchecked = uncheckedPins(snapshot, op.phaseId);
      if (unchecked) return `${unchecked} pin${unchecked === 1 ? " is" : "s are"} still unchecked. Check every pin before marking the walk complete.`;
      return null;
    }
    case "pin.inspect": {
      const pin = snapshot.pins.find((candidate) => candidate.id === op.pinId);
      if (!pin) return "That pin is no longer on this sheet.";
      const sheet = snapshot.sheets.find((candidate) => candidate.id === pin.sheetId);
      if (sheet && phaseOf(sheet.phaseId)?.status === "CLOSED") return "The office has closed this phase.";
      if (op.status === "PUNCH" && !op.note?.trim()) return "Say what needs correcting.";
      return null;
    }
    case "report.answer":
    case "report.notes":
    case "report.photo":
    case "report.submit": {
      const report = reportOf(op.reportId);
      if (!report) return "That inspection is no longer assigned to you.";
      if (!isReportEditable(report, userId)) return "This inspection has been sent to the office.";
      return null;
    }
  }
}
