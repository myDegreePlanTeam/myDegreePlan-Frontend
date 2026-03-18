/**
 * Sidebar.tsx
 * Collapsible left-side panel containing:
 *   - Course catalog (searchable + filterable)
 *   - Unscheduled courses pool
 *   - Degree progress summary
 *   - Degree switcher button
 */

import React, { useState } from 'react';
import { usePlanStore } from '../../store/planStore';
import { CourseCatalog } from './CourseCatalog';
import { UnscheduledPool } from './UnscheduledPool';
import { TransferModal } from './TransferModal';
import { PlacementModal } from './PlacementModal';
import {
  planTotalCredits,
  completedSlotCount,
} from '../../services/creditCalculator';

interface Props {
  onSwitchDegree: () => void;
  onResetPlan: () => void;
}

export function Sidebar({ onSwitchDegree, onResetPlan }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'catalog' | 'unscheduled'>('catalog');
  
  const [isTransferModalOpen, setTransferModalOpen] = useState(false);
  const [isPlacementModalOpen, setPlacementModalOpen] = useState(false);

  const selectedDegree = usePlanStore((s) => s.selectedDegree);
  const semesters = usePlanStore((s) => s.semesters);
  const courseMap = usePlanStore((s) => s.courseMap);
  const degreePlan = usePlanStore((s) => s.degreePlan);
  const validityMap = usePlanStore((s) => s.validityMap);

  const totalScheduled = planTotalCredits(semesters, courseMap);
  const requiredHours = degreePlan?.hours ?? 0;
  const nCompleted = completedSlotCount(semesters);

  let invalidCount = 0;
  for (const [, r] of validityMap) {
    if (!r.valid) invalidCount++;
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center w-10 bg-navy-800 border-r border-navy-600 border-opacity-40 py-3 gap-3">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg hover:bg-navy-700 text-slate-500 hover:text-slate-200 transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-64 flex-shrink-0 bg-navy-800 border-r border-navy-600 border-opacity-40 overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-navy-600 border-opacity-40">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Selected Program</p>
          <p className="text-xs font-semibold text-slate-200 leading-tight mt-0.5 line-clamp-2">
            {selectedDegree ?? 'No program selected'}
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="flex-shrink-0 p-1 rounded hover:bg-navy-700 text-slate-600 hover:text-slate-300 transition-colors ml-2"
          title="Collapse sidebar"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Progress Summary */}
      <div className="px-3 py-2.5 border-b border-navy-600 border-opacity-30 bg-navy-900 bg-opacity-40">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-base font-bold text-slate-200">{totalScheduled}</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wide">
              {requiredHours > 0 ? `/ ${requiredHours} cr` : 'credits'}
            </p>
          </div>
          <div>
            <p className={`text-base font-bold ${nCompleted > 0 ? 'text-emerald-300' : 'text-slate-200'}`}>
              {nCompleted}
            </p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wide">done</p>
          </div>
          <div>
            <p className={`text-base font-bold ${invalidCount > 0 ? 'text-red-300' : 'text-slate-200'}`}>
              {invalidCount}
            </p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wide">invalid</p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-navy-600 border-opacity-40">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'catalog'
              ? 'text-accent-blue border-b-2 border-accent-blue'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Catalog
        </button>
        <button
          onClick={() => setActiveTab('unscheduled')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'unscheduled'
              ? 'text-accent-blue border-b-2 border-accent-blue'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Unscheduled
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col">
        {activeTab === 'catalog' ? (
          <CourseCatalog />
        ) : (
          <UnscheduledPool />
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-navy-600 border-opacity-40 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => setTransferModalOpen(true)}
            className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold tracking-wide uppercase text-accent-violet border border-navy-500 hover:border-accent-violet hover:bg-accent-violet/10 transition-colors"
          >
            + Transfer
          </button>
          <button
            onClick={() => setPlacementModalOpen(true)}
            className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold tracking-wide uppercase text-accent-cyan border border-navy-500 hover:border-accent-cyan hover:bg-accent-cyan/10 transition-colors"
          >
            ACT Scores
          </button>
        </div>
        <button
          id="switch-degree-btn"
          onClick={onSwitchDegree}
          className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-300 border border-navy-500 hover:border-accent-blue hover:text-accent-blue transition-colors"
        >
          Switch Degree
        </button>
        <button
          id="reset-plan-btn"
          onClick={onResetPlan}
          className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-400 hover:text-red-300 hover:border-red-800 border border-navy-600 transition-colors"
        >
          Reset Plan
        </button>
      </div>

      <TransferModal 
        isOpen={isTransferModalOpen} 
        onClose={() => setTransferModalOpen(false)} 
      />
      <PlacementModal 
        isOpen={isPlacementModalOpen} 
        onClose={() => setPlacementModalOpen(false)} 
      />
    </div>
  );
}
