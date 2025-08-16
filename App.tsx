import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppData } from './hooks/useAppData';
import { FloatingUI } from './components/FloatingUI';
import { FilterSidebar } from './components/FilterSidebar';
import { VideoGrid } from './components/VideoGrid';
import { Login } from './components/Login';
import { SettingsModal } from './components/SettingsModal';
import { UploadModal } from './components/UploadModal';
import { EditModal } from './components/EditModal';
import { SplashScreen } from './components/SplashScreen';
import { ConfirmationModal } from './components/ConfirmationModal';
import { VideoAsset, Theme, Settings, AppState, PreviewLayout, ZoomLevel, GroupMode, SortBy, CategoryType, PerformanceBatch, Category } from './types';
import { IconChevronsLeft, IconChevronsRight } from './components/icons';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';


const App: React.FC = () => {
  const [appReady, setAppReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  
  const { 
    assets, loading, addAssets, deleteAsset, updateAsset, deleteMultipleAssets, toggleFavorite,
    categories, addCategoryItem, renameCategoryItem, deleteCategoryItem,
  } = useAppData(session?.user?.id);

  const actors = useMemo(() => categories.filter(c => c.type === 'actors').map(c => c.name), [categories]);
  const movements = useMemo(() => categories.filter(c => c.type === 'movements').map(c => c.name), [categories]);
  const performanceActors = useMemo(() => categories.filter(c => c.type === 'performanceActors').map(c => c.name), [categories]);
  
  const [theme, setTheme] = useState<Theme>('dark');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActors, setSelectedActors] = useState<string[]>([]);
  const [selectedMovements, setSelectedMovements] = useState<string[]>([]);
  const [selectedPerformanceActors, setSelectedPerformanceActors] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const [gridSize, setGridSize] = useState(4);
  
  const [groupMode, setGroupMode] = useState<GroupMode>('none');
  const [sortBy, setSortBy] = useState<SortBy>('created_at_desc');

  const [appState, setAppState] = useState<AppState>('grid');
  const [previewLayout, setPreviewLayout] = useState<PreviewLayout>('grid');
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('fit');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PerformanceBatch[] | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<VideoAsset | null>(null);
  const [settings, setSettings] = useState<Settings>({ autoplayOnHover: true });
  
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [confirmationProps, setConfirmationProps] = useState({ title: '', message: '', onConfirm: () => {} });

  const mainRef = useRef<HTMLElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const isDraggable = appState === 'preview' && zoomLevel === '100%';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
  }, [theme]);
  
  // Defer heavy upload processing to prevent UI freeze
  useEffect(() => {
    if (pendingUpload) {
        // This logic will now be inside useAppData, triggered by a call to addAssets
        // For now, we'll keep the structure but simplify
        addAssets(pendingUpload);
        setPendingUpload(null);
    }
  }, [pendingUpload, addAssets]);
  
  const handleUploadRequest = (batches: PerformanceBatch[]) => {
      setIsUploadModalOpen(false);
      setPendingUpload(batches);
  }
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  }

  const clearFilters = useCallback(() => {
      setSearchQuery('');
      setSelectedActors([]);
      setSelectedMovements([]);
      setSelectedPerformanceActors([]);
      setShowFavoritesOnly(false);
  }, []);
  
  const openPreview = () => {
    if (selectedAssets.size > 0) {
      setSidebarOpen(false);
      setAppState('preview');
    }
  };

  const closePreview = useCallback(() => {
    setAppState('grid');
    setZoomLevel('fit');
  }, []);

  const filteredAssets = useMemo(() => {
    return assets
      .filter(asset => {
        const favoriteMatch = !showFavoritesOnly || asset.is_favorite;

        const searchMatch = searchQuery.length === 0 ||
          asset.actor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.movement_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.performance_actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

        const actorMatch = selectedActors.length === 0 || selectedActors.includes(asset.actor_name);
        const movementMatch = selectedMovements.length === 0 || selectedMovements.includes(asset.movement_type);
        const perfActorMatch = selectedPerformanceActors.length === 0 || selectedPerformanceActors.includes(asset.performance_actor);
        
        return favoriteMatch && searchMatch && actorMatch && movementMatch && perfActorMatch;
      })
      .sort((a, b) => {
          switch(sortBy) {
            case 'created_at_asc':
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            case 'created_at_desc':
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            case 'actor_name_asc':
                return a.actor_name.localeCompare(b.actor_name);
            case 'actor_name_desc':
                return b.actor_name.localeCompare(a.actor_name);
            default:
                return 0;
          }
      });
  }, [assets, searchQuery, selectedActors, selectedMovements, selectedPerformanceActors, sortBy, showFavoritesOnly]);

  const handleSelectionChange = useCallback((assetId: string, event: React.MouseEvent) => {
    const { shiftKey, ctrlKey, metaKey } = event;
    const isModifierClick = ctrlKey || metaKey;

    if (shiftKey && lastSelectedId) {
      const currentIndex = filteredAssets.findIndex(a => a.id === assetId);
      const lastIndex = filteredAssets.findIndex(a => a.id === lastSelectedId);
      const start = Math.min(currentIndex, lastIndex);
      const end = Math.max(currentIndex, lastIndex);
      const rangeIds = filteredAssets.slice(start, end + 1).map(a => a.id);
      
      const newSet = new Set(selectedAssets);
      rangeIds.forEach(id => newSet.add(id));
      setSelectedAssets(newSet);
    } else if (isModifierClick) {
      const newSet = new Set(selectedAssets);
      if (newSet.has(assetId)) {
        newSet.delete(assetId);
      } else {
        newSet.add(assetId);
      }
      setSelectedAssets(newSet);
      setLastSelectedId(assetId);
    } else {
      setSelectedAssets(new Set([assetId]));
      setLastSelectedId(assetId);
    }
  }, [selectedAssets, lastSelectedId, filteredAssets]);

  const getSelectedAssetsData = useCallback((): VideoAsset[] => {
    const selectedAssetMap = new Map(assets.map(asset => [asset.id, asset]));
    return Array.from(selectedAssets).map(id => selectedAssetMap.get(id)).filter(Boolean) as VideoAsset[];
  }, [assets, selectedAssets]);
  
  const handleDownload = () => {
    console.log("Downloading assets:", Array.from(selectedAssets));
    alert(`Initiating download for ${selectedAssets.size} assets.`);
  };

  const handleClearSelection = useCallback(() => {
    setSelectedAssets(new Set());
    setLastSelectedId(null);
  }, []);

  const handleEditAsset = (asset: VideoAsset) => {
    setAssetToEdit(asset);
    setIsEditModalOpen(true);
  };
  
  const handleUpdateAsset = (updatedAsset: VideoAsset) => {
    updateAsset(updatedAsset);
    setIsEditModalOpen(false);
    setAssetToEdit(null);
  };

  const handleDeleteAssetRequest = useCallback((assetId: string) => {
    setConfirmationProps({
        title: 'Delete Asset',
        message: 'Are you sure you want to delete this asset? This action cannot be undone.',
        onConfirm: () => {
            deleteAsset(assetId);
            setSelectedAssets(prevSelected => {
                const newSelected = new Set(prevSelected);
                newSelected.delete(assetId);
                return newSelected;
            });
        }
    });
    setIsConfirmationOpen(true);
  }, [deleteAsset]);

  const handleDeleteMultipleAssetsRequest = useCallback(() => {
    if (selectedAssets.size === 0) return;
    setConfirmationProps({
        title: `Delete ${selectedAssets.size} Asset(s)`,
        message: `Are you sure you want to delete ${selectedAssets.size} selected asset(s)? This action cannot be undone.`,
        onConfirm: () => {
            deleteMultipleAssets(Array.from(selectedAssets));
            handleClearSelection();
        }
    });
    setIsConfirmationOpen(true);
  }, [selectedAssets, deleteMultipleAssets, handleClearSelection]);

  const handleDeleteCategoryRequest = useCallback((category: CategoryType, name: string) => {
    setConfirmationProps({
        title: `Delete Category Item`,
        message: `Are you sure you want to delete "${name}"? This will un-assign it from all associated assets. This action cannot be undone.`,
        onConfirm: () => {
          const catToDelete = categories.find(c => c.type === category && c.name === name);
          if (catToDelete) {
            deleteCategoryItem(catToDelete);
          }
        }
    });
    setIsConfirmationOpen(true);
  }, [deleteCategoryItem, categories]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSettingsOpen || isUploadModalOpen || isEditModalOpen || isConfirmationOpen) return;
      
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (appState === 'preview') {
        if (e.key === 'Escape' || e.code === 'Space') {
          e.preventDefault();
          closePreview();
        }
        return;
      }

      if (e.code === 'Space' && selectedAssets.size > 0) {
        e.preventDefault();
        openPreview();
      }
      if (e.key === 'Escape') {
        handleClearSelection();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteMultipleAssetsRequest();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState, selectedAssets, isSettingsOpen, isUploadModalOpen, isEditModalOpen, isConfirmationOpen, handleClearSelection, closePreview, handleDeleteMultipleAssetsRequest]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDraggable || !mainRef.current) return;
    setIsDragging(true);
    setDragStart({
        x: e.pageX - mainRef.current.offsetLeft,
        y: e.pageY - mainRef.current.offsetTop,
        scrollLeft: mainRef.current.scrollLeft,
        scrollTop: mainRef.current.scrollTop,
    });
    mainRef.current.style.cursor = 'grabbing';
    mainRef.current.style.userSelect = 'none';
  };

  const handleMouseLeave = () => {
      if (isDragging && mainRef.current) {
        setIsDragging(false);
        mainRef.current.style.cursor = 'grab';
        mainRef.current.style.userSelect = 'auto';
      }
  };

  const handleMouseUp = () => {
    if (isDragging && mainRef.current) {
        setIsDragging(false);
        mainRef.current.style.cursor = 'grab';
        mainRef.current.style.userSelect = 'auto';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging || !isDraggable || !mainRef.current) return;
      e.preventDefault();
      const x = e.pageX - mainRef.current.offsetLeft;
      const y = e.pageY - mainRef.current.offsetTop;
      const walkX = (x - dragStart.x);
      const walkY = (y - dragStart.y);
      mainRef.current.scrollLeft = dragStart.scrollLeft - walkX;
      mainRef.current.scrollTop = dragStart.scrollTop - walkY;
  };

  const getMainContentClasses = () => {
    let classes = 'flex-1 relative transition-all duration-300 ';
    if (appState === 'preview') {
      if (zoomLevel === '100%') {
        switch (previewLayout) {
          case 'row':
            return classes + 'overflow-x-auto overflow-y-hidden';
          case 'column':
            return classes + 'overflow-y-auto overflow-x-hidden';
          default:
            return classes + 'overflow-auto';
        }
      }
      return classes + 'overflow-hidden';
    }
    return classes + 'overflow-y-auto pt-24 pb-24 px-6';
  };

  if (!appReady) {
    return <SplashScreen onFinished={() => setAppReady(true)} />;
  }
  
  if (!session) {
    return <Login />;
  }
  
  const assetsToDisplay = appState === 'preview' ? getSelectedAssetsData() : filteredAssets;

  return (
    <div className="h-screen flex flex-col bg-b-light dark:bg-b-dark">
      <div className="flex flex-grow overflow-hidden relative">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 256, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex-shrink-0 h-full overflow-hidden"
              style={{ zIndex: 25 }}
            >
              <FilterSidebar 
                  isOpen={sidebarOpen}
                  actors={actors}
                  movements={movements}
                  performanceActors={performanceActors}
                  selectedActors={selectedActors}
                  setSelectedActors={setSelectedActors}
                  selectedMovements={selectedMovements}
                  setSelectedMovements={setSelectedMovements}
                  selectedPerformanceActors={selectedPerformanceActors}
                  setSelectedPerformanceActors={setSelectedPerformanceActors}
                  clearFilters={clearFilters}
                  showFavoritesOnly={showFavoritesOnly}
                  setShowFavoritesOnly={setShowFavoritesOnly}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <FloatingUI
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedCount={selectedAssets.size}
              onDownload={handleDownload}
              onClearSelection={handleClearSelection}
              gridSize={gridSize}
              setGridSize={setGridSize}
              onSettingsClick={() => setIsSettingsOpen(true)}
              onUploadClick={() => setIsUploadModalOpen(true)}
              appState={appState}
              onClosePreview={closePreview}
              previewLayout={previewLayout}
              setPreviewLayout={setPreviewLayout}
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
              groupMode={groupMode}
              setGroupMode={setGroupMode}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sidebarOpen={sidebarOpen}
              onLogout={handleLogout}
              isLoggedIn={!!session}
          />

          <motion.button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="absolute top-1/2 -translate-y-1/2 bg-primary-light dark:bg-primary-dark p-1 z-50 border-r border-t border-b border-secondary-light dark:border-secondary-dark"
            initial={false}
            animate={{ left: sidebarOpen ? 256 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {sidebarOpen ? <IconChevronsLeft size={20}/> : <IconChevronsRight size={20}/>}
          </motion.button>
          
          <main 
            ref={mainRef}
            className={`z-10 ${getMainContentClasses()} ${isDraggable ? 'cursor-grab' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            <VideoGrid
              assets={assetsToDisplay}
              loading={loading && appState === 'grid'}
              selectedAssets={selectedAssets}
              onSelectionChange={handleSelectionChange}
              groupMode={groupMode}
              gridSize={gridSize}
              autoplayOnHover={settings.autoplayOnHover}
              appState={appState}
              previewLayout={previewLayout}
              zoomLevel={zoomLevel}
              onEditAsset={handleEditAsset}
              onDeleteAsset={handleDeleteAssetRequest}
              onToggleFavorite={toggleFavorite}
            />
          </main>
        </div>
      </div>
      
      <AnimatePresence>
        {isSettingsOpen && <SettingsModal 
            settings={settings} 
            updateSettings={setSettings}
            theme={theme}
            setTheme={setTheme}
            categories={categories}
            addCategoryItem={addCategoryItem}
            renameCategoryItem={renameCategoryItem}
            onDeleteCategory={handleDeleteCategoryRequest}
            onClose={() => setIsSettingsOpen(false)} 
        />}
        {isUploadModalOpen && <UploadModal 
            actors={actors}
            movements={movements}
            performanceActors={performanceActors}
            onClose={() => setIsUploadModalOpen(false)} 
            onUploadRequest={handleUploadRequest} 
        />}
        {isEditModalOpen && assetToEdit && <EditModal 
            asset={assetToEdit} 
            actors={actors}
            movements={movements}
            performanceActors={performanceActors}
            onClose={() => setIsEditModalOpen(false)} 
            onSave={handleUpdateAsset} 
        />}
        {isConfirmationOpen && <ConfirmationModal 
          isOpen={isConfirmationOpen}
          onClose={() => setIsConfirmationOpen(false)}
          onConfirm={() => {
            confirmationProps.onConfirm();
            setIsConfirmationOpen(false);
          }}
          title={confirmationProps.title}
          message={confirmationProps.message}
        />}
      </AnimatePresence>
    </div>
  );
};

export default App;