# Degree Planner

A production-ready, fully client-side academic course planning tool. Students can visually map their 4-year degree across 8 semesters, enforce prerequisite rules automatically, and track completed courses.

## Tech Stack

**React 18 · TypeScript · Tailwind CSS v3 · dnd-kit · Zustand**

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## How to Add a New Degree

1. **Create the plan file** — add a new `csc_yourname.json` to `/data/` and `/public/data/` following the existing format:
   ```json
   { "hours": 120, "classes": [ { "classCode": "CSC1020", "semester": 1 }, ... ] }
   ```

2. **Register it** — Add an entry to `/public/data/degrees.json`:
   ```json
   { "degreeName": "Computer Science: Your Concentration", "planFile": "csc_yourname.json" }
   ```

3. **That's it.** Zero code changes needed. The app reads `degrees.json` on startup and surfaces all entries automatically.

## How to Swap in a New `coursesFile.json`

Replace `/public/data/coursesFile.json` with any file that matches the schema:
```json
{ "courses": [ { "code", "courseNumber", "subjectCode", "name", "credits", "description", "prerequisites?" } ] }
```
The app indexes it into a `Map` on startup for O(1) lookups. No code changes required.

## How the Prerequisite Engine Works

The engine (`src/services/prerequisiteEngine.ts`) implements DAG validation:

1. It makes one pass through all 8 semesters **in order**, building a cumulative set of "available" course codes.
2. Before processing semester N, it snapshots which codes are available (from semesters 1–N-1 **plus** any codes the student marked as Completed).
3. For each slot in semester N, it looks up the course's `prerequisites` array and checks every entry against the snapshot set.
4. Any prerequisite missing from the snapshot causes the slot to be marked **INVALID**, with the specific missing codes recorded.
5. Unfilled `options` and `elective` slots do not satisfy any prerequisite — only filled slots contribute to the availability set.
6. The engine runs after **every** plan mutation (drag, remove, complete toggle, choice fill) so the UI is always reactive.

## Project Structure

```
src/
  types/index.ts           — All TypeScript interfaces
  services/
    dataLoader.ts          — Fetches + indexes JSON files
    prerequisiteEngine.ts  — Pure DAG validation (no UI imports)
    creditCalculator.ts    — Credit hour utilities
  store/planStore.ts       — Zustand global state + localStorage
  components/
    DegreeSelector/        — Initial program selection screen
    SemesterGrid/          — 8-column Kanban grid
    CourseTile/            — Fixed course tile
    SlotTile/              — Options + Elective slot tiles
    Sidebar/               — Catalog, unscheduled pool, progress
    Tooltip/               — Prerequisite detail popovers
    StatusBar/             — Global stats bar
public/data/               — JSON data files served statically
```

## Known Limitations & Future Enhancements

- **Corequisites**: The current engine only validates prerequisites, not corequisites (courses that must be taken simultaneously). These would need a separate concurrent-availability check.
- **GPA/Grade requirements**: Some prerequisites list minimum grades (e.g. "C or better"). The engine treats all placements as satisfying requirements regardless of grade.
- **Non-course prerequisites**: Some entries list "Junior" or "Senior" standing as prerequisites. These strings won't match course codes — they are gracefully treated as unsatisfied, which may produce false invalid warnings.
- **Multi-degree planning**: The app supports one degree at a time. A future enhancement could allow concurrent degree/minor tracking.
- **Export**: No PDF or shareable link export currently. A print stylesheet or PDF generation could be added.
- **Backend sync**: The plan is localStorage-only. A backend API (optional) could enable multi-device sync or advisor review.