# Degree Planner — Update, Bug Fix & Expansion Prompt
> **Target:** Google Antigravity Agentic AI Code Editor  
> **Role:** Senior Full-Stack Software Engineer  
> **Scope:** Bug fixes, logic corrections, data expansion, infrastructure additions, and feature enhancements to the existing Degree Planner application

---

## ROLE & CONTEXT

You are a senior full-stack software engineer continuing development on the
**Degree Planner** application — a student-facing academic course mapping tool
built for Tennessee Technological University (TTU). You have full access to all
existing project files. Your job in this session is to:

1. Fix all confirmed bugs
2. Correct prerequisite and corequisite logic errors
3. Expand the degree catalog to include all TTU Bachelor's degree programs
4. Add infrastructure for future features (transfer credits, ACT scores, student accounts)
5. Enable "What-If" academic scenario planning
6. Set up catalog web scraping infrastructure
7. Update `README.md` and `degree_planner_prompt.md` to reflect all changes

**Work through each section below in order. Do not skip sections. Confirm
completion of each section before proceeding to the next.**

---

## SECTION 1 — BUG FIXES (Critical, Fix First)

### 1.1 — Horizontal Scroll Visual Lag

**Problem:** When scrolling the semester grid side-to-side, there is a
noticeable visual lag in the UI rendering.

**Fix:**
- Audit the semester grid container's CSS for any properties causing
  expensive repaints (e.g., `box-shadow`, `border-radius`, `filter`,
  `opacity` transitions applied to large containers)
- Apply `will-change: transform` and `transform: translateZ(0)` to the
  scrollable grid container to promote it to its own compositor layer
- Ensure the grid uses `overflow-x: auto` with `scroll-behavior: auto`
  (not `smooth`) for the horizontal axis — smooth scrolling adds
  perceived lag on drag-heavy UIs
- If using a virtual scroll library, verify it is configured correctly
  for horizontal panning
- Test the fix across Chrome, Firefox, and Safari

---

### 1.2 — TypeScript Errors in `planStore.ts` and `main.tsx`

**Problem:** Red-squiggly TypeScript errors exist in `planStore.ts` and
`main.tsx`. These may be type errors, missing imports, incorrect interface
shapes, or improper generic usage.

**Fix:**
- Open both files and resolve every TypeScript diagnostic error fully
- Do NOT suppress errors with `@ts-ignore` or `any` casts — fix the
  root cause in each case
- Ensure all interfaces in `/types/index.ts` accurately reflect the
  actual data shapes being used in the store and entry point
- Run `tsc --noEmit` and confirm zero errors before proceeding

---

## SECTION 2 — PREREQUISITE & COREQUISITE LOGIC CORRECTIONS

### 2.1 — Corequisite Support (New Concept)

**Problem:** The application currently only models prerequisites (must be
taken *before*). Corequisites (must be taken *at the same time or before*)
are not supported. The first known case:

> **MATH1910** (Calculus I) is a **corequisite** of **CSC1300**

There are likely other corequisite relationships in the course catalog.

**Fix:**

**Data layer:**
- Add a `corequisites` field to the course schema in `coursesFile.json`
  (alongside the existing `prerequisites` field):
  ```json
  {
    "code": "CSC1300",
    "corequisites": ["MATH1910"]
  }
  ```
- Audit the existing course descriptions in `coursesFile.json` for any
  description text containing the word "corequisite" and extract those
  relationships into the `corequisites` field programmatically or
  manually as discovered
- Update `/types/index.ts` to add `corequisites?: string[]` to the
  `Course` interface

**Prerequisite engine:**
- Update `prerequisiteEngine.ts` to evaluate corequisites with the
  following rule:
  > A corequisite for course X placed in Semester N is **satisfied** if
  > the corequisite course appears in Semester N (same semester) OR any
  > earlier semester, OR is marked as Completed
- Corequisites placed in a *later* semester than X must flag X as invalid
- In the invalid tooltip, distinguish between missing prerequisites
  ("Must be taken before") and missing corequisites ("Must be taken
  concurrently or before")
- Update the validity map shape returned by the engine:
  ```typescript
  {
    valid: boolean,
    missingPrereqs: string[],
    missingCoreqs: string[]
  }
  ```

---

### 2.2 — PC2500 as a Valid Alternative to COMM2025

**Problem:** `PC2500` (Professional Communication) fulfills the same
Communications requirement as `COMM2025` for `CSC3040`. Currently the
application may not recognize `PC2500` as satisfying this prerequisite
or degree slot.

**Fix:**

**Data layer (`csc_hpc.json` and all other CSC degree plan files):**
- Locate the `options` entry for the Communications slot and confirm
  both `"COMM2025"` and `"PC2500"` are present in the `options` array:
  ```json
  {
    "classCode": "options",
    "optionsName": "Communications",
    "credits": 3,
    "options": ["COMM2025", "PC2500"]
  }
  ```
- Apply this same correction to ALL degree plan JSON files that include
  this Communications requirement

**Prerequisite engine:**
- If `CSC3040` has `COMM2025` listed as a prerequisite in
  `coursesFile.json`, update it to treat the Communications slot as
  satisfied by either `COMM2025` OR `PC2500`
- The engine should evaluate OR-groups for prerequisites where
  alternative courses exist — implement an `prerequisiteGroups` concept
  if needed, or use the existing `options` slot satisfaction logic

---

## SECTION 3 — TRANSFER CREDITS COLUMN

### 3.1 — Transfer Credits UI

**Problem:** Courses like `MATH1910` have prerequisites (e.g., `MATH1730`,
`MATH1720`, `MATH1710`) that most students satisfy via high school math or
placement — not by taking TTU courses. There is currently no way to account
for this.

**Fix — Add a "Transfer Credits / Prior Learning" column to the semester grid:**

- Add a special **Semester 0** column labeled **"Transfer & Prior Credits"**
  that appears to the left of Semester 1 in the grid
- This column behaves like any other semester column with the following
  differences:
  - It is labeled distinctly (e.g., badge: "Transfer / AP / Dual Enrollment")
  - Courses placed here are treated as **Completed** for all prerequisite
    purposes — they satisfy prerequisites for any semester 1–8
  - There is no credit hour cap on this column
  - Courses here display with a distinct visual style (e.g., purple or
    teal tile, "TR" badge)
  - A running transfer credit total is shown at the bottom of the column

---

### 3.2 — Transfer Credit Infrastructure (Future-Ready)

Build the following infrastructure stubs now, to be activated when student
account integration is available:

**Create `/src/services/transferImport.ts`:**
```typescript
// STUB: Transfer credit import service
// Supports two future import paths:
//   1. JSON import from student account API
//   2. SQL query result from student information system (SIS)
// Currently: manual entry only (active)
// Future: replace manualTransferEntry() with live account fetch

export interface TransferCourse {
  code: string;           // Course code as recognized at TTU
  sourceInstitution: string;
  originalCode: string;   // Course code at the transfer institution
  credits: number;
  grade: string;
  equivalency?: string;   // TTU equivalent course code, if mapped
}

export async function fetchTransferCreditsFromAccount(
  studentId: string
): Promise<TransferCourse[]> {
  // TODO: Implement when SIS API access is granted
  // Will call: GET /api/student/{studentId}/transfer-credits
  throw new Error("Account-based transfer import not yet implemented.");
}

export async function importTransferCreditsFromJSON(
  json: unknown
): Promise<TransferCourse[]> {
  // TODO: Validate and parse JSON export from student portal
  throw new Error("JSON transfer import not yet implemented.");
}

export function manualTransferEntry(
  courses: TransferCourse[]
): TransferCourse[] {
  // ACTIVE: Returns the manually entered list as-is for use in planStore
  return courses;
}
```

- Wire `manualTransferEntry()` into the plan store so that manually
  added transfer courses populate the Semester 0 column
- Add a UI control (button: "Add Transfer Course") that opens a modal
  allowing manual entry of a transfer course with fields:
  `TTU Equivalent Course` (searchable dropdown from catalog),
  `Original Course Code`, `Source Institution`, `Credits`, `Grade`

---

## SECTION 4 — ACT SCORE / PLACEMENT INFRASTRUCTURE

**Problem:** Some courses in `coursesFile.json` have "descriptive
prerequisites" in their `description` field that reference ACT score
thresholds or placement test results rather than specific TTU course
codes (e.g., "ACT Math score of 19 or higher"). These cannot be
modeled with the current prerequisite system.

**Fix:**

**Data layer:**
- Add a `placementRequirements` optional field to the course schema:
  ```json
  {
    "code": "MATH1910",
    "placementRequirements": [
      {
        "type": "ACT",
        "subject": "Math",
        "minimumScore": 26,
        "description": "ACT Math score of 26 or higher, or completion of MATH1730"
      }
    ]
  }
  ```
- Audit `coursesFile.json` descriptions for ACT/placement language and
  populate `placementRequirements` where found

**Create `/src/services/placementService.ts`:**
```typescript
// STUB: ACT and placement score service
// Currently: manual score entry (active)
// Future: replace with student account API fetch when available
// NOTE: Full implementation pending access to proprietary school data

export interface PlacementScores {
  actMath?: number;
  actEnglish?: number;
  actReading?: number;
  actScience?: number;
  mathPlacementLevel?: number;  // e.g., 1-5 internal scale
  englishPlacementLevel?: number;
}

export async function fetchPlacementScoresFromAccount(
  studentId: string
): Promise<PlacementScores> {
  // TODO: Implement when student data API is accessible
  throw new Error("Account-based placement score fetch not yet implemented.");
}

export function manualPlacementEntry(
  scores: PlacementScores
): PlacementScores {
  // ACTIVE: Returns manually entered scores for use in prerequisite engine
  return scores;
}
```

**UI:**
- Add a "Placement Scores" section to the sidebar or settings panel
- Allow manual entry of ACT sub-scores (Math, English, Reading, Science)
- These scores are stored in plan state and passed to the prerequisite
  engine alongside the course plan
- Update `prerequisiteEngine.ts` to check `placementRequirements` in
  addition to `prerequisites` and `corequisites` when evaluating
  course validity
- If a placement requirement is met by manual score entry, the course
  is valid; if not entered, show a distinct warning:
  "Placement requirement — enter your ACT/placement scores to verify"

---

## SECTION 5 — DEGREE CATALOG EXPANSION

### 5.1 — Expand `degrees.json` to All TTU Bachelor's Degrees

Replace the current `degrees.json` with the full list of TTU Bachelor's
degree programs. Use the exact degree names as listed below. Organize
entries by degree family (use an optional `family` field for grouping
in the UI dropdown/search):

```json
{
  "degrees": [
    { "degreeName": "Accounting", "family": "Business", "planFile": null },
    { "degreeName": "Agriculture, Agribusiness Management Concentration", "family": "Agriculture", "planFile": null },
    { "degreeName": "Agriculture, Agricultural Education and Communication Concentration", "family": "Agriculture", "planFile": null },
    { "degreeName": "Agriculture, Agricultural Engineering Technology Concentration", "family": "Agriculture", "planFile": null },
    { "degreeName": "Agriculture, Agricultural Science and Management Concentration", "family": "Agriculture", "planFile": null },
    { "degreeName": "Agriculture, Agronomy and Precision Agriculture Concentration", "family": "Agriculture", "planFile": null },
    { "degreeName": "Agriculture, Horticulture, Landscape, and Turfgrass Management Concentration", "family": "Agriculture", "planFile": null },
    { "degreeName": "Agriculture, Soil and Water Conservation Concentration", "family": "Agriculture", "planFile": null },
    { "degreeName": "Animal Science, Animal Science Industries Concentration", "family": "Agriculture", "planFile": null },
    { "degreeName": "Animal Science, Poultry Science Concentration", "family": "Agriculture", "planFile": null },
    { "degreeName": "Animal Science, Pre-Veterinary Science Concentration", "family": "Agriculture", "planFile": null },
    { "degreeName": "Art, Art Education Concentration", "family": "Art", "planFile": null },
    { "degreeName": "Art, Clay Concentration", "family": "Art", "planFile": null },
    { "degreeName": "Art, Design Concentration, Digital Media Emphasis", "family": "Art", "planFile": null },
    { "degreeName": "Art, Fibers Concentration", "family": "Art", "planFile": null },
    { "degreeName": "Art, Glass Concentration", "family": "Art", "planFile": null },
    { "degreeName": "Art, Metals Concentration", "family": "Art", "planFile": null },
    { "degreeName": "Art, Painting Concentration", "family": "Art", "planFile": null },
    { "degreeName": "Art, Wood Concentration", "family": "Art", "planFile": null },
    { "degreeName": "Artificial Intelligence", "family": "Computer Science", "planFile": null },
    { "degreeName": "Biology, Botany Concentration", "family": "Biology", "planFile": null },
    { "degreeName": "Biology, Cellular and Molecular Biology Concentration", "family": "Biology", "planFile": null },
    { "degreeName": "Biology, Environmental Biology Concentration", "family": "Biology", "planFile": null },
    { "degreeName": "Biology, Health Sciences Concentration", "family": "Biology", "planFile": null },
    { "degreeName": "Biology, Marine Biology Concentration", "family": "Biology", "planFile": null },
    { "degreeName": "Biology, Microbiology Concentration", "family": "Biology", "planFile": null },
    { "degreeName": "Biology, Zoology Concentration", "family": "Biology", "planFile": null },
    { "degreeName": "Business Information and Technology", "family": "Business", "planFile": null },
    { "degreeName": "Business Information and Technology, Business Intelligence and Analytics Concentration", "family": "Business", "planFile": null },
    { "degreeName": "Business Management, General Management Concentration", "family": "Business", "planFile": null },
    { "degreeName": "Business Management, Human Resource Management Concentration", "family": "Business", "planFile": null },
    { "degreeName": "Business Management, Operations, Logistics, and Supply Chain Management Concentration", "family": "Business", "planFile": null },
    { "degreeName": "Chemical Engineering", "family": "Engineering", "planFile": null },
    { "degreeName": "Chemical Engineering, Bio-Molecular Engineering Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Chemical Engineering, Chemical Process Manufacturing Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Chemical Engineering, Energy and the Environment Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Chemistry, Biochemistry Concentration", "family": "Chemistry", "planFile": null },
    { "degreeName": "Chemistry, Business Chemistry Concentration", "family": "Chemistry", "planFile": null },
    { "degreeName": "Chemistry, Custom Chemistry Concentration", "family": "Chemistry", "planFile": null },
    { "degreeName": "Chemistry, Environmental Chemistry Concentration", "family": "Chemistry", "planFile": null },
    { "degreeName": "Chemistry, Forensic Chemistry Concentration", "family": "Chemistry", "planFile": null },
    { "degreeName": "Chemistry, Health Science Chemistry Concentration", "family": "Chemistry", "planFile": null },
    { "degreeName": "Chemistry, Industrial Chemistry Concentration", "family": "Chemistry", "planFile": null },
    { "degreeName": "Chemistry, Pure Chemistry Concentration", "family": "Chemistry", "planFile": null },
    { "degreeName": "Civil Engineering", "family": "Engineering", "planFile": null },
    { "degreeName": "Civil Engineering, Construction Engineering and Management Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Civil Engineering, Environmental Engineering Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Civil Engineering, Geological Engineering Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Communication, Communication Studies Concentration", "family": "Communication", "planFile": null },
    { "degreeName": "Communication, Journalism Concentration, News Editorial Option", "family": "Communication", "planFile": null },
    { "degreeName": "Communication, Journalism Concentration, Public Relations Option", "family": "Communication", "planFile": null },
    { "degreeName": "Computer Engineering", "family": "Engineering", "planFile": null },
    { "degreeName": "Computer Engineering, Hardware and System Security Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Computer Science", "family": "Computer Science", "planFile": "csc_base.json" },
    { "degreeName": "Computer Science, Data Science and Artificial Intelligence Concentration", "family": "Computer Science", "planFile": "csc_dsai.json" },
    { "degreeName": "Computer Science, High Performance Computing Concentration", "family": "Computer Science", "planFile": "csc_hpc.json" },
    { "degreeName": "Computer Science, Information Assurance and Cybersecurity Concentration", "family": "Computer Science", "planFile": "csc_cyber.json" },
    { "degreeName": "Design Studies, Architecture and Interior Design Concentration", "family": "Design", "planFile": null },
    { "degreeName": "Design Studies, Fashion Merchandising and Design Concentration", "family": "Design", "planFile": null },
    { "degreeName": "Early Childhood Education, Birth-K Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Early Childhood Education, Early Childhood Practitioner Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Early Childhood Education, PreK-3 Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Economics", "family": "Business", "planFile": null },
    { "degreeName": "Electrical Engineering", "family": "Engineering", "planFile": null },
    { "degreeName": "Electrical Engineering, Mechatronics Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Electrical Engineering, Vehicle Engineering Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Elementary Education", "family": "Education", "planFile": null },
    { "degreeName": "Engineering Technology, Engineering Technology Management Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Engineering Technology, Mechatronics Engineering Technology Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Engineering Technology, Smart Manufacturing Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "English, Creative Writing Concentration", "family": "English", "planFile": null },
    { "degreeName": "English, Literature Concentration", "family": "English", "planFile": null },
    { "degreeName": "English, Professional and Technical Communication Concentration", "family": "English", "planFile": null },
    { "degreeName": "English, Rhetoric and Language Concentration", "family": "English", "planFile": null },
    { "degreeName": "English, Theatre Concentration, Performance Option", "family": "English", "planFile": null },
    { "degreeName": "English, Theatre Concentration, Technical Option", "family": "English", "planFile": null },
    { "degreeName": "Environmental and Sustainability Studies, Environmental Leadership, Communication & Policy Concentration", "family": "Environmental Studies", "planFile": null },
    { "degreeName": "Environmental and Sustainability Studies, Environmental Science, Biology Concentration", "family": "Environmental Studies", "planFile": null },
    { "degreeName": "Environmental and Sustainability Studies, Environmental Science, Chemistry Concentration", "family": "Environmental Studies", "planFile": null },
    { "degreeName": "Environmental and Sustainability Studies, Environmental Science, Natural Resources Concentration", "family": "Environmental Studies", "planFile": null },
    { "degreeName": "Environmental and Sustainability Studies, Environmental Sustainability Concentration", "family": "Environmental Studies", "planFile": null },
    { "degreeName": "Environmental and Sustainability Studies, Environmental Technology Concentration", "family": "Environmental Studies", "planFile": null },
    { "degreeName": "Exercise Science, Exercise Physiology Concentration", "family": "Exercise Science", "planFile": null },
    { "degreeName": "Exercise Science, Fitness and Wellness Concentration", "family": "Exercise Science", "planFile": null },
    { "degreeName": "Exercise Science, Licensure Concentration", "family": "Exercise Science", "planFile": null },
    { "degreeName": "Exercise Science, Physical Education Practitioner Concentration", "family": "Exercise Science", "planFile": null },
    { "degreeName": "Exercise Science, Pre-Athletic Training Concentration", "family": "Exercise Science", "planFile": null },
    { "degreeName": "Exercise Science, Pre-Occupational Therapy Concentration", "family": "Exercise Science", "planFile": null },
    { "degreeName": "Exercise Science, Pre-Physical Therapy Concentration", "family": "Exercise Science", "planFile": null },
    { "degreeName": "Exercise Science, Pre-Physician Assistant Concentration", "family": "Exercise Science", "planFile": null },
    { "degreeName": "Exercise Science, Sport Administration Concentration", "family": "Exercise Science", "planFile": null },
    { "degreeName": "Exercise Science, Sport Performance Concentration", "family": "Exercise Science", "planFile": null },
    { "degreeName": "Finance", "family": "Business", "planFile": null },
    { "degreeName": "Foreign Language, Spanish Concentration, Option 1", "family": "Foreign Language", "planFile": null },
    { "degreeName": "Foreign Language, Spanish Concentration, Option 2", "family": "Foreign Language", "planFile": null },
    { "degreeName": "General Art, Dual-Focus Concentration", "family": "Art", "planFile": null },
    { "degreeName": "General Engineering, Joint TTU-ETSU", "family": "Engineering", "planFile": null },
    { "degreeName": "Geosciences, Environmental Geology Concentration", "family": "Geosciences", "planFile": null },
    { "degreeName": "Geosciences, Geography Concentration", "family": "Geosciences", "planFile": null },
    { "degreeName": "Geosciences, Geology Concentration", "family": "Geosciences", "planFile": null },
    { "degreeName": "Geosciences, Geospatial Data Analysis Concentration", "family": "Geosciences", "planFile": null },
    { "degreeName": "Geosciences, Planetary Geology Concentration", "family": "Geosciences", "planFile": null },
    { "degreeName": "History, Arts", "family": "History", "planFile": null },
    { "degreeName": "History, Sciences", "family": "History", "planFile": null },
    { "degreeName": "Human Ecology, Human Development and Family Science Concentration", "family": "Human Ecology", "planFile": null },
    { "degreeName": "Human Ecology, Nutrition and Dietetics Concentration", "family": "Human Ecology", "planFile": null },
    { "degreeName": "Interdisciplinary Computing", "family": "Computer Science", "planFile": null },
    { "degreeName": "Interdisciplinary Studies", "family": "Other", "planFile": null },
    { "degreeName": "International Business and Cultures", "family": "Business", "planFile": null },
    { "degreeName": "Marketing", "family": "Business", "planFile": null },
    { "degreeName": "Mathematics", "family": "Mathematics", "planFile": null },
    { "degreeName": "Mathematics, Actuarial Science Concentration", "family": "Mathematics", "planFile": null },
    { "degreeName": "Mathematics, Applied Mathematics Concentration", "family": "Mathematics", "planFile": null },
    { "degreeName": "Mathematics, Mathematics for Secondary Education Concentration", "family": "Mathematics", "planFile": null },
    { "degreeName": "Mathematics, Pure Mathematics Concentration", "family": "Mathematics", "planFile": null },
    { "degreeName": "Mathematics, Statistics and Data Science Concentration", "family": "Mathematics", "planFile": null },
    { "degreeName": "Mechanical Engineering", "family": "Engineering", "planFile": null },
    { "degreeName": "Mechanical Engineering, Aerospace Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Mechanical Engineering, Mechatronics and Robotics Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Mechanical Engineering, Vehicle Engineering Concentration", "family": "Engineering", "planFile": null },
    { "degreeName": "Multidisciplinary Studies, Computer Science Education Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Multidisciplinary Studies, English as a Second Language Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Multidisciplinary Studies, Generalist Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Multidisciplinary Studies, Middle School English, 6-8 Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Multidisciplinary Studies, Middle School Math, 6-8 Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Multidisciplinary Studies, Middle School Science, 6-8 Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Multidisciplinary Studies, Middle School Social Studies, 6-8 Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Music", "family": "Music", "planFile": null },
    { "degreeName": "Music, Instrumental/General Music, K-12 Licensure Concentration", "family": "Music", "planFile": null },
    { "degreeName": "Music, Live Audio Engineering Technology", "family": "Music", "planFile": null },
    { "degreeName": "Music, Music Performance Concentration, Composition Emphasis", "family": "Music", "planFile": null },
    { "degreeName": "Music, Music Performance Concentration, Instrumental Option", "family": "Music", "planFile": null },
    { "degreeName": "Music, Music Performance Concentration, Jazz Option", "family": "Music", "planFile": null },
    { "degreeName": "Music, Music Performance Concentration, Multiple Woodwinds Option", "family": "Music", "planFile": null },
    { "degreeName": "Music, Music Performance Concentration, Musical Theatre Option", "family": "Music", "planFile": null },
    { "degreeName": "Music, Music Performance Concentration, Piano Option", "family": "Music", "planFile": null },
    { "degreeName": "Music, Music Performance Concentration, Vocal Option", "family": "Music", "planFile": null },
    { "degreeName": "Music, Vocal/General Music, K-12 Licensure Concentration", "family": "Music", "planFile": null },
    { "degreeName": "Nuclear Engineering", "family": "Engineering", "planFile": null },
    { "degreeName": "Nursing", "family": "Nursing", "planFile": null },
    { "degreeName": "Nursing, Accelerated Nursing", "family": "Nursing", "planFile": null },
    { "degreeName": "Nursing, Registered", "family": "Nursing", "planFile": null },
    { "degreeName": "Physics, Applied Physics Concentration", "family": "Physics", "planFile": null },
    { "degreeName": "Physics, Astrophysics Concentration", "family": "Physics", "planFile": null },
    { "degreeName": "Physics, Computational Physics Concentration", "family": "Physics", "planFile": null },
    { "degreeName": "Physics, Pure Physics Concentration", "family": "Physics", "planFile": null },
    { "degreeName": "Political Science", "family": "Social Sciences", "planFile": null },
    { "degreeName": "Political Science, Legal Studies Concentration", "family": "Social Sciences", "planFile": null },
    { "degreeName": "Professional Studies, Desktop Publishing Concentration", "family": "Professional Studies", "planFile": null },
    { "degreeName": "Professional Studies, Health Administration Concentration", "family": "Professional Studies", "planFile": null },
    { "degreeName": "Professional Studies, Information Technology Concentration", "family": "Professional Studies", "planFile": null },
    { "degreeName": "Professional Studies, International Organizational Leadership Concentration", "family": "Professional Studies", "planFile": null },
    { "degreeName": "Professional Studies, Organizational Leadership Concentration", "family": "Professional Studies", "planFile": null },
    { "degreeName": "Professional Studies, Public Safety Concentration", "family": "Professional Studies", "planFile": null },
    { "degreeName": "Psychology", "family": "Social Sciences", "planFile": null },
    { "degreeName": "Secondary Education, Biology Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, Chemistry Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, Earth Science Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, Economics Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, English Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, Geography Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, History Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, Mathematics Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, Non-Licensure Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, Physics Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, Political Science Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, Spanish Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Secondary Education, Speech Communication and Theatre Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Sociology", "family": "Social Sciences", "planFile": null },
    { "degreeName": "Sociology, Criminology and Criminal Justice Concentration", "family": "Social Sciences", "planFile": null },
    { "degreeName": "Sociology, Social Work Concentration", "family": "Social Sciences", "planFile": null },
    { "degreeName": "Special Education Practitioner", "family": "Education", "planFile": null },
    { "degreeName": "Special Education, Comprehensive/Interventionist Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Special Education, Interventionist for Secondary Education Concentration", "family": "Education", "planFile": null },
    { "degreeName": "Studio Arts", "family": "Art", "planFile": null },
    { "degreeName": "Wildlife and Fisheries Science, Conservation Biology Concentration", "family": "Natural Sciences", "planFile": null },
    { "degreeName": "Wildlife and Fisheries Science, Fisheries Science Concentration", "family": "Natural Sciences", "planFile": null },
    { "degreeName": "Wildlife and Fisheries Science, Wildlife Science Concentration", "family": "Natural Sciences", "planFile": null }
  ]
}
```

**Important implementation notes for the expanded catalog:**

- Degrees with `"planFile": null` do not yet have a semester plan file.
  When a student selects one of these degrees, display a friendly
  **"Plan Coming Soon"** state — an empty 8-semester grid with a banner:
  *"The recommended sequence for this program is not yet available.
  You can still build a custom plan manually."*
- Do NOT crash or throw when `planFile` is null — gracefully fall back
  to an empty plan
- The degree selector UI must group degrees by `family` in a collapsible
  grouped dropdown or list — searching should filter across both
  `degreeName` and `family`
- The `planFile` field in `degrees.json` is now the authoritative source
  for mapping a degree to its plan JSON — remove any hardcoded filename
  conventions from the data loader

---

### 5.2 — Update `dataLoader.ts`

- Update the loader to read the new `planFile` field from each degree entry
- When `planFile` is null, return an empty plan structure (8 empty semesters)
- Ensure the loader handles the new `family` field for UI grouping

---

## SECTION 6 — "WHAT-IF" SCENARIO PLANNING

**Feature:** Allow students to layer additional programs onto their primary
degree plan to model double majors, minors, and concentrations.

### 6.1 — What-If Panel UI

- Add a collapsible **"What-If Scenarios"** panel to the sidebar
- Inside the panel, provide an **"Add Program"** button that opens a
  searchable modal using the same `degrees.json` catalog
- Each added program is listed as a scenario layer with:
  - Program name
  - Additional courses required (courses in the what-if program not
    already in the primary plan)
  - Additional credit hours required
  - A toggle to show/hide the what-if overlay on the grid
  - A remove button

### 6.2 — What-If Grid Overlay

- When a What-If program is active and visible, overlay its courses
  onto the semester grid using a **distinct visual treatment**
  (e.g., a colored border or badge: "What-If: Minor in Mathematics")
- Courses that already exist in the primary plan are marked as
  "Already Planned" within the What-If overlay
- Courses that are additional requirements are shown as ghost tiles
  in their recommended semester positions
- All prerequisite validation applies to what-if courses exactly
  as it does to primary plan courses
- What-If scenarios do NOT modify the underlying primary plan state —
  they are a read-only overlay layer

### 6.3 — What-If State Management

- Store what-if scenarios in plan state as a separate array:
  ```typescript
  interface WhatIfScenario {
    id: string;
    programName: string;
    planFile: string | null;
    visible: boolean;
  }
  ```
- Persist what-if scenarios in `localStorage` alongside the primary plan
- What-if scenarios survive page refresh

---

## SECTION 7 — CATALOG WEB SCRAPING INFRASTRUCTURE

**Goal:** Enable the application to pull current course information and
program data directly from the TTU undergraduate catalog at:
`https://undergrad.catalog.tntech.edu/`

### 7.1 — Create `/src/services/catalogScraper.ts`

Build a scraper service stub with the following architecture:

```typescript
// Catalog scraper service — Tennessee Tech University
// Source: https://undergrad.catalog.tntech.edu/
//
// ARCHITECTURE:
// This service is designed to run as a build-time or scheduled
// Node.js script (NOT in the browser) that:
//   1. Fetches program and course pages from the TTU catalog
//   2. Parses the HTML to extract structured course/program data
//   3. Writes updated JSON files to /data/
//
// Browser CORS policy prevents direct fetch from client-side code.
// Run this script with: `npm run catalog:sync`

export interface CatalogCourse {
  code: string;
  name: string;
  credits: number;
  description: string;
  prerequisites: string[];
  corequisites: string[];
}

export interface CatalogProgram {
  degreeName: string;
  family: string;
  totalHours: number;
  semesterSequence: Record<string, string[]>;
}

export async function scrapeCoursesCatalog(): Promise<CatalogCourse[]> {
  // TODO: Implement with cheerio or playwright
  // Target: https://undergrad.catalog.tntech.edu/content.php?catoid=...
  throw new Error("Catalog scraper not yet implemented.");
}

export async function scrapeProgramCatalog(
  programUrl: string
): Promise<CatalogProgram> {
  // TODO: Implement per-program page scraper
  throw new Error("Program scraper not yet implemented.");
}

export async function syncCatalogToJSON(outputDir: string): Promise<void> {
  // TODO: Orchestrates full scrape → JSON write pipeline
  throw new Error("Catalog sync not yet implemented.");
}
```

### 7.2 — Add NPM Script

Add the following to `package.json`:
```json
"scripts": {
  "catalog:sync": "npx tsx src/services/catalogScraper.ts"
}
```

Install `cheerio` and `tsx` as dev dependencies for future scraper use.

### 7.3 — Document Scraper Limitations

In `README.md`, add a section titled **"Catalog Sync"** documenting:
- The scraper is a future capability, not yet implemented
- It must run server-side (Node.js) due to browser CORS restrictions
- The TTU catalog URL and relevant page structure notes
- How to run `npm run catalog:sync` once implemented
- The expected output (updated JSON files in `/data/`)

---

## SECTION 8 — DOCUMENTATION UPDATES

### 8.1 — Update `README.md`

Add or update the following sections:

**New sections to add:**
- **Transfer & Prior Credits** — How to use the Semester 0 transfer column,
  how to add courses manually, and the future account import roadmap
- **ACT / Placement Scores** — How manual score entry works and what
  it unlocks in the prerequisite engine
- **What-If Scenarios** — How to add and use what-if program overlays
- **Corequisites** — Explanation of the corequisite model and how it
  differs from prerequisites in the validation engine
- **Catalog Sync** — As described in Section 7.3 above
- **Degree Coverage** — Note which degrees have full semester plans
  vs. which show the "Plan Coming Soon" state, and how to contribute
  a new plan file

**Update existing sections:**
- **How to add a new degree** — Update to reflect the new `planFile`
  and `family` fields in `degrees.json`
- **How the prerequisite engine works** — Update to include corequisites,
  placement requirements, and the new validity map shape
- **Known limitations** — Add: catalog scraping not yet live, ACT
  integration pending school data access, most degree plan files not
  yet populated

---

### 8.2 — Update `degree_planner_prompt.md`

Update the original project prompt markdown to reflect all architectural
changes made in this session:

- Add `corequisites` field to the Course schema table
- Add `placementRequirements` field to the Course schema table
- Add `family` and `planFile` fields to the Degree schema table
- Add the Semester 0 (Transfer Credits) column to the Semester Grid section
- Add the What-If Scenarios feature to the MVP features list
- Add the Catalog Scraper infrastructure to the Technical Requirements section
- Add `transferImport.ts`, `placementService.ts`, and `catalogScraper.ts`
  to the project structure tree
- Update the Data Relationship Map to include the `planFile` resolution path
- Update all TypeScript interface examples to reflect the new field additions

---

## SECTION 9 — FINAL VALIDATION CHECKLIST

Before marking this session complete, verify each item:

- [ ] `tsc --noEmit` passes with zero errors across the entire project
- [ ] `planStore.ts` has no TypeScript diagnostics
- [ ] `main.tsx` has no TypeScript diagnostics
- [ ] Horizontal scroll lag is resolved and tested in Chrome
- [ ] `MATH1910` / `CSC1300` corequisite is correctly modeled and validated
- [ ] `PC2500` is accepted as a valid Communications fulfillment alongside `COMM2025`
- [ ] Semester 0 (Transfer Credits) column is visible and functional
- [ ] `transferImport.ts` stub exists with correct exported functions
- [ ] `placementService.ts` stub exists with correct exported functions
- [ ] `catalogScraper.ts` stub exists with correct exported functions
- [ ] `degrees.json` contains all TTU Bachelor's degree programs (162 entries)
- [ ] Degrees with `planFile: null` show "Plan Coming Soon" gracefully
- [ ] Degree selector groups by `family` with search
- [ ] What-If panel is present in the sidebar
- [ ] What-If overlay renders correctly on the semester grid
- [ ] `README.md` has been updated with all new sections
- [ ] `degree_planner_prompt.md` has been updated to reflect current architecture
- [ ] All JSON files are valid (run through a JSON linter)
- [ ] `localStorage` persistence works for both primary plan and what-if scenarios

---

*Work through sections 1–9 in order. Confirm completion of each section
before proceeding. If a section requires a decision (e.g., library choice
for scraping), state the decision and rationale before implementing.*
