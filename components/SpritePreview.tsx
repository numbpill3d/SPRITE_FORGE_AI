import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, ZoomIn, 
  Palette, Sun, Moon, Grid, Monitor, Zap, Move, Target
} from 'lucide-react';
import { AnimationState, GenerationConfig, SpriteOffsets } from '../types';
import { useSpriteAnimation } from '../hooks/useSpriteAnimation';

interface SpritePreviewProps {
  spriteSheetUrl: string;
  sourceImageUrl: string | null;
  config: GenerationConfig;
  animationState: AnimationState;
  setAnimationState: (state: AnimationState) => void;
  offsets: SpriteOffsets;
  setOffsets: (offsets: SpriteOffsets) => void;
}

const SpritePreview: React.FC<SpritePreviewProps> = ({ 
  spriteSheetUrl, 
  config,
  animationState,
  setAnimationState,
  offsets,
  setOffsets
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(10);
  const [scale, setScale] = useState(4); 
  const [bgMode, setBgMode] = useState<'dark' | 'light' | 'green'>('dark');
  const [showGrid, setShowGrid] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const { currentFrame, setManualFrame } = useSpriteAnimation({
    isPlaying,
    fps,
    cols: config.cols,
    animationState,
    transitionDuration: 0
  });

  const handleStep = (dir: 1 | -1) => {
    setIsPlaying(false);
    let next = currentFrame + dir;
    if (next >= config.cols) next = 0;
    if (next < 0) next = config.cols - 1;
    setManualFrame(next);
  };

  const updateOffset = (axis: 'x' | 'y', value: number) => {
    setOffsets({
      ...offsets,
      [animationState]: {
        ...offsets[animationState],
        [axis]: value
      }
    });
  };

  useEffect(() => {
    const img = new Image();
    img.src = spriteSheetUrl;
    imgRef.current = img;
    img.onload = () => {
      setManualFrame(0);
    };
  }, [spriteSheetUrl]);

  const getRowIndex = (state: AnimationState) => {
    switch (state) {
      case AnimationState.Idle: return 0;
      case AnimationState.Run: return 1;
      case AnimationState.Jump: return 2;
      case AnimationState.Attack: return 3;
      default: return 0;
    }
  };

  useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const img = imgRef.current;

      if (canvas && ctx && img && img.complete && img.naturalWidth > 0) {
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
          canvas.width = displayWidth;
          canvas.height = displayHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;

        // 1. Draw Background
        let c1 = '#000';
        let c2 = '#0a0a0a';
        if (bgMode === 'light') { c1 = '#fff'; c2 = '#f0f0f0'; }
        if (bgMode === 'green') { c1 = '#0f380f'; c2 = '#306230'; }

        const checkerSize = 20;
        for(let y=0; y<canvas.height; y+=checkerSize) {
            for(let x=0; x<canvas.width; x+=checkerSize) {
                ctx.fillStyle = ((Math.floor(x/checkerSize) + Math.floor(y/checkerSize)) % 2 === 0) ? c1 : c2;
                ctx.fillRect(x,y,checkerSize,checkerSize);
            }
        }

        // 2. Logic for manual optimization
        const currentOffset = offsets[animationState] || { x: 0, y: 0 };
        const frameW = img.naturalWidth / config.cols;
        const frameH = img.naturalHeight / config.rows;
        
        const destW = Math.round(frameW * scale);
        const destH = Math.round(frameH * scale);
        
        const dx = Math.floor((canvas.width - destW) / 2);
        const dy = Math.floor((canvas.height - destH) / 2);

        const row = getRowIndex(animationState);
        // Apply manual nudge offsets to the source retrieval
        const sx = Math.floor(currentFrame * frameW) + currentOffset.x;
        const sy = Math.floor(row * frameH) + currentOffset.y;

        ctx.drawImage(
          img, 
          sx, sy, Math.floor(frameW), Math.floor(frameH),
          dx, dy, destW, destH
        );
        
        // 3. Optional Overlay Helpers
        if (showGrid) {
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.2)'; // Cyan faint
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2);
            ctx.moveTo(canvas.width/2, 0); ctx.lineTo(canvas.width/2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.strokeStyle = 'rgba(217, 70, 239, 0.4)'; // Fuchsia frame
            ctx.lineWidth = 1;
            ctx.strokeRect(dx, dy, destW, destH);
        }
      }
  }, [currentFrame, animationState, config, scale, bgMode, spriteSheetUrl, offsets, showGrid]);

  return (
    <div className="flex flex-col h-full bg-[#05000a] border-t-2 border-fuchsia-900/50">
       
       {/* Monitor Screen Area */}
       <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black shadow-[inset_0_0_120px_rgba(0,0,0,1)] p-4">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full max-w-[700px] max-h-[700px] object-contain pixelated cursor-move"
          />
          
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_4px,3px_100%]"></div>
          
          {/* Quick Tools */}
          <div className="absolute top-6 right-6 flex flex-col gap-3">
             <button onClick={() => setBgMode(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'green' : 'light')} 
               className="w-10 h-10 bg-black/60 border border-fuchsia-900 text-fuchsia-600 hover:text-cyan-400 hover:border-cyan-500 flex items-center justify-center transition-all shadow-xl active:scale-90"
               title="Toggle Background">
                <Palette size={18} />
             </button>
             <button onClick={() => setShowGrid(!showGrid)} 
               className={`w-10 h-10 bg-black/60 border ${showGrid ? 'border-cyan-500 text-cyan-400' : 'border-fuchsia-900 text-fuchsia-600'} hover:text-white flex items-center justify-center transition-all shadow-xl active:scale-90`}
               title="Toggle Grid">
                <Target size={18} />
             </button>
             <button onClick={() => setScale(s => s >= 8 ? 1 : s + 1)} 
               className="w-10 h-10 bg-black/60 border border-fuchsia-900 text-fuchsia-600 hover:text-cyan-400 hover:border-cyan-500 flex items-center justify-center transition-all shadow-xl active:scale-90"
               title="Zoom">
                <ZoomIn size={18} />
             </button>
          </div>

          <div className="absolute bottom-6 left-6 font-mono text-[9px] text-fuchsia-900 uppercase tracking-widest bg-black/60 px-3 py-1.5 border border-fuchsia-950 flex gap-4">
            <span>FRAME: {currentFrame.toString().padStart(2, '0')}</span>
            <span>ROW: {getRowIndex(animationState)}</span>
            <span>OFFSET: {offsets[animationState]?.x || 0}, {offsets[animationState]?.y || 0}</span>
          </div>
       </div>

       {/* Control Deck */}
       <div className="bg-[#0f041d] p-6 border-t-2 border-fuchsia-900/80 grid grid-cols-1 lg:grid-cols-3 gap-6 font-tech">
          
          {/* 1. Playback & State */}
          <div className="flex flex-col gap-3">
             <span className="text-[10px] text-fuchsia-900 tracking-widest uppercase font-bold">Logic_Control</span>
             <div className="flex items-center gap-3">
                <div className="flex bg-black border border-fuchsia-900 p-1">
                   <button onClick={() => handleStep(-1)} className="p-2 text-fuchsia-800 hover:text-white hover:bg-fuchsia-950 transition-colors"><SkipBack size={18} /></button>
                   <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 text-cyan-400 hover:text-white hover:bg-cyan-900/40 mx-1 transition-all">
                      {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                   </button>
                   <button onClick={() => handleStep(1)} className="p-2 text-fuchsia-800 hover:text-white hover:bg-fuchsia-950 transition-colors"><SkipForward size={18} /></button>
                </div>
                <select 
                    value={animationState} 
                    onChange={e => setAnimationState(e.target.value as AnimationState)}
                    className="flex-1 bg-black border border-fuchsia-900 text-cyan-400 text-xs py-3 px-4 outline-none focus:border-cyan-500 hover:bg-fuchsia-950 transition-all font-mono uppercase tracking-widest"
                >
                    <option value={AnimationState.Idle}>SYS_IDLE</option>
                    <option value={AnimationState.Run}>SYS_RUN</option>
                    <option value={AnimationState.Jump}>SYS_AIR</option>
                    <option value={AnimationState.Attack}>SYS_EXEC</option>
                </select>
             </div>
          </div>

          {/* 2. Manual Optimization (The "Nudge" Controls) */}
          <div className="flex flex-col gap-3">
             <span className="text-[10px] text-fuchsia-900 tracking-widest uppercase font-bold">Manual_Centering (Optimization)</span>
             <div className="flex items-center gap-4 bg-black/40 border border-fuchsia-950 p-2">
                <div className="flex-1 flex flex-col gap-1">
                   <div className="flex justify-between text-[8px] text-fuchsia-700 uppercase"><span>X_Nudge</span><span>{offsets[animationState]?.x || 0}px</span></div>
                   <input type="range" min="-128" max="128" value={offsets[animationState]?.x || 0} onChange={e => updateOffset('x', parseInt(e.target.value))} 
                     className="w-full h-1 bg-fuchsia-950 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-500" 
                   />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                   <div className="flex justify-between text-[8px] text-fuchsia-700 uppercase"><span>Y_Nudge</span><span>{offsets[animationState]?.y || 0}px</span></div>
                   <input type="range" min="-128" max="128" value={offsets[animationState]?.y || 0} onChange={e => updateOffset('y', parseInt(e.target.value))} 
                     className="w-full h-1 bg-fuchsia-950 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-500" 
                   />
                </div>
                <button onClick={() => setOffsets({...offsets, [animationState]: {x:0, y:0}})} className="text-[8px] border border-fuchsia-900 px-2 py-1 hover:bg-fuchsia-900 transition-colors uppercase text-fuchsia-500">Reset</button>
             </div>
          </div>

          {/* 3. Global Config */}
          <div className="flex flex-col gap-3">
             <span className="text-[10px] text-fuchsia-900 tracking-widest uppercase font-bold">Signal_Frequency</span>
             <div className="flex items-center gap-4 py-2 px-1">
                <input type="range" min="1" max="60" value={fps} onChange={e => setFps(parseInt(e.target.value))} 
                  className="flex-1 h-1.5 bg-fuchsia-950 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white" 
                />
                <div className="w-16 text-center">
                   <span className="text-xs text-cyan-400 font-mono block">{fps}Hz</span>
                   <span className="text-[8px] text-fuchsia-800 uppercase block">Ref_Clk</span>
                </div>
             </div>
          </div>

       </div>
    </div>
  );
};

export default SpritePreview;