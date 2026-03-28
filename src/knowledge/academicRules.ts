import { AcademicRule, PlacementGate, SatisfactionMethod, PlacementScores } from '../types';

/**
 * The single source of truth for all TTU academic policies that affect course eligibility.
 * All logic in here is pure TypeScript with no UI imports.
 */
export const ACADEMIC_RULES: Record<string, AcademicRule> = {
  MATH1910: {
    courseCode: 'MATH1910',
    satisfactionMethods: ['course', 'transfer', 'ap', 'ib', 'clep', 'act', 'math_placement'],
    placementGates: [
      { method: 'ap', examName: 'Calculus AB', minimumScore: 4, description: 'AP Calculus AB score >= 4' },
      { method: 'ap', examName: 'Calculus BC', minimumScore: 3, description: 'AP Calculus BC score >= 3' },
      { method: 'ib', examName: 'Mathematics HL', minimumScore: 5, description: 'IB Math HL score >= 5' },
      { method: 'clep', examName: 'Calculus', minimumScore: 50, description: 'CLEP Calculus score >= 50' },
      { method: 'math_placement', placementLevel: 5, description: 'TTU Math Placement Level 5' },
    ],
  },
  ENGL1010: {
    courseCode: 'ENGL1010',
    satisfactionMethods: ['course', 'transfer', 'ap', 'clep', 'act', 'dual_enrollment'],
    placementGates: [
      { method: 'act', subject: 'English', minimumScore: 18, description: 'ACT English >= 18 and Reading >= 19' }, // Handled in logic specifically
      { method: 'ap', examName: 'English Language', minimumScore: 3, description: 'AP English Language score >= 3' },
      { method: 'ap', examName: 'English Literature', minimumScore: 3, description: 'AP English Literature score >= 3' },
      { method: 'clep', examName: 'English Composition', minimumScore: 50, description: 'CLEP English Comp score >= 50' },
    ],
  },
  ENGL1020: {
    courseCode: 'ENGL1020',
    satisfactionMethods: ['course', 'transfer', 'ap'],
    placementGates: [
      { method: 'ap', examName: 'English Language', minimumScore: 4, description: 'AP English Language score >= 4' },
      { method: 'ap', examName: 'English Literature', minimumScore: 4, description: 'AP English Literature score >= 4' },
    ],
  },
  HIST2010: {
    courseCode: 'HIST2010',
    satisfactionMethods: ['course', 'transfer', 'ap', 'clep', 'dual_enrollment'],
    placementGates: [
      { method: 'ap', examName: 'US History', minimumScore: 3, description: 'AP US History score >= 3' },
      { method: 'clep', examName: 'American History I', minimumScore: 50, description: 'CLEP American History I score >= 50' },
    ],
  },
  HIST2020: {
    courseCode: 'HIST2020',
    satisfactionMethods: ['course', 'transfer', 'ap', 'clep', 'dual_enrollment'],
    placementGates: [
      { method: 'ap', examName: 'US History', minimumScore: 3, description: 'AP US History score >= 3' },
      { method: 'clep', examName: 'American History II', minimumScore: 50, description: 'CLEP American History II score >= 50' },
    ],
  },
  MATH1710: {
    courseCode: 'MATH1710',
    satisfactionMethods: ['course', 'transfer', 'act', 'clep', 'math_placement', 'dual_enrollment'],
    placementGates: [
      { method: 'act', subject: 'Math', minimumScore: 19, description: 'ACT Math >= 19' },
      { method: 'clep', examName: 'College Algebra', minimumScore: 50, description: 'CLEP College Algebra score >= 50' },
      { method: 'math_placement', placementLevel: 3, description: 'TTU Math Placement Level 3' },
    ],
    bypassOnly: true, // ACT score skips this prerequisite — does not award credit
  },
  MATH1720: {
    courseCode: 'MATH1720',
    satisfactionMethods: ['course', 'transfer', 'act', 'math_placement', 'dual_enrollment'],
    placementGates: [
      { method: 'act', subject: 'Math', minimumScore: 22, description: 'ACT Math >= 22' },
      { method: 'math_placement', placementLevel: 3, description: 'TTU Math Placement Level 3' },
    ],
    bypassOnly: true, // ACT score skips this prerequisite — does not award credit
  },
  MATH1730: {
    courseCode: 'MATH1730',
    satisfactionMethods: ['course', 'transfer', 'act', 'ap', 'clep', 'math_placement', 'dual_enrollment'],
    placementGates: [
      { method: 'act', subject: 'Math', minimumScore: 25, description: 'ACT Math >= 25' },
      { method: 'ap', examName: 'Calculus AB', minimumScore: 3, description: 'AP Calculus AB score >= 3' },
      { method: 'clep', examName: 'Precalculus', minimumScore: 50, description: 'CLEP Precalculus score >= 50' },
      { method: 'math_placement', placementLevel: 4, description: 'TTU Math Placement Level 4' },
    ],
    bypassOnly: true, // ACT score skips this prerequisite — does not award credit
  },
};

export function getRulesForCourse(courseCode: string): AcademicRule | null {
  return ACADEMIC_RULES[courseCode] || null;
}

export function canSatisfyByMethod(courseCode: string, method: SatisfactionMethod): boolean {
  const rules = getRulesForCourse(courseCode);
  return rules ? rules.satisfactionMethods.includes(method) : method === 'course';
}

export function getPlacementGatesForCourse(courseCode: string): PlacementGate[] {
  const rules = getRulesForCourse(courseCode);
  return rules?.placementGates || [];
}

export function isSatisfiedByPlacementScores(
  courseCode: string,
  scores: PlacementScores
): { satisfied: boolean; matchedGate?: PlacementGate } {
  const gates = getPlacementGatesForCourse(courseCode);
  for (const gate of gates) {
    if (gate.method === 'act') {
      if (gate.subject === 'Math' && scores.actMath && scores.actMath >= (gate.minimumScore || 0)) {
        return { satisfied: true, matchedGate: gate };
      }
      if (gate.subject === 'English' && courseCode === 'ENGL1010') {
        // ENGL1010 has a compound ACT requirement: English >= 18 AND Reading >= 19
        if (scores.actEnglish && scores.actEnglish >= 18 && scores.actReading && scores.actReading >= 19) {
          return { satisfied: true, matchedGate: gate };
        }
      }
    }
    if (gate.method === 'math_placement' && scores.mathPlacementLevel) {
      if (scores.mathPlacementLevel >= (gate.placementLevel || 0)) {
        return { satisfied: true, matchedGate: gate };
      }
    }
    if (gate.method === 'english_placement' && scores.englishPlacementLevel) {
      if (scores.englishPlacementLevel >= (gate.placementLevel || 0)) {
        return { satisfied: true, matchedGate: gate };
      }
    }
  }
  return { satisfied: false };
}

export function isSatisfiedByExamCredit(
  courseCode: string,
  examType: 'ap' | 'ib' | 'clep',
  examName: string,
  score: number
): { satisfied: boolean; matchedGate?: PlacementGate } {
  const gates = getPlacementGatesForCourse(courseCode);
  for (const gate of gates) {
    if (gate.method === examType && gate.examName === examName) {
      if (score >= (gate.minimumScore || 0)) {
        return { satisfied: true, matchedGate: gate };
      }
    }
  }
  return { satisfied: false };
}
