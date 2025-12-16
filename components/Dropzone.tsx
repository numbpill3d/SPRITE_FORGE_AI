import React, { useCallback, useState } from 'react';
import { Upload, FileCode, AlertCircle } from 'lucide-react';

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
      className={`relative w-full h-full min-h-[300px] transition-all duration-100 group cursor-pointer bg-black
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
      
      {/* Animated Border */}
      <div className={`absolute inset-0 border-2 border-dashed
         ${dragActive ? 'border-fuchsia-400 bg-fuchsia-900/20' : 'border-fuchsia-800 hover:border-fuchsia-600'}
         transition-colors
      `}>
         {/* Corner Accents */}
         <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-fuchsia-400"></div>
         <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-fuchsia-400"></div>
         <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-fuchsia-400"></div>
         <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-fuchsia-400"></div>
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
           <div className={`p-4 border border-fuchsia-600 rounded-full ${isProcessing ? 'animate-spin border-t-transparent' : ''}`}>
              <FileCode size={48} className={`text-fuchsia-400 ${dragActive ? 'scale-110' : ''}`} />
           </div>
           
           <div className="text-center font-tech">
              <h3 className="text-lg text-fuchsia-200 mb-1 tracking-wider">
                 {isProcessing ? "UPLOADING_PACKET..." : "INITIATE_TRANSFER"}
              </h3>
              <p className="text-xs text-fuchsia-600">
                 [DRAG_AND_DROP] OR [CLICK_TO_BROWSE]
              </p>
           </div>
           
           {isProcessing && (
              <div className="w-48 h-1 bg-fuchsia-900 mt-2 overflow-hidden">
                 <div className="h-full bg-fuchsia-400 w-1/3 animate-[pulse_1s_infinite] translate-x-[-100%]"></div>
              </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default Dropzone;