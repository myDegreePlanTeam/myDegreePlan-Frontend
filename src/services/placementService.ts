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
