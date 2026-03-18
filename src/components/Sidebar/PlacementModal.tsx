import React, { useState } from 'react';
import { usePlanStore } from '../../store/planStore';
import type { PlacementScores } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function PlacementModal({ isOpen, onClose }: Props) {
  const currentScores = usePlanStore((s) => s.placementScores);
  const setPlacementScores = usePlanStore((s) => s.setPlacementScores);
  
  const [actMath, setActMath] = useState(currentScores.actMath?.toString() || '');
  const [actEnglish, setActEnglish] = useState(currentScores.actEnglish?.toString() || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const scores: PlacementScores = {
      ...currentScores,
      actMath: actMath ? parseInt(actMath) : undefined,
      actEnglish: actEnglish ? parseInt(actEnglish) : undefined,
    };
    
    setPlacementScores(scores);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-navy-800 rounded-2xl shadow-2xl shadow-black/50 border border-navy-600 border-opacity-50 w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-600 border-opacity-30 flex justify-between items-center bg-navy-900 bg-opacity-40">
          <h2 className="text-lg font-bold text-slate-100">Test Scores</h2>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Enter your standardized test scores. These scores are used to bypass prerequisites for introductory courses like MATH1910 or ENGL1010.
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                ACT Math
              </label>
              <input
                type="number"
                min="1"
                max="36"
                value={actMath}
                onChange={(e) => setActMath(e.target.value)}
                placeholder="1-36"
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                ACT English
              </label>
              <input
                type="number"
                min="1"
                max="36"
                value={actEnglish}
                onChange={(e) => setActEnglish(e.target.value)}
                placeholder="1-36"
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all"
              />
            </div>
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg font-bold text-navy-900 bg-accent-cyan hover:bg-opacity-90 transition-colors shadow-lg shadow-accent-cyan/20"
            >
              Save Scores
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
