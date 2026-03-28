/**
 * scienceSequences.ts
 * Defines paired science course sequences for the degree planner.
 * When a student selects one half of a sequence, the other half
 * should auto-fill in the paired Science Sequence slot.
 */

/** Maps a sequence-start course to its required follow-up */
const SEQUENCE_PAIRS: Record<string, string> = {
  CHEM1110: 'CHEM1120',
  PHYS2010: 'PHYS2020',
  PHYS2110: 'PHYS2120',
  BIOL1113: 'BIOL1123',
};

/** Reverse map: sequence-end → sequence-start */
const REVERSE_PAIRS: Record<string, string> = {};
for (const [start, end] of Object.entries(SEQUENCE_PAIRS)) {
  REVERSE_PAIRS[end] = start;
}

/** Courses that can be taken in either Science Sequence slot without a pair dependency */
const STANDALONE_COURSES = new Set(['GEOL1040', 'GEOL1045', 'BIOL2310']);

/**
 * Get the sequence partner for a course.
 * - If it's a start (CHEM1110), returns the end (CHEM1120)
 * - If it's an end (CHEM1120), returns the start (CHEM1110)
 * - If standalone, returns null
 */
export function getSequencePartner(code: string): string | null {
  return SEQUENCE_PAIRS[code] ?? REVERSE_PAIRS[code] ?? null;
}

/** Returns true if this course is the first in a paired sequence */
export function isSequenceStart(code: string): boolean {
  return code in SEQUENCE_PAIRS;
}

/** Returns true if this course is the second in a paired sequence */
export function isSequenceEnd(code: string): boolean {
  return code in REVERSE_PAIRS;
}

/** Returns true if this course has no sequence dependency */
export function isStandalone(code: string): boolean {
  return STANDALONE_COURSES.has(code);
}

/**
 * For a sequence-end course, returns its required predecessor.
 * For everything else, returns null.
 */
export function getRequiredPredecessor(code: string): string | null {
  return REVERSE_PAIRS[code] ?? null;
}

/**
 * Given a sibling's current selection, filter the available options
 * for a Science Sequence slot.
 */
export function filterScienceOptions(
  allOptions: string[],
  siblingSelection: string | null,
): string[] {
  if (!siblingSelection) return allOptions; // No sibling selection — show all

  // If sibling chose a start, this slot should show the end + standalones
  if (isSequenceStart(siblingSelection)) {
    const requiredEnd = SEQUENCE_PAIRS[siblingSelection];
    return allOptions.filter((c) => c === requiredEnd || isStandalone(c));
  }

  // If sibling chose an end, this slot should show the start + standalones
  if (isSequenceEnd(siblingSelection)) {
    const requiredStart = REVERSE_PAIRS[siblingSelection];
    return allOptions.filter((c) => c === requiredStart || isStandalone(c));
  }

  // Sibling chose standalone — show everything
  return allOptions;
}
