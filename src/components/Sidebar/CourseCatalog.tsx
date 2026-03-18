/**
 * CourseCatalog.tsx
 * Searchable, department-filterable course catalog displayed in the sidebar.
 * Each catalog course acts as a draggable item that can be dropped into a semester.
 */

import React, { useState, useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { usePlanStore } from '../../store/planStore';
import type { Course } from '../../types';

// ─── Individual catalog course item ─────────────────────────────────────────

interface CatalogItemProps {
  course: Course;
  onAdd?: (courseCode: string) => void;
}

function CatalogItem({ course, onAdd }: CatalogItemProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `catalog-${course.code}`,
    data: { courseCode: course.code, type: 'catalog-item' },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border border-navy-500 border-opacity-50 bg-navy-800 hover:bg-navy-700 px-3 py-2 cursor-grab active:cursor-grabbing transition-all ${
        isDragging ? 'opacity-40' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[10px] text-accent-blue font-bold block">{course.code}</span>
          <p className="text-xs text-slate-300 leading-tight line-clamp-2">{course.name}</p>
          {(course.prerequisites?.length ?? 0) > 0 && (
            <p className="text-[9px] text-slate-600 mt-0.5">
              Prereq: {course.prerequisites!.slice(0, 2).join(', ')}
              {(course.prerequisites?.length ?? 0) > 2 && ' …'}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] text-slate-500">{course.credits} cr</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMenu((v) => !v);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-accent-blue transition-all p-0.5 rounded"
            title="Add to semester"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Semester picker popover */}
      {showAddMenu && (
        <div className="absolute right-0 top-full mt-1 z-40 bg-navy-700 border border-navy-500 rounded-xl shadow-2xl p-2 w-44 animate-fade-in">
          <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1 px-1">Add to semester</p>
          <div className="grid grid-cols-2 gap-1">
            {Array.from({ length: 8 }, (_, i) => (
              <button
                key={i}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd?.(course.code);
                  // Signal parent via add event with semester index
                  const event = new CustomEvent('catalog-add', {
                    detail: { courseCode: course.code, semesterIndex: i },
                  });
                  window.dispatchEvent(event);
                  setShowAddMenu(false);
                }}
                className="text-[9px] px-1.5 py-1 rounded-lg hover:bg-navy-600 text-slate-300 hover:text-white transition-colors text-center"
              >
                Sem {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Catalog Panel ──────────────────────────────────────────────────────

export function CourseCatalog() {
  const courseMap = usePlanStore((s) => s.courseMap);
  const subjectCodes = usePlanStore((s) => s.subjectCodes);
  const addCourseToSemester = usePlanStore((s) => s.addCourseToSemester);

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');

  // Listen for add-to-semester events from catalog items
  React.useEffect(() => {
    const handler = (e: Event) => {
      const { courseCode, semesterIndex } = (e as CustomEvent).detail as {
        courseCode: string;
        semesterIndex: number;
      };
      addCourseToSemester(courseCode, semesterIndex);
    };
    window.addEventListener('catalog-add', handler);
    return () => window.removeEventListener('catalog-add', handler);
  }, [addCourseToSemester]);

  // Build sorted course list — filter by search + department
  const allCourses = useMemo(() => {
    return Array.from(courseMap.values()).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }, [courseMap]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allCourses.filter((c) => {
      const matchesDept = filterDept ? c.subjectCode === filterDept : true;
      const matchesSearch = q
        ? c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
        : true;
      return matchesDept && matchesSearch;
    });
  }, [allCourses, search, filterDept]);

  // Only render first 80 results for performance
  const displayCourses = filtered.slice(0, 80);

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* Search */}
      <div className="relative">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="catalog-search"
          type="text"
          placeholder="Search courses…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-navy-800 border border-navy-600 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-blue"
        />
      </div>

      {/* Department filter */}
      <select
        id="dept-filter"
        value={filterDept}
        onChange={(e) => setFilterDept(e.target.value)}
        className="w-full px-2 py-1.5 text-xs rounded-lg bg-navy-800 border border-navy-600 text-slate-300 focus:outline-none focus:border-accent-blue"
      >
        <option value="">All Departments</option>
        {subjectCodes.map((code) => (
          <option key={code} value={code}>{code}</option>
        ))}
      </select>

      {/* Result count */}
      <p className="text-[10px] text-slate-600">
        {filtered.length > 80
          ? `Showing 80 of ${filtered.length} — refine your search`
          : `${filtered.length} course${filtered.length !== 1 ? 's' : ''}`}
      </p>

      {/* Course list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {displayCourses.map((course) => (
          <CatalogItem key={course.code} course={course} />
        ))}
        {displayCourses.length === 0 && (
          <p className="text-xs text-slate-600 text-center py-4 italic">No courses found</p>
        )}
      </div>
    </div>
  );
}
