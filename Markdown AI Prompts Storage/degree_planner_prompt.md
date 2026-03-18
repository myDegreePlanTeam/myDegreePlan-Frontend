# Degree Planner — AI IDE Prompt
> **Target:** Google Antigravity AI Code Editor  
> **Role:** Senior Full-Stack Software Engineer  
> **Project:** Degree Planner — Academic Course Map Builder

---

## ROLE & CONTEXT

You are a senior full-stack software engineer with 10+ years of experience
building production-grade academic and enterprise web applications. You have
deep expertise in SPA architecture, drag-and-drop UIs, graph-based dependency
resolution, and responsive design systems.

Before generating any code, briefly justify your chosen tech stack (3–5
sentences). Then generate the complete project structure and all source code
needed to run the application locally.

---

## PROJECT OVERVIEW

Build a fully functional, production-ready web application called
**Degree Planner**. This is a student-facing tool that allows a user to:

1. Select a college degree / major from a list of available programs
2. Visualize their full degree plan across up to 4 years (8 semesters)
3. Map out which courses go in which semester
4. Track which courses they have already completed
5. Have the system enforce prerequisite logic automatically and visually

---

## MINIMUM VIABLE PRODUCT — REQUIRED FEATURES

### 1. Major Selection

- On first load, present a searchable list or dropdown of available degree
  programs, populated dynamically from `degrees.json`
- Selecting a major loads its associated degree plan from the corresponding
  plan file (e.g., selecting the HPC concentration loads `csc_hpc.json`)
- The semester grid initializes with the recommended course sequence from
  that plan file as the starting scaffold
- The user may switch majors at any time; prompt for confirmation before
  clearing the current plan

---

### 2. Semester Grid (The Core Canvas)

- Display a grid of **8 semesters** across **4 years**
  (Year 1 Fall, Year 1 Spring, Year 2 Fall, Year 2 Spring, etc.)
- Each semester is a swimlane or card column that holds course tiles
- Each semester displays:
  - Semester label (e.g., "Year 1 — Fall")
  - Running credit hour count vs. the configurable max (default: 18)
  - Visual overflow warning if credit hours exceed the max
- The grid must be the dominant visual element of the application —
  think of it as a Kanban board built for academic planning

---

### 3. Course Tile Types

Every entry in a degree plan is one of three types. Render each distinctly:

| Type | Condition | Display |
|---|---|---|
| **Fixed Course** | `classCode` is a real course code | Full course tile with code, name, credits |
| **Choice Group** | `classCode === "options"` | Slot labeled with `optionsName`; student picks one course from the `options` array |
| **Free Elective** | `classCode === "elective"` | Open slot labeled "Free Elective" worth `credits` hours; student may assign any catalog course |

- Until a Choice Group slot is filled, it is considered UNFILLED and
  cannot satisfy any prerequisite
- Until a Free Elective slot is filled, it counts toward the semester
  credit load but satisfies no specific prerequisite
- Filled Choice Group and Elective slots should be visually
  distinguishable from their unfilled state

---

### 4. Add / Remove Courses

- A collapsible sidebar or modal presents the full course catalog
  (sourced from `coursesFile.json`)
- The catalog is searchable by course name or code
- The catalog is filterable by department/subject code (sourced from
  `codesFile.json`)
- Users can drag a course from the catalog into any semester slot,
  or use an "Add" button
- Users can remove any course from a semester; removed fixed-plan
  courses return to an "Unscheduled" pool; elective/choice assignments
  simply clear that slot

---

### 5. Drag-and-Drop Course Movement

- Course tiles can be dragged from one semester to another
- Course tiles can be dragged from the Unscheduled pool into any semester
- Course tiles can be reordered within a semester (cosmetic only)
- On every drop event, immediately re-evaluate all prerequisite
  constraints across the entire 8-semester plan
- Dragging a course out of a semester that another course depends on
  must immediately flag the dependent course as invalid

---

### 6. Mark Course as Completed ("Checked Off")

- Each course tile has a toggle (checkbox or button) to mark it as
  **Completed** — representing transfer credit or a previously passed course
- Completed courses are visually distinct: use a filled/green state with
  a checkmark icon
- Completed courses are treated as fully satisfied prerequisites for all
  subsequent semesters — they do not need to appear in an earlier semester
  of the plan grid to count
- Toggling a course from Completed back to Incomplete immediately
  re-runs prerequisite validation across the entire plan

---

### 7. Prerequisite Enforcement Engine

Implement prerequisite validation as a **pure, testable utility function**
using directed acyclic graph (DAG) traversal. This is the most critical
piece of business logic in the application.

**Rules:**

- A course placed in Semester N is **VALID** if and only if ALL courses
  in its `prerequisites` array satisfy at least one of the following:
  - They appear in Semesters 1 through N−1 in the current plan, OR
  - They are marked as **Completed**
- A course is **INVALID** if any prerequisite is:
  - Absent from the plan entirely
  - Placed in the same semester (N) as the course itself
  - Placed in a later semester (N+1 or beyond)
  - An unfilled Choice Group or Elective slot
- Courses with no `prerequisites` field or an empty `prerequisites`
  array are always valid from a prerequisite standpoint
- Prerequisite validation must be **reactive** — any change to the plan
  (drag, add, remove, complete toggle, choice selection) immediately
  re-evaluates the entire grid

**Implementation requirements:**

- Build this as a standalone service (e.g., `src/services/prerequisiteEngine.ts`)
- The function signature should accept the full plan state and return a
  map of `courseCode → { valid: boolean, missingPrereqs: string[] }`
- Write inline comments explaining the DAG traversal logic

---

### 8. Invalid Placement Warning System

- Courses failing prerequisite validation are marked **INVALID** with:
  - A prominent red border or background on the course tile
  - A warning icon on the tile
  - A tooltip or popover on hover listing exactly which prerequisites
    are missing and why
- A persistent summary bar or panel displays the total number of invalid
  placements across the full plan
- The summary bar should also display:
  - Total credits scheduled vs. degree requirement
  - Number of completed courses
  - Estimated degree completion percentage

---

### 9. Persistence

- Persist the user's full plan state to `localStorage` on every change
- On page load, restore from `localStorage` if a saved plan exists
- Provide a "Reset Plan" button that clears localStorage and reloads
  the default recommended sequence for the selected degree

---

## DATA LAYER — JSON-DRIVEN ARCHITECTURE

All application data is supplied via four external JSON files located in
a `/data` directory. **The app must never hardcode any degree name, course
code, department code, credit value, or prerequisite.** All values must
be read dynamically from these files. Swapping or extending these files
must require zero code changes.

---

### FILE 1: `degrees.json`

Defines the list of available degree programs displayed on the selection
screen.

```json
{
  "degrees": [
    { "degreeName": "Computer Science: No Concentration" },
    { "degreeName": "Computer Science: Data Science and Artificial Intelligence Concentration" },
    { "degreeName": "Computer Science: Cybersecurity Concentration" },
    { "degreeName": "Computer Science: High Performance Computing Concentration" }
  ]
}
```

- `degreeName` is both the display label and the lookup key for finding
  the correct degree plan file
- The degree selection UI must render dynamically from however many
  entries exist in this file — adding a new degree here must
  automatically surface it in the UI

---

### FILE 2: `[degreePlan].json` (e.g., `csc_hpc.json`)

One file per degree. Defines the recommended semester-by-semester course
sequence. The application loads the matching plan file when a degree is
selected (use a deterministic naming convention or a manifest mapping
`degreeName` → filename).

```json
{
  "hours": 120,
  "classes": [
    {
      "classCode": "CSC1020",
      "semester": 1
    },
    {
      "classCode": "options",
      "semester": 2,
      "optionsName": "Social/Behavioral Science Elective",
      "credits": 3,
      "options": [
        "AGBE2010",
        "ANTH1100",
        "ECON2010",
        "ECON2020",
        "PSY1030",
        "SOC1010"
      ]
    },
    {
      "classCode": "elective",
      "semester": 5,
      "credits": 3
    }
  ]
}
```

**Field reference:**

| Field | Type | Description |
|---|---|---|
| `hours` | number | Total credit hours required to complete the degree |
| `classes` | array | Ordered list of all course entries across all 8 semesters |
| `classCode` | string | Course code, `"options"`, or `"elective"` |
| `semester` | integer (1–8) | Which semester this entry belongs to |
| `optionsName` | string | Display label for a Choice Group slot (only when `classCode === "options"`) |
| `credits` | number | Credit hours for the slot (only on `options` and `elective` entries) |
| `options` | string[] | Array of valid course codes the student may choose from (only when `classCode === "options"`) |

---

### FILE 3: `coursesFile.json`

The master catalog of all courses. There are 3,100+ entries. Every
course anywhere in the application is resolved from this file.

```json
{
  "courses": [
    {
      "code": "ACCT3150",
      "courseNumber": "3150",
      "subjectCode": "ACCT",
      "name": "Accounting Analytics",
      "credits": 3,
      "description": "Prerequisite: ACCT 2110 and ACCT 2120...",
      "prerequisites": [
        "ACCT2110",
        "ACCT2120"
      ]
    }
  ]
}
```

**Field reference:**

| Field | Type | Notes |
|---|---|---|
| `code` | string | Primary unique identifier — used as the foreign key in all other files |
| `courseNumber` | string | Numeric portion of the course code |
| `subjectCode` | string | Department prefix (e.g., `"CSC"`, `"MATH"`) — matches entries in `codesFile.json` |
| `name` | string | Human-readable course name |
| `credits` | number | Credit hour value |
| `description` | string | Full course description — shown in hover tooltips |
| `prerequisites` | string[] | Optional. Array of `code` values that must be satisfied. If absent, treat as `[]` |

---

### FILE 4: `codesFile.json`

A flat array of all valid department/subject codes. Used to populate
the department filter in the course catalog sidebar.

```json
["ACCT", "AGBE", "BIOL", "CSC", "ECON", "ENGL", "MATH", "PHYS", "..."]
```

---

### Data Relationship Map

```
degrees.json
    └── degreeName
            └──► resolves to ──► [degreePlan].json
                                        └── classCode (fixed)
                                                └──► resolves to ──► coursesFile.json
                                                                          └── prerequisites[]
                                                                                  └──► self-referential ──► coursesFile.json
                                        └── options[] (choice group)
                                                └──► each value resolves to ──► coursesFile.json

codesFile.json
    └──► used to filter/group courses from coursesFile.json in the catalog UI
```

---

### Critical Data Implementation Notes

1. Index `coursesFile.json` into a `Map<code, Course>` on startup for
   O(1) lookups — never iterate the full array to find a single course.
2. A `prerequisites` field that is absent must be treated identically to
   an empty array `[]` — never throw on missing fields.
3. Unfilled `options` and `elective` slots must NOT satisfy any
   prerequisite, even if the slot itself has a credit value.
4. The degree plan files may reference course codes not present in
   `coursesFile.json` (e.g., generic elective placeholders). Handle
   missing lookups gracefully — show the code itself if the full record
   cannot be resolved, and do not crash.
5. Do not hardcode any mapping between `degreeName` and plan filename.
   Use a manifest, a naming convention function, or include a `planFile`
   field in `degrees.json` — your choice, but document it.

---

## UI / UX REQUIREMENTS

- The interface must feel **clean, modern, and academic** — a refined
  university portal, not a toy or generic CRUD app
- The **semester grid is the hero of the UI** — it should dominate the
  viewport and feel like a professional visual planner
- Course tiles must display at minimum:
  - Course code (bold, prominent)
  - Course name
  - Credit hours
  - Status indicator: Completed ✓ | Invalid ⚠ | Valid (default)
- A collapsible sidebar contains:
  - Course catalog (searchable + filterable by department)
  - Unscheduled courses pool
  - Degree progress summary (credits earned / total, % complete, invalid count)
- Hover tooltips or popovers on course tiles show:
  - Full course description
  - Complete prerequisite list with satisfaction status per prereq
- All state changes must feel **instant and reactive** — no full page
  reloads, no loading spinners for local operations
- The application must be **fully responsive**: desktop-first,
  tablet-friendly minimum

---

## TECHNICAL REQUIREMENTS

### Stack Selection

Choose the stack you believe is best suited for this application.
Justify your choice in 3–5 sentences before generating any code.
Strong candidates include:

- **React + TypeScript + Tailwind CSS + dnd-kit** *(recommended baseline)*
- Vue 3 + TypeScript + UnoCSS + VueDraggable
- SvelteKit + TypeScript + Tailwind CSS

Regardless of framework, the following are non-negotiable:

- **TypeScript** throughout — no plain JavaScript
- **Drag-and-drop** via a maintained library appropriate for your framework
- **Reactive state management** sufficient to handle cross-semester
  prerequisite invalidation on every plan mutation
- **localStorage persistence** for the full plan state
- **Pure utility functions** for the prerequisite engine — no framework
  coupling in business logic

---

### Project Structure

Organize the project with clean separation of concerns. The following
is a target structure (adapt names to your chosen framework's conventions):

```
/src
  /data                   ← JSON files (degrees, plan files, courses, codes)
  /components
    /Sidebar              ← Catalog, unscheduled pool, progress summary
    /SemesterGrid         ← 8-column semester grid
    /CourseTile           ← Individual course chip/card
    /SlotTile             ← Options and Elective slot variants
    /Tooltip              ← Prerequisite detail popovers
    /DegreeSelector       ← Initial major selection view
  /services
    prerequisiteEngine.ts ← Pure DAG validation utility
    creditCalculator.ts   ← Credit hour aggregation utilities
    dataLoader.ts         ← JSON loading and indexing on startup
  /store (or /state)      ← Global reactive state (plan, selections, validity map)
  /types
    index.ts              ← All shared TypeScript interfaces and types
/data
  degrees.json
  csc_hpc.json
  coursesFile.json
  codesFile.json
```

---

### Code Quality Standards

Write this code as if it will be handed off to a team of engineers:

- Clear, intention-revealing naming throughout
- Inline comments on all non-trivial logic, especially the DAG traversal
- Consistent formatting (Prettier-compatible)
- No `any` types in TypeScript
- All TypeScript interfaces for JSON shapes defined in `/types`
- The prerequisite engine must be written as a pure function with no
  side effects and no imports from UI code

---

## DELIVERABLES

Generate the following in order:

1. **Stack justification** (3–5 sentences)
2. **Complete project file tree** showing every file to be created
3. **All source code files**, complete and ready to run — no placeholders,
   no `// TODO` stubs for required features
4. **`README.md`** containing:
   - How to install dependencies and run locally
   - How to add a new degree (which files to touch and how)
   - How to swap in a new `coursesFile.json`
   - A plain-English explanation of how the prerequisite engine works
   - Known limitations or future enhancement suggestions

---

## CONSTRAINTS & REMINDERS

- Do **not** hardcode any course code, department, credit value,
  prerequisite, or degree name anywhere in application logic
- Do **not** build a backend, authentication system, or database —
  this is a fully client-side application for MVP
- Do **not** use `any` in TypeScript
- The prerequisite engine must be a **pure function** — no UI imports,
  no side effects
- Handle missing or malformed JSON fields **gracefully** — never crash
  on absent optional fields like `prerequisites`
- The app must remain fully functional with only the four provided
  JSON files and no network requests beyond initial asset loading

---

*Begin with your stack justification, then generate the complete project.*
