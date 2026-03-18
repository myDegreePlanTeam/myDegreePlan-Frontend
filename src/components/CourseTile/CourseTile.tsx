/**
 * CourseTile.tsx
 * Renders a single fixed-course slot in the semester grid.
 * Supports dragging (via dnd-kit useDraggable), completed toggle,
 * invalid highlighting, and a prerequisite detail tooltip on hover.
 */

import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { usePlanStore } from '../../store/planStore';
import { PrereqTooltip } from '../Tooltip/PrereqTooltip';
import type { Slot, ValidityResult } from '../../types';

interface Props {
  slot: Slot;
  /** Whether this tile is being rendered inside the drag overlay (no drag handle) */
  isOverlay?: boolean;
}

export function CourseTile({ slot, isOverlay = false }: Props) {
  const courseMap = usePlanStore((s) => s.courseMap);
  const validityMap = usePlanStore((s) => s.validityMap);
  const toggleCompleted = usePlanStore((s) => s.toggleCompleted);
  const removeFromSemester = usePlanStore((s) => s.removeFromSemester);

  const course = slot.courseCode ? courseMap.get(slot.courseCode) : undefined;
  const validity: ValidityResult | undefined = validityMap.get(slot.id);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: slot.id,
    data: { slotId: slot.id, type: 'course-tile' },
    disabled: isOverlay,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const isInvalid = validity && !validity.valid && !slot.completed;
  const isCompleted = slot.completed;

  const tileClass = isCompleted
    ? 'tile-completed'
    : isInvalid
      ? 'tile-invalid'
      : 'tile-valid';

  const displayCode = slot.courseCode ?? '???';
  const displayName = course?.name ?? displayCode;
  const credits = course?.credits ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group relative rounded-lg border px-3 py-2.5 cursor-grab active:cursor-grabbing
        ${tileClass} ${isDragging ? 'opacity-30' : 'opacity-100'}
        transition-all duration-150 hover:scale-[1.02] hover:shadow-lg
      `}
      {...(isOverlay ? {} : { ...attributes, ...listeners })}
    >
      {/* Invalid warning banner */}
      {isInvalid && (
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-red-500 rounded-t-lg" />
      )}

      {/* Completed shine */}
      {isCompleted && (
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-emerald-500 rounded-t-lg" />
      )}

      <PrereqTooltip
        courseCode={displayCode}
        validity={validity}
      >
        <div className="flex items-start justify-between gap-2">
          {/* Left: code + name */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              {/* Course code badge */}
              <span className="font-mono text-[10px] font-bold tracking-wider text-accent-blue uppercase">
                {displayCode}
              </span>

              {/* Status icon */}
              {isCompleted && (
                <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {isInvalid && !isCompleted && (
                <svg className="w-3 h-3 text-red-400 flex-shrink-0 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
            </div>

            <p className="text-xs text-slate-200 font-medium leading-tight line-clamp-2">
              {displayName}
            </p>
          </div>

          {/* Right: credits + action buttons */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">
              {credits} cr
            </span>

            {/* Action buttons — visible on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Complete toggle */}
              <button
                id={`complete-${slot.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCompleted(slot.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                title={isCompleted ? 'Mark as incomplete' : 'Mark as completed'}
                className={`p-0.5 rounded transition-colors ${
                  isCompleted
                    ? 'text-emerald-400 hover:text-emerald-300'
                    : 'text-slate-500 hover:text-emerald-400'
                }`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Remove button */}
              <button
                id={`remove-${slot.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromSemester(slot.id);
                }}
                onPointerDown={(e) => e.stopPropagation()}
                title="Remove from semester"
                className="p-0.5 rounded text-slate-500 hover:text-red-400 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Missing prereqs summary */}
        {isInvalid && (validity.missingPrereqs.length > 0 || validity.missingCoreqs.length > 0) && (
          <div className="mt-1.5 pt-1.5 border-t border-red-800 border-opacity-50 flex flex-col gap-0.5">
            {validity.missingPrereqs.length > 0 && (
              <p className="text-[9px] text-red-400 leading-tight">
                Missing Prereq: {validity.missingPrereqs.slice(0, 3).join(', ')}
                {validity.missingPrereqs.length > 3 && ` +${validity.missingPrereqs.length - 3}`}
              </p>
            )}
            {validity.missingCoreqs.length > 0 && (
              <p className="text-[9px] text-orange-400 leading-tight">
                Missing Coreq: {validity.missingCoreqs.slice(0, 3).join(', ')}
                {validity.missingCoreqs.length > 3 && ` +${validity.missingCoreqs.length - 3}`}
              </p>
            )}
          </div>
        )}
      </PrereqTooltip>
    </div>
  );
}
