import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MOVES } from '../constants/contractInfo';

/**
 * u79fbu52a8u9009u62e9u5668u7ec4u4ef6 - u5141u8bb8u73a9u5bb6u9009u62e9u77f3u5934u3001u526au5200u6216u5e03
 */
const MoveSelector = ({ selectedMove, onSelectMove, disabled = false }) => {
  return (
    <div className="flex justify-center gap-6 sm:gap-8 mb-8">
      {Object.entries(MOVES).slice(1).map(([moveId, moveInfo]) => (
        <motion.button
          key={moveId}
          whileHover={{ scale: disabled ? 1 : 1.1 }}
          whileTap={{ scale: disabled ? 1 : 0.9 }}
          onClick={() => !disabled && onSelectMove(Number(moveId))}
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full p-2 transition-all ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'} ${
            selectedMove === Number(moveId) 
              ? 'bg-amber-700 border-4 border-amber-300 shadow-lg' 
              : 'bg-amber-100 border-2 border-amber-400 hover:bg-amber-200'
          }`}
        >
          <div className="w-full h-full relative">
            <Image 
              src={moveInfo.icon} 
              fill 
              style={{objectFit: 'contain'}} 
              alt={moveInfo.name} 
            />
          </div>
        </motion.button>
      ))}
    </div>
  );
};

export default MoveSelector;
