import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IconX, IconEdit } from './icons';
import { VideoAsset } from '../types';
import { ComboBox } from './ComboBox';

interface EditModalProps {
  asset: VideoAsset;
  onClose: () => void;
  onSave: (updatedAsset: VideoAsset) => void;
  actors: string[];
  movements: string[];
  performanceActors: string[];
}

export const EditModal: React.FC<EditModalProps> = ({ asset, onClose, onSave, actors, movements, performanceActors }) => {
  const [formData, setFormData] = useState(asset);

  useEffect(() => {
    setFormData(asset);
  }, [asset]);

  const handleChange = (field: keyof VideoAsset, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, tags: e.target.value.split(',').map(tag => tag.trim()) }));
  }

  const handleSave = () => {
    onSave(formData);
  };
  
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-b-dark/80 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-2xl p-6 bg-primary-light dark:bg-primary-dark border border-secondary-dark flex flex-col"
        onClick={(e) => e.stopPropagation()}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><IconEdit/> Edit Asset</h2>
          <motion.button onClick={onClose} className="p-1 hover:bg-secondary-dark" title="Close" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1, rotate: 90 }}>
            <IconX />
          </motion.button>
        </div>
        
        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          <div className="flex gap-4 items-start">
            <video src={asset.videoUrl} className="w-32 h-auto aspect-[9/16] object-cover bg-black flex-shrink-0" controls={false} autoPlay muted loop playsInline/>
            <div className="flex-grow grid grid-cols-2 gap-4">
               <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Performance Actor</label>
                 <ComboBox
                    options={performanceActors}
                    value={formData.performanceActor}
                    onChange={(value) => handleChange('performanceActor', value)}
                  />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Actor</label>
                <ComboBox
                    options={actors}
                    value={formData.actorName}
                    onChange={(value) => handleChange('actorName', value)}
                  />
              </div>
               <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Movement</label>
                <ComboBox
                    options={movements}
                    value={formData.movementType}
                    onChange={(value) => handleChange('movementType', value)}
                  />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-1">Take #</label>
                <input type="number" value={formData.takeNumber} onChange={(e) => handleChange('takeNumber', parseInt(e.target.value) || 1)} className="w-full p-2 bg-primary-dark border border-secondary-dark focus:ring-1 focus:ring-white focus:outline-none" min="1" />
              </div>
              <div className="col-span-2">
                 <label className="text-xs font-bold text-gray-400 block mb-1">Tags (comma separated)</label>
                 <input type="text" value={formData.tags.join(', ')} onChange={handleTagChange} className="w-full p-2 bg-primary-dark border border-secondary-dark focus:ring-1 focus:ring-white focus:outline-none" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-shrink-0 pt-4 mt-4 border-t border-secondary-dark flex justify-end">
          <button
            onClick={handleSave}
            className="group relative flex justify-center py-2 px-6 border border-transparent text-sm font-medium text-b-dark bg-text-dark hover:bg-opacity-90"
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
