/**
 * The field app's view of the QC record.
 *
 * These mirror the server's Prisma enums (prisma/schema.prisma) so a value the
 * server sends needs no translation, but they are only what an inspector needs
 * to walk assigned work. Office concepts — approvals, delivery, recipients —
 * are deliberately absent: the field app never offers them.
 */

export type Role = "INSPECTOR" | "ADMIN";

export interface FieldUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type PunchPhaseStatus = "NOT_STARTED" | "IN_PROGRESS" | "WALK_COMPLETE" | "CLOSED";
export type PunchItemStatus = "OPEN" | "SENT" | "AWAITING_VERIFICATION" | "VERIFIED" | "VOID";
export type ReportStatus = "READY" | "IN_PROGRESS" | "COMPLETED" | "APPROVED" | "SUBMITTED";
export type EquipmentType = "TRANSFORMER" | "DISCONNECT" | "ATS" | "PANEL_BOARD" | "SWITCHGEAR";
export type GearPhase = "ROUGH_IN" | "INTERIM" | "FINAL";
export type PinStatus = "UNCHECKED" | "PASS" | "PUNCH" | "NA";
export type AnswerStatus = "yes" | "no" | "n/a" | "";

export interface Photo {
  id: string;
  /** Server URL, or a local file:// URI while the photo is still queued. */
  uri: string;
  caption?: string;
  isLocal?: boolean;
}

export interface Equipment {
  id: string;
  tag: string;
  location: string;
  type: EquipmentType;
}

export interface PunchItem {
  id: string;
  number: number;
  phaseId: string;
  status: PunchItemStatus;
  location: string;
  description: string;
  equipmentId: string | null;
  responsibleParty: string | null;
  createdById: string;
  createdAt: string;
  photos: Photo[];
  /** Set when the item was raised from a drawing pin. */
  annotationId?: string | null;
  isLocal?: boolean;
  /**
   * The id was made on this phone. The server stores the item under its own
   * id, so a change sent with this one would be refused; changes wait until a
   * snapshot from the server replaces the item.
   */
  provisional?: boolean;
}

export interface PunchPhase {
  id: string;
  projectId: string;
  name: string;
  status: PunchPhaseStatus;
  sortOrder: number;
  /** Whether the phase carries a drawing set (Mason and similar QC modules). */
  hasDrawings: boolean;
}

export interface Pin {
  id: string;
  number: number;
  sheetId: string;
  /** 0–1 of the page, never screen pixels (docs/ANNOTATION_CONTRACT.md). */
  x: number;
  y: number;
  deviceLabel: string;
  description: string;
  roomArea: string | null;
  status: PinStatus;
  note: string | null;
  punchItemId: string | null;
}

export interface Sheet {
  id: string;
  phaseId: string;
  sheetNumber: string;
  title: string;
  revision: string;
  /** A raster of the current issue's page, sized for a phone or tablet. */
  imageUri: string;
  /** A bundled image, for the demo's sheets. */
  imageAsset?: number;
  /** Pixel aspect of the image, width / height, so pins can be laid out before it loads. */
  aspect: number;
}

export interface ChecklistAnswer {
  id: string;
  section: string;
  prompt: string;
  status: AnswerStatus;
  comments: string;
}

export interface InspectionReport {
  id: string;
  projectId: string;
  equipmentId: string;
  inspectorId: string;
  gearPhase: GearPhase;
  status: ReportStatus;
  notes: string;
  answers: ChecklistAnswer[];
  photos: Photo[];
  openIssues: { id: string; description: string; status: string }[];
}

export interface Project {
  id: string;
  name: string;
  jobNumber: string;
  address: string;
}

/**
 * Everything assigned to one inspector, downloaded as a unit so the whole walk
 * works in a basement. The server scopes it: an inspector receives only
 * projects they are assigned to.
 */
export interface FieldSnapshot {
  user: FieldUser;
  fetchedAt: string;
  projects: Project[];
  equipment: (Equipment & { projectId: string })[];
  phases: PunchPhase[];
  items: PunchItem[];
  sheets: Sheet[];
  pins: Pin[];
  reports: InspectionReport[];
}
