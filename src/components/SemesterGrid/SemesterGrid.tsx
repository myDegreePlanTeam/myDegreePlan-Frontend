/**
 * SemesterGrid.tsx
 * The 8-column semester Kanban grid — the hero of the UI.
 * Renders four years × two semesters, with year group headers.
 */

import React from 'react';
import { usePlanStore } from '../../store/planStore';
import { SemesterColumn } from './SemesterColumn';

export function SemesterGrid() {
  const semesters = usePlanStore((s) => s.semesters);

  return (
    <div className="flex-1 overflow-x-auto px-4 pb-4">
      {/* Year group layout: 2 columns per year */}
      <div className="flex gap-3 min-w-max">
        {[0, 1, 2, 3].map((yearIdx) => {
          const fallIdx = yearIdx * 2;
          const springIdx = yearIdx * 2 + 1;
          return (
            <div key={yearIdx} className="flex flex-col gap-2">
              {/* Year label */}
              <div className="px-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Year {yearIdx + 1}
                </span>
              </div>
              <div className="flex gap-2">
                <SemesterColumn
                  semesterIndex={fallIdx}
                  slots={semesters[fallIdx] ?? []}
                />
                <SemesterColumn
                  semesterIndex={springIdx}
                  slots={semesters[springIdx] ?? []}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
