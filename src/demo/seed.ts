import type {
  ChecklistAnswer,
  Equipment,
  EquipmentType,
  FieldSnapshot,
  GearPhase,
  InspectionReport,
  Pin,
  PunchItem,
  PunchPhase,
  Sheet
} from "@/lib/types";
import sheetSpec from "./sheets.json";

/**
 * The demo inspector's assigned work: the same projects, phases and gear
 * checklists as `prisma/seed.mjs` and `lib/gear-checklists.mjs` on the server,
 * so the demo shows what the app really asks. Nothing here reaches a server.
 */

export const DEMO_USER = {
  id: "demo-inspector",
  name: "Marcus Hill",
  email: "marcus.hill@ecinc.us",
  role: "INSPECTOR" as const
};

const sheetImages: Record<string, number> = {
  "e-101.png": require("../../assets/demo/e-101.png"),
  "e-201.png": require("../../assets/demo/e-201.png")
};

const CHECKLISTS: Record<EquipmentType, Record<GearPhase, string[]>> = {
  ATS: {
    ROUGH_IN: ["Label is installed per job requirements", "Working clearance according to code", "Are bond bushings installed on line and load?"],
    INTERIM: ["Wiring neat and professional", "Wires landed correctly", "Correct wire size", "Fuse amperage matches specification"],
    FINAL: ["Equipment is clean", "Equipment is free from damage", "Wiring is free from damage", "All unused openings have knockout plugs", "Grounded properly", "All conduits entering and leaving are properly supported"]
  },
  DISCONNECT: {
    ROUGH_IN: ["Label is installed per job requirements", "Working clearance according to code", "Are bond bushings installed on line and load?"],
    INTERIM: ["Wiring neat and professional", "Wires landed correctly", "Correct wire size", "Fuse amperage matches specification"],
    FINAL: ["Equipment is clean", "Equipment is free from damage", "Wiring is free from damage", "All unused openings have knockout plugs", "Grounded properly", "All conduits entering and leaving are properly supported"]
  },
  TRANSFORMER: {
    ROUGH_IN: ["Transformer bakelite label(s) have been installed per specification.", "Is paint and finish in acceptable condition", "Cover is installed", "Size, type, and NEMA rating match specification", "Is grounding and bonding properly sized and bonded", "Proper clearances", "Is it protected (plastic and cardboard)"],
    INTERIM: ["Unit is on isolation pads", "Are PVCs stubbed up high enough", "Is wiring neat and professional"],
    FINAL: ["Ground bushings are installed", "Are all screws in place", "Ground to steel", "X0 is bonded to ground", "Equipment is clean", "Wiring is free from damage", "All conduits entering and leaving are properly supported"]
  },
  PANEL_BOARD: {
    ROUGH_IN: ["Panel designation label has been installed per specifications", "Panel paint and finish are in factory condition", "Covers are installed and flush with the wall, or secured to the panel", "Do all breakers match panel schedule?", "Isolated grounding is installed per specifications", "Enclosures are free from construction dust and debris"],
    INTERIM: ["90 degrees", "Ground neutral bar properly installed and separate", "Access/clearance per NEC, local codes and contract specifications", "Proper mounting height", "Panel is level", "Are bottom entry conduits level and even", "Is wiring neat and professional"],
    FINAL: ["Proper bushings and grounding bushings are used", "Proper size and color wiring", "Feeders and branch circuits are not run together in the same nipple", "Are all screws in place", "Is bakelite label and arc flash label in place", "All spare breakers are turned off", "All filler plates are in place", "Wiring is free from damage", "All unused openings have knockout plugs", "Panel schedules are complete, typewritten, and accurate."]
  },
  SWITCHGEAR: {
    ROUGH_IN: ["Panel designation label has been installed per specifications", "Panel paint and finish are in factory condition", "Covers are installed and flush with the wall, or secured to the panel", "Do all breakers match panel schedule?", "Isolated grounding is installed per specifications", "Enclosures are free from construction dust and debris"],
    INTERIM: ["90 degrees", "Ground neutral bar properly installed and separate", "Access/clearance per NEC, local codes and contract specifications", "Proper mounting height", "Panel is level", "Are bottom entry conduits level and even", "Is wiring neat and professional"],
    FINAL: ["Proper bushings and grounding bushings are used", "Proper size and color wiring", "Feeders and branch circuits are not run together in the same nipple", "Are all screws in place", "Is bakelite label and arc flash label in place", "Are all cable terminations torqued according to specs?", "Are all endbells installed on", "All spare breakers are turned off", "All filler plates are in place", "Wiring is free from damage", "All unused openings have knockout plugs", "Panel schedules are complete, typewritten, and accurate."]
  }
};

const PHASE_SECTION: Record<GearPhase, string> = { ROUGH_IN: "Rough In", INTERIM: "In Progress", FINAL: "Final" };

function checklist(reportId: string, type: EquipmentType, phase: GearPhase, answered = 0): ChecklistAnswer[] {
  // General items first, then the phase's questions — the same shape as a
  // published template: one section per heading.
  const general = ["Equipment matches the approved submittal", "Nameplate data recorded"];
  const prompts = [
    ...general.map((prompt) => ({ section: "General", prompt })),
    ...CHECKLISTS[type][phase].map((prompt) => ({ section: PHASE_SECTION[phase], prompt }))
  ];
  return prompts.map((entry, index) => ({
    id: `${reportId}-a${index + 1}`,
    section: entry.section,
    prompt: entry.prompt,
    status: index < answered ? (index === 3 ? "no" : "yes") : "",
    comments: index === 3 && index < answered ? "Knockout missing on the top-left of the enclosure." : ""
  }));
}

const PHASE_NAMES = ["Mason", "Ceiling Inspection", "Lighting Final", "Disconnect", "Gear", "Electrical Completion"];

export function buildDemoSnapshot(): FieldSnapshot {
  const projects = [
    { id: "p-ore", name: "Oak Ridge Elementary", jobNumber: "ORE-26033", address: "2650 Cedar Lane, Knoxville, TN" },
    { id: "p-rmo", name: "Riverfront Medical Office", jobNumber: "RMO-26012", address: "1140 Riverside Parkway, Chattanooga, TN" },
    { id: "p-cpd", name: "Cedar Point Distribution Center", jobNumber: "CPD-26044", address: "9100 Logistics Way, Murfreesboro, TN" }
  ];

  const phases: PunchPhase[] = projects.flatMap((project) =>
    PHASE_NAMES.map((name, index) => ({
      id: `${project.id}-ph${index + 1}`,
      projectId: project.id,
      name,
      sortOrder: index,
      hasDrawings: name === "Mason" && project.id === "p-ore",
      status: project.id === "p-ore" && index === 0 ? "IN_PROGRESS" : project.id === "p-rmo" && index < 2 ? (index === 0 ? "CLOSED" : "IN_PROGRESS") : "NOT_STARTED"
    }))
  );

  const equipment: (Equipment & { projectId: string })[] = [
    { id: "eq-ore-msb", projectId: "p-ore", tag: "MSB", location: "Elec 107", type: "SWITCHGEAR" },
    { id: "eq-ore-lp1a", projectId: "p-ore", tag: "LP-1A", location: "Elec 107", type: "PANEL_BOARD" },
    { id: "eq-ore-t1", projectId: "p-ore", tag: "T-1", location: "Elec 107", type: "TRANSFORMER" },
    { id: "eq-ore-ds3", projectId: "p-ore", tag: "DS-3", location: "Mech 106", type: "DISCONNECT" },
    { id: "eq-rmo-ats1", projectId: "p-rmo", tag: "ATS-1", location: "Generator yard", type: "ATS" },
    { id: "eq-rmo-hp2", projectId: "p-rmo", tag: "HP-2", location: "Level 2 Elec", type: "PANEL_BOARD" },
    { id: "eq-cpd-swbd", projectId: "p-cpd", tag: "SWBD-1", location: "Main electrical", type: "SWITCHGEAR" }
  ];

  const reports: InspectionReport[] = [
    { id: "r-ore-msb", equipmentId: "eq-ore-msb", gearPhase: "FINAL", status: "IN_PROGRESS", answered: 6 },
    { id: "r-ore-lp1a", equipmentId: "eq-ore-lp1a", gearPhase: "ROUGH_IN", status: "READY", answered: 0 },
    { id: "r-ore-t1", equipmentId: "eq-ore-t1", gearPhase: "INTERIM", status: "READY", answered: 0 },
    { id: "r-ore-ds3", equipmentId: "eq-ore-ds3", gearPhase: "FINAL", status: "READY", answered: 0 },
    { id: "r-rmo-ats1", equipmentId: "eq-rmo-ats1", gearPhase: "FINAL", status: "IN_PROGRESS", answered: 4 },
    { id: "r-rmo-hp2", equipmentId: "eq-rmo-hp2", gearPhase: "INTERIM", status: "READY", answered: 0 },
    { id: "r-cpd-swbd", equipmentId: "eq-cpd-swbd", gearPhase: "ROUGH_IN", status: "READY", answered: 0 }
  ].map((entry) => {
    const gear = equipment.find((candidate) => candidate.id === entry.equipmentId)!;
    return {
      id: entry.id,
      projectId: gear.projectId,
      equipmentId: gear.id,
      inspectorId: DEMO_USER.id,
      gearPhase: entry.gearPhase as GearPhase,
      status: entry.status as InspectionReport["status"],
      notes: "",
      answers: checklist(entry.id, gear.type, entry.gearPhase as GearPhase, entry.answered),
      photos: [],
      openIssues:
        entry.id === "r-rmo-ats1"
          ? [{ id: "c-1", description: "Office: confirm the generator-side lugs are torqued and marked.", status: "open" }]
          : []
    };
  });

  const masonPhaseId = "p-ore-ph1";
  const sheets: Sheet[] = sheetSpec.sheets.map((sheet) => ({
    id: sheet.id,
    phaseId: masonPhaseId,
    sheetNumber: sheet.sheetNumber,
    title: sheet.title,
    revision: sheet.revision,
    imageUri: "",
    imageAsset: sheetImages[sheet.image],
    aspect: sheetSpec.width / sheetSpec.height
  }));

  const items: PunchItem[] = [
    {
      id: "pi-ore-1", number: 1, phaseId: masonPhaseId, status: "OPEN",
      location: "E-101 · pin 3 · Classroom 102",
      description: "Box set 4\" low. Reset to 46\" AFF before the wall is grouted.",
      equipmentId: null, responsibleParty: "Masonry sub", createdById: DEMO_USER.id,
      createdAt: "2026-09-22T14:10:00.000Z", photos: [], annotationId: "pin-sheet-e101-3"
    },
    {
      id: "pi-ore-2", number: 2, phaseId: masonPhaseId, status: "SENT",
      location: "Corridor 104, east end",
      description: "Conduit stub bent over at top of wall; needs replacing before bond beam pour.",
      equipmentId: null, responsibleParty: "Masonry sub", createdById: "u-dana",
      createdAt: "2026-09-21T16:40:00.000Z", photos: []
    },
    {
      id: "pi-ore-3", number: 3, phaseId: masonPhaseId, status: "AWAITING_VERIFICATION",
      location: "Elec 107",
      description: "Panel can for LP-1A recessed 1/2\" too deep.",
      equipmentId: "eq-ore-lp1a", responsibleParty: "ECI crew", createdById: DEMO_USER.id,
      createdAt: "2026-09-20T13:05:00.000Z", photos: []
    },
    {
      id: "pi-rmo-1", number: 1, phaseId: "p-rmo-ph2", status: "OPEN",
      location: "Level 2 corridor, grid C-4",
      description: "Two ceiling boxes missing covers above the nurse station.",
      equipmentId: null, responsibleParty: "ECI crew", createdById: DEMO_USER.id,
      createdAt: "2026-09-23T15:30:00.000Z", photos: []
    }
  ];

  const pins: Pin[] = sheetSpec.sheets.flatMap((sheet) =>
    sheet.pins.map((pin, index) => {
      const id = `pin-${sheet.id}-${index + 1}`;
      return {
        id,
        number: index + 1,
        sheetId: sheet.id,
        x: pin.x,
        y: pin.y,
        deviceLabel: pin.device,
        description: pin.description,
        roomArea: pin.room,
        status: pin.status as Pin["status"],
        note: "note" in pin ? (pin.note as string) : null,
        punchItemId: items.find((item) => item.annotationId === id)?.id ?? null
      };
    })
  );

  return {
    user: DEMO_USER,
    fetchedAt: new Date().toISOString(),
    projects,
    equipment,
    phases,
    items,
    sheets,
    pins,
    reports
  };
}
