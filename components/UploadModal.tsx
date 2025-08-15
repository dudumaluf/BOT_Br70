import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconUploadCloud, IconTrash, IconPlus } from './icons';
import { PerformanceBatch, StagedSourceFile, StagedResultFile } from '../types';
import { ComboBox } from './ComboBox';

interface UploadModalProps {
  onClose: () => void;
  onUploadRequest: (batches: PerformanceBatch[]) => void;
  actors: string[];
  movements: string[];
  performanceActors: string[];
}

const getVideoDimensions = (file: File): Promise<{width: number, height: number}> => {
  return new Promise((resolve) => {
    let resolved = false;
    const video = document.createElement('video');
    video.preload = 'metadata';
    let objectUrl: string | null = null;
    
    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      video.remove();
    };

    video.onloadedmetadata = () => {
      if (resolved) return;
      resolved = true;
      resolve({ width: video.videoWidth, height: video.videoHeight });
      cleanup();
    };
    video.onerror = () => {
        if (resolved) return;
        resolved = true;
        console.error("Error loading video metadata for file:", file.name);
        resolve({ width: 1080, height: 1920 }); // Fallback resolution
        cleanup();
    };
    
    objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
  });
};

const FileInputArea: React.FC<{onFileChange: (files: FileList | null) => void, children: React.ReactNode, id: string, multiple?: boolean}> = ({onFileChange, children, id, multiple = false}) => {
    const [isDragging, setIsDragging] = useState(false);
    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        onFileChange(e.dataTransfer.files);
    };
    
    return (
        <label
          htmlFor={id}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed transition-colors cursor-pointer ${isDragging ? 'border-text-dark bg-secondary-dark/50' : 'border-secondary-dark hover:border-text-dark/50'}`}
        >
          {children}
          <input id={id} type="file" multiple={multiple} accept="video/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => onFileChange(e.target.files)} />
        </label>
    );
};


export const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUploadRequest, actors, movements, performanceActors }) => {
  const [batches, setBatches] = useState<PerformanceBatch[]>([]);
  
  useEffect(() => {
    // Cleanup object URLs when component unmounts
    return () => {
      batches.forEach(batch => {
        URL.revokeObjectURL(batch.sourceFile.previewUrl);
        batch.resultFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
      });
    };
  }, [batches]);

  const removeBatch = (batchId: string) => {
    setBatches(prev => prev.filter(b => {
      if (b.id === batchId) {
        URL.revokeObjectURL(b.sourceFile.previewUrl);
        b.resultFiles.forEach(file => URL.revokeObjectURL(file.previewUrl));
        return false;
      }
      return true;
    }));
  };
  
  const handleSourceFilesChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const newBatchesPromises = Array.from(files).map(async (file): Promise<PerformanceBatch> => {
      const resolution = await getVideoDimensions(file);
      const sourceFile: StagedSourceFile = {
        id: `${file.name}-${Date.now()}`, file, resolution,
        previewUrl: URL.createObjectURL(file), actorName: '',
        movementType: '', performanceActor: '', takeNumber: 1, tags: '',
      };
      return { id: `batch_${file.name}_${Date.now()}`, sourceFile, resultFiles: [] };
    });
    
    const newBatches = await Promise.all(newBatchesPromises);
    setBatches(prev => [...prev, ...newBatches]);
  };
  
  const handleResultFilesChange = async (batchId: string, files: FileList | null) => {
    if (!files) return;

    const newFilesPromises = Array.from(files)
      .filter(file => file.type.startsWith('video/'))
      .map(async (file): Promise<StagedResultFile> => {
        const resolution = await getVideoDimensions(file);
        return {
            id: `${file.name}-${Date.now()}`, file, resolution,
            previewUrl: URL.createObjectURL(file), actorName: '',
        }
      });
    
    const newFiles = await Promise.all(newFilesPromises);
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, resultFiles: [...b.resultFiles, ...newFiles] } : b));
  };

  const updateSourceFile = (batchId: string, field: keyof StagedSourceFile, value: string | number) => {
    setBatches(prev => prev.map(b => {
      if (b.id === batchId) {
        return { ...b, sourceFile: { ...b.sourceFile, [field]: value } };
      }
      return b;
    }));
  };
  
  const updateResultFile = (batchId: string, fileId: string, value: string) => {
    setBatches(prev => prev.map(b => {
        if (b.id === batchId) {
            return { ...b, resultFiles: b.resultFiles.map(f => f.id === fileId ? {...f, actorName: value} : f) };
        }
        return b;
    }));
  };

  const removeResultFile = (batchId: string, fileId: string) => {
    setBatches(prev => prev.map(b => {
      if (b.id === batchId) {
        const fileToRemove = b.resultFiles.find(f => f.id === fileId);
        if (fileToRemove) {
            URL.revokeObjectURL(fileToRemove.previewUrl);
        }
        return { ...b, resultFiles: b.resultFiles.filter(f => f.id !== fileId) };
      }
      return b;
    }));
  };

  const handleUploadClick = () => {
    if (batches.length === 0) return;
    onUploadRequest(batches);
  };
  
  const modalVariants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 } };
  const isUploadDisabled = batches.length === 0 || batches.some(b => !b.sourceFile.performanceActor || !b.sourceFile.movementType || b.resultFiles.some(r => !r.actorName));

  return (
    <motion.div className="fixed inset-0 bg-b-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-5xl h-[90vh] p-6 bg-primary-dark border border-secondary-dark flex flex-col" onClick={(e) => e.stopPropagation()} variants={modalVariants} initial="hidden" animate="visible" exit="exit">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><IconUploadCloud/> Upload New Assets</h2>
          <motion.button onClick={onClose} className="p-1 hover:bg-secondary-dark" title="Close" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1, rotate: 90 }}><IconX /></motion.button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-6">
            {batches.map((batch) => (
                <motion.div key={batch.id} layout className="p-4 bg-secondary-dark/50 border border-secondary-dark space-y-4 relative">
                    <button onClick={() => removeBatch(batch.id)} className="absolute -top-3 -right-3 p-1 bg-red-600 rounded-full text-white z-10"><IconTrash size={12} /></button>
                    
                    <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Performance Batch: {batch.sourceFile.file.name}</h3>
                    <motion.div layout className="flex gap-4 p-2 bg-secondary-dark items-start">
                        <video src={batch.sourceFile.previewUrl} className="w-24 h-auto aspect-[9/16] object-cover bg-black flex-shrink-0" controls={false} muted loop playsInline autoPlay/>
                        <div className="flex-grow grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-gray-400 block mb-1">Performance Actor</label><ComboBox options={performanceActors} value={batch.sourceFile.performanceActor} onChange={value => updateSourceFile(batch.id, 'performanceActor', value)} /></div>
                            <div><label className="text-xs font-bold text-gray-400 block mb-1">Movement</label><ComboBox options={movements} value={batch.sourceFile.movementType} onChange={value => updateSourceFile(batch.id, 'movementType', value)} /></div>
                            <div><label className="text-xs font-bold text-gray-400 block mb-1">Take #</label><input type="number" value={batch.sourceFile.takeNumber} onChange={(e) => updateSourceFile(batch.id, 'takeNumber', parseInt(e.target.value) || 1)} className="w-full p-2 bg-primary-dark border border-secondary-dark focus:ring-1 focus:ring-white focus:outline-none" min="1" /></div>
                            <div><label className="text-xs font-bold text-gray-400 block mb-1">Tags (comma separated)</label><input type="text" value={batch.sourceFile.tags} onChange={(e) => updateSourceFile(batch.id, 'tags', e.target.value)} className="w-full p-2 bg-primary-dark border border-secondary-dark focus:ring-1 focus:ring-white focus:outline-none" /></div>
                        </div>
                    </motion.div>

                    <motion.div initial={{opacity: 0}} animate={{opacity: 1}} className="space-y-3">
                        {batch.resultFiles.map(file => (
                           <motion.div layout key={file.id} className="flex gap-4 p-2 bg-secondary-dark items-center">
                              <video src={file.previewUrl} className="w-16 h-auto aspect-[9/16] object-cover bg-black flex-shrink-0" controls={false} muted loop playsInline autoPlay/>
                               <div className="flex-grow">
                                 <label className="text-xs font-bold text-gray-400 block mb-1">AI Actor Name</label>
                                 <ComboBox options={actors} value={file.actorName} onChange={value => updateResultFile(batch.id, file.id, value)} />
                               </div>
                               <button onClick={() => removeResultFile(batch.id, file.id)} className="self-center p-1 text-gray-400 hover:text-red-500 flex-shrink-0"><IconTrash size={16}/></button>
                           </motion.div>
                        ))}
                         <FileInputArea onFileChange={(files) => handleResultFilesChange(batch.id, files)} id={`result-upload-${batch.id}`} multiple>
                             <p className="text-sm text-gray-300">Drop corresponding AI Actor videos here</p>
                         </FileInputArea>
                    </motion.div>
                </motion.div>
            ))}

            <FileInputArea onFileChange={handleSourceFilesChange} id="source-multi-upload" multiple>
                <IconUploadCloud className="w-10 h-10 text-gray-500" />
                <p className="mt-2 text-md">Drop Source Performance Videos to Create Batches</p>
            </FileInputArea>
        </div>
        
        <div className="flex-shrink-0 pt-4 border-t border-secondary-dark flex justify-end">
          <button
            onClick={handleUploadClick}
            disabled={isUploadDisabled}
            className="group relative flex justify-center py-2 px-6 border border-transparent text-sm font-medium text-b-dark bg-text-dark hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed"
          >
            Upload All Batches
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
