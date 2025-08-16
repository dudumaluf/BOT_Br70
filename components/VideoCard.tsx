import React, { useRef, memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoAsset, AppState, ZoomLevel } from '../types';
import { IconCheck, IconInfo, IconMoreVertical, IconEdit, IconTrash, IconStar } from './icons';

interface VideoCardProps {
  asset: VideoAsset;
  isSelected: boolean;
  onSelectionChange: (assetId: string, event: React.MouseEvent) => void;
  autoplayOnHover: boolean;
  appState: AppState;
  indexInSelection?: number;
  zoomLevel?: ZoomLevel;
  onEdit: (asset: VideoAsset) => void;
  onDelete: (assetId: string) => void;
  onToggleFavorite: (assetId: string) => void;
}

const VideoCardComponent: React.FC<VideoCardProps> = ({ asset, isSelected, onSelectionChange, autoplayOnHover, appState, indexInSelection, zoomLevel, onEdit, onDelete, onToggleFavorite }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isPreviewing = appState === 'preview';
  const isZoomed = isPreviewing && zoomLevel === '100%';
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMouseEnter = () => {
    if (autoplayOnHover && !isPreviewing) {
      videoRef.current?.play().catch(error => console.log("Autoplay prevented:", error));
    }
  };

  const handleMouseLeave = () => {
    if (autoplayOnHover && !isPreviewing && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsMenuOpen(false);
  };

  useEffect(() => {
    if (isPreviewing && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(e => console.error("Preview autoplay failed", e));
    }
  }, [isPreviewing]);
  
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(!isMenuOpen);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(asset);
    setIsMenuOpen(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(asset.id);
    setIsMenuOpen(false);
  };
  
  const getParentClasses = () => {
    if (isPreviewing) {
      if (isZoomed) {
        // In zoom mode, parent should not constrain size. Let the video element dictate it.
        return 'relative group bg-black flex items-center justify-center';
      }
      // In fit mode, parent should fill its container.
      return 'relative group bg-black w-full h-full flex items-center justify-center overflow-hidden';
    }
    // Grid mode default classes
    return `relative group transition-shadow duration-200 bg-black cursor-pointer aspect-[9/16] ${isSelected ? 'ring-2 ring-white' : 'ring-1 ring-secondary-dark/50'}`;
  }


  return (
    <motion.div 
      layoutId={asset.id}
      whileHover={!isPreviewing ? { scale: 1.03, zIndex: 10 } : {}}
      className={getParentClasses()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => !isPreviewing && onSelectionChange(asset.id, e)}
    >
        <motion.video
            ref={videoRef}
            src={asset.video_url}
            poster={asset.thumbnail_url}
            muted={!isPreviewing || (isPreviewing && indexInSelection !== 0)}
            loop
            playsInline
            controls={isPreviewing}
            preload="metadata"
            autoPlay={isPreviewing}
            className={`transition-all duration-300 ease-in-out ${isZoomed ? 'max-w-none max-h-none' : 'object-contain w-full h-full'}`}
            style={isZoomed ? { width: asset.resolution.width, height: asset.resolution.height } : {}}
        />

        {/* Grid Info Overlay */}
        {!isPreviewing && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none p-3 flex flex-col justify-end">
                <div className="text-white transform-gpu translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <p className="font-bold text-sm truncate">{asset.actor_name} - Take {asset.take_number}</p>
                    <p className="text-xs text-gray-300">{asset.movement_type} (Perf: {asset.performance_actor})</p>
                </div>
            </div>
        )}
        
        {/* Management & Favorite Controls */}
        {!isPreviewing && (
           <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <motion.button
              onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(asset.id);
              }}
              className={`p-1.5 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-all ${asset.is_favorite ? 'text-yellow-400' : 'text-white/70 hover:text-white'}`}
              title={asset.is_favorite ? "Remove from favorites" : "Add to favorites"}
              whileTap={{ scale: 0.9 }}
            >
              <IconStar size={16} fill={asset.is_favorite ? 'currentColor' : 'none'} />
            </motion.button>
            <div className="relative">
              <motion.button 
                onClick={handleMenuClick}
                className="p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                whileTap={{scale: 0.9}}
              >
                <IconMoreVertical size={16} />
              </motion.button>
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-1 w-32 bg-primary-dark border border-secondary-dark z-20"
                  >
                    <button onClick={handleEditClick} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-secondary-dark"><IconEdit size={14}/> Edit</button>
                    <button onClick={handleDeleteClick} className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-red-500 hover:bg-secondary-dark"><IconTrash size={14}/> Delete</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Preview Info Tooltip */}
        {isPreviewing && (
          <div className="absolute top-2 right-2 group/tooltip z-10">
            <IconInfo className="w-6 h-6 text-white bg-black/50 rounded-full p-1 cursor-help"/>
            <div className="absolute bottom-full right-0 mb-2 w-max p-2 text-sm bg-primary-dark border border-secondary-dark text-text-dark opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none">
              <p>Resolution: {asset.resolution.width}x{asset.resolution.height}</p>
              <p>File Size: {asset.file_size}</p>
            </div>
          </div>
        )}
    </motion.div>
  );
};

export const VideoCard = memo(VideoCardComponent);