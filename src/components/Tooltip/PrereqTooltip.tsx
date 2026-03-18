/**
 * PrereqTooltip.tsx
 * Hover popover that shows a course's full description and prerequisite
 * satisfaction status for each prerequisite.
 */

import React, { useState, useRef, useEffect } from 'react';
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

  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = () => {
    timerRef.current = setTimeout(() => setVisible(true), 300);
  };

  const hideTooltip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  // Position the tooltip above or below the trigger based on available space
  useEffect(() => {
    if (visible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current.offsetHeight;
      const tooltipWidth = tooltipRef.current.offsetWidth;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      let top = triggerRect.bottom + 8;
      if (top + tooltipHeight > viewportHeight - 16) {
        top = triggerRect.top - tooltipHeight - 8;
      }

      let left = triggerRect.left;
      if (left + tooltipWidth > viewportWidth - 16) {
        left = viewportWidth - tooltipWidth - 16;
      }

      setPosition({ top, left });
    }
  }, [visible]);

  if (!course) return <>{children}</>;

  const prereqs = course.prerequisites ?? [];
  const missingSet = new Set(validity?.missingPrereqs ?? []);

  return (
    <div
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      className="relative"
    >
      {children}

      {visible && (
        <div
          ref={tooltipRef}
          style={{ top: position.top, left: position.left }}
          className="fixed z-50 w-80 rounded-xl glass-card-raised shadow-2xl shadow-black/50 p-4 animate-fade-in pointer-events-none"
        >
          {/* Course header */}
          <div className="mb-3">
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
            <p className="text-xs text-slate-400 leading-relaxed mb-3 max-h-24 overflow-y-auto">
              {course.description}
            </p>
          )}

          {/* Prerequisites */}
          {prereqs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Prerequisites
              </p>
              <div className="space-y-1">
                {prereqs.map((prereq) => {
                  const isMissing = missingSet.has(prereq);
                  const prereqCourse = courseMap.get(prereq);
                  return (
                    <div
                      key={prereq}
                      className="flex items-center gap-2 text-xs"
                    >
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
                        {prereqCourse && (
                          <span className="text-slate-400 ml-1">— {prereqCourse.name}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {prereqs.length === 0 && (
            <p className="text-xs text-slate-500 italic">No prerequisites required.</p>
          )}
        </div>
      )}
    </div>
  );
}
