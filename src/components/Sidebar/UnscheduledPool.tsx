/**
 * UnscheduledPool.tsx
 * Shows fixed-plan courses that have been removed from the semester grid.
 * Acts as a droppable zone and renders draggable course tiles.
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { usePlanStore } from '../../store/planStore';
import { CourseTile } from '../CourseTile/CourseTile';

export function UnscheduledPool() {
  const unscheduled = usePlanStore((s) => s.unscheduled);

  const { setNodeRef, isOver } = useDroppable({
    id: 'unscheduled',
    data: { semesterIndex: -1 },
  });

  if (unscheduled.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
        Unscheduled ({unscheduled.length})
      </h3>
      <div
        ref={setNodeRef}
        className={`rounded-xl border border-dashed p-2 space-y-1.5 min-h-12 transition-colors ${
          isOver
            ? 'border-accent-blue border-opacity-60 bg-navy-700'
            : 'border-navy-600 border-opacity-50'
        }`}
      >
        {unscheduled.map((slot) => (
          <CourseTile key={slot.id} slot={slot} />
        ))}
      </div>
    </div>
  );
}
