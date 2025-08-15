import React from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onFinished: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinished }) => {
  return (
    <motion.div
      className="fixed inset-0 bg-b-dark flex items-center justify-center z-[100]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 1, delay: 2.5 }}
      onAnimationComplete={onFinished}
    >
      <motion.img
        src="/logo.png"
        alt="BOT Logo"
        className="w-32 h-32"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 0.9] }}
        transition={{ duration: 3.0, times: [0, 0.33, 0.83, 1] }}
      />
    </motion.div>
  );
};