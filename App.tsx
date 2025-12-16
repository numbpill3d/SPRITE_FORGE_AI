import React, { useState, useEffect } from 'react';
import { analyzeCharacter, generateSpriteSheet } from './services/geminiService';
import { PixelStyle, CharacterAnalysis, GenerationConfig, AnimationState } from './types';
import Dropzone from './components/Dropzone';
import AnalysisPanel from './components/AnalysisPanel';
import SpritePreview from './components/SpritePreview';
import { 
  Terminal, Cpu, Save, Zap, Ghost, Minimize2, X, Maximize2, 
  Disc, MonitorPlay, Layers, ArrowRight, ShieldCheck, Skull
} from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import * as gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = (gifenc as any).default || gifenc;

type Tab = 'ROOT' | 'CONFIG' | 'VISUALIZER';
type LoadingStep = 'idle' | 'analyzing' | 'rigging' | 'rendering' | 'polishing' | 'complete';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('ROOT');
  
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<LoadingStep>('idle');
  const [analysis, setAnalysis] = useState<CharacterAnalysis | null>(null);
  const [spriteSheet, setSpriteSheet] = useState<string | null>(null);
  const [animationState, setAnimationState] = useState<AnimationState>(AnimationState.Run);
  const [upscaleExport, setUpscaleExport] = useState(true);
  
  const [config, setConfig] = useState<GenerationConfig>({
    style: PixelStyle.Bit16,
    rows: 4, 
    cols: 4
  });

  // Auto-nav
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
      const folderName = analysis?.name.replace(/\s+/g, '_') || 'Character';
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

    for (let i = 0; i < config.cols; i++) {
      ctx.clearRect(0,0,frameW,frameH);
      ctx.drawImage(fullCanvas, i * frameW, row * frameH, frameW, frameH, 0,0, frameW, frameH);
      const data = ctx.getImageData(0,0,frameW, frameH).data;
      const palette = quantize(data, 256);
      const index = applyPalette(data, palette);
      gif.writeFrame(index, frameW, frameH, { palette, delay: 125 });
    }
    gif.finish();
    const blob = new Blob([gif.bytes()], { type: 'image/gif' });
    saveAs(blob, `ANIMATION_${animationState}.gif`);
  };

  // --- Styled Components ---

  const WindowFrame = ({ title, children, className = "" }: any) => (
    <div className={`window-frame flex flex-col ${className}`}>
      <div className="window-header">
        <span className="flex items-center gap-2"><Terminal size={12} /> {title}</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 bg-fuchsia-300 border border-fuchsia-900 flex items-center justify-center cursor-pointer hover:bg-white"><Minimize2 size={8} className="text-black"/></div>
          <div className="w-3 h-3 bg-fuchsia-300 border border-fuchsia-900 flex items-center justify-center cursor-pointer hover:bg-white"><Maximize2 size={8} className="text-black"/></div>
          <div className="w-3 h-3 bg-red-500 border border-red-900 flex items-center justify-center cursor-pointer hover:bg-white"><X size={8} className="text-white"/></div>
        </div>
      </div>
      <div className="flex-1 bg-[#090011] relative overflow-hidden flex flex-col">
         {children}
      </div>
    </div>
  );

  const TabButton = ({ id, label }: { id: Tab, label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      disabled={id === 'CONFIG' && !analysis || id === 'VISUALIZER' && !spriteSheet}
      className={`
        px-4 py-2 text-sm font-pixel border-t-2 border-l-2 border-r-2 mr-1 transition-all
        ${activeTab === id 
          ? 'bg-[#1a0b2e] border-fuchsia-400 text-fuchsia-200 -mb-[2px] z-10' 
          : 'bg-[#0f0518] border-fuchsia-900 text-fuchsia-800 hover:text-fuchsia-500'}
        ${(id === 'CONFIG' && !analysis || id === 'VISUALIZER' && !spriteSheet) ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-start gap-8">
       
       {/* Main Banner */}
       <div className="w-full max-w-6xl relative mb-4">
          <div className="absolute -inset-1 bg-fuchsia-600 blur opacity-20"></div>
          <div className="relative border-2 border-fuchsia-500 bg-black p-4 flex justify-between items-center">
             <div>
                <h1 className="text-3xl md:text-5xl font-pixel text-white glitch" data-text="SPRITE_FORGE_AI">SPRITE_FORGE_AI</h1>
                <p className="text-fuchsia-400 font-tech text-sm tracking-[0.2em] mt-2">>> NEURAL_NET_V2.1 // ONLINE</p>
             </div>
             <div className="hidden md:flex gap-4 text-xs font-mono text-fuchsia-300">
                <div className="flex flex-col items-end">
                   <span>SYS_RAM: 64TB</span>
                   <span>NET_SPD: 10GPS</span>
                </div>
                <div className="w-8 h-8 border border-fuchsia-500 bg-fuchsia-900 animate-pulse"></div>
             </div>
          </div>
       </div>

       {/* Main Workspace */}
       <div className="w-full max-w-6xl grid grid-cols-12 gap-6">
          
          {/* Left Sidebar: Widgets */}
          <div className="col-span-12 md:col-span-3 space-y-6">
             
             {/* Status Widget */}
             <WindowFrame title="SYSTEM_LOG">
                <div className="p-3 font-tech text-xs text-green-400 h-32 overflow-y-auto bg-black border-2 border-inset border-fuchsia-900">
                   <div className="mb-1 text-gray-500">--- BEGIN LOG ---</div>
                   <div>> Core Systems... OK</div>
                   <div>> API Link... ESTABLISHED</div>
                   {loadingStep !== 'idle' && <div className="text-yellow-400 animate-pulse">> PROCESS: {loadingStep}</div>}
                   {analysis && <div className="text-cyan-400">> ENTITY_DATA [ACQUIRED]</div>}
                   {spriteSheet && <div className="text-fuchsia-400">> RENDER [COMPLETE]</div>}
                   <div className="animate-flicker mt-2">_</div>
                </div>
             </WindowFrame>

             {/* Links Widget */}
             <WindowFrame title="EXT_LINKS">
                <div className="p-4 flex flex-col gap-2 bg-checkered">
                   <button onClick={() => handleExport('png')} className="btn-retro py-2 px-3 text-xs font-bold text-fuchsia-200 flex items-center justify-between hover:text-white">
                      <span>SAVE_IMG</span> <Save size={14} />
                   </button>
                   <button onClick={() => handleExport('unity')} className="btn-retro py-2 px-3 text-xs font-bold text-fuchsia-200 flex items-center justify-between hover:text-white">
                      <span>UNITY_PKG</span> <Zap size={14} />
                   </button>
                   <button onClick={handleGifExport} className="btn-retro py-2 px-3 text-xs font-bold text-fuchsia-200 flex items-center justify-between hover:text-white">
                      <span>EXP_GIF</span> <Disc size={14} />
                   </button>
                </div>
             </WindowFrame>

             {/* Deco Widget */}
             <div className="border border-fuchsia-900 bg-black p-2 text-center opacity-70">
                <img src="https://media.tenor.com/fSsxEHPuss8AAAAi/amoung-us-pixel-dance.gif" className="w-16 h-16 mx-auto mb-2 grayscale contrast-150" style={{imageRendering: 'pixelated'}} />
                <div className="text-[10px] text-fuchsia-600 font-pixel">AD_SPACE_AVAIL</div>
             </div>

          </div>

          {/* Center Stage: Main Application */}
          <div className="col-span-12 md:col-span-9">
             
             {/* Tab Bar */}
             <div className="flex border-b-2 border-fuchsia-500 mb-0 pl-2">
                <TabButton id="ROOT" label="ROOT_ACCESS" />
                <TabButton id="CONFIG" label="SYS_CONFIG" />
                <TabButton id="VISUALIZER" label="VISUALIZER" />
             </div>

             {/* Main Window */}
             <div className="window-frame min-h-[500px] border-t-0">
                <div className="p-6 h-full flex flex-col bg-[#1a0b2e] relative">
                   {/* Background Decor */}
                   <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                      <Ghost size={120} className="text-fuchsia-500" />
                   </div>

                   {activeTab === 'ROOT' && (
                      <div className="flex flex-col h-full gap-6 relative z-10">
                         <div className="border-b border-fuchsia-800 pb-2">
                            <h2 className="text-xl font-pixel text-white mb-2 flex items-center gap-2">
                               <Layers size={20} className="text-fuchsia-400" /> INJECTION_PORTAL
                            </h2>
                            <p className="font-tech text-fuchsia-300 text-sm">Upload reference entity for neural deconstruction.</p>
                         </div>
                         <div className="flex-1">
                            <Dropzone onImageSelected={handleImageUpload} isProcessing={loadingStep === 'analyzing'} />
                         </div>
                         <div className="text-xs font-mono text-fuchsia-700 text-center">
                            SECURE CONNECTION // ENCRYPTED_SSL
                         </div>
                      </div>
                   )}

                   {activeTab === 'CONFIG' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full relative z-10">
                         <AnalysisPanel analysis={analysis} loading={false} />
                         
                         <div className="flex flex-col gap-4">
                            <div className="bg-black border border-fuchsia-800 p-4 flex-1 overflow-hidden flex flex-col">
                               <h3 className="text-sm font-pixel text-fuchsia-400 mb-4 border-b border-fuchsia-900 pb-2">RENDER_PROTOCOL</h3>
                               <div className="overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                  {Object.values(PixelStyle).map((style) => (
                                     <button 
                                        key={style}
                                        onClick={() => setConfig({...config, style})}
                                        className={`w-full text-left p-2 border text-xs font-tech transition-all flex items-center gap-2 group ${config.style === style ? 'bg-fuchsia-900 border-fuchsia-400 text-white' : 'bg-transparent border-fuchsia-900 text-gray-400 hover:border-fuchsia-600'}`}
                                     >
                                        <div className={`w-2 h-2 ${config.style === style ? 'bg-green-400 shadow-[0_0_5px_#4ade80]' : 'bg-gray-700'} rounded-full`}></div>
                                        {style}
                                     </button>
                                  ))}
                               </div>
                            </div>

                            <button 
                               onClick={handleGenerate}
                               disabled={loadingStep !== 'idle' && loadingStep !== 'complete'}
                               className="btn-retro py-4 font-pixel text-sm text-fuchsia-200 hover:text-white flex items-center justify-center gap-2"
                            >
                               {loadingStep === 'idle' || loadingStep === 'complete' ? (
                                  <> <Cpu size={18} /> EXECUTE_RENDER </>
                               ) : (
                                  <> <Skull size={18} className="animate-spin" /> COMPILING... </>
                               )}
                            </button>
                         </div>
                      </div>
                   )}

                   {activeTab === 'VISUALIZER' && (
                      <div className="h-full flex flex-col gap-4 relative z-10">
                         <div className="flex justify-between items-center border-b border-fuchsia-800 pb-2">
                            <h2 className="text-lg font-pixel text-white flex items-center gap-2">
                               <MonitorPlay size={18} className="text-fuchsia-400" /> OUTPUT_MONITOR
                            </h2>
                            <div className="text-xs font-tech text-fuchsia-500">RES: 512x512 // 32-BIT</div>
                         </div>
                         
                         <div className="flex-1 bg-black border-2 border-inset border-fuchsia-900 p-1">
                            {spriteSheet && (
                               <SpritePreview 
                                  spriteSheetUrl={spriteSheet} 
                                  sourceImageUrl={sourceImage}
                                  config={config} 
                                  animationState={animationState}
                                  setAnimationState={setAnimationState}
                               />
                            )}
                         </div>
                      </div>
                   )}
                </div>
             </div>

          </div>
       </div>

       {/* Footer */}
       <footer className="w-full max-w-6xl mt-8 border-t border-fuchsia-900 pt-4 pb-8 text-center">
          <p className="font-tech text-xs text-fuchsia-700">
             (C) 1999-2099 PIXEL_FORGE_SYSTEMS // DO NOT DISTRIBUTE // <span className="text-red-500 animate-pulse">NO SIGNAL</span>
          </p>
       </footer>

    </div>
  );
};

export default App;