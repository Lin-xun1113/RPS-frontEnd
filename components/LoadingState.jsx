import React from 'react';
import { motion } from 'framer-motion';

/**
 * u52a0u8f7du72b6u6001u7ec4u4ef6 - u663eu793au53e4u8001u98ceu683cu7684u52a0u8f7du52a8u753b
 */
const LoadingState = ({ text = 'u6b63u5728u52a0u8f7d...', size = 'md' }) => {
  const spinnerSize = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];
  
  const textSize = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  }[size];
  
  return (
    <div className="text-center py-8">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
        className={`${spinnerSize} border-4 border-amber-800 border-t-transparent rounded-full mx-auto`}
      />
      <p className={`mt-4 text-amber-800 font-medieval ${textSize}`}>{text}</p>
    </div>
  );
};

export default LoadingState;
