import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconTrash } from './icons';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-b-dark/80 backdrop-blur-sm z-[200] flex items-center justify-center"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-md p-6 bg-primary-light dark:bg-primary-dark border border-secondary-dark flex flex-col"
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{title}</h2>
              <motion.button onClick={onClose} className="p-1 hover:bg-secondary-light dark:hover:bg-secondary-dark" whileTap={{ scale: 0.9 }}>
                <IconX />
              </motion.button>
            </div>
            <p className="text-text-light/80 dark:text-text-dark/80 mb-6">{message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="py-2 px-4 text-sm font-medium hover:bg-secondary-light dark:hover:bg-secondary-dark transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="py-2 px-4 text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <IconTrash size={16} />
                Confirm
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};