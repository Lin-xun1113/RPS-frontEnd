import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { shortenAddress } from '../utils/addressUtils';
import { GAME_STATES } from '../constants/contractInfo';

/**
 * 游戏卡片组件 - 在游戏列表中显示单个游戏
 */
const GameCard = ({ game }) => {
  const { address } = useAccount();
  
  // 获取游戏状态的显示文本和颜色
  const getStatusInfo = () => {
    const statusKey = Object.keys(GAME_STATES).find(
      key => GAME_STATES[key] === game.state
    );
    
    const statusMap = {
      Creating: { text: '创建中', color: 'text-yellow-600' },
      Cancelled: { text: '已取消', color: 'text-red-600' },
      Committed: { text: '已提交', color: 'text-blue-600' },
      Revealed: { text: '已揭示', color: 'text-purple-600' },
      Finished: { text: '已完成', color: 'text-green-600' },
      CommitPhase: { text: '提交阶段', color: 'text-amber-600' },
      RevealPhase: { text: '揭示阶段', color: 'text-indigo-600' },
      Timeout: { text: '已超时', color: 'text-red-600' },
    };
    
    return statusMap[statusKey] || { text: '未知状态', color: 'text-gray-600' };
  };
  
  // 根据游戏状态确定用户是否可以加入游戏
  const canJoin = () => {
    if (!address) return false;
    
    // 获取游戏状态码
    const stateValue = parseInt(Object.keys(GAME_STATES).find(
      key => GAME_STATES[key] === game.state
    ) || 0);
    
    // 如果游戏状态为创建中(0)，且当前用户不是创建者，则可以加入
    return (
      stateValue === 0 && // Created状态
      game.creator.toLowerCase() !== address.toLowerCase() &&
      // 确保没有玩家2，或者玩家2是当前用户
      (!game.player2 || game.player2.toLowerCase() === address.toLowerCase())
    );
  };
  
  // 根据游戏状态确定用户是否可以查看游戏
  const canView = () => {
    if (!address) return false;
    
    // 如果用户是游戏的创建者或玩家2，则可以查看
    return (
      game.creator.toLowerCase() === address.toLowerCase() ||
      (game.player2 && game.player2.toLowerCase() === address.toLowerCase())
    );
  };
  
  const statusInfo = getStatusInfo();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-amber-50 border border-amber-200 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-medieval text-amber-900">
          游戏 #{game.id}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.color} bg-opacity-20 border border-current`}>
          {statusInfo.text}
        </span>
      </div>
      
      <div className="space-y-2 mb-4">
        <p className="text-sm text-amber-800">
          <span className="font-semibold">创建者: </span>
          {shortenAddress(game.creator)}
        </p>
        
        {game.player2 && (
          <p className="text-sm text-amber-800">
            <span className="font-semibold">对手: </span>
            {shortenAddress(game.player2)}
          </p>
        )}
        
        <p className="text-sm text-amber-800">
          <span className="font-semibold">赌注: </span>
          {game.gameType === 'token' ? '代币游戏' : `${formatEther(BigInt(game.betAmount))} MAG`}
        </p>
        
        <p className="text-sm text-amber-800">
          <span className="font-semibold">回合数: </span>
          {game.totalTurns}
        </p>
      </div>
      
      <div className="flex justify-end space-x-3">
        {canJoin() && (
          <Link href={`/game/${game.id}`}>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="py-1 px-3 bg-gradient-to-r from-amber-600 to-amber-800 text-white text-sm rounded shadow hover:shadow-amber-700/50 transition-all"
            >
              加入游戏
            </motion.a>
          </Link>
        )}
        
        {canView() && (
          <Link href={`/game/${game.id}`}>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="py-1 px-3 bg-gradient-to-r from-amber-700 to-amber-900 text-white text-sm rounded shadow hover:shadow-amber-800/50 transition-all"
            >
              查看游戏
            </motion.a>
          </Link>
        )}
      </div>
    </motion.div>
  );
};

export default GameCard;
