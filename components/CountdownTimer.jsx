import React, { useState, useEffect } from 'react';
import { useProvider } from 'wagmi';

/**
 * 倒计时组件 - 显示游戏中的倒计时，使用链上时间而非本地时间
 */
const CountdownTimer = ({ deadline, onTimeout, isPaused = false }) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [blockchainTime, setBlockchainTime] = useState(0);
  const provider = useProvider();
  
  // 获取最新区块时间
  useEffect(() => {
    if (!provider || isPaused) return;
    
    const fetchBlockchainTime = async () => {
      try {
        const block = await provider.getBlock('latest');
        if (block && block.timestamp) {
          setBlockchainTime(block.timestamp);
        }
      } catch (error) {
        console.error('获取区块时间失败:', error);
      }
    };
    
    // 立即获取一次时间
    fetchBlockchainTime();
    
    // 每30秒更新一次区块链时间
    const blockTimeInterval = setInterval(fetchBlockchainTime, 30000);
    
    return () => {
      clearInterval(blockTimeInterval);
    };
  }, [provider, isPaused]);
  
  // 使用区块链时间计算倒计时
  useEffect(() => {
    if (!deadline || !blockchainTime) return;
    
    // 初始化倒计时
    const updateTimeLeft = () => {
      // 使用区块链时间作为基准时间
      const now = blockchainTime + Math.floor((Date.now() / 1000) - blockchainTime);
      const remaining = deadline - now;
      
      if (remaining <= 0) {
        setTimeLeft(0);
        if (onTimeout) onTimeout();
        return;
      }
      
      setTimeLeft(remaining);
    };
    
    // 立即更新一次
    updateTimeLeft();
    
    // 如果没有暂停，设置定期更新
    let interval;
    if (!isPaused) {
      interval = setInterval(updateTimeLeft, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [deadline, blockchainTime, onTimeout, isPaused]);
  
  // 格式化时间
  const formatTime = (seconds) => {
    if (seconds <= 0) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // 计算倒计时百分比
  const getPercentage = () => {
    if (!deadline) return 0;
    
    // 假设总时间为5分钟
    const totalTime = 300;
    const percentage = (timeLeft / totalTime) * 100;
    return Math.max(0, Math.min(100, percentage));
  };
  
  // 根据剩余时间计算颜色
  const getColor = () => {
    const percentage = getPercentage();
    
    if (percentage > 60) return 'text-green-600 border-green-600';
    if (percentage > 30) return 'text-yellow-500 border-yellow-500';
    return 'text-red-600 border-red-600';
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className={`text-2xl font-medieval ${getColor()} border-2 rounded-full py-2 px-6`}>
        {formatTime(timeLeft)}
      </div>
      
      {timeLeft <= 0 && (
        <p className="mt-2 text-red-600 font-medieval">已超时!</p>
      )}
    </div>
  );
};

export default CountdownTimer;
