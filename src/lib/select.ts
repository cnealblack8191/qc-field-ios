import type { FieldSnapshot, PunchItem } from "./types";

/** Derived counts, kept out of the screens so each is computed one way. */

export const isUnresolved = (item: PunchItem) =>
  item.status === "OPEN" || item.status === "SENT" || item.status === "AWAITING_VERIFICATION";

export function phaseCounts(view: FieldSnapshot, phaseId: string) {
  const items = view.items.filter((item) => item.phaseId === phaseId && item.status !== "VOID");
  return {
    total: items.length,
    open: items.filter(isUnresolved).length,
    verified: items.filter((item) => item.status === "VERIFIED").length,
    local: items.filter((item) => item.isLocal).length
  };
}

export function sheetProgress(view: FieldSnapshot, sheetId: string) {
  const pins = view.pins.filter((pin) => pin.sheetId === sheetId);
  return {
    total: pins.length,
    checked: pins.filter((pin) => pin.status !== "UNCHECKED").length,
    punch: pins.filter((pin) => pin.status === "PUNCH").length
  };
}

export function reportProgress(view: FieldSnapshot, reportId: string) {
  const report = view.reports.find((candidate) => candidate.id === reportId);
  if (!report) return { answered: 0, total: 0, percent: 0 };
  const answered = report.answers.filter((answer) => answer.status).length;
  return { answered, total: report.answers.length, percent: report.answers.length ? answered / report.answers.length : 0 };
}

export function projectSummary(view: FieldSnapshot, projectId: string) {
  const phaseIds = new Set(view.phases.filter((phase) => phase.projectId === projectId).map((phase) => phase.id));
  const openItems = view.items.filter((item) => phaseIds.has(item.phaseId) && isUnresolved(item)).length;
  const reports = view.reports.filter(
    (report) => report.projectId === projectId && (report.status === "READY" || report.status === "IN_PROGRESS")
  );
  return {
    openItems,
    inspectionsToDo: reports.length,
    issues: view.reports.filter((report) => report.projectId === projectId && report.openIssues.length).length
  };
}
