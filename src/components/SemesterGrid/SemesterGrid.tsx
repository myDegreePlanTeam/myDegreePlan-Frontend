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
    <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4 scroll-smooth-none" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
      {/* Main Grid Layout */}
      <div className="flex gap-3 min-w-max">
        
        {/* Transfer Credits (Semester 0) */}
        <div className="flex flex-col gap-2 relative">
          <div className="px-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent-violet">
              Prior Learning
            </span>
          </div>
          <div className="flex gap-2 h-full">
            <SemesterColumn
              semesterIndex={0}
              slots={semesters[0] ?? []}
            />
          </div>
        </div>

        {/* Separator */}
        <div className="w-px bg-navy-600 opacity-50 mx-2 my-8 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>

        {/* Year group layout: 2 columns per year (indices 1-8) */}
        {[0, 1, 2, 3].map((yearIdx) => {
          const fallIdx = yearIdx * 2 + 1;
          const springIdx = yearIdx * 2 + 2;
          return (
            <div key={yearIdx} className="flex flex-col gap-2">
              {/* Year label */}
              <div className="px-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Year {yearIdx + 1}
                </span>
              </div>
              <div className="flex gap-2 h-full">
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
