// STUB: Transfer credit import service
// Supports two future import paths:
//   1. JSON import from student account API
//   2. SQL query result from student information system (SIS)
// Currently: manual entry only (active)
// Future: replace manualTransferEntry() with live account fetch

export interface TransferCourse {
  code: string;           // Course code as recognized at TTU
  sourceInstitution: string;
  originalCode: string;   // Course code at the transfer institution
  credits: number;
  grade: string;
  equivalency?: string;   // TTU equivalent course code, if mapped
}

export async function fetchTransferCreditsFromAccount(
  studentId: string
): Promise<TransferCourse[]> {
  // TODO: Implement when SIS API access is granted
  // Will call: GET /api/student/{studentId}/transfer-credits
  throw new Error("Account-based transfer import not yet implemented.");
}

export async function importTransferCreditsFromJSON(
  json: unknown
): Promise<TransferCourse[]> {
  // TODO: Validate and parse JSON export from student portal
  throw new Error("JSON transfer import not yet implemented.");
}

export function manualTransferEntry(
  courses: TransferCourse[]
): TransferCourse[] {
  // ACTIVE: Returns the manually entered list as-is for use in planStore
  return courses;
}
