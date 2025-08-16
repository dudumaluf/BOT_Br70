import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface PostLoginSplashProps {
  onFinished: () => void;
}

export const PostLoginSplash: React.FC<PostLoginSplashProps> = ({ onFinished }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 2500); // 2.5 seconds

    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <motion.div
      className="fixed inset-0 bg-black flex items-center justify-center z-[100]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <video
        src="/logo-animation.mp4"
        autoPlay
        muted
        playsInline
        className="w-auto h-auto max-w-full max-h-full"
      />
    </motion.div>
  );
};
