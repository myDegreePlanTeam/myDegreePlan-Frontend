/**
 * prerequisiteEngine.ts
 * Pure DAG-based prerequisite validation utility.
 *
 * This module has NO imports from React, Zustand, or any UI code.
 * It is a standalone, framework-agnostic service that can be unit-tested
 * independently of the application.
 *
 * Algorithm overview:
 * For a course placed in semester N, every prerequisite must appear in
 * semesters 1..N-1 (completed in an earlier semester) OR be in the
 * `completedCodes` set (transfer credit / prior completion).
 *
 * Unfilled options/elective slots do NOT satisfy any prerequisite, even
 * though they carry credit hours.
 */

import type { Course, Slot, ValidityMap, ValidityResult, PlacementScores, TransferCourse, ExamCredit } from '../types';
import { isSatisfiedByPlacementScores, isSatisfiedByExamCredit } from '../knowledge/academicRules';
import { getEquivalentCourses, isOrLogicPrerequisite } from '../knowledge/equivalencies';

export interface EngineContext {
  semesters: Slot[][];
  completedCodes: Set<string>;
  courseMap: Map<string, Course>;
  placementScores: PlacementScores;
  transferCourses?: TransferCourse[];
  examCredits?: ExamCredit[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Determine the effective course code for a slot.
 * Returns the code only when the slot is "filled" and can satisfy prerequisites.
 *   - fixed:   returns courseCode (always filled)
 *   - options: returns selectedOption only if non-null (i.e. student chose one)
 *   - elective: returns electiveCode only if non-null (student dragged one in)
 */
function getEffectiveCode(slot: Slot): string | null {
  switch (slot.type) {
    case 'fixed':
      return slot.courseCode ?? null;
    case 'options':
      return slot.selectedOption ?? null;
    case 'elective':
      return slot.electiveCode ?? null;
  }
}

// ─── Main Engine ──────────────────────────────────────────────────────────────

/**
 * Validate all course placements in the 9-semester plan against prerequisite rules.
 *
 * @param context - EngineContext containing semesters, completedCodes, courseMap, etc.
 * @returns ValidityMap — Map<slotId, { valid, missingPrereqs, missingCoreqs, satisfactionDetails }>
 *
 * Complexity: O(S × C × P) where S = semesters, C = courses/semester, P = prereqs/course.
 */
export function validatePlan(context: EngineContext): ValidityMap {
  const { semesters, completedCodes, courseMap, placementScores, transferCourses = [], examCredits = [] } = context;
  const validityMap: ValidityMap = new Map<string, ValidityResult>();

  // Build the set of course codes that are "available" before each semester.
  // availableBefore[N] = Set of codes visible to a course placed in semester N+1.
  //
  // A code is available before semester N if:
  //   - It appears in semesters 0..N-1 AND the slot is filled, OR
  //   - It is in completedCodes (treated as always available)
  //
  // We build this incrementally: start with completedCodes, then add each
  // semester's effective codes before processing the next semester.
  const availableBefore: Set<string>[] = [];
  const availableInOrBefore: Set<string>[] = [];
  let cumulativeCodes = new Set<string>(completedCodes);

  for (let semIndex = 0; semIndex < semesters.length; semIndex++) {
    // Snapshot what's available BEFORE this semester's slots are processed
    availableBefore[semIndex] = new Set<string>(cumulativeCodes);

    // After recording the snapshot, add this semester's filled courses
    // so they become available to subsequent semesters.
    for (const slot of semesters[semIndex]) {
      const code = getEffectiveCode(slot);
      if (code !== null) {
        cumulativeCodes.add(code);
      }
    }

    // Snapshot what's available IN OR BEFORE this semester for corequisites
    availableInOrBefore[semIndex] = new Set<string>(cumulativeCodes);
  }

  // Now validate each slot. For a slot in semester N (0-indexed),
  // every prerequisite must be in availableBefore[N].
  for (let semIndex = 0; semIndex < semesters.length; semIndex++) {
    const available = availableBefore[semIndex];

    for (const slot of semesters[semIndex]) {
      const effectiveCode = getEffectiveCode(slot);

      // Unfilled options/elective slots: mark valid (no course to validate)
      if (effectiveCode === null) {
        validityMap.set(slot.id, { valid: true, missingPrereqs: [], missingCoreqs: [] });
        continue;
      }

      // Look up the course record. If not found in catalog, treat as no prereqs.
      const courseRecord: Course | undefined = courseMap.get(effectiveCode);
      let prereqs: string[] = courseRecord?.prerequisites ?? [];
      const coreqs: string[] = courseRecord?.corequisites ?? [];
      const placements = courseRecord?.placementRequirements ?? [];
      let prereqGroups = [...(courseRecord?.prerequisiteGroups ?? [])];

      // Bug #2 Fix: Convert legacy "A AND B" arrays into "A OR B" groups if description signifies OR-logic
      if (prereqs.length > 1 && isOrLogicPrerequisite(courseRecord?.description)) {
        prereqGroups.push({
          type: 'OR',
          courses: [...prereqs],
          description: `One of: ${prereqs.join(', ')}`
        });
        prereqs = []; // Clear the original AND-list since it's now handled as an OR-group
      }

      // Determine which prerequisites are NOT satisfied
      let missingPrereqs: string[] = [];
      const satisfactionDetails: ValidityResult['satisfactionDetails'] = [];

      // Helper to check a specific candidate course OR its equivalents
      const evaluateCandidate = (candidate: string, forCoreq = false) => {
        const codesToCheck = [candidate, ...getEquivalentCourses(candidate)];
        for (const code of codesToCheck) {
          const availSet = forCoreq ? availableInOrBefore[semIndex] : available;

          if (availSet.has(code)) {
            return { prereqCode: candidate, satisfiedBy: completedCodes.has(code) ? 'completed' : 'plan' } as const;
          }

          // Check placement scores via academic rules
          const placementResult = isSatisfiedByPlacementScores(code, placementScores);
          if (placementResult.satisfied && placementResult.matchedGate) {
            return { prereqCode: candidate, satisfiedBy: placementResult.matchedGate.method } as const;
          }

          // Check Exam Credits via academic rules
          for (const exam of examCredits) {
            const result = isSatisfiedByExamCredit(code, exam.examType, exam.examName, exam.score);
            if (result.satisfied && result.matchedGate) {
              return { prereqCode: candidate, satisfiedBy: result.matchedGate.method } as const;
            }
          }

          // Check Transfer Courses explicitly with equivalents
          for (const tc of transferCourses) {
            if (tc.equivalency === code || tc.code === code) {
              return { prereqCode: candidate, satisfiedBy: 'transfer' } as const;
            }
          }
        }
        return null;
      };

      for (const prereq of prereqs) {
        const satisfiedDetail = evaluateCandidate(prereq, false);
        if (satisfiedDetail) {
          satisfactionDetails.push(satisfiedDetail);
        } else {
          missingPrereqs.push(prereq);
        }
      }

      // ── OR-logic prerequisite groups ──────────────────────────────────
      // Each group is satisfied if ANY ONE course in the group is met.
      for (const group of prereqGroups) {
        let groupSatisfied = false;
        let satisfiedByDetail: NonNullable<ValidityResult['satisfactionDetails']>[0] | undefined;

        for (const candidate of group.courses) {
          const detail = evaluateCandidate(candidate, false);
          if (detail) {
            satisfiedByDetail = detail;
            groupSatisfied = true;
            break;
          }

          // Fallback: check corequisite context for group candidates
          const coreqDetail = evaluateCandidate(candidate, true);
          if (coreqDetail && coreqDetail.satisfiedBy === 'plan') {
            satisfiedByDetail = coreqDetail;
            groupSatisfied = true;
            break;
          }
        }

        if (groupSatisfied && satisfiedByDetail) {
          satisfactionDetails!.push(satisfiedByDetail);
        } else {
          // Report the group description or the list of courses as missing
          const label = group.description || group.courses.join(' or ');
          missingPrereqs.push(label);
        }
      }

      // Determine which corequisites are NOT satisfied
      const missingCoreqs: string[] = coreqs.filter((coreq) => {
        const coreqDetail = evaluateCandidate(coreq, true);
        return !coreqDetail;
      });

      // Detect same-semester prerequisites: prereqs that are in the same semester
      // but not in an earlier one (availableInOrBefore has them, availableBefore doesn't)
      const sameSemesterPrereqs: string[] = [];
      for (const prereq of missingPrereqs) {
        // Check if this missing prereq is actually in the same semester
        const inOrBefore = availableInOrBefore[semIndex];
        if (inOrBefore.has(prereq)) {
          sameSemesterPrereqs.push(prereq);
        }
      }

      validityMap.set(slot.id, {
        valid: missingPrereqs.length === 0 && missingCoreqs.length === 0,
        missingPrereqs,
        missingCoreqs,
        sameSemesterPrereqs: sameSemesterPrereqs.length > 0 ? sameSemesterPrereqs : undefined,
        satisfactionDetails
      });
    }
  }

  return validityMap;
}

// ─── Chain Analysis Helpers ───────────────────────────────────────────────────

/**
 * Reverse-dependency lookup: find all courses in the catalog that list
 * `courseCode` as a direct prerequisite (AND-list or OR-group member).
 */
export function getPostrequisites(
  courseCode: string,
  courseMap: Map<string, Course>,
): string[] {
  const result: string[] = [];
  for (const [code, course] of courseMap) {
    const prereqs = course.prerequisites ?? [];
    const groups = course.prerequisiteGroups ?? [];
    if (prereqs.includes(courseCode)) {
      result.push(code);
    } else if (groups.some((g) => g.courses.includes(courseCode))) {
      result.push(code);
    }
  }
  return result;
}

/**
 * Transitive closure of all downstream postrequisites (BFS).
 * Returns codes in topological order (closest dependents first).
 */
export function getDependencyChain(
  courseCode: string,
  courseMap: Map<string, Course>,
): string[] {
  const visited = new Set<string>();
  const chain: string[] = [];
  const queue = [courseCode];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const postReqs = getPostrequisites(current, courseMap);
    for (const pr of postReqs) {
      if (!visited.has(pr)) {
        visited.add(pr);
        chain.push(pr);
        queue.push(pr);
      }
    }
  }
  return chain;
}

export interface CascadeMove {
  slotId: string;
  courseCode: string;
  fromSemester: number;
  toSemester: number;
}

export interface CascadeResult {
  moves: CascadeMove[];
  blocked: boolean;
  blockReason?: string;
}

/**
 * Compute which slots must cascade forward when a course is moved to a later semester.
 * Only cascades when moving LATER (moving earlier doesn't invalidate dependents).
 */
export function computeCascadeMoves(
  movedCourseCode: string,
  toSemesterIndex: number,
  semesters: Slot[][],
  courseMap: Map<string, Course>,
): CascadeResult {
  const moves: CascadeMove[] = [];
  const chain = getDependencyChain(movedCourseCode, courseMap);

  // Build a map of courseCode → { slotId, semesterIndex } for quick lookup
  const codeToLocation = new Map<string, { slotId: string; semIndex: number }>();
  for (let si = 0; si < semesters.length; si++) {
    for (const slot of semesters[si]) {
      const code = getEffectiveCode(slot);
      if (code) codeToLocation.set(code, { slotId: slot.id, semIndex: si });
    }
  }

  // Track the effective minimum semester for each cascaded course
  const minSemester = new Map<string, number>();
  minSemester.set(movedCourseCode, toSemesterIndex);

  for (const depCode of chain) {
    const loc = codeToLocation.get(depCode);
    if (!loc) continue; // not in the current plan

    // Find the latest semester of any of this course's prerequisites
    const depCourse = courseMap.get(depCode);
    const depPrereqs = depCourse?.prerequisites ?? [];
    const depGroups = depCourse?.prerequisiteGroups ?? [];
    const allPrereqCodes = [...depPrereqs, ...depGroups.flatMap((g) => g.courses)];

    let latestPrereqSem = -1;
    for (const pCode of allPrereqCodes) {
      const pMin = minSemester.get(pCode);
      if (pMin !== undefined && pMin > latestPrereqSem) latestPrereqSem = pMin;
      const pLoc = codeToLocation.get(pCode);
      if (pLoc && pLoc.semIndex > latestPrereqSem) latestPrereqSem = pLoc.semIndex;
    }

    // If this course is in a semester <= latestPrereqSem, it needs to move
    if (latestPrereqSem >= 0 && loc.semIndex <= latestPrereqSem) {
      const newSem = latestPrereqSem + 1;
      if (newSem > 8) {
        return {
          moves,
          blocked: true,
          blockReason: `Moving ${movedCourseCode} would push ${depCode} beyond semester 8`,
        };
      }
      moves.push({
        slotId: loc.slotId,
        courseCode: depCode,
        fromSemester: loc.semIndex,
        toSemester: newSem,
      });
      minSemester.set(depCode, newSem);
      // Update location for subsequent dependency checks
      codeToLocation.set(depCode, { slotId: loc.slotId, semIndex: newSem });
    } else {
      // No move needed, but record its position for downstream checks
      minSemester.set(depCode, loc.semIndex);
    }
  }

  return { moves, blocked: false };
}

// ─── Convenience ──────────────────────────────────────────────────────────────

/**
 * Convenience: check if a single course code has all its prerequisites
 * satisfied by the provided available-code set. Used for catalog display.
 *
 * @param courseCode   - The course to check
 * @param available    - Set of course codes already "seen"
 * @param courseMap    - O(1) lookup map
 */
export function arePrerequsitesMet(
  courseCode: string,
  available: Set<string>,
  courseMap: Map<string, Course>,
): boolean {
  const course = courseMap.get(courseCode);
  const prereqs = course?.prerequisites ?? [];
  return prereqs.every((p) => {
    if (available.has(p)) return true;
    const equivalents = getEquivalentCourses(p);
    return equivalents.some(eq => available.has(eq));
  });
}
