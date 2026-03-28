/**
 * SlotTile.tsx
 * Renders options (choice-group) and elective slot tiles.
 *
 * OptionsSlot: allows the student to pick one course from a predefined list.
 * ElectiveSlot: shows as free elective; a course can be dragged into it from
 *               the catalog, or cleared.
 */

import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { usePlanStore } from '../../store/planStore';
import { PrereqTooltip } from '../Tooltip/PrereqTooltip';
import { filterScienceOptions } from '../../knowledge/scienceSequences';
import type { Slot, ValidityResult } from '../../types';

// ─── Options Slot ─────────────────────────────────────────────────────────────

interface OptionsSlotProps {
  slot: Slot;
  isOverlay?: boolean;
}

export function OptionsSlot({ slot, isOverlay = false }: OptionsSlotProps) {
  const courseMap = usePlanStore((s) => s.courseMap);
  const validityMap = usePlanStore((s) => s.validityMap);
  const semesters = usePlanStore((s) => s.semesters);
  const fillChoice = usePlanStore((s) => s.fillChoice);
  const clearChoice = usePlanStore((s) => s.clearChoice);
  const toggleCompleted = usePlanStore((s) => s.toggleCompleted);

  const [showPicker, setShowPicker] = useState(false);

  const isFilled = !!slot.selectedOption;
  const validity: ValidityResult | undefined = validityMap.get(slot.id);
  const isInvalid = validity && !validity.valid && !slot.completed && isFilled;
  const isCompleted = slot.completed;
  const selectedCourse = slot.selectedOption ? courseMap.get(slot.selectedOption) : undefined;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: slot.id,
    data: { slotId: slot.id, type: 'options-tile' },
    disabled: isOverlay || !isFilled,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const tileClass = isCompleted ? 'tile-completed' : isInvalid ? 'tile-invalid' : isFilled ? 'tile-valid' : 'tile-unfilled';

  const handleSelect = (code: string) => {
    fillChoice(slot.id, code);
    setShowPicker(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border px-3 py-2.5 ${tileClass} ${isDragging ? 'opacity-30' : ''} transition-all duration-150`}
      {...(isFilled && !isOverlay ? { ...attributes, ...listeners } : {})}
    >
      {isInvalid && <div className="absolute -top-px left-0 right-0 h-0.5 bg-red-500 rounded-t-lg" />}
      {isCompleted && <div className="absolute -top-px left-0 right-0 h-0.5 bg-emerald-500 rounded-t-lg" />}

      {/* Header: slot label */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent-violet">
            {slot.optionsName ?? 'Choose an Option'}
          </span>

          {isFilled && selectedCourse && (
            <div>
              <PrereqTooltip courseCode={slot.selectedOption!} validity={validity}>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="font-mono text-[10px] text-accent-blue font-semibold">
                    {slot.selectedOption}
                  </span>
                  {isCompleted && (
                    <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {isInvalid && (
                    <svg className="w-3 h-3 text-red-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-xs text-slate-300 font-medium line-clamp-1">
                  {selectedCourse.name}
                </p>
              </PrereqTooltip>
            </div>
          )}

          {!isFilled && (
            <p className="text-xs text-slate-500 mt-0.5 italic">Unfilled — select a course</p>
          )}
        </div>

        {/* Right actions */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] text-slate-400">{slot.slotCredits ?? 3} cr</span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isFilled && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleCompleted(slot.id); }}
                onPointerDown={(e) => e.stopPropagation()}
                title={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                className={`p-0.5 rounded transition-colors ${isCompleted ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setShowPicker((v) => !v); }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Choose course"
              className="p-0.5 rounded text-slate-500 hover:text-accent-violet transition-colors"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
            </button>
            {isFilled && (
              <button
                onClick={(e) => { e.stopPropagation(); clearChoice(slot.id); }}
                onPointerDown={(e) => e.stopPropagation()}
                title="Clear selection"
                className="p-0.5 rounded text-slate-500 hover:text-red-400 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Missing prereqs summary */}
      {isInvalid && validity && (validity.missingPrereqs.length > 0 || validity.missingCoreqs.length > 0) && (
        <div className="mt-1 pt-1 border-t border-red-800 border-opacity-50 flex flex-col gap-0.5">
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

      {/* Same-semester conflict warning */}
      {validity?.sameSemesterPrereqs && validity.sameSemesterPrereqs.length > 0 && !slot.completed && isFilled && (
        <div className="mt-1 pt-1 border-t border-amber-700 border-opacity-50">
          <p className="text-[9px] text-amber-400 leading-tight">
            Same-semester conflict: {validity.sameSemesterPrereqs.join(', ')} must be taken earlier
          </p>
        </div>
      )}

      {/* Inline course picker popover */}
      {showPicker && (
        <div className="absolute top-full left-0 mt-1 z-30 w-64 max-h-48 overflow-y-auto rounded-xl glass-card-raised shadow-2xl animate-fade-in">
          <div className="p-2 space-y-0.5">
            {(() => {
              let availableOptions = slot.options ?? [];

              // For Science Sequence slots, filter based on sibling selection
              if (slot.optionsName === 'Science Sequence') {
                let siblingSelection: string | null = null;
                for (const sem of semesters) {
                  for (const s of sem) {
                    if (
                      s.type === 'options' &&
                      s.optionsName === 'Science Sequence' &&
                      s.id !== slot.id &&
                      s.selectedOption
                    ) {
                      siblingSelection = s.selectedOption;
                    }
                  }
                }
                availableOptions = filterScienceOptions(availableOptions, siblingSelection);
              }

              return availableOptions.map((code) => {
                const c = courseMap.get(code);
                return (
                  <button
                    key={code}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); handleSelect(code); }}
                    className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-navy-500 transition-colors text-xs"
                  >
                    <span className="font-mono font-semibold text-accent-blue">{code}</span>
                    {c && <span className="text-slate-400 ml-1.5">{c.name}</span>}
                  </button>
                );
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Elective Slot ────────────────────────────────────────────────────────────

interface ElectiveSlotProps {
  slot: Slot;
  isOverlay?: boolean;
}

export function ElectiveSlot({ slot, isOverlay = false }: ElectiveSlotProps) {
  const courseMap = usePlanStore((s) => s.courseMap);
  const clearElective = usePlanStore((s) => s.clearElective);
  const toggleCompleted = usePlanStore((s) => s.toggleCompleted);

  const fills = slot.electiveFills ?? [];
  const totalCredits = slot.slotCredits ?? 3;
  const usedCredits = fills.reduce((sum, f) => sum + f.credits, 0);
  const remaining = slot.remainingCredits ?? (totalCredits - usedCredits);
  const isFullyFilled = remaining === 0;
  const hasPartialFills = fills.length > 0;
  const isCompleted = slot.completed;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: slot.id,
    data: { slotId: slot.id, type: 'elective-tile' },
    disabled: isOverlay || !isFullyFilled,
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const tileClass = isCompleted ? 'tile-completed' : isFullyFilled ? 'tile-valid' : 'tile-unfilled';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border px-3 py-2.5 ${tileClass} ${isDragging ? 'opacity-30' : ''} transition-all duration-150`}
      {...(isFullyFilled && !isOverlay ? { ...attributes, ...listeners } : {})}
    >
      {isCompleted && <div className="absolute -top-px left-0 right-0 h-0.5 bg-emerald-500 rounded-t-lg" />}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent-amber">
            Free Elective
          </span>

          {hasPartialFills ? (
            <div className="mt-0.5 space-y-0.5">
              {fills.map((f) => {
                const c = courseMap.get(f.courseCode);
                return (
                  <p key={f.courseCode} className="text-[10px] text-slate-300 leading-tight">
                    <span className="font-mono text-accent-blue font-semibold">{f.courseCode}</span>
                    {c && <span className="text-slate-400 ml-1">{c.name}</span>}
                    <span className="text-slate-500 ml-1">({f.credits} cr)</span>
                  </p>
                );
              })}
              {!isFullyFilled && (
                <p className="text-[10px] text-accent-amber italic">
                  {remaining} cr remaining — drag a course here
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic mt-0.5">
              Drag any course here · {totalCredits} cr
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] text-slate-400">
            {hasPartialFills ? `${remaining}/${totalCredits} cr` : `${totalCredits} cr`}
          </span>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isFullyFilled && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleCompleted(slot.id); }}
                onPointerDown={(e) => e.stopPropagation()}
                className={`p-0.5 rounded transition-colors ${isCompleted ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`}
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            {hasPartialFills && (
              <button
                onClick={(e) => { e.stopPropagation(); clearElective(slot.id); }}
                onPointerDown={(e) => e.stopPropagation()}
                title="Clear all elective fills"
                className="p-0.5 rounded text-slate-500 hover:text-red-400 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
