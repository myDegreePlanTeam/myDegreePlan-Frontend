/**
 * PrereqTooltip.tsx
 * Click-triggered info panel that shows a course's full description and
 * prerequisite satisfaction status. Renders as a fixed-position portal
 * to avoid z-index and overflow clipping issues.
 *
 * The panel is positioned adjacent to the triggering info icon, clamped
 * within the viewport so it is always fully visible and readable.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { usePlanStore } from '../../store/planStore';
import type { Course, ValidityResult } from '../../types';

interface Props {
  courseCode: string;
  validity: ValidityResult | undefined;
  children: React.ReactNode;
}

export function PrereqTooltip({ courseCode, validity, children }: Props) {
  const courseMap = usePlanStore((s) => s.courseMap);
  const course: Course | undefined = courseMap.get(courseCode);

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    if (!iconRef.current || !panelRef.current) return;
    const iconRect = iconRef.current.getBoundingClientRect();
    const panelEl = panelRef.current;
    const panelWidth = panelEl.offsetWidth;
    const panelHeight = panelEl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    // Prefer placing to the right of the icon
    let left = iconRect.right + pad;
    if (left + panelWidth > vw - pad) {
      // Fall back to placing left of the icon
      left = iconRect.left - panelWidth - pad;
    }
    // If still offscreen, center horizontally
    if (left < pad) {
      left = Math.max(pad, (vw - panelWidth) / 2);
    }

    // Vertically center on the icon, then clamp
    let top = iconRect.top + iconRect.height / 2 - panelHeight / 2;
    top = Math.max(pad, Math.min(top, vh - panelHeight - pad));

    setPosition({ top, left });
  }, []);

  // Position the panel when it opens and on scroll/resize
  useEffect(() => {
    if (!open) return;
    // Initial positioning after a frame so the panel has rendered
    requestAnimationFrame(reposition);

    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        iconRef.current && !iconRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  if (!course) return <>{children}</>;

  const prereqs = course.prerequisites ?? [];
  const coreqs = course.corequisites ?? [];
  const placements = course.placementRequirements ?? [];
  const missingPrereqsSet = new Set(validity?.missingPrereqs ?? []);
  const missingCoreqsSet = new Set(validity?.missingCoreqs ?? []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setOpen((v) => !v);
  };

  return (
    <div className="relative">
      {children}

      {/* Always-visible info icon */}
      <button
        ref={iconRef}
        onClick={handleToggle}
        onPointerDown={(e) => e.stopPropagation()}
        title="View course details"
        className={`absolute -top-1 -right-1 p-0.5 rounded-full transition-all z-10 ${
          open
            ? 'bg-accent-blue text-white shadow-md'
            : 'bg-navy-600 text-slate-400 hover:text-accent-blue hover:bg-navy-500'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Portal-rendered info panel */}
      {open && createPortal(
        <div
          ref={panelRef}
          style={{ top: position.top, left: position.left }}
          className="fixed z-[9999] w-80 rounded-xl bg-navy-700 border border-navy-400 border-opacity-60 shadow-2xl shadow-black/60 p-4 animate-fade-in"
        >
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            className="absolute top-2 right-2 p-0.5 rounded text-slate-500 hover:text-slate-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Course header */}
          <div className="mb-3 pr-5">
            <span className="font-mono text-xs text-accent-blue font-semibold tracking-wider">
              {course.code}
            </span>
            <h4 className="font-semibold text-slate-100 mt-0.5 leading-tight">
              {course.name}
            </h4>
            <span className="text-xs text-slate-400">{course.credits} credit hours</span>
          </div>

          {/* Description */}
          {course.description && (
            <p className="text-xs text-slate-400 leading-relaxed mb-3 max-h-28 overflow-y-auto">
              {course.description}
            </p>
          )}

          {/* Prerequisites */}
          {prereqs.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Prerequisites
              </p>
              <div className="space-y-1">
                {prereqs.map((prereq) => {
                  const isMissing = missingPrereqsSet.has(prereq);
                  const prereqCourse = courseMap.get(prereq);
                  return (
                    <div key={prereq} className="flex items-center gap-2 text-xs">
                      {isMissing ? (
                        <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={isMissing ? 'text-red-300' : 'text-emerald-300'}>
                        <span className="font-mono font-medium">{prereq}</span>
                        {prereqCourse && <span className="text-slate-400 ml-1">— {prereqCourse.name}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Corequisites */}
          {coreqs.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Corequisites (Concurrent or Before)
              </p>
              <div className="space-y-1">
                {coreqs.map((coreq) => {
                  const isMissing = missingCoreqsSet.has(coreq);
                  const coreqCourse = courseMap.get(coreq);
                  return (
                    <div key={coreq} className="flex items-center gap-2 text-xs">
                      {isMissing ? (
                        <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={isMissing ? 'text-red-300' : 'text-emerald-300'}>
                        <span className="font-mono font-medium">{coreq}</span>
                        {coreqCourse && <span className="text-slate-400 ml-1">— {coreqCourse.name}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Placement Requirements */}
          {placements.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Placement Requirements
              </p>
              <div className="space-y-1">
                {placements.map((req, idx) => (
                  <div key={idx} className="flex gap-2 text-xs">
                    <svg className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-yellow-200/90 leading-tight">
                      {req.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {prereqs.length === 0 && coreqs.length === 0 && placements.length === 0 && (
            <p className="text-xs text-slate-500 italic">No prerequisites or corequisites required.</p>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
