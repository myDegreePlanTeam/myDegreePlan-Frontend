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

import type { Course, Slot, ValidityMap, ValidityResult, PlacementScores } from '../types';

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
 * @param semesters    - Array of 9 arrays of Slots (semesters[0] = Transfer)
 * @param completedCodes - Set of course codes the student has marked as completed
 * @param courseMap    - O(1) lookup map: code → Course from coursesFile.json
 * @param placementScores - Student placement scores
 * @returns ValidityMap — Map<slotId, { valid, missingPrereqs, missingCoreqs }>
 *
 * Complexity: O(S × C × P) where S = semesters, C = courses/semester, P = prereqs/course.
 */
export function validatePlan(
  semesters: Slot[][],
  completedCodes: Set<string>,
  courseMap: Map<string, Course>,
  placementScores: PlacementScores,
): ValidityMap {
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
      const prereqs: string[] = courseRecord?.prerequisites ?? [];
      const coreqs: string[] = courseRecord?.corequisites ?? [];
      const placements = courseRecord?.placementRequirements ?? [];

      // Determine which prerequisites are NOT satisfied
      // Handle the PC2500 aliasing for COMM2025 explicitly here
      let missingPrereqs: string[] = prereqs.filter((prereq) => {
        if (prereq === 'COMM2025' && available.has('PC2500')) return false;
        return !available.has(prereq);
      });

      // Check placement scores. If a placement requirement is present and met,
      // it satisfies ALL prerequisites for that course (e.g. ACT Math 26 satisfies MATH1730).
      let hasValidPlacement = false;
      for (const p of placements) {
        if (p.type === 'ACT' && p.subject === 'Math' && placementScores.actMath && placementScores.actMath >= p.minimumScore) {
          hasValidPlacement = true;
          break;
        }
        if (p.type === 'ACT' && p.subject === 'English' && placementScores.actEnglish && placementScores.actEnglish >= p.minimumScore) {
          hasValidPlacement = true;
          break;
        }
        // Add more placement logic as needed
      }

      if (hasValidPlacement) {
        // Only ignore 'missing' if the placement strictly overrides it.
        // For our MVP, meeting *any* placement requirement bypasses the missing prerequisite list 
        // because typical TTU course structure relies on "ACT Math 26 OR MATH 1730".
        missingPrereqs = [];
      }

      // Determine which corequisites are NOT satisfied
      const missingCoreqs: string[] = coreqs.filter((coreq) => {
        if (coreq === 'COMM2025' && availableInOrBefore[semIndex].has('PC2500')) return false;
        return !availableInOrBefore[semIndex].has(coreq);
      });

      validityMap.set(slot.id, {
        valid: missingPrereqs.length === 0 && missingCoreqs.length === 0,
        missingPrereqs,
        missingCoreqs
      });
    }
  }

  return validityMap;
}

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
  return prereqs.every((p) => available.has(p));
}
