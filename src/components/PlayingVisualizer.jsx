import React from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

const PlayingVisualizer = ({ className }) => {
  return (
    <div className={cn("flex items-end gap-[2px] h-4", className)}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-[3px] bg-primary rounded-full origin-bottom"
          animate={{
            height: ["20%", "100%", "40%", "80%", "20%"],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default PlayingVisualizer;
