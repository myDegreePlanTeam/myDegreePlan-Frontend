/**
 * equivalencies.ts
 * Reusable utility for checking course equivalencies.
 * 
 * Many TTU courses state "or equivalent" in their prerequisites. This mapping 
 * defines which courses are universally accepted as satisfying a given prerequisite.
 * Typically, higher-level math or specialized variants sequence backward.
 */

// Key: The prerequisite required
// Value: Courses that satisfy the prerequisite
const EQUIVALENCY_MAP: Record<string, string[]> = {
  // Math sequence equivalencies (higher level calculus covers lower algebra/trig)
  'MATH1130': ['MATH1710', 'MATH1730', 'MATH1830', 'MATH1910', 'MATH1920'], // College Algebra satisfied by Precal or Calc
  'MATH1710': ['MATH1730', 'MATH1830', 'MATH1910', 'MATH1920'], // Precal I satisfied by Precal or Calc
  'MATH1720': ['MATH1730', 'MATH1910', 'MATH1920'],             // Precal II satisfied by Precal or Calc
  'MATH1730': ['MATH1910', 'MATH1920'],                         // Precal satisfied by Calc I
  'MATH1830': ['MATH1910', 'MATH1920'],                         // Applied Calc satisfied by Calc I
  
  // English sequence equivalencies
  'ENGL1010': ['ENGL1011', 'ENGL1015'],
  'ENGL1020': ['ENGL1021', 'ENGL1025'],

  // Computer Science equivalencies
  'CSC2000': ['CSC2010', 'CSC2011', 'CSC2110', 'CSC2111'],
  'CSC2001': ['CSC2010', 'CSC2011', 'CSC2110', 'CSC2111', 'ENGR1210'],

  // Science sequences
  'PHYS2010': ['PHYS2110'], // Calculus-based physics satisfies algebra-based physics
  'PHYS2020': ['PHYS2120'],

  // Special common cross-listed equivalencies
  'PC2500': ['COMM2025'],
  'COMM2025': ['PC2500'],
};

/**
 * Get all equivalent courses that can satisfy the specified prerequisite.
 */
export function getEquivalentCourses(courseCode: string): string[] {
  return EQUIVALENCY_MAP[courseCode] || [];
}

/**
 * Check if a course description indicates that its prerequisites array
 * actually represents an OR-logic group (e.g. "or equivalent" or lists "or").
 *
 * This handles cases where legacy data has `prerequisites: ["MATH1130", "MATH1710"]` 
 * but the description explicitly states "MATH 1130 or MATH 1710".
 */
export function isOrLogicPrerequisite(description?: string): boolean {
  if (!description) return false;
  const lower = description.toLowerCase();
  
  // Common TTU catalog patterns that imply OR instead of AND
  if (lower.includes('or equivalent')) return true;
  if (lower.includes('or consent')) return true;
  if (/or \w{3,4}\s?\d{4}/.test(lower)) return true; // matches "or MATH 1710"
  
  return false;
}
