/**
 * App.tsx
 * Root application component. Responsibilities:
 * - Bootstrap data loading on mount
 * - Provide DndContext (dnd-kit) wrapping the entire app
 * - Handle all onDragEnd events and route them to the store
 * - Manage the DegreeSelector view vs. the planner view
 * - Handle major-switch confirmation dialog
 * - Handle reset plan confirmation
 * - Render the DragOverlay for visual drag feedback
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { usePlanStore } from './store/planStore';
import { DegreeSelector } from './components/DegreeSelector/DegreeSelector';
import { SemesterGrid } from './components/SemesterGrid/SemesterGrid';
import { Sidebar } from './components/Sidebar/Sidebar';
import { StatusBar } from './components/StatusBar/StatusBar';
import { CourseTile } from './components/CourseTile/CourseTile';
import { OptionsSlot, ElectiveSlot } from './components/SlotTile/SlotTile';
import { NotificationToasts } from './components/Notifications/NotificationToast';
import type { Slot } from './types';

// ─── Drag Overlay Renderer ────────────────────────────────────────────────────

/**
 * Renders the ghost tile shown under the cursor while dragging.
 * We pass isOverlay=true to disable nested drag/drop listeners.
 */
function DragOverlayContent({ activeSlot }: { activeSlot: Slot | null }) {
  if (!activeSlot) return null;

  return (
    <div className="drag-overlay w-52 pointer-events-none select-none">
      {activeSlot.type === 'fixed' && <CourseTile slot={activeSlot} isOverlay />}
      {activeSlot.type === 'options' && <OptionsSlot slot={activeSlot} isOverlay />}
      {activeSlot.type === 'elective' && <ElectiveSlot slot={activeSlot} isOverlay />}
    </div>
  );
}

// ─── Confirmation Modal ────────────────────────────────────────────────────────

interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm" onClick={onCancel} />
      {/* Dialog */}
      <div className="relative glass-card-raised rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-in">
        <h3 className="text-base font-bold text-slate-100 mb-2">Confirm Action</h3>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            id="confirm-cancel-btn"
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-navy-500 text-slate-300 text-sm hover:border-slate-400 transition-colors"
          >
            Cancel
          </button>
          <button
            id="confirm-proceed-btn"
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const loadData = usePlanStore((s) => s.loadData);
  const resetPlan = usePlanStore((s) => s.resetPlan);
  const moveSlot = usePlanStore((s) => s.moveSlot);
  const fillElective = usePlanStore((s) => s.fillElective);
  const addCourseToSemester = usePlanStore((s) => s.addCourseToSemester);
  const loaded = usePlanStore((s) => s.loaded);
  const loadError = usePlanStore((s) => s.loadError);
  const selectedDegree = usePlanStore((s) => s.selectedDegree);
  const semesters = usePlanStore((s) => s.semesters);

  // UI state
  const [showDegreeSelector, setShowDegreeSelector] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [activeSlot, setActiveSlot] = useState<Slot | null>(null);

  // Load catalog data on mount
  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Show degree selector if no degree is selected yet
  const shouldShowDegreeSelector = !selectedDegree || showDegreeSelector;

  // ── DnD Setup ──────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require a small drag distance to prevent accidental drags on click
        distance: 6,
      },
    }),
  );

  /** Find a slot by its id across all semesters and unscheduled pool. */
  const findSlot = useCallback(
    (slotId: string): Slot | null => {
      for (const sem of semesters) {
        const found = sem.find((s) => s.id === slotId);
        if (found) return found;
      }
      return null;
    },
    [semesters],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const data = active.data.current as { slotId?: string; type?: string };

      if (data?.slotId) {
        const slot = findSlot(data.slotId);
        if (slot) setActiveSlot(slot);
      }
    },
    [findSlot],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveSlot(null);
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current as {
        slotId?: string;
        courseCode?: string;
        type?: string;
      };
      const overData = over.data.current as {
        semesterIndex?: number;
        slotId?: string;
        type?: string;
      };

      // ── Case 1: dragging a catalog item onto a semester column ────────────
      if (activeData?.type === 'catalog-item' && activeData.courseCode) {
        const semIndex = overData?.semesterIndex;
        if (semIndex !== undefined && semIndex >= 0) {
          // Check if the drop target is an elective slot
          if (overData?.slotId) {
            const targetSlot = findSlot(overData.slotId);
            if (targetSlot?.type === 'elective') {
              fillElective(overData.slotId, activeData.courseCode);
              return;
            }
          }
          addCourseToSemester(activeData.courseCode, semIndex);
        }
        return;
      }

      // ── Case 2: dragging an existing slot to a new location ───────────────
      if (activeData?.slotId) {
        const slotId = activeData.slotId;
        let destSemesterIndex = -1;
        let destPosition = 0;

        if (over.id === 'unscheduled') {
          destSemesterIndex = -1;
        } else if (typeof over.id === 'string' && over.id.startsWith('semester-')) {
          destSemesterIndex = parseInt(over.id.split('-')[1], 10);
          destPosition = semesters[destSemesterIndex]?.length ?? 0;
        } else if (overData?.semesterIndex !== undefined) {
          destSemesterIndex = overData.semesterIndex;
          if (destSemesterIndex >= 0) {
            // Dropping onto another slot — insert before it
            const sem = semesters[destSemesterIndex];
            const idx = sem.findIndex((s) => s.id === over.id);
            destPosition = idx >= 0 ? idx : sem.length;
          }
        }

        // Ignore if source and destination are the same slot
        if (active.id === over.id) return;

        moveSlot({ slotId, toSemesterIndex: destSemesterIndex, toPosition: destPosition });
      }
    },
    [semesters, moveSlot, fillElective, addCourseToSemester, findSlot],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSwitchDegree = () => {
    if (selectedDegree) {
      setConfirm({
        message:
          'Switching degrees will clear your current plan and reset all semester assignments. Are you sure?',
        onConfirm: () => {
          setConfirm(null);
          setShowDegreeSelector(true);
        },
      });
    } else {
      setShowDegreeSelector(true);
    }
  };

  const handleResetPlan = () => {
    setConfirm({
      message:
        'This will reset all courses to the recommended sequence and clear all completed marks. Are you sure?',
      onConfirm: () => {
        setConfirm(null);
        void resetPlan();
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading course catalog…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center">
          <p className="text-red-400 font-semibold mb-2">Failed to load data</p>
          <p className="text-slate-500 text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  if (shouldShowDegreeSelector) {
    return (
      <>
        <DegreeSelector
          onSelect={() => setShowDegreeSelector(false)}
        />
        {confirm && (
          <ConfirmModal
            message={confirm.message}
            onConfirm={confirm.onConfirm}
            onCancel={() => setConfirm(null)}
          />
        )}
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* App Shell */}
      <div className="flex flex-col h-screen bg-navy-900 overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="flex items-center gap-4 px-4 py-2.5 bg-navy-800 border-b border-navy-600 border-opacity-50 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="font-bold text-sm text-white tracking-tight">Degree Planner</span>
          </div>
          <div className="h-4 w-px bg-navy-600" />
          <p className="text-xs text-slate-400 truncate max-w-xs">{selectedDegree}</p>
        </header>

        {/* Status Bar */}
        <StatusBar />

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            onSwitchDegree={handleSwitchDegree}
            onResetPlan={handleResetPlan}
          />

          {/* Semester Grid */}
          <main className="flex-1 overflow-x-auto overflow-y-auto p-4 bg-navy-900">
            <SemesterGrid />
          </main>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        <DragOverlayContent activeSlot={activeSlot} />
      </DragOverlay>

      {/* Notifications */}
      <NotificationToasts />

      {/* Confirmation Modal */}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </DndContext>
  );
}
