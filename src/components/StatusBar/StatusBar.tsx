/**
 * StatusBar.tsx
 * Persistent statistics bar at the top of the planner view.
 * Shows: invalid count, total scheduled credits, completed courses, % complete.
 */

import React from 'react';
import { usePlanStore } from '../../store/planStore';
import {
  planTotalCredits,
  completedSlotCount,
  completionPercentage,
} from '../../services/creditCalculator';

export function StatusBar() {
  const semesters = usePlanStore((s) => s.semesters);
  const validityMap = usePlanStore((s) => s.validityMap);
  const courseMap = usePlanStore((s) => s.courseMap);
  const completedCodes = usePlanStore((s) => s.completedCodes);
  const degreePlan = usePlanStore((s) => s.degreePlan);

  // Count invalid placements (only filled slots that are invalid)
  let invalidCount = 0;
  for (const [, result] of validityMap) {
    if (!result.valid) invalidCount++;
  }

  const totalScheduled = planTotalCredits(semesters, courseMap);
  const requiredHours = degreePlan?.hours ?? 0;
  const nCompleted = completedSlotCount(semesters);
  const pctComplete = completionPercentage(semesters, completedCodes, courseMap, requiredHours);

  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-navy-800 border-b border-navy-600 border-opacity-50 flex-wrap">
      {/* Invalid placements */}
      <div className="flex items-center gap-2">
        {invalidCount > 0 ? (
          <div className="flex items-center gap-1.5 bg-red-950 bg-opacity-60 border border-red-800 border-opacity-60 rounded-full px-3 py-1">
            <svg className="w-3.5 h-3.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-bold text-red-300">
              {invalidCount} invalid
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-emerald-950 bg-opacity-40 border border-emerald-800 border-opacity-40 rounded-full px-3 py-1">
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs font-bold text-emerald-300">All valid</span>
          </div>
        )}
      </div>

      <div className="h-4 w-px bg-navy-600" />

      {/* Credit hours */}
      <div className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span className="text-xs text-slate-400">
          <span className="font-bold text-slate-200">{totalScheduled}</span>
          {requiredHours > 0 && (
            <span> / {requiredHours} cr</span>
          )}
        </span>
      </div>

      <div className="h-4 w-px bg-navy-600" />

      {/* Completed */}
      <div className="flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs text-slate-400">
          <span className="font-bold text-emerald-300">{nCompleted}</span> completed
        </span>
      </div>

      <div className="h-4 w-px bg-navy-600" />

      {/* Completion percentage */}
      {requiredHours > 0 && (
        <div className="flex items-center gap-2 flex-1 max-w-48">
          <div className="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-violet transition-all duration-300"
              style={{ width: `${pctComplete}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-300 whitespace-nowrap">{pctComplete}%</span>
        </div>
      )}
    </div>
  );
}
