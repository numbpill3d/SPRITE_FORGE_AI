import React from 'react';
import { CharacterAnalysis } from '../types';
import { User, Tag, Sparkles, Hash, Code } from 'lucide-react';

interface AnalysisPanelProps {
  analysis: CharacterAnalysis | null;
  loading: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis, loading }) => {
  if (loading || !analysis) return null;

  return (
    <div className="bg-black border border-fuchsia-800 h-full flex flex-col font-tech text-sm p-1">
       <div className="bg-fuchsia-900/30 p-2 border-b border-fuchsia-800 mb-2 flex items-center justify-between">
          <h3 className="text-fuchsia-300 flex items-center gap-2 font-bold">
             <Code size={14} /> ENTITY_DOSSIER
          </h3>
          <span className="text-[10px] text-fuchsia-600 font-mono">ID: {Math.random().toString(16).substr(2,6).toUpperCase()}</span>
       </div>

       <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
          
          <div className="flex items-start gap-3">
             <div className="w-16 h-16 bg-fuchsia-900/20 border border-fuchsia-700 flex items-center justify-center text-xs text-fuchsia-800">
                NO_PREV
             </div>
             <div>
                <div className="text-white font-bold text-lg">{analysis.name}</div>
                <div className="text-fuchsia-500 text-xs font-mono">CLASS: {analysis.bodyType.toUpperCase()}</div>
             </div>
          </div>

          <div className="space-y-1">
             <div className="text-[10px] text-gray-500 uppercase tracking-widest">Description</div>
             <p className="text-gray-300 border-l-2 border-fuchsia-600 pl-2 text-xs leading-relaxed">
                {analysis.description}
             </p>
          </div>

          <div className="space-y-1">
             <div className="text-[10px] text-gray-500 uppercase tracking-widest">Hex Palette</div>
             <div className="flex gap-1 flex-wrap font-mono text-[10px]">
                {analysis.colors.map((c, i) => (
                   <div key={i} className="flex items-center gap-1 bg-[#111] border border-[#333] px-1">
                      <div className="w-2 h-2" style={{backgroundColor: c}}></div>
                      <span className="text-gray-400">{c}</span>
                   </div>
                ))}
             </div>
          </div>

          <div className="space-y-1">
             <div className="text-[10px] text-gray-500 uppercase tracking-widest">Detected Features</div>
             <div className="grid grid-cols-2 gap-1">
                {analysis.features.map((f, i) => (
                   <div key={i} className="text-xs text-green-400 before:content-['>'] before:mr-1 before:text-green-700">
                      {f}
                   </div>
                ))}
             </div>
          </div>

          <div className="bg-[#111] p-2 border border-[#333] mt-2">
             <div className="text-[10px] text-fuchsia-400 mb-1">AI_SUGGESTIONS.LOG</div>
             <ul className="list-none space-y-1">
                {analysis.animationSuggestions.map((s, i) => (
                   <li key={i} className="text-[10px] text-gray-400 font-mono">
                      [INFO] {s}
                   </li>
                ))}
             </ul>
          </div>
       </div>
    </div>
  );
};

export default AnalysisPanel;