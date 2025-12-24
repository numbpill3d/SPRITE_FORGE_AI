import React, { useCallback, useState } from 'react';
import { Upload, FileCode, AlertCircle, ArrowDown } from 'lucide-react';

interface DropzoneProps {
  onImageSelected: (base64: string) => void;
  isProcessing: boolean;
}

const Dropzone: React.FC<DropzoneProps> = ({ onImageSelected, isProcessing }) => {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("ERR: INVALID_FORMAT");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onImageSelected(result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [onImageSelected]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`relative w-full h-full transition-all duration-100 group cursor-pointer bg-black
        ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-upload')?.click()}
    >
      <input 
        id="file-upload" 
        type="file" 
        className="hidden" 
        accept="image/*"
        onChange={handleChange}
      />
      
      {/* Tech Border Container */}
      <div className={`absolute inset-0 border-2 border-dashed
         ${dragActive ? 'border-fuchsia-400 bg-fuchsia-900/20' : 'border-fuchsia-900 hover:border-fuchsia-600'}
         transition-colors
      `}>
         {/* Animated Reticle Corners */}
         <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-fuchsia-500"></div>
         <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-fuchsia-500"></div>
         <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-fuchsia-500"></div>
         <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-fuchsia-500"></div>
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
           <div className={`w-16 h-16 border border-fuchsia-700 bg-[#0a0214] flex items-center justify-center relative ${dragActive ? 'scale-110' : ''} transition-transform`}>
              {isProcessing ? (
                 <div className="w-8 h-8 border-2 border-fuchsia-500 border-t-transparent animate-spin"></div>
              ) : (
                 <ArrowDown size={24} className="text-fuchsia-500 animate-bounce" />
              )}
           </div>
           
           <div className="text-center font-tech">
              <h3 className="text-sm text-fuchsia-200 mb-1 tracking-wider uppercase">
                 {isProcessing ? "PROCESSING_STREAM..." : "INITIATE_UPLOAD"}
              </h3>
              <p className="text-[10px] text-fuchsia-700 uppercase">
                 [DROP_FILE] OR [CLICK_TO_BROWSE]
              </p>
           </div>
           
           {isProcessing && (
              <div className="w-32 h-1 bg-fuchsia-900 overflow-hidden">
                 <div className="h-full bg-fuchsia-400 w-1/2 animate-[pulse_0.5s_infinite]"></div>
              </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default Dropzone;