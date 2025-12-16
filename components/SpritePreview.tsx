import React, { useEffect, useRef, useState } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, ZoomIn, 
  Palette, Sun, Moon, Grid, Monitor
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
  const [scale, setScale] = useState(2); 
  const [bgMode, setBgMode] = useState<'light' | 'dark' | 'green'>('dark');
  
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
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = false;

        // Draw BG
        let c1 = '#000';
        let c2 = '#111';
        if (bgMode === 'light') { c1 = '#fff'; c2 = '#eee'; }
        if (bgMode === 'green') { c1 = '#0f380f'; c2 = '#8bac0f'; }

        const size = 16;
        for(let y=0; y<canvas.height; y+=size) {
            for(let x=0; x<canvas.width; x+=size) {
                ctx.fillStyle = ((x/size + y/size) % 2 === 0) ? c1 : c2;
                ctx.fillRect(x,y,size,size);
            }
        }

        const frameW = img.naturalWidth / config.cols;
        const frameH = img.naturalHeight / config.rows;
        
        const destW = Math.floor(frameW * scale);
        const destH = Math.floor(frameH * scale);
        
        const dx = Math.floor((canvas.width - destW) / 2);
        const dy = Math.floor((canvas.height - destH) / 2);

        const row = getRowIndex(animationState);
        const sx = Math.floor(currentFrame * frameW);
        const sy = Math.floor(row * frameH);

        ctx.drawImage(img, sx, sy, frameW, frameH, dx, dy, destW, destH);
      }
  }, [currentFrame, animationState, config, scale, bgMode, spriteSheetUrl]);

  return (
    <div className="flex flex-col h-full gap-0 bg-[#000]">
       {/* Monitor Frame */}
       <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center border-b border-fuchsia-900">
          <canvas 
            ref={canvasRef} 
            width={512} 
            height={400} 
            className="w-full h-full object-contain"
          />
          {/* Internal Scanlines */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
          
          <div className="absolute top-2 right-2 flex flex-col gap-1">
             <button onClick={() => setBgMode(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'green' : 'light')} className="p-1 bg-black/50 text-fuchsia-500 border border-fuchsia-800 hover:text-white">
                <Palette size={14} />
             </button>
             <button onClick={() => setScale(s => s >= 5 ? 1 : s + 1)} className="p-1 bg-black/50 text-fuchsia-500 border border-fuchsia-800 hover:text-white">
                <ZoomIn size={14} />
             </button>
          </div>
       </div>

       {/* Control Deck */}
       <div className="bg-[#0f0518] p-2 flex items-center justify-between font-tech border-t border-fuchsia-800">
          <div className="flex items-center gap-2">
             <button onClick={() => handleStep(-1)} className="p-1 text-fuchsia-600 hover:text-white"><SkipBack size={16} /></button>
             <button onClick={() => setIsPlaying(!isPlaying)} className="p-1 text-fuchsia-400 hover:text-white">
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
             </button>
             <button onClick={() => handleStep(1)} className="p-1 text-fuchsia-600 hover:text-white"><SkipForward size={16} /></button>
          </div>

          <div className="flex gap-4 items-center text-xs">
             <div className="flex items-center gap-2 text-fuchsia-700">
                <span>SPEED</span>
                <input type="range" min="1" max="24" value={fps} onChange={e => setFps(parseInt(e.target.value))} className="w-16 accent-fuchsia-600 h-1 bg-gray-800 appearance-none" />
             </div>
             
             <select 
                value={animationState} 
                onChange={e => setAnimationState(e.target.value as AnimationState)}
                className="bg-black border border-fuchsia-800 text-fuchsia-300 px-2 py-0.5 text-xs outline-none focus:border-white"
             >
                <option value={AnimationState.Idle}>STATE: IDLE</option>
                <option value={AnimationState.Run}>STATE: RUN</option>
                <option value={AnimationState.Jump}>STATE: JUMP</option>
                <option value={AnimationState.Attack}>STATE: ATK</option>
             </select>
          </div>
       </div>
    </div>
  );
};

export default SpritePreview;