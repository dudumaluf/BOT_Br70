
import React, { useState, useEffect, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconUploadCloud, IconTrash, IconBot } from './icons';
import { PerformanceBatch, StagedSourceFile, StagedResultFile, GenerationTask, VideoAsset, RunwayTaskStatus } from '../types';
import { ComboBox } from './ComboBox';
import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '../lib/database.types';

// --- MANUAL UPLOAD COMPONENTS ---

const getVideoDimensions = (file: File): Promise<{width: number, height: number}> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const objectUrl = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: video.videoWidth, height: video.videoHeight });
    };
    video.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        console.error("Error loading video metadata for file:", file.name);
        resolve({ width: 1080, height: 1920 }); // Fallback
    };
    video.src = objectUrl;
  });
};

const FileInputArea: React.FC<{onFileChange: (files: FileList | null) => void, children: React.ReactNode, id: string, multiple?: boolean, accept?: string}> = ({onFileChange, children, id, multiple = false, accept="video/*"}) => {
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
          onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed transition-colors cursor-pointer ${isDragging ? 'border-text-dark bg-secondary-dark/50' : 'border-secondary-dark hover:border-text-dark/50'}`}
        >
          {children}
          <input id={id} type="file" multiple={multiple} accept={accept} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => onFileChange(e.target.files)} />
        </label>
    );
};

const ManualUploader: React.FC<{
  onUploadRequest: (batches: PerformanceBatch[]) => void;
  actors: string[]; movements: string[]; performanceActors: string[];
}> = ({ onUploadRequest, actors, movements, performanceActors }) => {
  const [batches, setBatches] = useState<PerformanceBatch[]>([]);
  
  useEffect(() => {
    return () => { // Cleanup object URLs on unmount
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
    const newBatches = await Promise.all(Array.from(files).map(async (file): Promise<PerformanceBatch> => {
      const resolution = await getVideoDimensions(file);
      const sourceFile: StagedSourceFile = {
        id: `${file.name}-${Date.now()}`, file, resolution, previewUrl: URL.createObjectURL(file),
        actor_name: '', movement_type: '', performance_actor: '', take_number: 1, tags: '',
      };
      return { id: `batch_${file.name}_${Date.now()}`, sourceFile, resultFiles: [] };
    }));
    setBatches(prev => [...prev, ...newBatches]);
  };
  
  const handleResultFilesChange = async (batchId: string, files: FileList | null) => {
    if (!files) return;
    const newFiles = await Promise.all(Array.from(files).filter(f => f.type.startsWith('video/')).map(async (file): Promise<StagedResultFile> => {
      const resolution = await getVideoDimensions(file);
      return { id: `${file.name}-${Date.now()}`, file, resolution, previewUrl: URL.createObjectURL(file), actor_name: '' };
    }));
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, resultFiles: [...b.resultFiles, ...newFiles] } : b));
  };

  const updateSourceFile = (batchId: string, field: keyof StagedSourceFile, value: string | number) => {
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, sourceFile: { ...b.sourceFile, [field]: value } } : b));
  };
  
  const updateResultFile = (batchId: string, fileId: string, value: string) => {
    setBatches(prev => prev.map(b => b.id === batchId ? { ...b, resultFiles: b.resultFiles.map(f => f.id === fileId ? {...f, actor_name: value} : f) } : b));
  };

  const removeResultFile = (batchId: string, fileId: string) => {
    setBatches(prev => prev.map(b => {
      if (b.id === batchId) {
        const fileToRemove = b.resultFiles.find(f => f.id === fileId);
        if (fileToRemove) URL.revokeObjectURL(fileToRemove.previewUrl);
        return { ...b, resultFiles: b.resultFiles.filter(f => f.id !== fileId) };
      }
      return b;
    }));
  };

  const handleUploadClick = () => {
    if (batches.length > 0) onUploadRequest(batches);
  };
  
  const isUploadDisabled = batches.length === 0 || batches.some(b => !b.sourceFile.performance_actor || !b.sourceFile.movement_type || b.resultFiles.some(r => !r.actor_name));

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto pr-2 space-y-6">
        {batches.map((batch) => (
          <motion.div key={batch.id} layout className="p-4 bg-secondary-dark/50 border border-secondary-dark space-y-4 relative">
            <button onClick={() => removeBatch(batch.id)} className="absolute -top-3 -right-3 p-1 bg-red-600 rounded-full text-white z-10"><IconTrash size={12} /></button>
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-400">Performance Batch: {batch.sourceFile.file.name}</h3>
            <motion.div layout className="flex gap-4 p-2 bg-secondary-dark items-start">
              <video src={batch.sourceFile.previewUrl} className="w-24 h-auto aspect-[9/16] object-cover bg-black flex-shrink-0" controls={false} muted loop playsInline autoPlay/>
              <div className="flex-grow grid grid-cols-2 gap-4">
                <ComboBox options={performanceActors} value={batch.sourceFile.performance_actor} onChange={value => updateSourceFile(batch.id, 'performance_actor', value)} placeholder="Performance Actor" />
                <ComboBox options={movements} value={batch.sourceFile.movement_type} onChange={value => updateSourceFile(batch.id, 'movement_type', value)} placeholder="Movement" />
                <input type="number" value={batch.sourceFile.take_number} onChange={(e) => updateSourceFile(batch.id, 'take_number', parseInt(e.target.value) || 1)} className="w-full p-2 bg-primary-dark border border-secondary-dark focus:ring-1 focus:ring-white focus:outline-none" min="1" />
                <input type="text" value={batch.sourceFile.tags} placeholder="Tags (comma-separated)" onChange={(e) => updateSourceFile(batch.id, 'tags', e.target.value)} className="w-full p-2 bg-primary-dark border border-secondary-dark focus:ring-1 focus:ring-white focus:outline-none" />
              </div>
            </motion.div>
            <motion.div layout className="space-y-3">
              {batch.resultFiles.map(file => (
                 <motion.div layout key={file.id} className="flex gap-4 p-2 bg-secondary-dark items-center">
                    <video src={file.previewUrl} className="w-16 h-auto aspect-[9/16] object-cover bg-black flex-shrink-0" controls={false} muted loop playsInline autoPlay/>
                     <div className="flex-grow"><ComboBox options={actors} value={file.actor_name} onChange={value => updateResultFile(batch.id, file.id, value)} placeholder="AI Actor Name" /></div>
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
        <button onClick={handleUploadClick} disabled={isUploadDisabled} className="group relative flex justify-center py-2 px-6 border border-transparent text-sm font-medium text-b-dark bg-text-dark hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-not-allowed">Upload All Batches</button>
      </div>
    </div>
  )
}

// --- AI GENERATION COMPONENTS ---

// Handles responses from our backend proxy, throwing an error if the response is not OK.
const handleApiResponse = async (res: Response) => {
    if (!res.ok) {
        // Try to parse error details from the response body, otherwise fall back to status text.
        const errorBody = await res.json().catch(() => ({ error: `Request failed with status: ${res.status} ${res.statusText}` }));
        throw new Error(errorBody.error || `HTTP error! status: ${res.status}`);
    }
    // For DELETE requests that return 204 No Content, res.json() will fail.
    if (res.status === 204) {
        return null;
    }
    return res.json();
};

// API object to interact with our own backend proxy, not RunwayML directly.
const runwayApi = {
  startTask: (body: any) => fetch('/api/runway', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handleApiResponse),

  getTaskStatus: (taskId: string) => fetch(`/api/runway?taskId=${taskId}`, {
    method: 'GET',
  }).then(handleApiResponse)
};


const SingleFileInput: React.FC<{onFileChange: (file: File | null) => void; label: string; file: File | null; accept: string}> = ({onFileChange, label, file, accept}) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
        setPreviewUrl(null);
    }, [file]);
    
    return (
        <FileInputArea onFileChange={(files) => onFileChange(files ? files[0] : null)} id={label} accept={accept}>
            {previewUrl ? (
                <div className="text-center relative group">
                  {file?.type.startsWith('video/') ? <video src={previewUrl} className="max-h-20 mx-auto" autoPlay loop muted playsInline /> : <img src={previewUrl} alt="Preview" className="max-h-20 mx-auto" />}
                  <p className="text-xs truncate max-w-xs">{file?.name}</p>
                  <button onClick={(e) => { e.preventDefault(); onFileChange(null); }} className="absolute -top-2 -right-2 p-0.5 bg-red-600 rounded-full text-white opacity-0 group-hover:opacity-100"><IconX size={12} /></button>
                </div>
            ) : (
                <div className="text-center">
                    <IconUploadCloud className="w-8 h-8 text-gray-500 mx-auto" />
                    <p className="mt-1 text-sm">{label}</p>
                </div>
            )}
        </FileInputArea>
    );
};

const SaveToGalleryForm: React.FC<{
    task: GenerationTask;
    actors: string[];
    onSave: (finalMetadata: { actor_name: string; tags: string[] }) => void;
    onCancel: () => void;
}> = ({ task, actors, onSave, onCancel }) => {
    const [actorName, setActorName] = useState('');
    const [tags, setTags] = useState(task.initial_metadata.tags.join(', '));
    const isFormValid = actorName.trim() !== '';

    return (
        <motion.div layout className="mt-2 p-3 bg-primary-dark border border-secondary-dark space-y-3">
            <h4 className="font-bold text-md">Save to Gallery</h4>
            <div className="grid grid-cols-1 gap-3">
                <ComboBox options={actors} value={actorName} onChange={setActorName} placeholder="Final AI Actor Name" />
                <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags (comma-separated)" className="w-full p-2 bg-secondary-dark border border-secondary-dark focus:ring-1 focus:ring-white focus:outline-none" />
            </div>
            <div className="flex justify-end gap-2 mt-2">
                <button onClick={onCancel} className="py-1 px-3 text-sm hover:bg-secondary-dark">Cancel</button>
                <button onClick={() => onSave({ actor_name: actorName, tags: tags.split(',').map(t=>t.trim()) })} disabled={!isFormValid} className="py-1 px-3 text-sm bg-text-dark text-b-dark disabled:opacity-50">Save</button>
            </div>
        </motion.div>
    );
};

const TaskItem: React.FC<{ 
    task: GenerationTask; 
    onDelete: (taskId: string) => void; 
    onSave: (task: GenerationTask, metadata: any) => void;
    actors: string[];
}> = memo(({ task, onDelete, onSave, actors }) => {
    const [isSaving, setIsSaving] = useState(false);
    const getStatusPill = (status: RunwayTaskStatus) => {
        const styles: {[key: string]: string} = {
            UPLOADING: 'bg-yellow-500/20 text-yellow-300',
            PENDING: 'bg-yellow-500/20 text-yellow-300 animate-pulse',
            RUNNING: 'bg-blue-500/20 text-blue-300 animate-pulse',
            SUCCEEDED: 'bg-green-500/20 text-green-300',
            FAILED: 'bg-red-500/20 text-red-300',
            ARCHIVED: 'bg-gray-500/20 text-gray-400',
        };
        return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}>{status}</span>;
    }

    return (
        <motion.div layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3 bg-secondary-dark/50 border border-secondary-dark flex flex-col">
            <div className="flex items-start gap-4">
                <div className="flex-grow">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-semibold">{task.initial_metadata.performance_actor} - {task.initial_metadata.movement_type}</p>
                      {getStatusPill(task.status)}
                    </div>
                    <p className="text-xs mt-1 text-gray-400">Character: {task.initial_metadata.character_asset_name}</p>
                    {task.status === 'FAILED' && <p className="text-xs text-red-400 mt-1">{task.error_message}</p>}
                </div>
                 <button onClick={() => onDelete(task.id)} className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"><IconTrash size={16}/></button>
            </div>
            {task.status === 'SUCCEEDED' && task.output_video_url && (
                <div className="mt-4">
                    { isSaving ? (
                        <SaveToGalleryForm task={task} actors={actors} onCancel={() => setIsSaving(false)} onSave={(finalMeta) => { onSave(task, finalMeta); setIsSaving(false); }} />
                    ) : (
                         <div className="flex gap-4 items-center">
                            <video src={task.output_video_url} className="w-24 aspect-[9/16] object-cover bg-black" controls muted loop autoPlay playsInline />
                            <div className="flex-grow"></div>
                            <button onClick={() => setIsSaving(true)} className="py-2 px-4 text-sm bg-text-dark text-b-dark self-end">Save to Gallery</button>
                         </div>
                    )}
                </div>
            )}
        </motion.div>
    );
});

const AiGenerator: React.FC<{
  userId: string;
  tasks: GenerationTask[];
  createGenerationTask: (taskData: Omit<GenerationTask, 'id' | 'created_at'>) => Promise<GenerationTask | null>;
  deleteGenerationTask: (taskId: string) => void;
  saveGeneratedVideoToGallery: (task: GenerationTask, finalMetadata: { actor_name: string; tags: string[] }) => void;
  actors: string[]; movements: string[]; performanceActors: string[];
  refreshData: () => void;
}> = (props) => {
    const { userId, tasks, createGenerationTask, deleteGenerationTask, saveGeneratedVideoToGallery, actors, movements, performanceActors, refreshData } = props;

    const [refVideo, setRefVideo] = useState<File|null>(null);
    const [charAsset, setCharAsset] = useState<File|null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    
    const [initialMeta, setInitialMeta] = useState({
      performance_actor: '', movement_type: '', take_number: 1, tags: '', ratio: '720:1280'
    });
    
    const pollTasks = useCallback(async () => {
        const tasksToPoll = tasks.filter(t => t.status === 'PENDING' || t.status === 'RUNNING');
        if (tasksToPoll.length === 0) return;

        for (const task of tasksToPoll) {
          if (!task.runway_task_id) continue;
          try {
            const runwayTask: any = await runwayApi.getTaskStatus(task.runway_task_id);
            if (task.status.toLowerCase() !== runwayTask.status) {
              const updatePayload: Database['public']['Tables']['generation_tasks']['Update'] = {
                status: runwayTask.status.toUpperCase(),
                output_video_url: runwayTask.output?.uri || null,
                error_message: runwayTask.error || null,
              };
              const { error } = await supabase.from('generation_tasks').update(updatePayload).eq('id', task.id);
              if (!error) {
                refreshData(); // Refresh data to get immediate UI update
              }
            }
          } catch (error: any) {
            console.error(`Error polling task ${task.id}:`, error);
            const updatePayload: Database['public']['Tables']['generation_tasks']['Update'] = { status: 'FAILED', error_message: error.message };
            await supabase.from('generation_tasks').update(updatePayload).eq('id', task.id);
            refreshData();
          }
        }
    }, [tasks, refreshData]);

    useEffect(() => {
        const interval = setInterval(pollTasks, 10000);
        return () => clearInterval(interval);
    }, [pollTasks]);


    const handleStartGeneration = async () => {
        if (!refVideo || !charAsset || !initialMeta.performance_actor || !initialMeta.movement_type) return;
        setIsGenerating(true);

        try {
            // 1. Create temporary task in UI
            const tempId = uuidv4();
            const tempTaskData: Omit<GenerationTask, 'id' | 'created_at' | 'runway_task_id' | 'input_reference_video_url' | 'input_character_url' | 'output_video_url' | 'error_message'> = {
              user_id: userId,
              status: 'UPLOADING',
              initial_metadata: {
                performance_actor: initialMeta.performance_actor,
                movement_type: initialMeta.movement_type,
                take_number: initialMeta.take_number,
                tags: initialMeta.tags.split(',').map(t=>t.trim()),
                character_asset_name: charAsset.name,
                reference_video_name: refVideo.name,
              }
            };
            
            // 2. Upload assets to Supabase to get public URLs for Runway
            const uploadFile = async (file: File, folder: string) => {
                const path = `${userId}/${folder}/${uuidv4()}-${file.name}`;
                const { error } = await supabase.storage.from('videos').upload(path, file);
                if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`);
                const { data } = supabase.storage.from('videos').getPublicUrl(path);
                return data.publicUrl;
            };
            
            const [refUrl, charUrl] = await Promise.all([
              uploadFile(refVideo, 'generation_inputs'),
              uploadFile(charAsset, 'generation_inputs'),
            ]);

            // 3. Start Runway task
            const runwayResponse: any = await runwayApi.startTask({
                character: { type: charAsset.type.startsWith('video') ? 'video' : 'image', uri: charUrl },
                reference: { type: 'video', uri: refUrl },
                ratio: initialMeta.ratio,
                model: 'act_two',
            });
            if (!runwayResponse.id) throw new Error(runwayResponse.error || 'Failed to start Runway task');

            // 4. Create permanent task in DB
            await createGenerationTask({
              ...tempTaskData,
              status: 'PENDING',
              runway_task_id: runwayResponse.id,
              input_character_url: charUrl,
              input_reference_video_url: refUrl,
              output_video_url: null,
              error_message: null,
            });
            
            setRefVideo(null); setCharAsset(null);
        } catch (error: any) {
            console.error('Generation Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };
    
    const isFormValid = refVideo && charAsset && initialMeta.performance_actor && initialMeta.movement_type;
    
    return (
        <div className="h-full flex flex-col">
          <div className="p-4 bg-secondary-dark/50 border border-secondary-dark space-y-3">
            <h3 className="font-bold text-md">New Generation Job</h3>
            <div className="grid grid-cols-2 gap-4">
              <SingleFileInput onFileChange={setRefVideo} label="Reference Performance" file={refVideo} accept="video/*" />
              <SingleFileInput onFileChange={setCharAsset} label="Character Asset" file={charAsset} accept="video/*,image/*" />
              <ComboBox options={performanceActors} value={initialMeta.performance_actor} onChange={val => setInitialMeta(p=>({...p, performance_actor: val}))} placeholder="Performance Actor" />
              <ComboBox options={movements} value={initialMeta.movement_type} onChange={val => setInitialMeta(p=>({...p, movement_type: val}))} placeholder="Movement" />
              <input type="number" value={initialMeta.take_number} onChange={e => setInitialMeta(p=>({...p, take_number: parseInt(e.target.value) || 1}))} className="w-full p-2 bg-primary-dark border border-secondary-dark" min="1" />
              <select value={initialMeta.ratio} onChange={e => setInitialMeta(p => ({...p, ratio: e.target.value}))} className="w-full p-2 bg-primary-dark border border-secondary-dark">
                <option value="720:1280">Portrait (720x1280)</option>
                <option value="1280:720">Landscape (1280x720)</option>
                <option value="960:960">Square (960x960)</option>
              </select>
              <input type="text" value={initialMeta.tags} onChange={e => setInitialMeta(p=>({...p, tags: e.target.value}))} placeholder="Tags (comma-separated)" className="col-span-2 w-full p-2 bg-primary-dark border border-secondary-dark" />
            </div>
            <div className="flex justify-end">
              <button onClick={handleStartGeneration} disabled={!isFormValid || isGenerating} className="py-2 px-6 text-sm bg-text-dark text-b-dark disabled:opacity-50">
                {isGenerating ? 'Starting...' : 'Start Generation'}
              </button>
            </div>
          </div>
          <h3 className="font-bold text-md mt-6 mb-3">Generation History</h3>
          <div className="flex-grow overflow-y-auto pr-2 space-y-3">
             <AnimatePresence>
                {tasks.map(task => <TaskItem key={task.id} task={task} onDelete={deleteGenerationTask} onSave={saveGeneratedVideoToGallery} actors={actors} />)}
              </AnimatePresence>
          </div>
        </div>
    );
}

// --- MAIN MODAL ---

interface UploadModalProps {
  onClose: () => void;
  onUploadRequest: (batches: PerformanceBatch[]) => void;
  actors: string[]; movements: string[]; performanceActors: string[];
  userId: string;
  generationTasks: GenerationTask[];
  createGenerationTask: (taskData: Omit<GenerationTask, 'id' | 'created_at'>) => Promise<GenerationTask | null>;
  deleteGenerationTask: (taskId: string) => void;
  saveGeneratedVideoToGallery: (task: GenerationTask, finalMetadata: { actor_name: string; tags: string[] }) => void;
  refreshData: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = (props) => {
  const { onClose, onUploadRequest, actors, movements, performanceActors } = props;
  const [activeTab, setActiveTab] = useState('manual');
  
  const modalVariants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 } };

  return (
    <motion.div className="fixed inset-0 bg-b-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="w-full max-w-5xl h-[90vh] p-6 bg-primary-dark border border-secondary-dark flex flex-col" onClick={(e) => e.stopPropagation()} variants={modalVariants} initial="hidden" animate="visible" exit="exit">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><IconUploadCloud/> Content Hub</h2>
          <motion.button onClick={onClose} className="p-1 hover:bg-secondary-dark" title="Close" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1, rotate: 90 }}><IconX /></motion.button>
        </div>
        
         <div className="flex border-b border-secondary-dark mb-4">
            <button onClick={() => setActiveTab('manual')} className={`flex items-center gap-2 px-4 py-2 text-sm ${activeTab === 'manual' ? 'border-b-2 border-text-dark' : 'text-gray-400'}`}><IconUploadCloud size={16} /> Manual Upload</button>
            <button onClick={() => setActiveTab('generate')} className={`flex items-center gap-2 px-4 py-2 text-sm ${activeTab === 'generate' ? 'border-b-2 border-text-dark' : 'text-gray-400'}`}><IconBot size={16}/> AI Generation</button>
        </div>

        <div className="flex-grow overflow-hidden">
          {activeTab === 'manual' ? (
            <ManualUploader onUploadRequest={onUploadRequest} actors={actors} movements={movements} performanceActors={performanceActors} />
          ) : (
            <AiGenerator 
                actors={props.actors}
                movements={props.movements}
                performanceActors={props.performanceActors}
                userId={props.userId}
                tasks={props.generationTasks}
                createGenerationTask={props.createGenerationTask}
                deleteGenerationTask={props.deleteGenerationTask}
                saveGeneratedVideoToGallery={props.saveGeneratedVideoToGallery}
                refreshData={props.refreshData}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
