/**
 * DegreeSelector.tsx
 * The initial degree selection screen. Displayed when no degree is selected
 * or when the user wants to switch majors.
 */

import React, { useState } from 'react';
import { usePlanStore } from '../../store/planStore';
import type { DegreeEntry } from '../../types';

interface Props {
  onSelect?: () => void;
}

export function DegreeSelector({ onSelect }: Props) {
  const degrees = usePlanStore((s) => s.degrees);
  const selectDegree = usePlanStore((s) => s.selectDegree);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = degrees.filter((d) =>
    d.degreeName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = async (degree: DegreeEntry) => {
    setLoading(true);
    await selectDegree(degree);
    setLoading(false);
    onSelect?.();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-accent-violet flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Degree Planner
          </h1>
        </div>
        <p className="text-slate-400 text-lg max-w-md mx-auto">
          Select your degree program to build and visualize your academic course plan.
        </p>
      </div>

      {/* Search */}
      <div className="w-full max-w-lg mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="degree-search"
            type="text"
            placeholder="Search programs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-navy-700 border border-navy-500 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-blue transition-colors"
          />
        </div>
      </div>

      {/* Degree Cards */}
      <div className="w-full max-w-lg space-y-3">
        {filtered.map((degree) => (
          <button
            key={degree.degreeName}
            id={`degree-${degree.planFile.replace('.json', '')}`}
            onClick={() => void handleSelect(degree)}
            disabled={loading}
            className="w-full text-left p-5 rounded-xl glass-card hover:border-accent-blue hover:border-opacity-60 hover:bg-navy-600 transition-all duration-200 group focus-ring disabled:opacity-50"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-100 group-hover:text-white transition-colors">
                  {degree.degreeName}
                </span>
              </div>
              <svg className="w-5 h-5 text-slate-500 group-hover:text-accent-blue group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            No programs match "{search}"
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-8 flex items-center gap-3 text-slate-400">
          <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          Loading degree plan…
        </div>
      )}
    </div>
  );
}
