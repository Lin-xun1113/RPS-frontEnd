import { useState, useEffect } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { readContract, writeContract, getContract } from 'wagmi/actions';
import { parseEther, formatEther, keccak256, toHex, getRandomBytes, encodePacked } from 'viem';
import { ROCK_PAPER_SCISSORS_ADDRESS, ABI, GAME_STATES } from '../constants/contractInfo';

/**
 * 自定义钩子用于处理石头剪刀布游戏逻辑
 */
export default function useRPSGame(gameId) {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('waiting');
  const [roundsWon, setRoundsWon] = useState({ player1: 0, player2: 0 });
  const [currentRound, setCurrentRound] = useState(1);
  
  // 创建合约实例 - Wagmi v1 方式
  // 注意：在v1中，不再使用useContract钩子，而是使用getContract action
  const contract = walletClient ? getContract({
    address: ROCK_PAPER_SCISSORS_ADDRESS,
    abi: ABI,
    walletClient,
    publicClient,
  }) : null;
  
  // 加载游戏数据
  const fetchGameDetails = async () => {
    if (!gameId || !contract) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 在实际应用中，这里应从合约获取游戏状态
      // 例如：const gameInfo = await contract.games(gameId);
      // 这里用模拟数据演示
      const mockGame = {
        // 模拟游戏数据结构
        id: gameId,
        creator: '0xA795CEDd3962232e5A58EcB59BBb85ACa7f24781',
        player2: '0xB895CEDd3962232e5A58EcB59BBb85ACa7f24782',
        betAmount: parseEther('0.1'),
        totalTurns: 3,
        currentTurn: 1,
        gameType: 'MAG',
        state: 5, // CommitPhase
        timeoutInterval: 300, // 5分钟
        commitDeadline: Math.floor(Date.now() / 1000) + 300,
        moves: {
          player1: { committed: false, revealed: false, move: 0 },
          player2: { committed: false, revealed: false, move: 0 }
        }
      };
      
      setGame(mockGame);
      updateGamePhase(mockGame);
      setLoading(false);
    } catch (err) {
      console.error('获取游戏详情失败:', err);
      setError('获取游戏详情失败，请重试');
      setLoading(false);
    }
  };
  
  // 更新游戏阶段
  const updateGamePhase = (gameData) => {
    if (!gameData) return;
    
    if (gameData.state === 5) { // CommitPhase
      if (!gameData.moves.player1.committed || 
          !gameData.moves.player2.committed) {
        setPhase('commit');
      } else {
        setPhase('waiting');
      }
    } else if (gameData.state === 1) { // Committed
      setPhase('reveal');
    } else if (gameData.state === 2) { // Revealed
      setPhase('results');
    } else if (gameData.state === 3) { // Finished
      setPhase('finished');
    }
    
    setCurrentRound(gameData.currentTurn);
  };
  
  // 提交移动
  const commitMove = async (selectedMove, address) => {
    if (!selectedMove || !gameId || !contract || !address) {
      setError('提交移动失败：缺少必要参数');
      return false;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 生成随机盐值
      const saltBytes = getRandomBytes(32);
      const salt = toHex(saltBytes);
      
      // 生成提交哈希
      const moveHash = keccak256(
        encodePacked(['uint8', 'bytes32', 'address'], [selectedMove, salt, address])
      );
      
      // 保存盐值到本地存储
      localStorage.setItem(`salt_${gameId}_${address}`, salt);
      
      // 调用合约提交移动
      // 实际应用中使用：
      // const tx = await contract.commitMove(gameId, moveHash);
      // await tx.wait();
      
      // 模拟成功提交
      setTimeout(() => {
        const updatedGame = { ...game };
        const isPlayer1 = address === game.creator;
        
        if (isPlayer1) {
          updatedGame.moves.player1.committed = true;
        } else {
          updatedGame.moves.player2.committed = true;
        }
        
        setGame(updatedGame);
        updateGamePhase(updatedGame);
        setLoading(false);
      }, 1000);
      
      return true;
    } catch (err) {
      console.error('提交移动失败:', err);
      setError('提交移动失败，请重试');
      setLoading(false);
      return false;
    }
  };
  
  // 揭示移动
  const revealMove = async (selectedMove, address) => {
    if (!selectedMove || !gameId || !contract || !address) {
      setError('揭示移动失败：缺少必要参数');
      return false;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 从本地存储获取盐值
      const salt = localStorage.getItem(`salt_${gameId}_${address}`);
      
      if (!salt) {
        setError('无法找到盐值，无法揭示移动');
        setLoading(false);
        return false;
      }
      
      // 调用合约揭示移动
      // 实际应用中使用：
      // const tx = await contract.revealMove(gameId, selectedMove, salt);
      // await tx.wait();
      
      // 模拟成功揭示
      setTimeout(() => {
        const updatedGame = { ...game };
        const isPlayer1 = address === game.creator;
        
        if (isPlayer1) {
          updatedGame.moves.player1.revealed = true;
          updatedGame.moves.player1.move = selectedMove;
        } else {
          updatedGame.moves.player2.revealed = true;
          updatedGame.moves.player2.move = selectedMove;
        }
        
        // 如果双方都已揭示，更新游戏状态
        if (updatedGame.moves.player1.revealed && updatedGame.moves.player2.revealed) {
          updatedGame.state = 2; // Revealed
          
          // 确定回合获胜者并更新比分
          // 实际应用中这个逻辑应该在合约中处理
          updateRoundResult(updatedGame);
        }
        
        setGame(updatedGame);
        updateGamePhase(updatedGame);
        setLoading(false);
      }, 1000);
      
      return true;
    } catch (err) {
      console.error('揭示移动失败:', err);
      setError('揭示移动失败，请重试');
      setLoading(false);
      return false;
    }
  };
  
  // 处理超时揭示
  const handleTimeoutReveal = async () => {
    if (!gameId || !contract) {
      setError('超时处理失败：缺少必要参数');
      return false;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 调用合约超时揭示
      // 实际应用中使用：
      // const tx = await contract.timeoutReveal(gameId);
      // await tx.wait();
      
      // 模拟成功处理超时
      setTimeout(() => {
        fetchGameDetails();
      }, 1000);
      
      return true;
    } catch (err) {
      console.error('超时处理失败:', err);
      setError('超时处理失败，请重试');
      setLoading(false);
      return false;
    }
  };
  
  // 提取奖励
  const withdrawPrize = async () => {
    if (!contract) {
      setError('提取奖励失败：合约未初始化');
      return false;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 调用合约提取奖励
      // 实际应用中使用：
      // const tx = await contract.withdrawPrize();
      // await tx.wait();
      
      // 模拟成功提取
      setTimeout(() => {
        setLoading(false);
      }, 1000);
      
      return true;
    } catch (err) {
      console.error('提取奖励失败:', err);
      setError('提取奖励失败，请重试');
      setLoading(false);
      return false;
    }
  };
  
  // 更新回合结果
  const updateRoundResult = (gameData) => {
    if (!gameData) return;
    
    const player1Move = gameData.moves.player1.move;
    const player2Move = gameData.moves.player2.move;
    
    // 石头=1, 剪刀=2, 布=3
    // 石头胜剪刀, 剪刀胜布, 布胜石头
    if (player1Move === player2Move) {
      // 平局，不加分
    } else if (
      (player1Move === 1 && player2Move === 2) || // 石头胜剪刀
      (player1Move === 2 && player2Move === 3) || // 剪刀胜布
      (player1Move === 3 && player2Move === 1)    // 布胜石头
    ) {
      setRoundsWon(prev => ({ ...prev, player1: prev.player1 + 1 }));
    } else {
      setRoundsWon(prev => ({ ...prev, player2: prev.player2 + 1 }));
    }
    
    // 检查游戏是否结束
    const requiredWins = Math.ceil(gameData.totalTurns / 2);
    if (roundsWon.player1 >= requiredWins || roundsWon.player2 >= requiredWins) {
      gameData.state = 3; // Finished
    } else {
      // 准备下一回合
      gameData.currentTurn += 1;
      gameData.moves = {
        player1: { committed: false, revealed: false, move: 0 },
        player2: { committed: false, revealed: false, move: 0 }
      };
      gameData.state = 5; // CommitPhase
    }
  };
  
  // 初始化时加载游戏数据
  useEffect(() => {
    if (gameId && contract) {
      fetchGameDetails();
    }
  }, [gameId, contract]);
  
  return {
    game,
    loading,
    error,
    phase,
    currentRound,
    roundsWon,
    fetchGameDetails,
    commitMove,
    revealMove,
    handleTimeoutReveal,
    withdrawPrize
  };
}
