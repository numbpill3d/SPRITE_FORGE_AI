import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, ZoomIn, 
  Palette, Sun, Moon, Grid, Monitor, Zap
} from 'lucide-react';
import { AnimationState, GenerationConfig } from '../types';
import { useSpriteAnimation } from '../hooks/useSpriteAnimation';

interface SpritePreviewProps {
  spriteSheetUrl: string;
  sourceImageUrl: string | null;
  config: GenerationConfig;
  animationState: AnimationState;
  setAnimationState: (state: AnimationState) => void;
}

const SpritePreview: React.FC<SpritePreviewProps> = ({ 
  spriteSheetUrl, 
  config,
  animationState,
  setAnimationState
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(8);
  const [scale, setScale] = useState(3); 
  const [bgMode, setBgMode] = useState<'dark' | 'light' | 'green'>('dark');
  
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

  useEffect(() => {
    const img = new Image();
    img.src = spriteSheetUrl;
    imgRef.current = img;
    img.onload = () => {
      // Refresh the view once the image is definitely ready
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
        // Pixel-perfect sizing: Ensure internal resolution matches CSS display size
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;
        
        if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
          canvas.width = displayWidth;
          canvas.height = displayHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Ensure no interpolation for sharp pixel art
        ctx.imageSmoothingEnabled = false;

        // 1. Draw Checkerboard Background
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

        // 2. Slicing Logic (Robust Grid Calculation)
        // We calculate frame size based on natural dimensions to handle non-1024 sheets if AI deviates
        const frameW = img.naturalWidth / config.cols;
        const frameH = img.naturalHeight / config.rows;
        
        // Use exact integer scale for crispness
        const destW = Math.round(frameW * scale);
        const destH = Math.round(frameH * scale);
        
        // Center drawing point in viewport
        const dx = Math.floor((canvas.width - destW) / 2);
        const dy = Math.floor((canvas.height - destH) / 2);

        // Calculate source coordinates using current frame and row
        const row = getRowIndex(animationState);
        const sx = Math.floor(currentFrame * frameW);
        const sy = Math.floor(row * frameH);

        // Draw the current sprite frame
        // Using Math.floor on source to avoid bleeding into adjacent frames
        ctx.drawImage(
          img, 
          sx, sy, Math.floor(frameW), Math.floor(frameH), // Source
          dx, dy, destW, destH                            // Destination
        );
        
        // 3. Status Bar/Indicator (Faint)
        ctx.strokeStyle = 'rgba(217, 70, 239, 0.1)'; // Very faint fuchsia
        ctx.lineWidth = 1;
        ctx.strokeRect(dx, dy, destW, destH);
      }
  }, [currentFrame, animationState, config, scale, bgMode, spriteSheetUrl]);

  return (
    <div className="flex flex-col h-full bg-[#05000a] border-t-2 border-fuchsia-900/50">
       
       {/* Monitor Screen Area */}
       <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black shadow-[inset_0_0_80px_rgba(0,0,0,1)] p-6">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full max-w-[640px] max-h-[640px] object-contain pixelated cursor-crosshair"
          />
          
          {/* CRT/Digital Distortions */}
          <div className="absolute inset-0 pointer-events-none opacity-25 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%]"></div>
          
          {/* OSD (On-Screen Display) Controls */}
          <div className="absolute top-6 right-6 flex flex-col gap-3">
             <button onClick={() => setBgMode(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'green' : 'light')} 
               className="w-12 h-12 bg-black/80 border border-fuchsia-800 text-fuchsia-500 hover:text-cyan-400 hover:border-cyan-500 flex items-center justify-center transition-all shadow-lg active:scale-90"
               title="Toggle Background">
                <Palette size={20} />
             </button>
             <button onClick={() => setScale(s => s >= 6 ? 1 : s + 1)} 
               className="w-12 h-12 bg-black/80 border border-fuchsia-800 text-fuchsia-500 hover:text-cyan-400 hover:border-cyan-500 flex items-center justify-center transition-all shadow-lg active:scale-90"
               title="Zoom Level">
                <ZoomIn size={20} />
             </button>
          </div>

          {/* Frame Label */}
          <div className="absolute bottom-6 left-6 font-mono text-[10px] text-fuchsia-900 uppercase tracking-widest bg-black/40 px-2 py-1 border border-fuchsia-950">
            FRAME: {currentFrame.toString().padStart(2, '0')} // ROW: {getRowIndex(animationState)}
          </div>
       </div>

       {/* Control Deck (Integrated Dashboard) */}
       <div className="bg-[#0f041d] p-5 border-t-2 border-fuchsia-900/80 flex flex-wrap gap-4 items-center justify-between font-tech">
          
          {/* Playback Group */}
          <div className="flex items-center gap-6">
             <div className="flex bg-black border-2 border-fuchsia-900 rounded p-1 shadow-inner">
                <button onClick={() => handleStep(-1)} className="p-2.5 text-fuchsia-800 hover:text-white hover:bg-fuchsia-950 transition-colors"><SkipBack size={20} /></button>
                <button onClick={() => setIsPlaying(!isPlaying)} className="p-2.5 text-cyan-400 hover:text-white hover:bg-cyan-900/40 mx-1 transition-all">
                   {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                </button>
                <button onClick={() => handleStep(1)} className="p-2.5 text-fuchsia-800 hover:text-white hover:bg-fuchsia-950 transition-colors"><SkipForward size={20} /></button>
             </div>
             
             <div className="hidden lg:flex flex-col">
                <span className="text-[10px] text-fuchsia-900 tracking-tighter uppercase font-bold">Signal_Status</span>
                <div className="flex items-center gap-2">
                   <div className={`w-2.5 h-2.5 rounded-none ${isPlaying ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-600"}`} />
                   <span className={`text-xs font-mono ${isPlaying ? "text-green-500" : "text-red-600"}`}>{isPlaying ? "LOCKED" : "WAITING"}</span>
                </div>
             </div>
          </div>

          {/* Configuration Group */}
          <div className="flex flex-wrap gap-8 items-center">
             <div className="flex flex-col items-end">
                <span className="text-[10px] text-fuchsia-900 tracking-tighter uppercase font-bold">Refresh_Rate</span>
                <div className="flex items-center gap-4">
                   <input type="range" min="1" max="60" value={fps} onChange={e => setFps(parseInt(e.target.value))} 
                     className="w-32 h-1.5 bg-fuchsia-950 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white" 
                   />
                   <span className="text-xs text-cyan-500 w-10 font-mono text-right">{fps}Hz</span>
                </div>
             </div>
             
             <div className="flex flex-col items-end">
                <span className="text-[10px] text-fuchsia-900 tracking-tighter uppercase font-bold">Logic_State</span>
                <select 
                    value={animationState} 
                    onChange={e => setAnimationState(e.target.value as AnimationState)}
                    className="bg-black border-2 border-fuchsia-900 text-cyan-400 text-xs py-2 px-4 outline-none focus:border-cyan-500 hover:bg-fuchsia-950 transition-all font-mono uppercase tracking-widest"
                >
                    <option value={AnimationState.Idle}>SYS_IDLE</option>
                    <option value={AnimationState.Run}>SYS_RUN</option>
                    <option value={AnimationState.Jump}>SYS_AIR</option>
                    <option value={AnimationState.Attack}>SYS_EXEC</option>
                </select>
             </div>
          </div>

       </div>
    </div>
  );
};

export default SpritePreview;