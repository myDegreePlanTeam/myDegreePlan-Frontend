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

export interface PlacementRequirement {
  type: string;
  subject: string;
  minimumScore: number;
  description: string;
}

/** An OR-group prerequisite: any ONE course in the group satisfies it. */
export interface PrerequisiteGroup {
  type: 'OR';                // Currently only OR needed; AND is the default array behavior
  courses: string[];         // Any ONE of these satisfies the group
  description?: string;      // Optional human-readable label e.g. "Communications requirement"
}

/** A single course record from coursesFile.json */
export interface Course {
  code: string;
  courseNumber: string;
  subjectCode: string;
  name: string;
  credits: number;
  description: string;
  /** Optional — treat missing as []. All must be satisfied (AND logic). */
  prerequisites?: string[];
  /** Optional OR-groups — each group requires ONE course to be satisfied. */
  prerequisiteGroups?: PrerequisiteGroup[];
  corequisites?: string[];
  placementRequirements?: PlacementRequirement[];
}

/** Root shape of coursesFile.json */
export interface CoursesFile {
  courses: Course[];
}

// ─── Academic Rules Knowledge Layer Types ─────────────────────────────────────

export type SatisfactionMethod =
  | 'course'           // Standard TTU course completion
  | 'transfer'         // Transfer course equivalency accepted
  | 'ap'               // AP exam score
  | 'ib'               // IB exam score
  | 'clep'             // CLEP exam
  | 'act'              // ACT sub-score threshold
  | 'sat'              // SAT sub-score threshold
  | 'math_placement'   // TTU math placement test result
  | 'english_placement'// TTU English placement test result
  | 'dual_enrollment'  // Dual enrollment / early college credit
  | 'military'         // Military credit (ACE recommendations)
  | 'dept_approval'    // Departmental permission / instructor approval
  | 'waiver';          // Dean's waiver

export interface PlacementGate {
  method: SatisfactionMethod;
  subject?: string;         // e.g. "Math", "English", "Reading"
  minimumScore?: number;    // e.g. ACT Math >= 26, AP Calc score >= 3
  examName?: string;        // e.g. "AP Calculus AB", "CLEP College Algebra"
  placementLevel?: number;  // For internal placement test scales
  description: string;      // Human-readable explanation shown in the UI
}

export interface CourseEquivalency {
  ttuCourseCode: string;     // The TTU course this satisfies
  institutionName: string;   // Sending institution name
  institutionCode?: string;  // Optional FICE/OPEID code
  externalCode: string;      // Course code at the sending institution
  externalName: string;      // Course name at the sending institution
  credits: number;
  source: 'TTP' | 'ARTIC' | 'manual' | 'dept_approved';
  notes?: string;
}

export interface AcademicRule {
  courseCode: string;
  satisfactionMethods: SatisfactionMethod[];
  placementGates?: PlacementGate[];
  minimumGrade?: string;          // e.g. "C" — some courses require C or better
  notes?: string;                 // Policy notes shown to student
  /** When true, placement satisfaction silently bypasses prerequisites
   *  without adding a slot or credit to Prior Learning. Used for courses
   *  like MATH1710/1720/1730 that are skipped (not earned) via ACT scores. */
  bypassOnly?: boolean;
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

  // ── Prior Learning Source ──
  /** How this slot was added to the plan (undefined = user-placed or degree template) */
  source?: 'placement' | 'transfer' | 'exam';
  /** Human-readable label for the source (e.g., "ACT Math ≥ 27", "AP Calculus AB") */
  sourceLabel?: string;
}

// ─── Validity / Engine Types ──────────────────────────────────────────────────

/** Result for a single slot from the prerequisite engine */
export interface ValidityResult {
  valid: boolean;
  /** List of prerequisite course codes that are not satisfied */
  missingPrereqs: string[];
  /** List of corequisite course codes that are not satisfied */
  missingCoreqs: string[];
  /** Prerequisites placed in the same semester (invalid but present in plan) */
  sameSemesterPrereqs?: string[];
  /** Detailed record of exactly how each prerequisite was fulfilled */
  satisfactionDetails?: {
    prereqCode: string;
    satisfiedBy: SatisfactionMethod | 'plan' | 'completed';
  }[];
}

/** A notification shown to the user about plan changes or warnings */
export interface PlanNotification {
  id: string;
  type: 'info' | 'warning' | 'auto-move';
  message: string;
  createdAt: number;
  courseCodes?: string[];
}

/** Map from slot.id → validity result, returned by the prerequisite engine */
export type ValidityMap = Map<string, ValidityResult>;

// ─── Placement & Transfer Types ───────────────────────────────────────────────

export interface PlacementScores {
  actMath?: number;
  actEnglish?: number;
  actReading?: number;
  actScience?: number;
  mathPlacementLevel?: number;
  englishPlacementLevel?: number;
}

export interface TransferCourse {
  code: string;
  sourceInstitution: string;
  originalCode: string;
  credits: number;
  grade: string;
  equivalency?: string;
}

export interface ExamCredit {
  examType: 'ap' | 'ib' | 'clep';
  examName: string;
  score: number;
  ttuEquivalent: string[];
  credits: number;
}

// ─── Application State ────────────────────────────────────────────────────────

/** The application's global state shape (managed by Zustand) */
export interface AppState {
  /** Available degree programs loaded from degrees.json */
  degrees: DegreeEntry[];
  /** Currently selected degree name, or null on the selection screen */
  selectedDegree: string | null;
  /** The loaded degree plan for the selected degree */
  degreePlan: DegreePlan | null;
  /** 9 semester columns — semesters[0] is Transfer, semesters[1] is Sem 1, etc. */
  semesters: Slot[][];
  /** Slots removed from the grid (fixed-plan courses not yet placed) */
  unscheduled: Slot[];
  /** Set of course codes the student has marked as completed (transfer credit, etc.) */
  completedCodes: Set<string>;
  /** Placement test scores for satisfying placementRequirements */
  placementScores: PlacementScores;
  /** Manually entered transfer courses */
  transferCourses: TransferCourse[];
  /** AP/IB/CLEP Exam Credits */
  examCredits: ExamCredit[];
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
  /** User-facing notifications (auto-move cascades, warnings, etc.) */
  notifications: PlanNotification[];
}
