import React, { useState } from 'react';
import { usePlanStore } from '../../store/planStore';
import type { PlacementScores } from '../../types';
import { ACADEMIC_RULES, getPlacementGatesForCourse } from '../../knowledge/academicRules';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const UNLOCK_COURSES = ['MATH1910', 'MATH1730', 'MATH1720', 'MATH1710', 'ENGL1010'];

export function PlacementModal({ isOpen, onClose }: Props) {
  const currentScores = usePlanStore((s) => s.placementScores);
  const setPlacementScores = usePlanStore((s) => s.setPlacementScores);
  const courseMap = usePlanStore((s) => s.courseMap);
  
  const [scores, setScores] = useState<PlacementScores>({
    actMath: currentScores.actMath,
    actEnglish: currentScores.actEnglish,
    actReading: currentScores.actReading,
    actScience: currentScores.actScience,
    mathPlacementLevel: currentScores.mathPlacementLevel,
    englishPlacementLevel: currentScores.englishPlacementLevel,
  });

  if (!isOpen) return null;

  const handleChange = (field: keyof PlacementScores, value: string) => {
    setScores(prev => ({
      ...prev,
      [field]: value ? parseInt(value) : undefined,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPlacementScores(scores);
    onClose();
  };

  // Compute unlocked courses based on current scores, separating
  // credit-granting unlocks from bypass-only prerequisite skips
  const creditUnlocks: { code: string; name: string; gate: string }[] = [];
  const bypassUnlocks: { code: string; name: string; gate: string; enables: string }[] = [];

  for (const code of UNLOCK_COURSES) {
    const gates = getPlacementGatesForCourse(code);
    const rule = ACADEMIC_RULES[code];
    for (const gate of gates) {
      let met = false;
      if (gate.method === 'act') {
        if (gate.subject === 'Math' && scores.actMath && scores.actMath >= (gate.minimumScore || 0)) met = true;
        if (gate.subject === 'English' && scores.actEnglish && scores.actEnglish >= (gate.minimumScore || 0)) {
          if (code === 'ENGL1010' && (!scores.actReading || scores.actReading < 19)) met = false;
          else met = true;
        }
      }
      if (gate.method === 'math_placement' && scores.mathPlacementLevel && scores.mathPlacementLevel >= (gate.placementLevel || 0)) met = true;
      if (met) {
        const c = courseMap.get(code);
        if (rule?.bypassOnly) {
          // Find what course this bypass enables (the next course in the chain)
          const enables = code === 'MATH1730' ? 'MATH1910' : code === 'MATH1720' ? 'MATH1730' : 'MATH1720';
          bypassUnlocks.push({ code, name: c?.name || code, gate: gate.description, enables });
        } else {
          creditUnlocks.push({ code, name: c?.name || code, gate: gate.description });
        }
        break;
      }
    }
  }

  // Derive "ready to take" courses: non-bypass courses whose prereqs are now satisfied
  const readyToTake: { code: string; name: string }[] = [];
  if (bypassUnlocks.length > 0) {
    // If MATH1730 is bypassed, MATH1910 is ready to take (if not already a credit unlock)
    const bypassedCodes = new Set(bypassUnlocks.map(u => u.code));
    if (bypassedCodes.has('MATH1730')) {
      const calc1 = courseMap.get('MATH1910');
      if (calc1 && !creditUnlocks.some(u => u.code === 'MATH1910')) {
        readyToTake.push({ code: 'MATH1910', name: calc1.name });
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-navy-800 rounded-2xl shadow-2xl shadow-black/50 border border-navy-600 border-opacity-50 w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-navy-600 border-opacity-30 flex justify-between items-center bg-navy-900 bg-opacity-40">
          <h2 className="text-lg font-bold text-slate-100">Test & Placement Scores</h2>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          <p className="text-xs text-slate-400 leading-relaxed">
            ACT and placement scores are used to determine prerequisite eligibility within this planning tool only.
            Official placement decisions are made by the TTU Registrar and your academic advisor.
          </p>
          
          {/* ACT Scores */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-accent-cyan mb-3">ACT Sub-Scores</h3>
            <div className="grid grid-cols-2 gap-3">
              {([
                ['actMath', 'Math'],
                ['actEnglish', 'English'],
                ['actReading', 'Reading'],
                ['actScience', 'Science'],
              ] as [keyof PlacementScores, string][]).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">{label}</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={scores[field] ?? ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    placeholder="1-36"
                    className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Math Placement */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">TTU Placement Tests</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Math Level</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={scores.mathPlacementLevel ?? ''}
                  onChange={(e) => handleChange('mathPlacementLevel', e.target.value)}
                  placeholder="1-5"
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">English Level</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={scores.englishPlacementLevel ?? ''}
                  onChange={(e) => handleChange('englishPlacementLevel', e.target.value)}
                  placeholder="1-5"
                  className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Ready to take — courses whose prerequisites are bypassed */}
          {readyToTake.length > 0 && (
            <div className="bg-accent-cyan/10 border border-accent-cyan/30 rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-accent-cyan mb-2">
                Ready to Take (Prerequisites Bypassed)
              </p>
              <div className="space-y-1.5">
                {readyToTake.map(u => (
                  <div key={u.code} className="flex items-start gap-2 text-xs">
                    <svg className="w-3.5 h-3.5 text-accent-cyan flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v4a1 1 0 002 0V7zm-1 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="font-mono font-semibold text-accent-cyan">{u.code}</span>
                      <span className="text-slate-400 ml-1">— {u.name}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Prerequisites bypassed by your scores — no credit awarded for skipped courses</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Credit-granting unlocks */}
          {creditUnlocks.length > 0 && (
            <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
                Credit Earned by Your Scores
              </p>
              <div className="space-y-1.5">
                {creditUnlocks.map(u => (
                  <div key={u.code} className="flex items-start gap-2 text-xs">
                    <svg className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <span className="font-mono font-semibold text-emerald-300">{u.code}</span>
                      <span className="text-slate-400 ml-1">— {u.name}</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">{u.gate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="pt-2">
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
