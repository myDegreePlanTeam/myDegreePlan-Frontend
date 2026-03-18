// All shared TypeScript interfaces for the Degree Planner application.
// Every JSON shape, store slice, and service return value is typed here.
// No `any` types are used anywhere in the application.

// ─── JSON Data Shapes ─────────────────────────────────────────────────────────

/** A single degree program entry from degrees.json */
export interface DegreeEntry {
  degreeName: string;
  /** Filename of the corresponding degree plan JSON (e.g. "csc_hpc.json") */
  planFile: string;
}

/** Root shape of degrees.json */
export interface DegreesFile {
  degrees: DegreeEntry[];
}

/** A single class entry in a degree plan JSON file.
 *  Covers all three slot types: fixed course, options group, and free elective. */
export interface PlanEntry {
  /** Course code, "options", or "elective" */
  classCode: string;
  /** Which semester (1–8) this entry belongs to */
  semester: number;
  /** Credit hours — provided for "options" and "elective" slots */
  credits?: number;
  /** Display label for a choice-group slot (when classCode === "options") */
  optionsName?: string;
  /** Array of valid course codes to pick from (when classCode === "options") */
  options?: string[];
}

/** Root shape of a degree plan JSON file (e.g. csc_hpc.json) */
export interface DegreePlan {
  /** Total credit hours required for the degree */
  hours: number;
  classes: PlanEntry[];
}

/** A single course record from coursesFile.json */
export interface Course {
  code: string;
  courseNumber: string;
  subjectCode: string;
  name: string;
  credits: number;
  description: string;
  /** Optional — treat missing as [] */
  prerequisites?: string[];
}

/** Root shape of coursesFile.json */
export interface CoursesFile {
  courses: Course[];
}

// ─── Slot / Tile Types ────────────────────────────────────────────────────────

/** Discriminated union for the three slot types placed in the semester grid. */
export type SlotType = 'fixed' | 'options' | 'elective';

/** A slot placed in the semester grid or in the unscheduled pool. */
export interface Slot {
  /** Stable unique ID for drag-and-drop & React keys */
  id: string;
  type: SlotType;

  // ── Fixed course fields ──
  /** Set for type === "fixed" — the resolved course code */
  courseCode?: string;

  // ── Options slot fields ──
  optionsName?: string;
  options?: string[];
  /** The course code chosen by the student (null = unfilled) */
  selectedOption?: string | null;

  // ── Elective slot fields ──
  /** Credits for options/elective slots */
  slotCredits?: number;
  /** Course code dragged into an elective slot (null = unfilled) */
  electiveCode?: string | null;

  // ── Status ──
  /** Whether the student has marked this course as completed */
  completed: boolean;
}

// ─── Validity / Engine Types ──────────────────────────────────────────────────

/** Result for a single slot from the prerequisite engine */
export interface ValidityResult {
  valid: boolean;
  /** List of prerequisite course codes that are not satisfied */
  missingPrereqs: string[];
}

/** Map from slot.id → validity result, returned by the prerequisite engine */
export type ValidityMap = Map<string, ValidityResult>;

// ─── Application State ────────────────────────────────────────────────────────

/** The application's global state shape (managed by Zustand) */
export interface AppState {
  /** Available degree programs loaded from degrees.json */
  degrees: DegreeEntry[];
  /** Currently selected degree name, or null on the selection screen */
  selectedDegree: string | null;
  /** The loaded degree plan for the selected degree */
  degreePlan: DegreePlan | null;
  /** 8 semester columns — semesters[0] is Semester 1, etc. */
  semesters: Slot[][];
  /** Slots removed from the grid (fixed-plan courses not yet placed) */
  unscheduled: Slot[];
  /** Set of course codes the student has marked as completed (transfer credit, etc.) */
  completedCodes: Set<string>;
  /** Prerequisite validity map, updated reactively after every plan mutation */
  validityMap: ValidityMap;
  /** O(1) lookup map built from coursesFile.json on startup */
  courseMap: Map<string, Course>;
  /** All department/subject codes from codesFile.json */
  subjectCodes: string[];
  /** Whether initial data has finished loading */
  loaded: boolean;
  /** Error message if data loading failed */
  loadError: string | null;
}
