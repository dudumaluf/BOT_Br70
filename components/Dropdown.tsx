import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconCheck } from './icons';

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface DropdownProps {
  label: string;
  options: DropdownOption[];
  selected: string;
  onSelect: (value: string) => void;
  triggerIcon?: React.ReactNode;
  direction?: 'up' | 'down';
}

export const Dropdown: React.FC<DropdownProps> = ({ label, options, selected, onSelect, triggerIcon, direction = 'down' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => opt.value === selected);

  const menuVariants = {
    open: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 20 }
    },
    closed: { 
      opacity: 0, 
      y: direction === 'up' ? 5 : -5,
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  };

  return (
    <div className="relative" onMouseLeave={() => setIsOpen(false)}>
      <button 
        onMouseEnter={() => setIsOpen(true)}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 text-sm text-text-light/80 dark:text-text-dark/80 hover:text-text-light dark:hover:text-text-dark hover:bg-secondary-light/50 dark:hover:bg-secondary-dark/50"
      >
        {triggerIcon || selectedOption?.icon}
        <span className="font-medium">{selectedOption?.label || label}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={menuVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className={`absolute left-0 w-40 bg-primary-light dark:bg-primary-dark border border-secondary-light dark:border-secondary-dark z-[60] ${direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'}`}
          >
            {options.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onSelect(option.value);
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-text-light dark:text-text-dark hover:bg-secondary-light dark:hover:bg-secondary-dark"
              >
                {option.icon}
                <span className="flex-grow">{option.label}</span>
                {selected === option.value && <IconCheck size={16} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
