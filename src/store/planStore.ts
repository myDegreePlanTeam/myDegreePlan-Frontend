/**
 * planStore.ts
 * Global application state managed by Zustand.
 *
 * State is persisted to localStorage automatically via the `persist` middleware.
 * The course catalog (courseMap, subjectCodes, degrees) is NOT persisted —
 * it is always reloaded fresh from JSON on startup, keeping localStorage lean.
 *
 * Any time the plan changes (drag, add, remove, complete toggle, choice fill),
 * the store immediately re-runs `validatePlan` so the UI reflects the new
 * validity state without any manual trigger.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from './uuid';
import type {
  AppState,
  Course,
  DegreeEntry,
  DegreePlan,
  PlanNotification,
  PlacementScores,
  TransferCourse,
  ExamCredit,
  Slot,
  ValidityMap,
} from '../types';
import {
  loadCourseMap,
  loadDegrees,
  loadDegreePlan,
  loadSubjectCodes,
} from '../services/dataLoader';
import { validatePlan, computeCascadeMoves } from '../services/prerequisiteEngine';
import { ACADEMIC_RULES, isSatisfiedByPlacementScores } from '../knowledge/academicRules';
import { getSequencePartner, isStandalone } from '../knowledge/scienceSequences';

// ── Plan Schema Version ───────────────────────────────────────────────────────
const PLAN_VERSION = 3; // v3: bypassOnly placement courses no longer create slots/credits

/** Course codes that are bypass-only — they should not appear as slots in Prior Learning */
const BYPASS_ONLY_CODES = new Set(['MATH1710', 'MATH1720', 'MATH1730']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build the initial 9 empty semester columns where [0] is Transfer */
function buildEmptySemesters(): Slot[][] {
  return Array.from({ length: 9 }, () => []);
}

/**
 * Convert a DegreePlan's class entries into 8 semester Slot arrays.
 * Assigns stable UUIDs to each slot for dnd-kit key stability.
 */
function planToSlots(plan: DegreePlan): Slot[][] {
  const semesters = buildEmptySemesters();

  for (const entry of plan.classes) {
    const semIndex = entry.semester; // 1-indexed to map to semesters[1-8]
    if (semIndex < 1 || semIndex > 8) continue; // guard against malformed data

    let slot: Slot;

    if (entry.classCode === 'options') {
      slot = {
        id: uuidv4(),
        type: 'options',
        optionsName: entry.optionsName ?? 'Choose an Option',
        options: entry.options ?? [],
        selectedOption: null,
        slotCredits: entry.credits ?? 3,
        completed: false,
      };
    } else if (entry.classCode === 'elective') {
      slot = {
        id: uuidv4(),
        type: 'elective',
        slotCredits: entry.credits ?? 3,
        electiveCode: null,
        completed: false,
      };
    } else {
      // Fixed course
      slot = {
        id: uuidv4(),
        type: 'fixed',
        courseCode: entry.classCode,
        completed: false,
      };
    }

    semesters[semIndex].push(slot);
  }

  return semesters;
}

function revalidate(
  semesters: Slot[][],
  completedCodes: Set<string>,
  courseMap: Map<string, Course>,
  placementScores: PlacementScores,
  transferCourses?: TransferCourse[],
  examCredits?: ExamCredit[],
): ValidityMap {
  const storeState = usePlanStore ? usePlanStore.getState() : ({} as any);
  return validatePlan({
    semesters,
    completedCodes,
    courseMap,
    placementScores,
    transferCourses: transferCourses ?? storeState?.transferCourses ?? [],
    examCredits: examCredits ?? storeState?.examCredits ?? [],
  });
}

// ─── Store Definition ─────────────────────────────────────────────────────────

interface PlanActions {
  /** Load all JSON data on app startup. */
  loadData: () => Promise<void>;

  /**
   * Select a degree and populate the semester grid with the recommended sequence.
   * If `confirmClear` is false AND a plan is already loaded, the caller should
   * prompt the user for confirmation before calling this.
   */
  selectDegree: (degree: DegreeEntry) => Promise<void>;

  /** Move a slot from one location to another.
   *  Locations are identified by: { type: 'semester' | 'unscheduled', semesterIndex?: number, slotIndex?: number }
   */
  moveSlot: (params: MoveParams) => void;

  /** Toggle the "completed" flag on a slot and re-run validation. */
  toggleCompleted: (slotId: string) => void;

  /** Fill a choice-group slot with the selected option code. */
  fillChoice: (slotId: string, courseCode: string) => void;

  /** Clear a filled choice-group slot back to unfilled. */
  clearChoice: (slotId: string) => void;

  /** Fill an elective slot with a dragged-in course code. */
  fillElective: (slotId: string, courseCode: string) => void;

  /** Clear a filled elective slot. */
  clearElective: (slotId: string) => void;

  /** Remove a fixed course from a semester back to the unscheduled pool. */
  removeFromSemester: (slotId: string) => void;

  /** Add a manual transfer course to Semester 0 */
  addTransferCourse: (course: TransferCourse) => void;

  /** Update placement scores (ACT, etc.) */
  setPlacementScores: (scores: PlacementScores) => void;

  /** Add an exam credit (AP/IB/CLEP) */
  addExamCredit: (credit: ExamCredit) => void;

  /** Add a course from the catalog into a specific semester. */
  addCourseToSemester: (courseCode: string, semesterIndex: number) => void;

  /** Reset the plan to the recommended sequence for the current degree. */
  resetPlan: () => Promise<void>;

  /** Manually re-run validation (used after bulk state changes). */
  rerunValidation: () => void;

  /** Add a notification to the stack. */
  addNotification: (notification: PlanNotification) => void;

  /** Dismiss a notification by ID. */
  dismissNotification: (id: string) => void;
}

export interface MoveParams {
  slotId: string;
  /** Destination: 0-indexed semester number, or -1 for unscheduled pool */
  toSemesterIndex: number;
  /** Position within the destination container */
  toPosition: number;
}

type FullStore = AppState & PlanActions;

// Zustand store — we persist only the plan-state portions, not the catalog.
export const usePlanStore = create<FullStore>()(
  persist(
    (set: any, get: () => FullStore): FullStore => ({
      // ── Initial State ────────────────────────────────────────────────────
      degrees: [] as DegreeEntry[],
      selectedDegree: null,
      degreePlan: null,
      semesters: buildEmptySemesters(),
      unscheduled: [] as Slot[],
      completedCodes: new Set<string>(),
      placementScores: {} as PlacementScores,
      transferCourses: [] as TransferCourse[],
      examCredits: [] as ExamCredit[],
      validityMap: new Map() as ValidityMap,
      courseMap: new Map<string, Course>(),
      subjectCodes: [] as string[],
      loaded: false,
      loadError: null,
      notifications: [] as PlanNotification[],

      // ── Actions ──────────────────────────────────────────────────────────

      loadData: async () => {
        try {
          const [degreesFile, courseMap, subjectCodes] = await Promise.all([
            loadDegrees(),
            loadCourseMap(),
            loadSubjectCodes(),
          ]);
          set((state: FullStore) => ({
            degrees: degreesFile.degrees,
            courseMap,
            subjectCodes,
            loaded: true,
            // Re-validate with freshly loaded courseMap in case we restored from localStorage
            validityMap: revalidate(state.semesters, state.completedCodes, courseMap, state.placementScores),
          }));
        } catch (err) {
          set({ loadError: String(err), loaded: true });
        }
      },

      selectDegree: async (degree: DegreeEntry) => {
        try {
          const plan = await loadDegreePlan(degree.planFile);
          const semesters = planToSlots(plan);
          const completedCodes = new Set<string>();
          const { courseMap, placementScores } = get();
          const validityMap = revalidate(semesters, completedCodes, courseMap, placementScores);
          set({
            selectedDegree: degree.degreeName,
            degreePlan: plan,
            semesters,
            unscheduled: [],
            completedCodes,
            validityMap,
          });
        } catch (err) {
          set({ loadError: String(err) });
        }
      },

      moveSlot: ({ slotId, toSemesterIndex, toPosition }: MoveParams) => {
        const { semesters, unscheduled, completedCodes, courseMap, notifications } = get();

        // Find the slot in its current location
        let slot: Slot | undefined;
        let fromSemesterIndex = -2; // -2 = not found, -1 = unscheduled
        let fromPosition = -1;

        // Search unscheduled pool first
        const unschedIdx = unscheduled.findIndex((s) => s.id === slotId);
        if (unschedIdx !== -1) {
          slot = unscheduled[unschedIdx];
          fromSemesterIndex = -1;
          fromPosition = unschedIdx;
        } else {
          // Search each semester
          for (let i = 0; i < semesters.length; i++) {
            const idx = semesters[i].findIndex((s) => s.id === slotId);
            if (idx !== -1) {
              slot = semesters[i][idx];
              fromSemesterIndex = i;
              fromPosition = idx;
              break;
            }
          }
        }

        if (!slot) return; // slot not found — no-op

        // Determine the effective course code for cascade analysis
        let movedCode: string | null = null;
        if (slot.type === 'fixed') movedCode = slot.courseCode ?? null;
        else if (slot.type === 'options') movedCode = slot.selectedOption ?? null;
        else if (slot.type === 'elective') movedCode = slot.electiveCode ?? null;

        // ── Cascade check: only when moving to a LATER semester ──────────
        let cascadeMoves: { slotId: string; courseCode: string; fromSemester: number; toSemester: number }[] = [];
        if (movedCode && toSemesterIndex >= 1 && fromSemesterIndex >= 0 && toSemesterIndex > fromSemesterIndex) {
          const cascade = computeCascadeMoves(movedCode, toSemesterIndex, semesters, courseMap);
          if (cascade.blocked) {
            // Reject the move and notify the user
            const newNotification: PlanNotification = {
              id: uuidv4(),
              type: 'warning',
              message: cascade.blockReason || `Cannot move ${movedCode} — would push courses beyond semester 8`,
              createdAt: Date.now(),
              courseCodes: [movedCode],
            };
            set({ notifications: [...notifications, newNotification] });
            return;
          }
          cascadeMoves = cascade.moves;
        }

        // Build new state arrays via immutable clones
        const newSemesters = semesters.map((sem) => [...sem]);
        let newUnscheduled = [...unscheduled];

        // Remove from source
        if (fromSemesterIndex === -1) {
          newUnscheduled.splice(fromPosition, 1);
        } else {
          newSemesters[fromSemesterIndex].splice(fromPosition, 1);
        }

        // Insert into destination
        if (toSemesterIndex === -1) {
          // Moving to unscheduled pool
          newUnscheduled.splice(toPosition, 0, slot);
        } else {
          const dest = newSemesters[toSemesterIndex];
          const clampedPos = Math.min(toPosition, dest.length);
          dest.splice(clampedPos, 0, slot);
        }

        // ── Apply cascade moves ──────────────────────────────────────────
        for (const cm of cascadeMoves) {
          // Find and remove from current position
          for (let si = 0; si < newSemesters.length; si++) {
            const idx = newSemesters[si].findIndex((s) => s.id === cm.slotId);
            if (idx !== -1) {
              const [movedSlot] = newSemesters[si].splice(idx, 1);
              newSemesters[cm.toSemester].push(movedSlot);
              break;
            }
          }
        }

        // Add notification for cascade moves
        let newNotifications = [...notifications];
        if (cascadeMoves.length > 0) {
          const movedNames = cascadeMoves.map((m) => m.courseCode).join(', ');
          newNotifications.push({
            id: uuidv4(),
            type: 'auto-move',
            message: `Auto-moved ${movedNames} to maintain prerequisite ordering`,
            createdAt: Date.now(),
            courseCodes: cascadeMoves.map((m) => m.courseCode),
          });
        }

        const validityMap = revalidate(newSemesters, completedCodes, courseMap, get().placementScores);
        set({ semesters: newSemesters, unscheduled: newUnscheduled, validityMap, notifications: newNotifications });
      },

      toggleCompleted: (slotId: string) => {
        const { semesters, completedCodes, courseMap } = get();

        let newCompletedCodes = new Set<string>(completedCodes);
        const newSemesters = semesters.map((sem) =>
          sem.map((slot) => {
            if (slot.id !== slotId) return slot;

            const updatedSlot = { ...slot, completed: !slot.completed };
            // Determine the effective course code to add/remove from completedCodes
            let code: string | null = null;
            if (slot.type === 'fixed') code = slot.courseCode ?? null;
            else if (slot.type === 'options') code = slot.selectedOption ?? null;
            else if (slot.type === 'elective') code = slot.electiveCode ?? null;

            if (code) {
              if (updatedSlot.completed) {
                newCompletedCodes.add(code);
              } else {
                newCompletedCodes.delete(code);
              }
            }
            return updatedSlot;
          }),
        );

        const validityMap = revalidate(newSemesters, newCompletedCodes, courseMap, get().placementScores);
        set({ semesters: newSemesters, completedCodes: newCompletedCodes, validityMap });
      },

      fillChoice: (slotId: string, courseCode: string) => {
        const { semesters, completedCodes, courseMap } = get();

        // Find the slot being filled to check for Science Sequence linking
        let filledSlot: Slot | undefined;
        for (const sem of semesters) {
          const s = sem.find((sl) => sl.id === slotId);
          if (s) { filledSlot = s; break; }
        }

        let newSemesters = semesters.map((sem) =>
          sem.map((slot) =>
            slot.id === slotId && slot.type === 'options'
              ? { ...slot, selectedOption: courseCode }
              : slot,
          ),
        );

        // ── Science Sequence auto-fill ───────────────────────────────────
        if (filledSlot?.optionsName === 'Science Sequence' && !isStandalone(courseCode)) {
          const partner = getSequencePartner(courseCode);
          if (partner) {
            // Find sibling Science Sequence slot (same optionsName, different id)
            newSemesters = newSemesters.map((sem) =>
              sem.map((slot) => {
                if (
                  slot.type === 'options' &&
                  slot.optionsName === 'Science Sequence' &&
                  slot.id !== slotId &&
                  !slot.selectedOption // Only auto-fill if not already filled
                ) {
                  return { ...slot, selectedOption: partner };
                }
                return slot;
              }),
            );
          }
        }

        const validityMap = revalidate(newSemesters, completedCodes, courseMap, get().placementScores);
        set({ semesters: newSemesters, validityMap });
      },

      clearChoice: (slotId: string) => {
        const { semesters, completedCodes, courseMap } = get();

        // Find the slot being cleared to check for Science Sequence
        let clearedSlot: Slot | undefined;
        for (const sem of semesters) {
          const s = sem.find((sl) => sl.id === slotId);
          if (s) { clearedSlot = s; break; }
        }

        let newSemesters = semesters.map((sem) =>
          sem.map((slot) =>
            slot.id === slotId && slot.type === 'options'
              ? { ...slot, selectedOption: null, completed: false }
              : slot,
          ),
        );

        // ── Science Sequence: also clear sibling ─────────────────────────
        if (clearedSlot?.optionsName === 'Science Sequence') {
          newSemesters = newSemesters.map((sem) =>
            sem.map((slot) => {
              if (
                slot.type === 'options' &&
                slot.optionsName === 'Science Sequence' &&
                slot.id !== slotId
              ) {
                return { ...slot, selectedOption: null, completed: false };
              }
              return slot;
            }),
          );
        }

        // Remove cleared codes from completedCodes
        const newCompletedCodes = new Set<string>(completedCodes);
        for (const sem of semesters) {
          for (const slot of sem) {
            if (slot.id === slotId && slot.type === 'options' && slot.selectedOption) {
              newCompletedCodes.delete(slot.selectedOption);
            }
            // Also clear sibling's completedCode if Science Sequence
            if (
              clearedSlot?.optionsName === 'Science Sequence' &&
              slot.type === 'options' &&
              slot.optionsName === 'Science Sequence' &&
              slot.id !== slotId &&
              slot.selectedOption
            ) {
              newCompletedCodes.delete(slot.selectedOption);
            }
          }
        }
        const validityMap = revalidate(newSemesters, newCompletedCodes, courseMap, get().placementScores);
        set({ semesters: newSemesters, completedCodes: newCompletedCodes, validityMap });
      },

      fillElective: (slotId: string, courseCode: string) => {
        const { semesters, completedCodes, courseMap, notifications } = get();
        const course = courseMap.get(courseCode);
        const courseCredits = course?.credits ?? 3;

        // Find the elective slot and its semester index
        let electiveSlot: Slot | undefined;
        let electiveSemIndex = -1;
        for (let si = 0; si < semesters.length; si++) {
          const found = semesters[si].find((s) => s.id === slotId && s.type === 'elective');
          if (found) { electiveSlot = found; electiveSemIndex = si; break; }
        }
        if (!electiveSlot || electiveSemIndex < 0) return;

        const totalCredits = electiveSlot.slotCredits ?? 3;
        const currentFills = electiveSlot.electiveFills ?? [];
        const usedCredits = currentFills.reduce((sum, f) => sum + f.credits, 0);
        const remaining = totalCredits - usedCredits;

        // Check if course credits exceed remaining
        if (courseCredits > remaining) {
          const newNotification: PlanNotification = {
            id: uuidv4(),
            type: 'warning',
            message: `${courseCode} (${courseCredits} cr) exceeds the remaining ${remaining} elective credits`,
            createdAt: Date.now(),
            courseCodes: [courseCode],
          };
          set({ notifications: [...notifications, newNotification] });
          return;
        }

        const newFills = [...currentFills, { courseCode, credits: courseCredits }];
        const newRemaining = remaining - courseCredits;

        // Create a visible fixed slot for the selected course in the same semester
        const newFixedSlot: Slot = {
          id: uuidv4(),
          type: 'fixed',
          courseCode,
          completed: false,
        };

        const newSemesters = semesters.map((sem, si) => {
          if (si !== electiveSemIndex) return [...sem];
          return sem.map((slot) => {
            if (slot.id !== slotId) return slot;
            return {
              ...slot,
              electiveFills: newFills,
              remainingCredits: newRemaining,
              // Mark fully filled when no credits remain
              electiveCode: newRemaining === 0 ? 'FILLED' : slot.electiveCode,
            };
          }).concat([newFixedSlot]);
        });

        const validityMap = revalidate(newSemesters, completedCodes, courseMap, get().placementScores);
        set({ semesters: newSemesters, validityMap });
      },

      clearElective: (slotId: string) => {
        const { semesters, completedCodes, courseMap } = get();

        // Find the elective slot to get its fills
        let electiveSlot: Slot | undefined;
        let electiveSemIndex = -1;
        for (let si = 0; si < semesters.length; si++) {
          const found = semesters[si].find((s) => s.id === slotId && s.type === 'elective');
          if (found) { electiveSlot = found; electiveSemIndex = si; break; }
        }

        const fillCodes = new Set((electiveSlot?.electiveFills ?? []).map((f) => f.courseCode));

        const newSemesters = semesters.map((sem, si) => {
          let result = sem.map((slot) =>
            slot.id === slotId && slot.type === 'elective'
              ? { ...slot, electiveCode: null, electiveFills: [], remainingCredits: undefined, completed: false }
              : slot,
          );
          // Remove fixed slots that were created for partial elective fills
          if (si === electiveSemIndex && fillCodes.size > 0) {
            result = result.filter((slot) => !(slot.type === 'fixed' && slot.courseCode && fillCodes.has(slot.courseCode)));
          }
          return result;
        });

        const newCompletedCodes = new Set<string>(completedCodes);
        if (electiveSlot?.electiveCode) newCompletedCodes.delete(electiveSlot.electiveCode);
        for (const code of fillCodes) newCompletedCodes.delete(code);

        const validityMap = revalidate(newSemesters, newCompletedCodes, courseMap, get().placementScores);
        set({ semesters: newSemesters, completedCodes: newCompletedCodes, validityMap });
      },

      removeFromSemester: (slotId: string) => {
        const { semesters, unscheduled, completedCodes, courseMap } = get();
        let removedSlot: Slot | undefined;

        const newSemesters = semesters.map((sem) =>
          sem.filter((slot) => {
            if (slot.id === slotId) {
              removedSlot = slot;
              return false;
            }
            return true;
          }),
        );

        if (!removedSlot) return;

        // Remove from completedCodes if applicable
        const newCompletedCodes = new Set<string>(completedCodes);
        let effectiveCode: string | undefined;
        if (removedSlot.type === 'fixed') effectiveCode = removedSlot.courseCode;
        else if (removedSlot.type === 'options') effectiveCode = removedSlot.selectedOption ?? undefined;
        else if (removedSlot.type === 'elective') effectiveCode = removedSlot.electiveCode ?? undefined;
        if (effectiveCode) newCompletedCodes.delete(effectiveCode);

        // Reset completion state on the removed slot
        const resetSlot: Slot = { ...removedSlot, completed: false };

        const newUnscheduled =
          removedSlot.type === 'fixed'
            ? [...unscheduled, resetSlot] // fixed courses go to unscheduled pool
            : unscheduled; // options/elective slots simply disappear

        const validityMap = revalidate(newSemesters, newCompletedCodes, courseMap, get().placementScores);
        set({
          semesters: newSemesters,
          unscheduled: newUnscheduled,
          completedCodes: newCompletedCodes,
          validityMap,
        });
      },

      addCourseToSemester: (courseCode: string, semesterIndex: number) => {
        const { semesters, unscheduled, completedCodes, courseMap } = get();

        // Check if the course is in the unscheduled pool first
        const unschedIdx = unscheduled.findIndex(
          (s) => s.type === 'fixed' && s.courseCode === courseCode,
        );

        let newUnscheduled = [...unscheduled];
        let newSemesters = semesters.map((sem) => [...sem]);

        if (unschedIdx !== -1) {
          // Move from unscheduled to the semester
          const [slot] = newUnscheduled.splice(unschedIdx, 1);
          newSemesters[semesterIndex].push(slot);
        } else {
          // Check if already somewhere in the grid; if so, move it
          let existingSlot: Slot | undefined;
          let fromIndex = -1;
          let fromSlotIndex = -1;
          for (let i = 0; i < semesters.length; i++) {
            const idx = semesters[i].findIndex(
              (s) => s.type === 'fixed' && s.courseCode === courseCode,
            );
            if (idx !== -1) {
              existingSlot = semesters[i][idx];
              fromIndex = i;
              fromSlotIndex = idx;
              break;
            }
          }

          if (existingSlot && fromIndex !== -1) {
            newSemesters[fromIndex].splice(fromSlotIndex, 1);
            newSemesters[semesterIndex].push(existingSlot);
          } else {
            // Brand new course from catalog
            const newSlot: Slot = {
              id: uuidv4(),
              type: 'fixed',
              courseCode,
              completed: false,
            };
            newSemesters[semesterIndex].push(newSlot);
          }
        }

        const validityMap = revalidate(newSemesters, completedCodes, courseMap, get().placementScores);
        set({ semesters: newSemesters, unscheduled: newUnscheduled, validityMap });
      },

      resetPlan: async () => {
        const { selectedDegree, degrees } = get();
        if (!selectedDegree) return;
        const entry = degrees.find((d) => d.degreeName === selectedDegree);
        if (!entry) return;
        try {
          const plan = await loadDegreePlan(entry.planFile);
          const semesters = planToSlots(plan);
          const completedCodes = new Set<string>();
          const { courseMap, placementScores } = get();
          const validityMap = revalidate(semesters, completedCodes, courseMap, placementScores);
          set({ degreePlan: plan, semesters, unscheduled: [], completedCodes, validityMap });
        } catch (err) {
          set({ loadError: String(err) });
        }
      },

      rerunValidation: () => {
        const { semesters, completedCodes, courseMap, placementScores } = get();
        const validityMap = revalidate(semesters, completedCodes, courseMap, placementScores);
        set({ validityMap });
      },

      addNotification: (notification: PlanNotification) => {
        set((state: FullStore) => ({
          notifications: [...state.notifications, notification],
        }));
      },

      dismissNotification: (id: string) => {
        set((state: FullStore) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      addTransferCourse: (course: TransferCourse) => {
        const { semesters, completedCodes, courseMap, placementScores, transferCourses } = get();

        // Add to transferCourses array
        const newTransferCourses = [...transferCourses, course];

        // Also add a 'fixed' slot to Sem 0 (which acts as the Transfer column)
        const id = uuidv4();
        const newSlot: Slot = {
          id,
          type: 'fixed',
          courseCode: course.equivalency || course.code,
          completed: true, // Transfer courses are implicitly completed
          source: 'transfer',
          sourceLabel: `Transfer from ${course.sourceInstitution}`,
        };

        const newSemesters = semesters.map((sem, idx) =>
          idx === 0 ? [...sem, newSlot] : [...sem]
        );

        const newCompletedCodes = new Set<string>(completedCodes);
        newCompletedCodes.add(newSlot.courseCode!);

        const validityMap = revalidate(newSemesters, newCompletedCodes, courseMap, placementScores, newTransferCourses);
        set({ semesters: newSemesters, transferCourses: newTransferCourses, completedCodes: newCompletedCodes, validityMap });
      },

      setPlacementScores: (scores: PlacementScores) => {
        const { semesters, completedCodes, courseMap, transferCourses, examCredits } = get();

        // Remove previously auto-added placement slots from Semester 0
        const oldPlacementCodes = new Set<string>();
        const sem0WithoutPlacements = semesters[0].filter((slot) => {
          if (slot.source === 'placement') {
            if (slot.courseCode) oldPlacementCodes.add(slot.courseCode);
            return false;
          }
          return true;
        });

        // Determine which courses are now satisfied by the new scores.
        // bypassOnly rules (e.g., MATH1710/1720/1730) are silently satisfied
        // by the prerequisite engine — they do NOT get slots or credit.
        const newPlacementSlots: Slot[] = [];
        const newPlacementCodes = new Set<string>();
        for (const courseCode of Object.keys(ACADEMIC_RULES)) {
          const rule = ACADEMIC_RULES[courseCode];
          const result = isSatisfiedByPlacementScores(courseCode, scores);
          if (result.satisfied && result.matchedGate) {
            // Skip bypass-only courses — these are prerequisite bypasses,
            // not earned credits (e.g., ACT Math >= 25 skips MATH1710/1720/1730
            // but doesn't award credit for them)
            if (rule.bypassOnly) continue;

            // Don't duplicate if the course is already in Semester 0 from transfer/exam
            const alreadyInSem0 = sem0WithoutPlacements.some(
              (s) => s.courseCode === courseCode
            );
            if (!alreadyInSem0) {
              newPlacementSlots.push({
                id: uuidv4(),
                type: 'fixed',
                courseCode,
                completed: true,
                source: 'placement',
                sourceLabel: result.matchedGate.description,
              });
            }
            newPlacementCodes.add(courseCode);
          }
        }

        const newSemesters = semesters.map((sem, idx) =>
          idx === 0 ? [...sem0WithoutPlacements, ...newPlacementSlots] : [...sem]
        );

        // Update completedCodes: remove old placement codes, add new ones
        const newCompletedCodes = new Set<string>(completedCodes);
        for (const code of oldPlacementCodes) {
          // Only remove if this code isn't also completed by another source
          const stillInPlan = newSemesters.some((sem) =>
            sem.some((s) => s.courseCode === code && s.source !== 'placement' && s.completed)
          );
          if (!stillInPlan && !newPlacementCodes.has(code)) {
            newCompletedCodes.delete(code);
          }
        }
        for (const code of newPlacementCodes) {
          newCompletedCodes.add(code);
        }

        const validityMap = revalidate(newSemesters, newCompletedCodes, courseMap, scores, transferCourses, examCredits);
        set({ semesters: newSemesters, completedCodes: newCompletedCodes, placementScores: scores, validityMap });
      },

      addExamCredit: (credit: ExamCredit) => {
        const { semesters, completedCodes, courseMap, placementScores, transferCourses, examCredits } = get();
        const newExamCredits = [...examCredits, credit];

        // Add equivalent courses to Semester 0 and completedCodes.
        // If the course already exists in a regular semester, remove it first.
        const newSemesters = semesters.map((sem) => [...sem]);
        const newCompletedCodes = new Set<string>(completedCodes);
        for (const ttuCode of credit.ttuEquivalent) {
          // Remove from regular semesters (1-8) if already placed
          for (let si = 1; si < newSemesters.length; si++) {
            const idx = newSemesters[si].findIndex(
              (s) => s.type === 'fixed' && s.courseCode === ttuCode
            );
            if (idx !== -1) {
              newSemesters[si].splice(idx, 1);
            }
          }

          // Don't duplicate if already in Semester 0
          const alreadyInSem0 = newSemesters[0].some((s) => s.courseCode === ttuCode);
          if (!alreadyInSem0) {
            const slot: Slot = {
              id: uuidv4(),
              type: 'fixed',
              courseCode: ttuCode,
              completed: true,
              source: 'exam',
              sourceLabel: `EXAM CREDIT -- ${credit.examType.toUpperCase()} ${credit.examName}`,
            };
            newSemesters[0].push(slot);
          }
          newCompletedCodes.add(ttuCode);
        }

        const validityMap = revalidate(newSemesters, newCompletedCodes, courseMap, placementScores, transferCourses, newExamCredits);
        set({ semesters: newSemesters, examCredits: newExamCredits, completedCodes: newCompletedCodes, validityMap });
      },
    }),
    {
      name: 'degree-planner-state',
      version: PLAN_VERSION,
      migrate: (persisted: any, version: number) => {
        if (version === 2) {
          // v2 → v3: Remove bypass-only placement slots (MATH1710/1720/1730)
          // from Semester 0 and completedCodes. These were incorrectly added as
          // credit-bearing slots when they are just prerequisite bypasses.
          console.info('[Degree Planner] Migrating v2 → v3: removing bypass-only placement slots');
          const semesters = persisted.semesters ?? buildEmptySemesters();
          if (semesters[0]) {
            semesters[0] = semesters[0].filter((slot: any) => {
              if (slot.source === 'placement' && slot.courseCode && BYPASS_ONLY_CODES.has(slot.courseCode)) {
                return false; // Remove bypass-only slots
              }
              return true;
            });
          }
          // Clean completedCodes — handle both array (serialized) and Set forms
          let completedCodes = persisted.completedCodes;
          if (Array.isArray(completedCodes)) {
            completedCodes = completedCodes.filter((code: string) => !BYPASS_ONLY_CODES.has(code));
          } else if (completedCodes instanceof Set) {
            for (const code of BYPASS_ONLY_CODES) completedCodes.delete(code);
          }
          return { ...persisted, semesters, completedCodes };
        }
        if (version < PLAN_VERSION) {
          // Schema version too old — full reset
          console.warn(
            `[Degree Planner] Stored plan version ${version} is older than current ${PLAN_VERSION}. Resetting plan.`
          );
          return {
            selectedDegree: null,
            degreePlan: null,
            semesters: buildEmptySemesters(),
            unscheduled: [],
            completedCodes: new Set<string>(),
            placementScores: {},
            transferCourses: [],
            examCredits: [],
          };
        }
        return persisted;
      },
      storage: createJSONStorage(() => localStorage, {
        // Custom reviver to restore Sets and Maps from JSON
        reviver: (key, value) => {
          if (key === 'completedCodes' && Array.isArray(value)) {
            return new Set<string>(value as string[]);
          }
          return value;
        },
        // Custom replacer to serialize Sets
        replacer: (key, value) => {
          if (key === 'completedCodes' && value instanceof Set) {
            return Array.from(value as Set<string>);
          }
          return value;
        },
      }),
      // Only persist plan state — not the heavyweight catalog data
      partialize: (state: any) => ({
        selectedDegree: state.selectedDegree,
        degreePlan: state.degreePlan,
        semesters: state.semesters,
        unscheduled: state.unscheduled,
        completedCodes: state.completedCodes,
        placementScores: state.placementScores,
        transferCourses: state.transferCourses,
        examCredits: state.examCredits,
      }),
    },
  ),
);
