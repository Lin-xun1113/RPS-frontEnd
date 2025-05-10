import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { toast, Toaster } from 'react-hot-toast';
import { useAccount, useBalance, useWalletClient, usePublicClient } from 'wagmi';
import { readContract, writeContract, getContract } from 'wagmi/actions';
import { ethers } from 'ethers';
import { formatEther, parseEther } from 'viem';
import Layout from '../components/Layout';
import Image from 'next/image';
import { ROCK_PAPER_SCISSORS_ADDRESS, ABI, WINNING_TOKEN_ADDRESS, TOKEN_ABI } from '../constants/contractInfo';

export default function CreateGame() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { data: balance } = useBalance({ address });
  
  const [gameType, setGameType] = useState('MAG'); // 'MAG' or 'token'
  const [totalTurns, setTotalTurns] = useState(3);
  const [timeoutInterval, setTimeoutInterval] = useState(300); // 5分钟（秒）
  const [timeoutCommit, setTimeoutCommit] = useState(300); // 5分钟（秒）提交超时
  const [betAmount, setBetAmount] = useState('0.1');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  
  // Wagmi v1 方式创建合约实例
  const contract = walletClient ? getContract({
    address: ROCK_PAPER_SCISSORS_ADDRESS,
    abi: ABI,
    walletClient,
    publicClient,
  }) : null;
  
  // 代币合约
  const tokenContract = walletClient ? getContract({
    address: WINNING_TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    walletClient,
    publicClient,
  }) : null;
  
  const handleCreateGame = async () => {
    if (!isConnected || !contract) {
      toast.error('请先连接钱包');
      setError('请先连接钱包');
      return;
    }
    
    // 验证总回合数必须是奇数
    if (totalTurns % 2 === 0) {
      toast.error('总回合数必须是奇数');
      setError('总回合数必须是奇数');
      return;
    }
    
    // 验证总回合数范围
    if (totalTurns < 1 || totalTurns > 21) {
      toast.error('总回合数必须在 1-21 之间');
      setError('总回合数必须在 1-21 之间');
      return;
    }
    
    // 已在上面验证过总回合数是否为奇数
    
    if (timeoutInterval < 300) {
      toast.error('揭示超时时间至少需要5分钟（300秒）');
      setError('揭示超时时间至少需要5分钟（300秒）');
      return;
    }

    if (timeoutCommit < 300) {
      toast.error('提交超时时间至少需要5分钟（300秒）');
      setError('提交超时时间至少需要5分钟（300秒）');
      return;
    }    
    
    try {
      setIsCreating(true);
      setError('');
      
      let tx;
      let gameId;
      
      if (gameType === 'MAG') {
        // 检查ETH余额
        if (balance && parseEther(betAmount) > balance.value) {
          toast.error('MAG余额不足');
          setError('MAG余额不足');
          setIsCreating(false);
          return;
        }
        
        // 创建ETH游戏 - 使用 Wagmi v1 的 writeContract API
        toast.loading('正在创建MAG游戏...', { id: 'createGame' });
        
        // 使用 writeContract 实现 createGameWithEth 调用
        const { hash } = await writeContract({
          address: ROCK_PAPER_SCISSORS_ADDRESS,
          abi: [{
            name: 'createGameWithEth',
            type: 'function',
            stateMutability: 'payable',
            inputs: [
              { name: '_totalTurns', type: 'uint256' },
              { name: '_timeoutInterval', type: 'uint256' },
              { name: '_timeoutCommit', type: 'uint256' }
            ],
            outputs: [{ type: 'uint256' }]
          }],
          functionName: 'createGameWithEth',
          args: [totalTurns, timeoutInterval, timeoutCommit],
          value: parseEther(betAmount)
        });
        
        // 等待交易确认
        tx = await publicClient.waitForTransactionReceipt({ hash });
      } else {
        // 代币游戏
        // 检查代币余额和授权
        try {
          // 使用 readContract 获取代币余额
          const tokenBalance = await readContract({
            address: WINNING_TOKEN_ADDRESS,
            abi: [{
              name: 'balanceOf',
              type: 'function',
              stateMutability: 'view',
              inputs: [{ name: 'account', type: 'address' }],
              outputs: [{ type: 'uint256' }]
            }],
            functionName: 'balanceOf',
            args: [address]
          });
          
          if (ethers.BigNumber.from(tokenBalance).lt(1)) {
            toast.error('代币余额不足');
            setError('代币余额不足');
            setIsCreating(false);
            return;
          }
          
          // 使用 readContract 查询代币授权
          const allowance = await readContract({
            address: WINNING_TOKEN_ADDRESS,
            abi: [{
              name: 'allowance',
              type: 'function',
              stateMutability: 'view',
              inputs: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' }
              ],
              outputs: [{ type: 'uint256' }]
            }],
            functionName: 'allowance',
            args: [address, ROCK_PAPER_SCISSORS_ADDRESS]
          });
          
          if (ethers.BigNumber.from(allowance).lt(1)) {
            toast.loading('正在授权代币使用权限...', { id: 'approveToken' });
            
            // 使用 writeContract 进行代币授权
            const { hash: approveHash } = await writeContract({
              address: WINNING_TOKEN_ADDRESS,
              abi: [{
                name: 'approve',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [
                  { name: 'spender', type: 'address' },
                  { name: 'amount', type: 'uint256' }
                ],
                outputs: [{ type: 'bool' }]
              }],
              functionName: 'approve',
              args: [ROCK_PAPER_SCISSORS_ADDRESS, 1]
            });
            
            await publicClient.waitForTransactionReceipt({ hash: approveHash });
            toast.success('授权成功', { id: 'approveToken' });
          }
          
          // 创建代币游戏
          toast.loading('正在创建代币游戏...', { id: 'createGame' });
          
          // 使用 writeContract 创建代币游戏
          const { hash } = await writeContract({
            address: ROCK_PAPER_SCISSORS_ADDRESS,
            abi: [{
              name: 'createGameWithToken',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: '_totalTurns', type: 'uint256' },
                { name: '_timeoutInterval', type: 'uint256' },
                { name: '_timeoutCommit', type: 'uint256' }
              ],
              outputs: [{ type: 'uint256' }]
            }],
            functionName: 'createGameWithToken',
            args: [totalTurns, timeoutInterval, timeoutCommit]
          });
          
          // 等待交易确认
          tx = await publicClient.waitForTransactionReceipt({ hash });
        } catch (tokenError) {
          console.error('代币交互失败:', tokenError);
          toast.error(`代币操作失败: ${tokenError.message.slice(0, 50)}...`, { id: 'approveToken' });
          setError(tokenError.message || '代币操作失败，请重试');
          setIsCreating(false);
          return;
        }
      }
      
      // 从事件中获取游戏ID - 尝试多种方式解析
      const receipt = tx; // tx已经是receipt，因为我们使用了waitForTransactionReceipt
      console.log('交易收据：', receipt);
      
      // 方法1：检查标准事件格式
      const gameCreatedEvent = receipt.events?.find(e => e.event === 'GameCreated');
      if (gameCreatedEvent?.args?.gameId) {
        gameId = gameCreatedEvent.args.gameId.toString();
        console.log('方法1找到游戏ID:', gameId);
      }
      
      // 方法2：检查日志条目和主题格式
      if (!gameId && receipt.logs && receipt.logs.length > 0) {
        // GameCreated事件的第一个indexed参数应该是gameId
        for (const log of receipt.logs) {
          // 检查主题数量是否符合GameCreated事件
          if (log.topics && log.topics.length >= 2) {
            // 第二个主题通常是游戏ID（如果它是indexed参数）
            const potentialGameId = BigInt(log.topics[1]).toString();
            console.log('方法2找到潜在的游戏ID:', potentialGameId);
            if (!gameId) gameId = potentialGameId;
          }
        }
      }
      
      // 方法3：直接检查收据哈希作为临时解决方案
      if (!gameId && receipt.transactionHash) {
        // 作为最后的手段，使用交易哈希的最后8个字符作为临时ID
        // 这不是理想的解决方案，但可以让用户继续操作
        gameId = receipt.transactionHash.slice(-8);
        console.log('方法3使用交易哈希后8位作为临时ID:', gameId);
      }
      
      if (gameId) {
        toast.success('游戏创建成功！', { id: 'createGame' });
        console.log('最终使用的游戏ID:', gameId);
        
        // 导航到新创建的游戏
        router.push(`/game/${gameId}`);
      } else {
        console.error('无法从交易收据中获取游戏ID', receipt);
        toast.error('游戏创建成功，但无法获取游戏ID', { id: 'createGame' });
        setError('游戏创建成功，但无法获取游戏ID');
        setIsCreating(false);
        router.push('/games');
      }
    } catch (error) {
      console.error('创建游戏失败:', error);
      toast.error(`创建游戏失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'createGame' });
      setError(error.message || '创建游戏失败，请重试');
      setIsCreating(false);
    }
  };
  
  const handleBackToGames = () => {
    router.push('/games');
  };
  
  if (!isConnected) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-medieval text-amber-900 mb-6">请先连接钱包</h2>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <Toaster position="top-center" toastOptions={{ duration: 5000 }} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-medieval text-amber-900">创建新游戏</h1>
          
          <button
            onClick={handleBackToGames}
            className="py-2 px-4 bg-amber-100 text-amber-800 font-medieval rounded border border-amber-300 hover:bg-amber-200 transition-all duration-300"
          >
            返回列表
          </button>
        </div>
        
        <div className="bg-[url('/images/scroll-wide.png')] bg-contain bg-center bg-no-repeat py-16 px-12 mb-8">
          <div className="max-w-md mx-auto">
            <div className="mb-8">
              <h3 className="text-xl font-medieval text-amber-900 mb-4">游戏模式</h3>
              
              <div className="flex justify-center gap-4">
                <GameTypeButton 
                  active={gameType === 'MAG'}
                  onClick={() => setGameType('MAG')}
                  icon="/images/eth-icon.png"
                  label="MAG游戏"
                />
                <GameTypeButton 
                  active={gameType === 'token'}
                  onClick={() => setGameType('token')}
                  icon="/images/token-icon.png"
                  label="代币游戏"
                />
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-amber-800 font-medieval mb-2">回合数 (必须是奇数)</label>
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setTotalTurns(Math.max(1, totalTurns - 2))}
                  className="w-10 h-10 flex items-center justify-center bg-amber-700 text-amber-100 rounded-full"
                  disabled={totalTurns <= 1}
                >
                  -
                </button>
                <div className="text-3xl font-medieval text-amber-900 w-16 text-center">
                  {totalTurns}
                </div>
                <button 
                  onClick={() => setTotalTurns(totalTurns + 2)}
                  className="w-10 h-10 flex items-center justify-center bg-amber-700 text-amber-100 rounded-full"
                >
                  +
                </button>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-amber-800 font-medieval mb-2">
                揭示阶段超时时间 ({timeoutInterval} 秒 / {Math.floor(timeoutInterval / 60)} 分钟)
              </label>
              <input
                type="range"
                min="300"
                max="3600"
                step="60"
                value={timeoutInterval}
                onChange={(e) => setTimeoutInterval(Number(e.target.value))}
                className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-amber-700 mt-1">
                <span>5分钟</span>
                <span>30分钟</span>
                <span>60分钟</span>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-amber-800 font-medieval mb-2">
                提交阶段超时时间 ({timeoutCommit} 秒 / {Math.floor(timeoutCommit / 60)} 分钟)
              </label>
              <input
                type="range"
                min="300"
                max="3600"
                step="60"
                value={timeoutCommit}
                onChange={(e) => setTimeoutCommit(Number(e.target.value))}
                className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-amber-700 mt-1">
                <span>5分钟</span>
                <span>30分钟</span>
                <span>60分钟</span>
              </div>
            </div>
            
            {gameType === 'MAG' && (
              <div className="mb-8">
                <label className="block text-amber-800 font-medieval mb-2">投注金额 (MAG)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-full py-2 px-3 bg-amber-50 border-2 border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-amber-800">MAG</span>
                  </div>
                </div>
                {balance && (
                  <p className="text-sm text-amber-700 mt-1">
                    余额: {parseFloat(formatEther(balance.value)).toFixed(4)} MAG
                  </p>
                )}
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <button
              onClick={handleCreateGame}
              disabled={isCreating}
              className={`w-full py-3 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-medieval text-xl rounded-md border-2 border-amber-600 shadow-lg transition-all duration-300 ${isCreating ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-amber-600/30'}`}
            >
              {isCreating ? '创建中...' : '创建游戏'}
            </button>
          </div>
        </div>
        
        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-6 mb-8">
          <h3 className="text-xl font-medieval text-amber-900 mb-4">游戏说明</h3>
          <ul className="list-disc pl-5 space-y-2 text-amber-800">
            <li>回合数必须是奇数，这样可以保证游戏有胜负结果。</li>
            <li>超时时间表示每回合的移动提交和揭示阶段的最长等待时间。</li>
            <li>MAG游戏：双方投注相同金额的MAG，赢家获得总投注额的90%（10%为平台费用）。</li>
            <li>代币游戏：双方各投入1个WinningToken代币，赢家获得全部2个代币。</li>
            <li>游戏结束后，胜利者需要手动提取奖励。</li>
          </ul>
        </div>
      </motion.div>
    </Layout>
  );
}

const GameTypeButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-300 ${active ? 'bg-amber-100 border-amber-600 shadow-md' : 'bg-amber-50 border-amber-200 hover:bg-amber-100'}`}
  >
    <div className="w-12 h-12 mb-2 relative">
      <Image src={icon} layout="fill" objectFit="contain" alt={label} />
    </div>
    <span className="font-medieval text-amber-900">{label}</span>
  </button>
);
