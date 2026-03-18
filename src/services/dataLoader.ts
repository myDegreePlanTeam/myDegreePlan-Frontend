/**
 * dataLoader.ts
 * Fetches and indexes all JSON data files on application startup.
 * All data is loaded from /public/data/ — no hardcoded course or degree values.
 *
 * Degree-to-file mapping: each entry in degrees.json includes a `planFile`
 * field (e.g. "csc_hpc.json") that resolves to /data/<planFile>.
 */

import type { Course, CoursesFile, DegreePlan, DegreesFile } from '../types';

const DATA_BASE = '/data';

/** Fetch and parse a JSON file from the /data directory. */
async function fetchJson<T>(filename: string): Promise<T> {
  const url = `${DATA_BASE}/${filename}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

/** Load the list of available degree programs from degrees.json. */
export async function loadDegrees(): Promise<DegreesFile> {
  return fetchJson<DegreesFile>('degrees.json');
}

/**
 * Load a specific degree plan by its planFile filename.
 * @param planFile - e.g. "csc_hpc.json"
 */
export async function loadDegreePlan(planFile: string): Promise<DegreePlan> {
  return fetchJson<DegreePlan>(planFile);
}

/**
 * Load the full course catalog and index it into an O(1) Map.
 * Missing entries are handled gracefully — callers should check for undefined.
 * @returns Map from course code → Course record
 */
export async function loadCourseMap(): Promise<Map<string, Course>> {
  const file = await fetchJson<CoursesFile>('coursesFile.json');
  const map = new Map<string, Course>();

  for (const course of file.courses) {
    // Normalize: ensure prerequisites is always an array
    const normalised: Course = {
      ...course,
      prerequisites: course.prerequisites ?? [],
    };
    map.set(course.code, normalised);
  }

  return map;
}

/**
 * Load the flat array of department/subject codes from codesFile.json.
 * Used to populate the catalog department filter.
 */
export async function loadSubjectCodes(): Promise<string[]> {
  return fetchJson<string[]>('codesFile.json');
}
