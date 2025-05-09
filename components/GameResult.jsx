import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { MOVES } from '../constants/contractInfo';

/**
 * 游戏结果组件 - 显示回合或游戏结果
 */
const GameResult = ({ player1Move, player2Move, winner, isRoundResult = true }) => {
  const getResultText = () => {
    if (!winner) {
      return '平局!';
    }
    
    return isRoundResult 
      ? `${winner === 'player1' ? '玩家1' : '玩家2'} 获胜本回合!` 
      : `${winner === 'player1' ? '玩家1' : '玩家2'} 获得最终胜利!`;
  };
  
  const getTextColor = () => {
    if (!winner) return 'text-blue-300';
    return winner === 'player1' ? 'text-cyan-400' : 'text-indigo-400';
  };
  
  return (
    <div className="text-center">
      <h3 className="text-xl font-medieval text-blue-300 mb-6 text-shadow">
        {isRoundResult ? '回合结果' : '游戏结束!'}
      </h3>
      
      {/* <div className="flex justify-center items-center gap-10 mb-8">
        <div className="text-center">
          <p className="text-blue-300 mb-2 font-medieval">玩家 1</p>
          <div className="w-20 h-20 rounded-full p-2 bg-blue-900/70 border-2 border-blue-400 mx-auto shadow-[0_0_10px_rgba(59,130,246,0.5)]">
            <div className="w-full h-full relative">
              <Image 
                src={MOVES[player1Move]?.icon || '/images/none.png'} 
                fill 
                style={{objectFit: 'contain'}} 
                alt={MOVES[player1Move]?.name || '无'} 
              />
            </div>
          </div>
        </div>
        
        <div className="text-3xl font-medieval text-blue-400 text-shadow glow-blue">VS</div>
        
        <div className="text-center">
          <p className="text-blue-300 mb-2 font-medieval">玩家 2</p>
          <div className="w-20 h-20 rounded-full p-2 bg-blue-900/70 border-2 border-blue-400 mx-auto shadow-[0_0_10px_rgba(59,130,246,0.5)]">
            <div className="w-full h-full relative">
              <Image 
                src={MOVES[player2Move]?.icon || '/images/none.png'} 
                fill 
                style={{objectFit: 'contain'}} 
                alt={MOVES[player2Move]?.name || '无'} 
              />
            </div>
          </div>
        </div>
      </div> */}
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`py-3 px-6 rounded-lg ${
          !winner ? 'bg-blue-900/40 border border-blue-500/40' : 
          (winner === 'player1' ? 'bg-cyan-900/40 border border-cyan-500/40' : 'bg-indigo-900/40 border border-indigo-500/40')
        } shadow-[0_0_15px_rgba(59,130,246,0.3)] max-w-xs mx-auto`}
      >
        <p className={`text-xl font-medieval ${getTextColor()} text-shadow`}>
          {getResultText()}
        </p>
      </motion.div>
    </div>
  );
};

export default GameResult;
