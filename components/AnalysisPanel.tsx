import React from 'react';
import { CharacterAnalysis } from '../types';
import { User, Tag, Sparkles, Hash, Code, Fingerprint } from 'lucide-react';

interface AnalysisPanelProps {
  analysis: CharacterAnalysis | null;
  loading: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis, loading }) => {
  if (loading || !analysis) return null;

  return (
    <div className="bg-[#05000a] border border-fuchsia-800 h-full flex flex-col font-tech text-sm p-1">
       <div className="bg-fuchsia-900/20 p-2 border-b border-fuchsia-800 mb-2 flex items-center justify-between">
          <h3 className="text-fuchsia-300 flex items-center gap-2 font-bold text-xs uppercase">
             <Fingerprint size={12} /> ENTITY_DOSSIER
          </h3>
          <span className="text-[10px] text-fuchsia-700 font-mono">ID: {Math.random().toString(16).substr(2,6).toUpperCase()}</span>
       </div>

       <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
          
          <div className="flex items-start gap-3 border-b border-fuchsia-900 pb-3">
             <div className="w-12 h-12 bg-fuchsia-900/10 border border-fuchsia-800 flex items-center justify-center text-[8px] text-fuchsia-800">
                IMG_NULL
             </div>
             <div>
                <div className="text-white font-bold text-base uppercase tracking-wider">{analysis.name}</div>
                <div className="text-fuchsia-600 text-[10px] font-mono">CLASS: {analysis.bodyType.toUpperCase()}</div>
             </div>
          </div>

          <div className="space-y-1">
             <div className="text-[10px] text-fuchsia-700 uppercase tracking-widest border-b border-fuchsia-900/50 mb-1">VISUAL_DESC</div>
             <p className="text-fuchsia-200 text-xs leading-relaxed font-mono opacity-80">
                {analysis.description}
             </p>
          </div>

          <div className="space-y-1">
             <div className="text-[10px] text-fuchsia-700 uppercase tracking-widest border-b border-fuchsia-900/50 mb-1">HEX_PALETTE</div>
             <div className="flex gap-1 flex-wrap font-mono text-[10px]">
                {analysis.colors.map((c, i) => (
                   <div key={i} className="flex items-center gap-1 bg-black border border-fuchsia-900 px-1 py-0.5">
                      <div className="w-2 h-2" style={{backgroundColor: c}}></div>
                      <span className="text-gray-400">{c}</span>
                   </div>
                ))}
             </div>
          </div>

          <div className="space-y-1">
             <div className="text-[10px] text-fuchsia-700 uppercase tracking-widest border-b border-fuchsia-900/50 mb-1">FEATURES_DETECT</div>
             <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                {analysis.features.map((f, i) => (
                   <div key={i} className="text-[10px] text-cyan-600 before:content-['>'] before:mr-1 before:text-fuchsia-800">
                      {f}
                   </div>
                ))}
             </div>
          </div>

          <div className="bg-[#0a0214] p-2 border border-fuchsia-900 mt-2">
             <div className="text-[10px] text-fuchsia-500 mb-1 uppercase">AI_ADVISORY.LOG</div>
             <ul className="list-none space-y-1">
                {analysis.animationSuggestions.map((s, i) => (
                   <li key={i} className="text-[10px] text-gray-500 font-mono pl-2 border-l border-fuchsia-900">
                      {s}
                   </li>
                ))}
             </ul>
          </div>
       </div>
    </div>
  );
};

export default AnalysisPanel;