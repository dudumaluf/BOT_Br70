import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Theme, CategoryType, Category } from '../types';
import { IconX, IconSettings, IconPalette, IconUsers, IconMove, IconPersonStanding, IconEdit, IconTrash, IconListPlus } from './icons';

interface SettingsModalProps {
  settings: Settings;
  updateSettings: (newSettings: Settings) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  categories: Category[];
  addCategoryItem: (category: CategoryType, name: string) => void;
  renameCategoryItem: (category: Category, newName: string) => void;
  onDeleteCategory: (category: CategoryType, name: string) => void;
  onClose: () => void;
}

const Toggle: React.FC<{ label: string; enabled: boolean; onChange: (enabled: boolean) => void }> = ({ label, enabled, onChange }) => {
    const spring = { type: "spring" as const, stiffness: 700, damping: 30 };
    return (
        <label className="flex items-center justify-between cursor-pointer py-2">
            <span className="text-text-light dark:text-text-dark">{label}</span>
            <div className={`flex items-center w-12 h-7 p-1 rounded-full ${enabled ? 'bg-text-light dark:bg-text-dark justify-end' : 'bg-secondary-light dark:bg-secondary-dark justify-start'}`} onClick={() => onChange(!enabled)}>
                <motion.div className={`w-5 h-5 rounded-full ${enabled ? 'bg-b-light dark:bg-b-dark' : 'bg-text-light dark:bg-text-dark'}`} layout transition={spring} />
            </div>
        </label>
    );
};

const ThemeSelector: React.FC<{ theme: Theme; setTheme: (theme: Theme) => void }> = ({ theme, setTheme }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-text-light dark:text-text-dark">Theme</span>
    <div className="flex items-center gap-2 p-1 bg-secondary-light dark:bg-secondary-dark">
      <button onClick={() => setTheme('light')} className={`px-3 py-1 text-sm ${theme === 'light' ? 'bg-primary-light text-text-light' : 'text-text-dark hover:bg-primary-dark'}`}>Light</button>
      <button onClick={() => setTheme('dark')} className={`px-3 py-1 text-sm ${theme === 'dark' ? 'bg-primary-dark text-text-dark' : 'text-text-light hover:bg-secondary-light'}`}>Dark</button>
    </div>
  </div>
);

const ManagementList: React.FC<{
  categoryType: CategoryType;
  items: Category[];
  addCategoryItem: (category: CategoryType, name: string) => void;
  renameCategoryItem: (category: Category, newName: string) => void;
  deleteCategoryItem: (category: CategoryType, name: string) => void;
}> = ({ categoryType, items, addCategoryItem, renameCategoryItem, deleteCategoryItem }) => {
  const [newItemName, setNewItemName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      addCategoryItem(categoryType, newItemName.trim());
      setNewItemName('');
    }
  };

  const handleRename = (item: Category) => {
    const newName = prompt(`Rename "${item.name}" to:`, item.name);
    if (newName && newName.trim() && newName !== item.name) {
      renameCategoryItem(item, newName.trim());
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input 
          type="text" 
          value={newItemName} 
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder={`New ${categoryType.slice(0, -1)} name...`}
          className="flex-grow p-2 bg-secondary-light dark:bg-secondary-dark border border-secondary-light dark:border-secondary-dark focus:ring-text-light dark:focus:ring-text-dark focus:outline-none"
        />
        <button type="submit" className="p-2 bg-text-light dark:bg-text-dark text-b-light dark:text-b-dark hover:bg-opacity-90 flex items-center gap-1"><IconListPlus size={16}/> Add</button>
      </form>
      <div className="max-h-60 overflow-y-auto space-y-1 pr-2">
        {items.map(item => (
          <div key={item.id} className="flex justify-between items-center p-2 bg-secondary-light dark:bg-secondary-dark group">
            <span className="text-text-light dark:text-text-dark">{item.name}</span>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleRename(item)} title="Rename"><IconEdit size={16} className="text-gray-500 hover:text-text-light dark:hover:text-text-dark"/></button>
              <button onClick={() => deleteCategoryItem(categoryType, item.name)} title={'Delete'}>
                <IconTrash size={16} className={`text-gray-500 hover:text-red-500`} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    settings, updateSettings, theme, setTheme,
    categories, addCategoryItem, renameCategoryItem, 
    onDeleteCategory,
    onClose 
}) => {
  const [activeTab, setActiveTab] = useState('preferences');

  const tabs = [
    { id: 'preferences', label: 'Preferences', icon: IconPalette },
    { id: 'actors', label: 'Actors', icon: IconUsers },
    { id: 'movements', label: 'Movements', icon: IconMove },
    { id: 'performanceActors', label: 'Perf. Actors', icon: IconPersonStanding },
  ];

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  };

  return (
    <motion.div className="fixed inset-0 bg-b-dark/80 backdrop-blur-sm z-50 flex items-center justify-center" onClick={onClose} initial="hidden" animate="visible" exit="exit" variants={{visible: {opacity: 1}, hidden: {opacity: 0}}}>
      <motion.div className="w-full max-w-2xl bg-primary-light dark:bg-primary-dark border border-secondary-light dark:border-secondary-dark flex flex-col h-[70vh]" onClick={(e) => e.stopPropagation()} variants={modalVariants}>
        <div className="flex justify-between items-center p-4 border-b border-secondary-light dark:border-secondary-dark flex-shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2"><IconSettings/> Management Hub</h2>
          <motion.button onClick={onClose} className="p-1 hover:bg-secondary-light dark:hover:bg-secondary-dark" title="Close (Esc)" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1, rotate: 90 }}><IconX /></motion.button>
        </div>
        
        <div className="flex flex-grow overflow-hidden">
          <aside className="w-48 border-r border-secondary-light dark:border-secondary-dark p-2 flex-shrink-0">
            <nav className="flex flex-col gap-1">
              {tabs.map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 w-full text-left p-2 text-sm transition-colors ${activeTab === tab.id ? 'bg-text-light dark:bg-text-dark text-b-light dark:text-b-dark' : 'hover:bg-secondary-light dark:hover:bg-secondary-dark'}`}
                >
                  <tab.icon size={16}/> {tab.label}
                </button>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-6 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {activeTab === 'preferences' && (
                  <div className="space-y-4 divide-y divide-secondary-light dark:divide-secondary-dark">
                    <ThemeSelector theme={theme} setTheme={setTheme} />
                    <Toggle label="Autoplay on Hover" enabled={settings.autoplayOnHover} onChange={(enabled) => updateSettings({ ...settings, autoplayOnHover: enabled })} />
                  </div>
                )}
                {activeTab === 'actors' && <ManagementList categoryType="actors" items={categories.filter(c=>c.type === 'actors')} addCategoryItem={addCategoryItem} renameCategoryItem={renameCategoryItem} deleteCategoryItem={onDeleteCategory} />}
                {activeTab === 'movements' && <ManagementList categoryType="movements" items={categories.filter(c=>c.type === 'movements')} addCategoryItem={addCategoryItem} renameCategoryItem={renameCategoryItem} deleteCategoryItem={onDeleteCategory} />}
                {activeTab === 'performanceActors' && <ManagementList categoryType="performanceActors" items={categories.filter(c=>c.type === 'performanceActors')} addCategoryItem={addCategoryItem} renameCategoryItem={renameCategoryItem} deleteCategoryItem={onDeleteCategory} />}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

      </motion.div>
    </motion.div>
  );
};