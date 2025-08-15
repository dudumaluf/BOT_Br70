import React from 'react';
import { motion } from 'framer-motion';
import { IconUsers, IconMove, IconCheck, IconPersonStanding, IconStar } from './icons';

interface FilterSidebarProps {
  isOpen: boolean;
  actors: string[];
  movements: string[];
  performanceActors: string[];
  selectedActors: string[];
  setSelectedActors: (actors: string[]) => void;
  selectedMovements: string[];
  setSelectedMovements: (movements: string[]) => void;
  selectedPerformanceActors: string[];
  setSelectedPerformanceActors: (actors: string[]) => void;
  clearFilters: () => void;
  showFavoritesOnly: boolean;
  setShowFavoritesOnly: (show: boolean) => void;
}

const AnimatedCheckbox: React.FC<{ isChecked: boolean; onChange: () => void; label: string }> = ({ isChecked, onChange, label }) => {
  const checkVariants = {
    checked: { pathLength: 1, opacity: 1 },
    unchecked: { pathLength: 0, opacity: 0 },
  };

  return (
    <label className="flex items-center space-x-3 cursor-pointer group">
      <div className="relative flex items-center justify-center">
        <input type="checkbox" checked={isChecked} onChange={onChange} className="sr-only" />
        <motion.div
          animate={isChecked ? { backgroundColor: "#e0e0e0", borderColor: "#e0e0e0" } : { backgroundColor: "transparent", borderColor: "#2a2a2a" }}
          className="w-5 h-5 border-2 rounded-full dark:border-secondary-dark"
        >
         <div className="dark:hidden">
            <motion.div
                animate={isChecked ? { backgroundColor: "#121212", borderColor: "#121212" } : { backgroundColor: "transparent", borderColor: "#e0e0e0" }}
                transition={{ duration: 0.2 }}
                className="w-full h-full border-2 rounded-full border-secondary-light"
            >
                 <svg className="w-full h-full" viewBox="0 0 24 24">
                    <motion.path
                    d="M5 13l4 4L19 7"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    variants={checkVariants}
                    animate={isChecked ? 'checked' : 'unchecked'}
                    transition={{ duration: 0.2 }}
                    />
                </svg>
            </motion.div>
         </div>
         <div className="hidden dark:block">
            <motion.div
                animate={isChecked ? { backgroundColor: "#e0e0e0", borderColor: "#e0e0e0" } : { backgroundColor: "transparent", borderColor: "#2a2a2a" }}
                transition={{ duration: 0.2 }}
                className="w-full h-full border-2 rounded-full border-secondary-dark"
            >
                 <svg className="w-full h-full" viewBox="0 0 24 24">
                    <motion.path
                    d="M5 13l4 4L19 7"
                    fill="none"
                    stroke="black"
                    strokeWidth="3"
                    variants={checkVariants}
                    animate={isChecked ? 'checked' : 'unchecked'}
                    transition={{ duration: 0.2 }}
                    />
                </svg>
            </motion.div>
         </div>
        </motion.div>
      </div>
      <span className="text-text-light/80 dark:text-text-dark/70 group-hover:text-text-light dark:group-hover:text-text-dark transition-colors">{label}</span>
    </label>
  );
};

const FilterSection: React.FC<{ title: string; items: string[]; selectedItems: string[]; onSelect: (item: string) => void; children: React.ReactNode }> = ({ title, items, selectedItems, onSelect, children }) => (
  <div>
    <h3 className="flex items-center text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        {children}
        <span className="ml-2">{title}</span>
    </h3>
    <div className="space-y-3">
      {items.map(item => (
        <AnimatedCheckbox 
          key={item}
          label={item}
          isChecked={selectedItems.includes(item)}
          onChange={() => onSelect(item)}
        />
      ))}
    </div>
  </div>
);

export const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
    isOpen, 
    actors, movements, performanceActors,
    selectedActors, setSelectedActors, 
    selectedMovements, setSelectedMovements, 
    selectedPerformanceActors, setSelectedPerformanceActors, 
    clearFilters,
    showFavoritesOnly, setShowFavoritesOnly
}) => {
  
  const createSelectHandler = (
    selectedItems: string[],
    setSelectedItems: (items: string[]) => void
  ) => (item: string) => {
    const newSelection = selectedItems.includes(item)
      ? selectedItems.filter(i => i !== item)
      : [...selectedItems, item];
    setSelectedItems(newSelection);
  };

  return (
    <aside className={`bg-primary-light dark:bg-primary-dark transition-all duration-300 flex flex-col h-full border-r border-secondary-light dark:border-secondary-dark ${isOpen ? 'w-64' : 'w-0'}`}>
        <div className={`overflow-hidden flex flex-col h-full ${!isOpen ? 'invisible' : ''}`}>
            <div className="p-4 flex justify-between items-center border-b border-secondary-light dark:border-secondary-dark flex-shrink-0">
              <h2 className="text-lg font-bold">Filters</h2>
              <motion.button 
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)} 
                className={`p-1.5 transition-colors ${showFavoritesOnly ? 'text-yellow-400' : 'text-text-light/50 dark:text-text-dark/50 hover:text-yellow-400'}`}
                whileTap={{ scale: 0.9 }}
                title={showFavoritesOnly ? "Show All" : "Show Favorites Only"}
              >
                <IconStar size={20} fill={showFavoritesOnly ? 'currentColor' : 'none'} />
              </motion.button>
            </div>

            <div className="p-4 flex-grow overflow-y-auto">
                <div className="space-y-6">
                    <FilterSection title="Performance Actors" items={performanceActors} selectedItems={selectedPerformanceActors} onSelect={createSelectHandler(selectedPerformanceActors, setSelectedPerformanceActors)}>
                        <IconPersonStanding className="h-4 w-4"/>
                    </FilterSection>
                    <FilterSection title="Actors" items={actors} selectedItems={selectedActors} onSelect={createSelectHandler(selectedActors, setSelectedActors)}>
                        <IconUsers className="h-4 w-4"/>
                    </FilterSection>
                    <FilterSection title="Movements" items={movements} selectedItems={selectedMovements} onSelect={createSelectHandler(selectedMovements, setSelectedMovements)}>
                        <IconMove className="h-4 w-4"/>
                    </FilterSection>
                </div>
            </div>

            <div className="p-4 border-t border-secondary-light dark:border-secondary-dark flex-shrink-0">
                <button onClick={clearFilters} className="w-full text-center py-2 text-sm text-text-light/70 dark:text-text-dark/70 hover:bg-secondary-light dark:hover:bg-secondary-dark hover:text-text-light dark:hover:text-text-dark transition-colors">Clear All Filters</button>
            </div>
        </div>
    </aside>
  );
};