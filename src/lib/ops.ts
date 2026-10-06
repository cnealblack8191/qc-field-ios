import type {
  AnswerStatus,
  FieldSnapshot,
  InspectionReport,
  PinStatus,
  PunchItem,
  PunchPhaseStatus
} from "./types";

/**
 * Every write the field app makes, as a value.
 *
 * Nothing on a field screen waits on the network. A tap produces an op, the op
 * is written to the device outbox first, and each screen renders
 * `applyOps(lastServerSnapshot, queuedOps)`. There is no separate optimistic
 * copy to reconcile and nothing to roll back: when the server acknowledges an
 * op it simply leaves the queue and the next snapshot already contains it.
 *
 * Each op carries a client-generated `id` that the server treats as unique
 * (the same idempotency rule as the web app's offline queue), so a retry after
 * a dropped response is a no-op rather than a duplicate.
 */
export type FieldOp =
  | {
      kind: "punch.create";
      id: string;
      createdAt: string;
      phaseId: string;
      location: string;
      description: string;
      equipmentId: string | null;
      responsibleParty: string | null;
      photoUris: string[];
    }
  | {
      kind: "punch.update";
      id: string;
      createdAt: string;
      itemId: string;
      location: string;
      description: string;
      equipmentId: string | null;
      responsibleParty: string | null;
    }
  | { kind: "punch.void"; id: string; createdAt: string; itemId: string; reason: string }
  | { kind: "punch.verify"; id: string; createdAt: string; itemId: string }
  | { kind: "phase.completeWalk"; id: string; createdAt: string; phaseId: string }
  | {
      kind: "pin.inspect";
      id: string;
      createdAt: string;
      pinId: string;
      status: PinStatus;
      note: string | null;
      photoUris: string[];
    }
  | {
      kind: "report.answer";
      id: string;
      createdAt: string;
      reportId: string;
      answerId: string;
      status: AnswerStatus;
      comments: string;
    }
  | { kind: "report.notes"; id: string; createdAt: string; reportId: string; notes: string }
  | { kind: "report.photo"; id: string; createdAt: string; reportId: string; photoUri: string; caption: string }
  | { kind: "report.submit"; id: string; createdAt: string; reportId: string };

export type FieldOpKind = FieldOp["kind"];

/** Ops that replace an earlier queued op for the same target, so the queue stays short. */
export function supersedes(next: FieldOp, queued: FieldOp): boolean {
  if (next.kind === "report.answer" && queued.kind === "report.answer") {
    return next.reportId === queued.reportId && next.answerId === queued.answerId;
  }
  if (next.kind === "report.notes" && queued.kind === "report.notes") {
    return next.reportId === queued.reportId;
  }
  if (next.kind === "pin.inspect" && queued.kind === "pin.inspect") {
    // A second result for the same pin replaces the first only when the first
    // carried nothing that would be lost — photos are evidence.
    return next.pinId === queued.pinId && queued.photoUris.length === 0;
  }
  return false;
}

export function describeOp(op: FieldOp, view: FieldSnapshot): string {
  switch (op.kind) {
    case "punch.create":
      return `New punch item · ${op.location}`;
    case "punch.update":
      return `Edit punch item #${itemNumber(view, op.itemId)}`;
    case "punch.void":
      return `Remove punch item #${itemNumber(view, op.itemId)}`;
    case "punch.verify":
      return `Verify punch item #${itemNumber(view, op.itemId)}`;
    case "phase.completeWalk":
      return `Mark ${view.phases.find((phase) => phase.id === op.phaseId)?.name ?? "walk"} complete`;
    case "pin.inspect": {
      const pin = view.pins.find((candidate) => candidate.id === op.pinId);
      return `Pin ${pin?.number ?? ""} · ${pinStatusLabel[op.status]}`;
    }
    case "report.answer":
      return `Checklist answer · ${reportTag(view, op.reportId)}`;
    case "report.notes":
      return `Jobsite notes · ${reportTag(view, op.reportId)}`;
    case "report.photo":
      return `Photo · ${reportTag(view, op.reportId)}`;
    case "report.submit":
      return `Send ${reportTag(view, op.reportId)} to the office`;
  }
}

export const pinStatusLabel: Record<PinStatus, string> = {
  UNCHECKED: "Not checked",
  PASS: "Pass",
  PUNCH: "Punch",
  NA: "N/A"
};

function itemNumber(view: FieldSnapshot, itemId: string) {
  return view.items.find((item) => item.id === itemId)?.number ?? "";
}

function reportTag(view: FieldSnapshot, reportId: string) {
  const report = view.reports.find((candidate) => candidate.id === reportId);
  const equipment = view.equipment.find((candidate) => candidate.id === report?.equipmentId);
  return equipment?.tag ?? "inspection";
}

/** A phase moves out of Not Started the moment anything is logged on it. */
function touchPhase(snapshot: FieldSnapshot, phaseId: string) {
  snapshot.phases = snapshot.phases.map((phase) => {
    if (phase.id !== phaseId) return phase;
    // Logging onto a completed or closed walk reopens it, as on the server.
    const status: PunchPhaseStatus = phase.status === "IN_PROGRESS" ? phase.status : "IN_PROGRESS";
    return { ...phase, status };
  });
}

function nextItemNumber(snapshot: FieldSnapshot, phaseId: string) {
  const projectId = snapshot.phases.find((phase) => phase.id === phaseId)?.projectId;
  const phaseIds = new Set(snapshot.phases.filter((phase) => phase.projectId === projectId).map((phase) => phase.id));
  return snapshot.items.filter((item) => phaseIds.has(item.phaseId)).reduce((max, item) => Math.max(max, item.number), 0) + 1;
}

function updateReport(snapshot: FieldSnapshot, reportId: string, change: (report: InspectionReport) => InspectionReport) {
  snapshot.reports = snapshot.reports.map((report) => {
    if (report.id !== reportId) return report;
    const next = change(report);
    // Answering the first question starts the inspection.
    return next.status === "READY" ? { ...next, status: "IN_PROGRESS" } : next;
  });
}

/**
 * Apply one op to a snapshot. Used twice: by the device, to lay queued work
 * over the last server snapshot, and by the demo server, as its write path —
 * so the demo cannot drift from what the screens show.
 *
 * `local` marks records that exist only on this device, for the "Not yet
 * synced" treatment.
 */
export function applyOp(input: FieldSnapshot, op: FieldOp, options: { local: boolean; userId: string }): FieldSnapshot {
  const snapshot: FieldSnapshot = { ...input };
  switch (op.kind) {
    case "punch.create": {
      if (snapshot.items.some((item) => item.id === op.id)) return snapshot;
      const item: PunchItem = {
        id: op.id,
        number: nextItemNumber(snapshot, op.phaseId),
        phaseId: op.phaseId,
        status: "OPEN",
        location: op.location,
        description: op.description,
        equipmentId: op.equipmentId,
        responsibleParty: op.responsibleParty,
        createdById: options.userId,
        createdAt: op.createdAt,
        photos: op.photoUris.map((uri, index) => ({ id: `${op.id}-p${index}`, uri, isLocal: options.local })),
        isLocal: options.local,
        provisional: true
      };
      snapshot.items = [...snapshot.items, item];
      touchPhase(snapshot, op.phaseId);
      return snapshot;
    }
    case "punch.update":
      snapshot.items = snapshot.items.map((item) =>
        item.id === op.itemId && item.status === "OPEN"
          ? { ...item, location: op.location, description: op.description, equipmentId: op.equipmentId, responsibleParty: op.responsibleParty }
          : item
      );
      return snapshot;
    case "punch.void":
      snapshot.items = snapshot.items.map((item) =>
        item.id === op.itemId && item.status === "OPEN" ? { ...item, status: "VOID" } : item
      );
      return snapshot;
    case "punch.verify":
      snapshot.items = snapshot.items.map((item) =>
        item.id === op.itemId && item.status !== "VOID" ? { ...item, status: "VERIFIED" } : item
      );
      return snapshot;
    case "phase.completeWalk":
      snapshot.phases = snapshot.phases.map((phase) =>
        phase.id === op.phaseId && phase.status !== "CLOSED" ? { ...phase, status: "WALK_COMPLETE" } : phase
      );
      return snapshot;
    case "pin.inspect": {
      const pin = snapshot.pins.find((candidate) => candidate.id === op.pinId);
      if (!pin) return snapshot;
      const sheet = snapshot.sheets.find((candidate) => candidate.id === pin.sheetId);
      let punchItemId = pin.punchItemId;
      if (op.status === "PUNCH" && sheet) {
        const existing = punchItemId ? snapshot.items.find((item) => item.id === punchItemId) : undefined;
        if (existing) {
          // Re-punching a pin re-syncs its item rather than raising a second one.
          snapshot.items = snapshot.items.map((item) =>
            item.id === existing.id
              ? {
                  ...item,
                  status: item.status === "VOID" || item.status === "VERIFIED" ? "OPEN" : item.status,
                  description: op.note || item.description,
                  photos: [...item.photos, ...op.photoUris.map((uri, index) => ({ id: `${op.id}-p${index}`, uri, isLocal: options.local }))]
                }
              : item
          );
        } else {
          punchItemId = `pin-${op.id}`;
          snapshot.items = [
            ...snapshot.items,
            {
              id: punchItemId,
              number: nextItemNumber(snapshot, sheet.phaseId),
              phaseId: sheet.phaseId,
              status: "OPEN",
              location: [sheet.sheetNumber, `pin ${pin.number}`, pin.roomArea].filter(Boolean).join(" · "),
              description: op.note || `${pin.deviceLabel}: ${pin.description}`,
              equipmentId: null,
              responsibleParty: null,
              createdById: options.userId,
              createdAt: op.createdAt,
              photos: op.photoUris.map((uri, index) => ({ id: `${op.id}-p${index}`, uri, isLocal: options.local })),
              annotationId: pin.id,
              isLocal: options.local,
              provisional: true
            }
          ];
        }
        touchPhase(snapshot, sheet.phaseId);
      } else if (punchItemId && op.status !== "PUNCH") {
        // Changing a punched pin to Pass or N/A takes its open item off the walk.
        snapshot.items = snapshot.items.map((item) =>
          item.id === punchItemId && item.status === "OPEN" ? { ...item, status: "VOID" } : item
        );
      }
      snapshot.pins = snapshot.pins.map((candidate) =>
        candidate.id === op.pinId ? { ...candidate, status: op.status, note: op.note, punchItemId } : candidate
      );
      return snapshot;
    }
    case "report.answer":
      updateReport(snapshot, op.reportId, (report) => ({
        ...report,
        answers: report.answers.map((answer) =>
          answer.id === op.answerId ? { ...answer, status: op.status, comments: op.comments } : answer
        )
      }));
      return snapshot;
    case "report.notes":
      updateReport(snapshot, op.reportId, (report) => ({ ...report, notes: op.notes }));
      return snapshot;
    case "report.photo":
      updateReport(snapshot, op.reportId, (report) =>
        report.photos.some((photo) => photo.id === op.id)
          ? report
          : { ...report, photos: [...report.photos, { id: op.id, uri: op.photoUri, caption: op.caption, isLocal: options.local }] }
      );
      return snapshot;
    case "report.submit":
      snapshot.reports = snapshot.reports.map((report) =>
        report.id === op.reportId && (report.status === "READY" || report.status === "IN_PROGRESS")
          ? { ...report, status: "COMPLETED" }
          : report
      );
      return snapshot;
  }
}

export function applyOps(snapshot: FieldSnapshot, ops: FieldOp[], userId: string): FieldSnapshot {
  return ops.reduce((view, op) => applyOp(view, op, { local: true, userId }), snapshot);
}
