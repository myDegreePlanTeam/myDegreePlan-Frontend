/**
 * creditCalculator.ts
 * Pure utility functions for aggregating credit hours across the plan.
 * No framework imports — fully testable in isolation.
 */

import type { Course, Slot } from '../types';

/**
 * Resolve the credit hours for a single slot.
 *   - fixed:   look up the course in courseMap; fallback to 0 if not found
 *   - options: use slotCredits (defined in the plan file)
 *   - elective: use slotCredits (defined in the plan file)
 *
 * If an options/elective slot has been filled with a real course, we still
 * use the slot's defined credit value (the plan's stated requirement).
 */
export function slotCredits(slot: Slot, courseMap: Map<string, Course>): number {
  if (slot.type === 'fixed') {
    const code = slot.courseCode;
    if (!code) return 0;
    return courseMap.get(code)?.credits ?? 0;
  }
  if (slot.type === 'elective' && slot.electiveFills && slot.electiveFills.length > 0) {
    // For partially filled electives, report the used credits (capped at slotCredits)
    const used = slot.electiveFills.reduce((sum, f) => sum + f.credits, 0);
    return Math.min(used, slot.slotCredits ?? 0);
  }
  // options and elective slots carry their credit value in slotCredits
  return slot.slotCredits ?? 0;
}

/**
 * Total credits for a single semester column.
 */
export function semesterTotalCredits(
  slots: Slot[],
  courseMap: Map<string, Course>,
): number {
  return slots.reduce((sum, slot) => sum + slotCredits(slot, courseMap), 0);
}

/**
 * Total credits scheduled across all 8 semesters.
 */
export function planTotalCredits(
  semesters: Slot[][],
  courseMap: Map<string, Course>,
): number {
  return semesters.reduce(
    (sum, semester) => sum + semesterTotalCredits(semester, courseMap),
    0,
  );
}

/**
 * Count how many slots are marked as "completed".
 * Counts fixed slots with a courseCode, filled options, and filled electives.
 */
export function completedSlotCount(semesters: Slot[][]): number {
  let count = 0;
  for (const semester of semesters) {
    for (const slot of semester) {
      if (slot.completed) count++;
    }
  }
  return count;
}

/**
 * Compute the degree completion percentage.
 * Based on credits from completed slots vs. total degree hours.
 *
 * @param semesters       - The 8-semester plan
 * @param completedCodes  - Set of course codes marked complete
 * @param courseMap       - O(1) course lookup
 * @param totalDegreeHours - The required total from the degree plan
 */
export function completionPercentage(
  semesters: Slot[][],
  completedCodes: Set<string>,
  courseMap: Map<string, Course>,
  totalDegreeHours: number,
): number {
  if (totalDegreeHours === 0) return 0;
  let earnedCredits = 0;

  for (const semester of semesters) {
    for (const slot of semester) {
      // A slot contributes to completion if its effective code is in completedCodes
      let effectiveCode: string | undefined;
      if (slot.type === 'fixed') effectiveCode = slot.courseCode;
      else if (slot.type === 'options') effectiveCode = slot.selectedOption ?? undefined;
      else if (slot.type === 'elective') effectiveCode = slot.electiveCode ?? undefined;

      if (effectiveCode && completedCodes.has(effectiveCode)) {
        earnedCredits += slotCredits(slot, courseMap);
      }
    }
  }

  return Math.min(100, Math.round((earnedCredits / totalDegreeHours) * 100));
}
