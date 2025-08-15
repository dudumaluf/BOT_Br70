import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GroupMode, SortBy, AppState, PreviewLayout, ZoomLevel } from '../types';
import { IconSearch, IconDownload, IconX, IconMinus, IconPlus, IconSettings, IconColumns, IconRows, IconGrid, IconUploadCloud, IconUsers, IconMove, IconPersonStanding, IconSort, IconSun } from './icons';
import { Dropdown } from './Dropdown';

interface FloatingUIProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCount: number;
  onDownload: () => void;
  onClearSelection: () => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  onSettingsClick: () => void;
  onUploadClick: () => void;
  appState: AppState;
  onClosePreview: () => void;
  previewLayout: PreviewLayout;
  setPreviewLayout: (layout: PreviewLayout) => void;
  zoomLevel: ZoomLevel;
  setZoomLevel: (level: ZoomLevel) => void;
  groupMode: GroupMode;
  setGroupMode: (mode: GroupMode) => void;
  sortBy: SortBy;
  setSortBy: (by: SortBy) => void;
  sidebarOpen: boolean;
  isLoggedIn: boolean;
  onLogout: () => void;
}

const MotionButton: React.FC<{ onClick?: () => void; title: string; children: React.ReactNode; disabled?: boolean; className?: string; active?: boolean }> = ({ onClick, title, children, disabled, className, active }) => (
    <motion.button
        onClick={onClick}
        title={title}
        disabled={disabled}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${active ? 'bg-text-light dark:bg-text-dark text-b-light dark:text-b-dark' : 'hover:bg-secondary-light/50 dark:hover:bg-secondary-dark/50'} ${className}`}
    >
        {children}
    </motion.button>
);

const Toolbar: React.FC<{children: React.ReactNode, position: string, animate?: boolean, layoutId?: string, style?: React.CSSProperties }> = ({ children, position, animate = true, layoutId, style }) => {
  const animationProps = animate ? {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { type: 'tween' as const, duration: 0.3 }
  } : {};

  return (
    <motion.div
      layoutId={layoutId}
      {...animationProps}
      style={style}
      className={`absolute p-1.5 bg-primary-light/70 dark:bg-primary-dark/50 backdrop-blur-md border border-secondary-light dark:border-secondary-dark flex items-center gap-2 z-40 ${position}`}
    >
      {children}
    </motion.div>
  );
};


const GROUP_OPTIONS: { value: GroupMode, label: string, icon: React.ReactNode }[] = [
  { value: 'none', label: 'None', icon: <IconGrid size={16} /> },
  { value: 'performanceActor', label: 'Perf. Actor', icon: <IconPersonStanding size={16} /> },
  { value: 'actorName', label: 'Actor', icon: <IconUsers size={16} /> },
  { value: 'movementType', label: 'Movement', icon: <IconMove size={16} /> },
];

const SORT_OPTIONS: { value: SortBy, label: string }[] = [
    { value: 'dateAdded_desc', label: 'Newest' },
    { value: 'dateAdded_asc', label: 'Oldest' },
    { value: 'actorName_asc', label: 'Actor A-Z' },
    { value: 'actorName_desc', label: 'Actor Z-A' },
];

export const FloatingUI: React.FC<FloatingUIProps> = ({ 
    searchQuery, setSearchQuery, 
    selectedCount, onDownload, onClearSelection, gridSize, setGridSize, 
    onSettingsClick, onUploadClick, appState, onClosePreview,
    previewLayout, setPreviewLayout, zoomLevel, setZoomLevel,
    groupMode, setGroupMode, sortBy, setSortBy, sidebarOpen,
    isLoggedIn, onLogout
}) => {
  const hasSelection = selectedCount > 0;

  return (
    <div className="w-full h-full absolute inset-0 pointer-events-none z-30">
      <AnimatePresence>
        {appState === 'grid' ? (
          <>
            {/* Top Left: Logo */}
             <Toolbar position="top-6 left-6 rounded-full" layoutId="logo-bar">
                <div className="w-8 h-8 bg-primary-light dark:bg-secondary-dark flex items-center justify-center rounded-full">
                    <img src="/logo.png" alt="BOT Logo" className="h-6 w-6" />
                </div>
            </Toolbar>

            {/* Top Center: Search */}
             <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
                <div className="relative flex items-center">
                  <motion.input
                    layoutId="search-bar"
                    type="text"
                    placeholder="Search assets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-96 text-left pl-4 pr-10 py-3 bg-primary-light/70 dark:bg-primary-dark/50 backdrop-blur-md border border-secondary-light dark:border-secondary-dark rounded-full focus:ring-1 focus:ring-text-light dark:focus:ring-text-dark focus:outline-none"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-light/50 dark:text-text-dark/50">
                    <IconSearch className="h-5 w-5" />
                  </div>
                </div>
            </div>
            
            {/* Top Right: App Controls */}
            <Toolbar position="top-6 right-6 pointer-events-auto rounded-md" layoutId="app-controls">
              <MotionButton onClick={onUploadClick} title="Upload Assets">
                <IconUploadCloud className="h-5 w-5" />
              </MotionButton>
              <MotionButton onClick={onSettingsClick} title="Settings & Management">
                <IconSettings className="h-5 w-5" />
              </MotionButton>
              {isLoggedIn && (
                <button onClick={onLogout} title="Logout" className="ml-2 text-xs text-text-light/50 dark:text-text-dark/50 hover:text-text-light dark:hover:text-text-dark">Logout</button>
              )}
            </Toolbar>
            
            {/* Bottom Left: Data Controls */}
            <motion.div
              className="absolute bottom-6 pointer-events-auto"
              initial={false}
              animate={{ left: sidebarOpen ? 256 + 24 : 24 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{ zIndex: 40 }}
            >
              <Toolbar position="relative !bottom-0 !left-0 rounded-md">
                  <Dropdown 
                    label="Group By" 
                    options={GROUP_OPTIONS}
                    selected={groupMode}
                    onSelect={(val) => setGroupMode(val as GroupMode)}
                    direction="up"
                  />
                  <div className="h-6 w-px bg-secondary-light dark:bg-secondary-dark/80"></div>
                  <Dropdown 
                    label="Sort By" 
                    options={SORT_OPTIONS}
                    selected={sortBy}
                    onSelect={(val) => setSortBy(val as SortBy)}
                    triggerIcon={<IconSort size={16} />}
                    direction="up"
                  />
              </Toolbar>
            </motion.div>

            {/* Bottom Right: View Controls */}
            <Toolbar position="bottom-6 right-6 pointer-events-auto rounded-md">
               <div className="flex items-center gap-1">
                  <MotionButton onClick={() => setGridSize(Math.max(2, gridSize - 1))} title="Decrease Grid Size" className="p-1.5"><IconMinus className="h-4 w-4"/></MotionButton>
                  <span className="w-6 text-center text-sm font-medium">{gridSize}</span>
                  <MotionButton onClick={() => setGridSize(Math.min(10, gridSize + 1))} title="Increase Grid Size" className="p-1.5"><IconPlus className="h-4 w-4"/></MotionButton>
              </div>
            </Toolbar>

            {/* Bottom Center: Selection Actions */}
            <AnimatePresence>
              {hasSelection && (
                <Toolbar position="bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto rounded-md">
                  <span className="text-sm font-medium px-2">{selectedCount} selected</span>
                  <div className="h-6 w-px bg-secondary-light dark:bg-secondary-dark/80"></div>
                  <MotionButton onClick={onDownload} disabled={!hasSelection} title="Download selection" className="p-1.5"><IconDownload className="h-5 w-5" /></MotionButton>
                  <MotionButton onClick={onClearSelection} title="Clear selection (Esc)" className="p-1.5"><IconX className="h-5 w-5" /></MotionButton>
                </Toolbar>
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
            {/* Preview UI */}
            <Toolbar position="top-6 right-6 pointer-events-auto rounded-md">
                <MotionButton onClick={onClosePreview} title="Close Preview (Esc or Space)" className="text-base font-semibold flex items-center gap-2 !p-2">
                    <IconX size={16} /> Close
                </MotionButton>
            </Toolbar>
            
            <Toolbar position="bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto rounded-md">
                <MotionButton active={zoomLevel === 'fit'} onClick={() => setZoomLevel('fit')} title="Fit to Screen"><span className="text-sm px-1">Fit</span></MotionButton>
                <MotionButton active={zoomLevel === '100%'} onClick={() => setZoomLevel('100%')} title="Zoom to 100%"><span className="text-sm px-1">100%</span></MotionButton>
                {selectedCount > 1 && (
                    <>
                        <div className="h-6 w-px bg-secondary-light dark:bg-secondary-dark/80"></div>
                        <MotionButton active={previewLayout === 'grid'} onClick={() => setPreviewLayout('grid')} title="Grid Layout"><IconGrid className="h-5 w-5"/></MotionButton>
                        <MotionButton active={previewLayout === 'row'} onClick={() => setPreviewLayout('row')} title="Row Layout (Horizontal)"><IconColumns className="h-5 w-5"/></MotionButton>
                        <MotionButton active={previewLayout === 'column'} onClick={() => setPreviewLayout('column')} title="Column Layout (Vertical)"><IconRows className="h-5 w-5"/></MotionButton>
                    </>
                )}
            </Toolbar>

            <Toolbar position="bottom-6 right-6 pointer-events-auto rounded-md">
                <span className="text-sm font-medium px-2">{selectedCount} selected</span>
                <div className="h-6 w-px bg-secondary-light dark:bg-secondary-dark/80"></div>
                <MotionButton onClick={onDownload} disabled={!hasSelection} title="Download selection" className="p-1.5"><IconDownload className="h-5 w-5" /></MotionButton>
            </Toolbar>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};