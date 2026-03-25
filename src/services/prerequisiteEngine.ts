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

/**
 * Check if a course code is satisfied by the available set,
 * accounting for known course aliases / equivalencies.
 */
function isCodeAvailable(code: string, available: Set<string>): boolean {
  if (available.has(code)) return true;

  // Known course aliases
  if (code === 'COMM2025' && available.has('PC2500')) return true;
  if (code === 'PC2500' && available.has('COMM2025')) return true;

  return false;
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

      // Courses already marked completed should not show prereq warnings —
      // the student has already passed, so prereq validation is moot.
      if (slot.completed) {
        validityMap.set(slot.id, { valid: true, missingPrereqs: [], missingCoreqs: [] });
        continue;
      }

      // Look up the course record. If not found in catalog, treat as no prereqs.
      const courseRecord: Course | undefined = courseMap.get(effectiveCode);
      const prereqs: string[] = courseRecord?.prerequisites ?? [];
      const prereqGroups = courseRecord?.prerequisiteGroups ?? [];
      const coreqs: string[] = courseRecord?.corequisites ?? [];
      const placements = courseRecord?.placementRequirements ?? [];

      // ── Check placement scores first ──────────────────────────────────
      // If a placement requirement is met, it can bypass prerequisite checks
      // (e.g. ACT Math 26 satisfies "MATH1730 or ACT Math 26").
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
      }

      // ── Determine which prerequisites (AND-logic) are NOT satisfied ───
      let missingPrereqs: string[];
      if (hasValidPlacement) {
        // Placement score bypasses the AND-prerequisites
        missingPrereqs = [];
      } else {
        missingPrereqs = prereqs.filter((prereq) => !isCodeAvailable(prereq, available));
      }

      // ── Validate prerequisite groups (OR-logic) ───────────────────────
      // Each group requires at least ONE of its courses to be available.
      // If none in the group are available, report the group description as missing.
      for (const group of prereqGroups) {
        if (hasValidPlacement) break;
        const groupSatisfied = group.courses.some((code) => isCodeAvailable(code, available));
        if (!groupSatisfied) {
          // Add a descriptive label or the first code as the "missing" indicator
          const label = group.description ?? group.courses.join(' or ');
          missingPrereqs.push(label);
        }
      }

      // ── Determine which corequisites are NOT satisfied ────────────────
      const missingCoreqs: string[] = coreqs.filter(
        (coreq) => !isCodeAvailable(coreq, availableInOrBefore[semIndex])
      );

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
  if (!course) return true;

  const prereqs = course.prerequisites ?? [];
  const prereqGroups = course.prerequisiteGroups ?? [];

  const andSatisfied = prereqs.every((p) => isCodeAvailable(p, available));
  const orSatisfied = prereqGroups.every((group) =>
    group.courses.some((code) => isCodeAvailable(code, available))
  );

  return andSatisfied && orSatisfied;
}
