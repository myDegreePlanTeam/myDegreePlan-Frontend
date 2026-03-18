/**
 * SemesterColumn.tsx
 * A single semester column in the 8-column Kanban grid.
 * Acts as a droppable container for course tiles.
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { usePlanStore } from '../../store/planStore';
import { semesterTotalCredits } from '../../services/creditCalculator';
import { CourseTile } from '../CourseTile/CourseTile';
import { OptionsSlot, ElectiveSlot } from '../SlotTile/SlotTile';
import type { Slot } from '../../types';

const MAX_CREDITS = 18;

const YEAR_LABELS = ['Year 1', 'Year 1', 'Year 2', 'Year 2', 'Year 3', 'Year 3', 'Year 4', 'Year 4'];
const TERM_LABELS = ['Fall', 'Spring', 'Fall', 'Spring', 'Fall', 'Spring', 'Fall', 'Spring'];

interface Props {
  semesterIndex: number;
  slots: Slot[];
}

export function SemesterColumn({ semesterIndex, slots }: Props) {
  const courseMap = usePlanStore((s) => s.courseMap);
  const { setNodeRef, isOver } = useDroppable({
    id: `semester-${semesterIndex}`,
    data: { semesterIndex },
  });

  const totalCredits = semesterTotalCredits(slots, courseMap);
  const isOverCredit = totalCredits > MAX_CREDITS;
  const year = YEAR_LABELS[semesterIndex];
  const term = TERM_LABELS[semesterIndex];
  const isSpring = term === 'Spring';

  return (
    <div
      className={`flex flex-col rounded-xl border transition-all duration-200 ${
        isOver
          ? 'border-accent-blue border-opacity-70 shadow-lg shadow-accent-blue/10 bg-navy-600'
          : 'border-navy-500 border-opacity-40 bg-navy-800 bg-opacity-60'
      }`}
      style={{ minWidth: '200px' }}
    >
      {/* Column Header */}
      <div className={`px-3 py-2.5 rounded-t-xl border-b border-opacity-30 ${
        isSpring ? 'border-accent-cyan' : 'border-navy-500'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{year}</p>
            <h3 className={`text-sm font-bold ${isSpring ? 'text-accent-cyan' : 'text-slate-200'}`}>
              {term}
            </h3>
          </div>
          {/* Credit counter */}
          <div className={`text-right ${isOverCredit ? 'text-accent-rose' : 'text-slate-400'}`}>
            <p className={`text-sm font-bold ${isOverCredit ? 'text-accent-rose animate-pulse-soft' : ''}`}>
              {totalCredits}
            </p>
            <p className="text-[9px] text-slate-500">/ {MAX_CREDITS} cr</p>
          </div>
        </div>
        {/* Credit progress bar */}
        <div className="mt-2 h-0.5 bg-navy-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOverCredit ? 'bg-accent-rose' : isSpring ? 'bg-accent-cyan' : 'bg-accent-blue'
            }`}
            style={{ width: `${Math.min(100, (totalCredits / MAX_CREDITS) * 100)}%` }}
          />
        </div>
      </div>

      {/* Droppable Slot Area */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 min-h-[120px]"
      >
        <SortableContext
          items={slots.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {slots.map((slot) => {
            if (slot.type === 'fixed') {
              return <CourseTile key={slot.id} slot={slot} />;
            } else if (slot.type === 'options') {
              return <OptionsSlot key={slot.id} slot={slot} />;
            } else {
              return <ElectiveSlot key={slot.id} slot={slot} />;
            }
          })}
        </SortableContext>

        {slots.length === 0 && (
          <div className={`h-16 rounded-lg border-2 border-dashed flex items-center justify-center text-xs text-slate-600 transition-colors ${
            isOver ? 'border-accent-blue border-opacity-40 text-accent-blue' : 'border-navy-600'
          }`}>
            {isOver ? 'Drop here' : 'Empty'}
          </div>
        )}
      </div>
    </div>
  );
}
