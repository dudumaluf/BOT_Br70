import React from 'react';
import { motion } from 'framer-motion';
import { VideoAsset, GroupedVideos, GroupMode, AppState, PreviewLayout, ZoomLevel } from '../types';
import { VideoCard } from './VideoCard';
import { IconFilm } from './icons';

interface VideoGridProps {
  assets: VideoAsset[];
  loading: boolean;
  selectedAssets: Set<string>;
  onSelectionChange: (assetId: string, event: React.MouseEvent) => void;
  groupMode: GroupMode;
  gridSize: number;
  autoplayOnHover: boolean;
  appState: AppState;
  previewLayout: PreviewLayout;
  zoomLevel: ZoomLevel;
  onEditAsset: (asset: VideoAsset) => void;
  onDeleteAsset: (assetId: string) => void;
  onToggleFavorite: (assetId: string) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({ assets, loading, selectedAssets, onSelectionChange, groupMode, gridSize, autoplayOnHover, appState, previewLayout, zoomLevel, onEditAsset, onDeleteAsset, onToggleFavorite }) => {

  const renderGroupedView = (key: 'actor_name' | 'movement_type' | 'performance_actor') => {
    const groupedAssets = assets.reduce((acc, asset) => {
      const groupKey = asset[key] || 'Uncategorized';
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(asset);
      return acc;
    }, {} as GroupedVideos);
    const sortedGroups = Object.keys(groupedAssets).sort();

    return (
      <div className="space-y-12">
        {sortedGroups.map(groupName => (
          <div key={groupName}>
            <h2 className="text-xl font-semibold mb-4 pb-2 border-b border-secondary-light dark:border-secondary-dark">{groupName}</h2>
            <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}>
              {groupedAssets[groupName].map(asset => (
                <VideoCard
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAssets.has(asset.id)}
                  onSelectionChange={onSelectionChange}
                  autoplayOnHover={autoplayOnHover}
                  appState={appState}
                  onEdit={onEditAsset}
                  onDelete={onDeleteAsset}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  if (loading) {
    return (
        <div className="flex justify-center items-center h-full">
            <div className="text-center">
                <IconFilm className="h-12 w-12 text-gray-400 animate-pulse mx-auto"/>
                <p className="mt-4 text-lg">Loading Assets...</p>
            </div>
        </div>
    );
  }

  if (assets.length === 0 && appState === 'grid') {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-center">
            <IconFilm className="h-12 w-12 text-gray-500 mx-auto"/>
            <p className="mt-4 text-lg">No assets found.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters or upload new assets.</p>
        </div>
      </div>
    );
  }
  
  let containerClasses = '';
  let gridStyle = {};
  const isZoomed = appState === 'preview' && zoomLevel === '100%';

  if (appState === 'grid') {
    if (groupMode === 'none') {
      containerClasses = 'grid gap-4';
      gridStyle = { gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` };
    }
  } else { // Preview state
    if (isZoomed) {
      switch (previewLayout) {
        case 'row': 
          containerClasses = 'inline-flex flex-row items-start gap-4 p-4 h-full';
          break;
        case 'column':
          containerClasses = 'inline-flex flex-col items-center w-full gap-4 p-4';
          break;
        case 'grid':
        default:
          const numAssetsGrid = assets.length;
          let colsGrid = Math.ceil(Math.sqrt(numAssetsGrid));
          containerClasses = `inline-grid gap-4 p-4`;
          gridStyle = { gridTemplateColumns: `repeat(${colsGrid}, auto)` };
          break;
      }
    } else {
      if (assets.length === 1) {
        containerClasses = 'flex items-center justify-center h-full p-2';
      } else {
        switch (previewLayout) {
          case 'row':
            containerClasses = 'grid grid-flow-col auto-cols-fr gap-2 h-full items-center p-2';
            break;
          case 'column':
            containerClasses = 'grid grid-flow-row auto-rows-fr gap-2 h-full items-center justify-center p-2';
            break;
          case 'grid':
          default:
            const numAssetsFit = assets.length;
            let colsFit = Math.ceil(Math.sqrt(numAssetsFit));
            containerClasses = `grid gap-2 h-full items-center p-2`;
            gridStyle = { gridTemplateColumns: `repeat(${colsFit}, 1fr)` };
            break;
        }
      }
    }
  }

  const renderContent = () => {
    if (appState === 'grid') {
      if (groupMode !== 'none') {
          return renderGroupedView(groupMode);
      }
      return assets.map(asset => (
        <VideoCard
          key={asset.id}
          asset={asset}
          isSelected={selectedAssets.has(asset.id)}
          onSelectionChange={onSelectionChange}
          autoplayOnHover={autoplayOnHover}
          appState={appState}
          onEdit={onEditAsset}
          onDelete={onDeleteAsset}
          onToggleFavorite={onToggleFavorite}
        />
      ));
    } else { // Preview state rendering
      return assets.map((asset, index) => (
         <VideoCard
            key={asset.id}
            asset={asset}
            isSelected={selectedAssets.has(asset.id)}
            onSelectionChange={onSelectionChange}
            autoplayOnHover={autoplayOnHover}
            appState={appState}
            indexInSelection={index}
            zoomLevel={zoomLevel}
            onEdit={onEditAsset}
            onDelete={onDeleteAsset}
            onToggleFavorite={onToggleFavorite}
            />
      ));
    }
  }
  
  return (
    <motion.div layout className={containerClasses} style={gridStyle}>
        {renderContent()}
    </motion.div>
  );
};