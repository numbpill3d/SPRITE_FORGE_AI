import React, { useState, useEffect } from 'react';
import { analyzeCharacter, generateSpriteSheet } from './services/geminiService';
import { PixelStyle, CharacterAnalysis, GenerationConfig, AnimationState, SpriteOffsets } from './types';
import Dropzone from './components/Dropzone';
import AnalysisPanel from './components/AnalysisPanel';
import SpritePreview from './components/SpritePreview';
import { 
  Terminal, Cpu, Save, Zap, Ghost, Minimize2, X, Maximize2, 
  Disc, MonitorPlay, Layers, ArrowRight, ShieldCheck, Skull, Activity, Target
} from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import * as gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = (gifenc as any).default || gifenc;

type Tab = 'ROOT' | 'CONFIG' | 'VISUALIZER';
type LoadingStep = 'idle' | 'analyzing' | 'rigging' | 'rendering' | 'polishing' | 'complete';

const INITIAL_OFFSETS: SpriteOffsets = {
  [AnimationState.Idle]: { x: 0, y: 0 },
  [AnimationState.Run]: { x: 0, y: 0 },
  [AnimationState.Jump]: { x: 0, y: 0 },
  [AnimationState.Attack]: { x: 0, y: 0 },
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('ROOT');
  
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle');
  const [analysis, setAnalysis] = useState<CharacterAnalysis | null>(null);
  const [spriteSheet, setSpriteSheet] = useState<string | null>(null);
  const [animationState, setAnimationState] = useState<AnimationState>(AnimationState.Run);
  const [upscaleExport, setUpscaleExport] = useState(true);
  const [offsets, setOffsets] = useState<SpriteOffsets>(INITIAL_OFFSETS);
  
  const [config, setConfig] = useState<GenerationConfig>({
    style: PixelStyle.Bit16,
    rows: 4, 
    cols: 4
  });

  // Auto-nav flow
  useEffect(() => {
    if (analysis && !spriteSheet && activeTab === 'ROOT') {
      setActiveTab('CONFIG');
    }
  }, [analysis]);

  useEffect(() => {
    if (spriteSheet && activeTab === 'CONFIG') {
      setActiveTab('VISUALIZER');
    }
  }, [spriteSheet]);

  const handleImageUpload = async (base64: string) => {
    setSourceImage(base64);
    setSpriteSheet(null);
    setLoadingStep('analyzing');
    try {
      const cleanBase64 = base64.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");
      const result = await analyzeCharacter(cleanBase64);
      setAnalysis(result);
      setLoadingStep('idle');
    } catch (err) {
      console.error(err);
      alert("System Error: Analysis failed.");
      setLoadingStep('idle');
    }
  };

  const handleGenerate = async () => {
    if (!sourceImage || !analysis) return;
    setLoadingStep('rigging');
    setTimeout(() => setLoadingStep('rendering'), 1500);
    
    try {
      const cleanBase64 = sourceImage.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");
      const sheetUrl = await generateSpriteSheet(cleanBase64, config.style, analysis);
      setSpriteSheet(sheetUrl);
      setLoadingStep('complete');
    } catch (err) {
      console.error(err);
      alert("System Error: Generation failed.");
      setLoadingStep('idle');
    }
  };

  const getProcessedCanvas = async (img: HTMLImageElement, scale = 1): Promise<HTMLCanvasElement> => {
     const canvas = document.createElement('canvas');
     canvas.width = img.naturalWidth * scale;
     canvas.height = img.naturalHeight * scale;
     const ctx = canvas.getContext('2d');
     if (!ctx) throw new Error("No Context");
     ctx.imageSmoothingEnabled = false; 
     ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
     return canvas;
  }

  const handleExport = async (format: 'png' | 'unity') => {
    if (!spriteSheet) return;
    const img = new Image();
    img.src = spriteSheet;
    await new Promise(r => img.onload = r);
    const scale = upscaleExport ? 4 : 1;
    const canvas = await getProcessedCanvas(img, scale);
    
    if (format === 'png') {
      canvas.toBlob(blob => {
          if(blob) saveAs(blob, `ENTITY_${analysis?.name || 'UNKNOWN'}_${scale}X.png`);
      });
    } else if (format === 'unity') {
      const zip = new JSZip();
      const folderName = (analysis?.name || 'Character').replace(/\s+/g, '_');
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r));
      if (!blob) return;
      
      const root = zip.folder(folderName);
      root?.file(`${folderName}_SpriteSheet.png`, blob);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `DEPLOY_PACKAGE_${folderName}.zip`);
    }
  };

  const handleGifExport = async () => {
    if (!spriteSheet) return;
    const img = new Image();
    img.src = spriteSheet;
    await new Promise((resolve) => { img.onload = resolve; });
    const scale = upscaleExport ? 4 : 1;
    const frameW = (img.naturalWidth / config.cols) * scale;
    const frameH = (img.naturalHeight / config.rows) * scale;
    const fullCanvas = await getProcessedCanvas(img, scale);
    const gif = new GIFEncoder();
    const canvas = document.createElement('canvas');
    canvas.width = frameW; canvas.height = frameH;
    const ctx = canvas.getContext('2d');
    if(!ctx) return;
    
    let row = 0;
    if (animationState === AnimationState.Run) row = 1;
    else if (animationState === AnimationState.Jump) row = 2;
    else if (animationState === AnimationState.Attack) row = 3;

    const offset = offsets[animationState] || { x: 0, y: 0 };

    for (let i = 0; i < config.cols; i++) {
      ctx.clearRect(0,0,frameW,frameH);
      // Apply manual centering offsets for export as well
      ctx.drawImage(
        fullCanvas, 
        (i * frameW) + (offset.x * scale), 
        (row * frameH) + (offset.y * scale), 
        frameW, frameH, 
        0, 0, 
        frameW, frameH
      );
      const data = ctx.getImageData(0,0,frameW, frameH).data;
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, frameW, frameH, { palette, delay: 125 });
    }
    gif.finish();
    const blob = new Blob([gif.bytes()], { type: 'image/gif' });
    saveAs(blob, `ANIMATION_${animationState}.gif`);
  };

  const WindowFrame = ({ title, children, className = "", onClose }: any) => (
    <div className={`window-frame flex flex-col shadow-[8px_8px_0_rgba(0,0,0,0.5)] ${className}`}>
      <div className="window-header font-pixel text-[10px] tracking-[0.2em] py-2 px-3">
        <span className="flex items-center gap-2 uppercase"><Terminal size={10} /> {title}</span>
        <div className="flex gap-2">
          <button className="w-3.5 h-3.5 bg-fuchsia-300 border border-black hover:bg-white transition-colors"></button>
          <button className="w-3.5 h-3.5 bg-red-500 border border-black hover:bg-white transition-colors" onClick={onClose}></button>
        </div>
      </div>
      <div className="flex-1 bg-[#05000a] relative flex flex-col p-1 overflow-hidden">
         {children}
      </div>
    </div>
  );

  const NavButton = ({ id, label }: { id: Tab, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      disabled={id === 'CONFIG' && !analysis || id === 'VISUALIZER' && !spriteSheet}
      className={`
        flex-1 text-center py-2 font-tech text-sm border-r border-fuchsia-950 last:border-0 transition-all uppercase tracking-widest
        ${activeTab === id 
          ? 'bg-fuchsia-900 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]' 
          : 'bg-[#120524] text-fuchsia-800 hover:text-fuchsia-400 hover:bg-[#1a0b2e]'}
        ${(id === 'CONFIG' && !analysis || id === 'VISUALIZER' && !spriteSheet) ? 'opacity-30 cursor-not-allowed grayscale' : ''}
      `}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen p-4 md:p-12 flex flex-col items-center justify-center relative overflow-hidden bg-black">
       
       {/* Ambient Tech Grid Background */}
       <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 text-fuchsia-900/10 font-pixel text-[20vw] select-none mix-blend-screen -rotate-12">ANIMUS</div>
          <div className="absolute bottom-1/4 right-1/4 text-fuchsia-900/10 font-pixel text-[20vw] select-none mix-blend-screen rotate-12">ENGINE</div>
       </div>

       <div className="w-full max-w-7xl grid grid-cols-12 gap-8 relative z-10 items-stretch">
          
          {/* Sidebar Area */}
          <div className="col-span-12 md:col-span-3 flex flex-col gap-6">
             
             {/* Header Display */}
             <div className="border-2 border-fuchsia-500 bg-black p-6 text-center shadow-[6px_6px_0_#701a75]">
                <h1 className="text-3xl font-pixel text-white glitch mb-2 tracking-tighter uppercase" data-text="ANIMUS ENGINE">ANIMUS ENGINE</h1>
                <div className="h-0.5 bg-fuchsia-800 w-full mb-3 opacity-50"></div>
                <div className="flex flex-col items-center justify-center gap-1 text-fuchsia-400 font-tech text-[10px] tracking-widest">
                   <div className="flex items-center gap-2 animate-pulse">
                      <Activity size={10} />
                      <span>IMAGE TO ANIMATED SPRITE SHEET</span>
                   </div>
                   <span className="text-cyan-500 opacity-60">LINK_STABLE // BUFF_READY</span>
                </div>
             </div>

             <WindowFrame title="PROCESS_LOG" className="h-64">
                <div className="flex-1 bg-black p-3 font-tech text-[11px] text-fuchsia-400 overflow-y-auto custom-scrollbar border border-fuchsia-950">
                   <div className="text-gray-700 italic mb-2 tracking-widest">>> SYSTEM_INIT_...</div>
                   <div className="space-y-1">
                      <div>> SENSORS: ONLINE</div>
                      <div>> GRID_SYNC: CALIBRATED</div>
                      {loadingStep !== 'idle' && <div className="text-yellow-500 animate-[pulse_0.8s_infinite]">> CURRENT_TASK: {loadingStep.toUpperCase()}</div>}
                      {analysis && <div className="text-cyan-400">> ENTITY_LOADED: {analysis.name}</div>}
                      {spriteSheet && <div className="text-green-500">> SPRITE_GRID: SUCCESS</div>}
                      <div className="animate-pulse mt-2 inline-block w-2 h-4 bg-fuchsia-500"></div>
                   </div>
                </div>
             </WindowFrame>

             <WindowFrame title="DATA_EXPORT">
                <div className="flex flex-col gap-2 p-2 bg-[#0a0214]">
                   <button onClick={() => handleExport('png')} className="btn-retro py-3 px-3 text-[10px] font-pixel flex items-center justify-between group active:scale-95">
                      <span className="group-hover:text-cyan-300 transition-colors uppercase">Save Raster</span> <Save size={12} />
                   </button>
                   <button onClick={() => handleExport('unity')} className="btn-retro py-3 px-3 text-[10px] font-pixel flex items-center justify-between group active:scale-95">
                      <span className="group-hover:text-cyan-300 transition-colors uppercase">Unity Asset</span> <Zap size={12} />
                   </button>
                   <button onClick={handleGifExport} className="btn-retro py-3 px-3 text-[10px] font-pixel flex items-center justify-between group active:scale-95">
                      <span className="group-hover:text-cyan-300 transition-colors uppercase">Build GIF</span> <Disc size={12} />
                   </button>
                </div>
             </WindowFrame>

          </div>

          {/* Main Stage Area */}
          <div className="col-span-12 md:col-span-9 flex flex-col">
             
             <div className="window-frame flex-1 flex flex-col border-4">
                <div className="window-header justify-between py-3">
                   <span className="flex items-center gap-3 ml-2"><MonitorPlay size={14} className="text-cyan-400" /> VIRTUAL_PIXEL_ENGINE_V4</span>
                   <div className="flex gap-4 mr-4 font-mono text-[9px] text-fuchsia-400/60 uppercase">
                      <span>Thread_Active</span>
                      <span className="text-green-500">Secure</span>
                   </div>
                </div>
                
                {/* Workflow Navigation */}
                <div className="flex bg-black border-b-2 border-fuchsia-950">
                   <NavButton id="ROOT" label="01. Ingress" />
                   <NavButton id="CONFIG" label="02. Compile" />
                   <NavButton id="VISUALIZER" label="03. Visualize" />
                </div>

                {/* Interactive Content */}
                <div className="flex-1 bg-[#05000a] relative p-8 flex flex-col overflow-hidden min-h-[550px]">
                   <div className="absolute inset-0 opacity-10 bg-checker pointer-events-none"></div>

                   {activeTab === 'ROOT' && (
                      <div className="flex-1 flex flex-col items-center justify-center relative z-10 gap-8">
                         <div className="text-center">
                            <h2 className="text-4xl font-pixel text-white mb-3 tracking-tighter uppercase">Data_Ingress</h2>
                            <p className="font-tech text-fuchsia-600 text-lg uppercase tracking-[0.3em]">Supply Entity Reference</p>
                         </div>
                         <div className="w-full max-w-xl h-80 shadow-[0_0_50px_rgba(112,26,117,0.3)] border-2 border-fuchsia-900">
                            <Dropzone onImageSelected={handleImageUpload} isProcessing={loadingStep === 'analyzing'} />
                         </div>
                      </div>
                   )}

                   {activeTab === 'CONFIG' && (
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                         <AnalysisPanel analysis={analysis} loading={false} />
                         
                         <div className="flex flex-col gap-6">
                            <div className="bg-black border-2 border-fuchsia-900 flex-1 flex flex-col shadow-inner">
                               <div className="bg-fuchsia-950/40 p-3 border-b-2 border-fuchsia-900 text-xs font-pixel text-fuchsia-400 tracking-widest uppercase">Select Protocol</div>
                               <div className="p-4 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
                                  {Object.values(PixelStyle).map((style) => (
                                     <button 
                                        key={style}
                                        onClick={() => setConfig({...config, style})}
                                        className={`w-full text-left p-3 border-2 font-tech text-xs tracking-widest transition-all flex items-center justify-between group ${config.style === style ? 'bg-fuchsia-900 border-fuchsia-500 text-white' : 'bg-transparent border-fuchsia-950 text-fuchsia-900 hover:border-fuchsia-800 hover:text-fuchsia-400'}`}
                                     >
                                        <div className="flex items-center gap-3">
                                           <div className={`w-3 h-3 ${config.style === style ? 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]' : 'bg-gray-900'}`} />
                                           <span className="uppercase">{style}</span>
                                        </div>
                                        {config.style === style && <ArrowRight size={12} className="text-cyan-400" />}
                                     </button>
                                  ))}
                               </div>
                            </div>

                            <button 
                               onClick={handleGenerate}
                               disabled={loadingStep !== 'idle' && loadingStep !== 'complete'}
                               className="btn-retro py-6 font-pixel text-sm text-fuchsia-100 hover:text-cyan-300 flex items-center justify-center gap-4 border-2 border-fuchsia-500 bg-[#120524] shadow-[0_0_20px_rgba(217,70,239,0.3)] transition-all active:scale-95"
                            >
                               {loadingStep === 'idle' || loadingStep === 'complete' ? (
                                  <> <Cpu size={20} /> INITIATE_RENDER_PROCESS </>
                               ) : (
                                  <> <Skull size={20} className="animate-spin text-red-500" /> RENDERING_FRAMES_... </>
                               )}
                            </button>
                         </div>
                      </div>
                   )}

                   {activeTab === 'VISUALIZER' && (
                      <div className="flex-1 flex flex-col relative z-10 h-full">
                         {spriteSheet ? (
                            <SpritePreview 
                               spriteSheetUrl={spriteSheet} 
                               sourceImageUrl={sourceImage}
                               config={config} 
                               animationState={animationState}
                               setAnimationState={setAnimationState}
                               offsets={offsets}
                               setOffsets={setOffsets}
                            />
                         ) : (
                            <div className="flex-1 border-4 border-dashed border-fuchsia-950 flex flex-col items-center justify-center text-fuchsia-900 font-pixel gap-4">
                               <div className="w-20 h-20 border-4 border-fuchsia-950 animate-pulse flex items-center justify-center">
                                  <X size={40} className="opacity-20" />
                               </div>
                               <span className="text-sm tracking-[0.5em] uppercase opacity-40">Static_Lost</span>
                            </div>
                         )}
                      </div>
                   )}
                </div>
             </div>

          </div>
       </div>

       {/* Floating OS Footer */}
       <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-black/80 backdrop-blur-md border border-fuchsia-900 px-6 py-2 rounded-full flex items-center gap-6">
             <div className="flex items-center gap-2 text-[10px] font-tech text-fuchsia-700">
                <Layers size={12} />
                <span>VER: 5.0.0-ANIMUS</span>
             </div>
             <div className="h-4 w-px bg-fuchsia-900"></div>
             <div className="text-[10px] font-tech text-fuchsia-500 uppercase tracking-widest">
                ANIMUS_LINK // ACCESS_GRANTED
             </div>
          </div>
       </footer>

    </div>
  );
};

export default App;