import React, { useState } from 'react';
import { usePlanStore } from '../../store/planStore';
import type { TransferCourse } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function TransferModal({ isOpen, onClose }: Props) {
  const addTransferCourse = usePlanStore((s) => s.addTransferCourse);
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('3');
  const [institution, setInstitution] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    
    const course: TransferCourse = {
      code: code.toUpperCase(),
      originalCode: code.toUpperCase(),
      sourceInstitution: institution || 'Unknown',
      credits: parseInt(credits) || 3,
      grade: 'T', // Transfer grade
      equivalency: code.toUpperCase(), // Assuming 1:1 equivalency for manual entry
    };
    
    addTransferCourse(course);
    setCode('');
    setInstitution('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-navy-800 rounded-2xl shadow-2xl shadow-black/50 border border-navy-600 border-opacity-50 w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-600 border-opacity-30 flex justify-between items-center bg-navy-900 bg-opacity-40">
          <h2 className="text-lg font-bold text-slate-100">Add Prior Learning</h2>
          <button onClick={onClose} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
              Course Code (TTU Equivalent)
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. MATH1910"
              className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                Credits
              </label>
              <input
                type="number"
                min="1"
                max="12"
                required
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1.5">
                Institution
              </label>
              <input
                type="text"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="Roane State"
                className="w-full bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
              />
            </div>
          </div>
          
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg font-bold text-white bg-accent-blue hover:bg-opacity-90 transition-colors shadow-lg shadow-accent-blue/20"
            >
              Add to Semester 0
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
