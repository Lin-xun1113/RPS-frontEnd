import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/router';
import { useAccount, useContract, useSigner, useProvider } from 'wagmi';
import { ethers } from 'ethers';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';

// 导入UI组件
import MoveSelector from './MoveSelector';
import LoadingState from './LoadingState';
import GameResult from './GameResult';
import CountdownTimer from './CountdownTimer';

// 导入合约信息
import { ROCK_PAPER_SCISSORS_ADDRESS, WINNING_TOKEN_ADDRESS, ABI, MOVES, GAME_STATES } from '../constants/contractInfo';

export default function GameComponent() {
  const router = useRouter();
  const { id: gameId } = router.query;
  const { isConnected, address } = useAccount();
  const provider = useProvider();
  const { data: signer } = useSigner();
  
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMove, setSelectedMove] = useState(null);
  const [phase, setPhase] = useState('waiting'); // waiting, join, commit, reveal, results, finished
  const [currentRound, setCurrentRound] = useState(1);
  const [roundsWon, setRoundsWon] = useState({ player1: 0, player2: 0 });
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState(null);
  const [salt, setSalt] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [blockchainTime, setBlockchainTime] = useState(0);
  const [blockchainTimeInterval, setBlockchainTimeInterval] = useState(null);
  
  // 新增: 状态锁定机制，防止界面频繁切换
  const [phaseLocked, setPhaseLocked] = useState(false);
  const [actionTaken, setActionTaken] = useState(false);
  
  // 新增: 缓存上一次的游戏数据用来比较变化
  const previousGameRef = React.useRef(null);
  
  // 使用useRef而非state来存储可变但不触发重新渲染的值
  const mountedRef = React.useRef(false);
  const saltRef = React.useRef(null);

  const contract = useContract({
    address: ROCK_PAPER_SCISSORS_ADDRESS,
    abi: ABI,
    signerOrProvider: signer || provider,
  });
  
  // 获取链上时间的函数
  const fetchBlockchainTime = useCallback(async () => {
    try {
      const block = await provider.getBlock('latest');
      if (block && block.timestamp) {
        setBlockchainTime(block.timestamp);
        console.log('获取到的链上时间:', new Date(block.timestamp * 1000).toLocaleString());
      }
    } catch (error) {
      console.error('获取区块时间失败:', error);
    }
  }, [provider]);

  // 使用链上时间判断是否超时
  const isTimeoutByBlockchain = useCallback((deadline) => {
    if (!blockchainTime || !deadline) return false;
    return blockchainTime > deadline;
  }, [blockchainTime]);
  
  // 初始化和清理效果
  useEffect(() => {
    // 启动时获取游戏数据
    if (isConnected && contract && gameId) {
      // 立即获取区块链时间和游戏详情
      fetchBlockchainTime().then(() => {
        fetchGameDetails();
      });
      
      // 定期更新区块链时间 - 每10秒更新一次
      const blockchainTimeIntervalId = setInterval(() => {
        fetchBlockchainTime();
      }, 10000);
      
      // 保存计时器ID供清理使用
      setBlockchainTimeInterval(blockchainTimeIntervalId);
      
      // 智能刷新机制 - 根据游戏状态调整刷新频率
      const getRefreshRate = () => {
        // 如果状态已锁定，减少刷新频率以提高界面稳定性
        if (phaseLocked) return 30000; // 30秒
        
        // 如果玩家刚刚采取了动作，也减少刷新频率
        if (actionTaken) return 20000; // 20秒
        
        // 正常默认刷新频率
        return 15000; // 15秒
      };
      
      // 使用智能刷新频率设置定时器
      const interval = setInterval(() => {
        console.log(`智能刷新:状态=${phase}, 锁定=${phaseLocked}, 刷新间隔=${getRefreshRate()}ms`);
        fetchGameDetails();
      }, getRefreshRate());
      
      setRefreshInterval(interval);
      
      // 检查localStorage中保存的相关盐值
      if (typeof window !== 'undefined') {
        const savedSalt = localStorage.getItem(`salt_${gameId}_${address}`);
        if (savedSalt) {
          setSalt(savedSalt);
          saltRef.current = savedSalt;
        }
      }
    }
    
    // 清理函数
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      if (blockchainTimeInterval) {
        clearInterval(blockchainTimeInterval);
      }
      console.log('游戏组件定时器已清理');
    };
  }, [isConnected, contract, gameId, phase, phaseLocked, actionTaken, fetchBlockchainTime]);
  
  // 回合变化时重置选择的移动
  useEffect(() => {
    if (game && game.currentTurn) {
      // 当回合变化时，重置选择的移动
      setSelectedMove(null);
      console.log('回合检测 - 当前回合:', game.currentTurn);
    }
  }, [game?.currentTurn]);
  
  // 手动刷新游戏状态
  const handleManualRefresh = async () => {
    if (refreshing) return;
    
    try {
      setRefreshing(true);
      toast.loading('刷新游戏状态...', { id: 'refresh-toast' });
      await fetchGameDetails(true);
      toast.success('游戏状态已更新', { id: 'refresh-toast' });
    } catch (error) {
      console.error('手动刷新失败:', error);
      toast.error('刷新失败，请重试', { id: 'refresh-toast' });
    } finally {
      setRefreshing(false);
    }
  };

  // 从区块链获取游戏详情
  const fetchGameDetails = useCallback(async (isManualRefresh = false) => {
    if (!gameId || !isConnected || !contract) return;
    
    // 如果是手动刷新，忽略锁定状态，强制刷新
    // 否则，如果状态已锁定且当前在“已揭示”状态，降低获取数据的频率
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefresh;
    
    if (!isManualRefresh && phaseLocked && phase === 'player_revealed' && timeSinceLastRefresh < 15000) {
      console.log('状态已锁定且在“已揭示”状态，跳过刷新');
      return;
    }
    
    setLastRefresh(now);
    
    try {
      // 每次获取数据前不显示加载状态，避免闪烁
      if (!game) {
        setLoading(true);
      }
      setError(null);
      
      console.log('正在获取游戏 ID:', gameId, '的详细信息');
      
      // 获取游戏基本信息
      const gameInfo = await contract.games(gameId);
      console.log('游戏基本信息:', gameInfo);
      
      // 保存原始数据方便调试
      const rawGameInfo = [];
      for (let i = 0; i < gameInfo.length; i++) {
        rawGameInfo.push(gameInfo[i] && gameInfo[i].toString ? gameInfo[i].toString() : gameInfo[i]);
      }
      console.log('原始游戏数据:', rawGameInfo);
      
      // 从游戏基本信息中提取数据 - 按照合约Game结构体定义的顺序
      // address playerA, address playerB, uint256 bet, uint256 timeoutInterval, 
      // uint256 revealDeadline, uint256 creationTime, uint256 joinDeadline, 
      // uint256 totalTurns, uint256 currentTurn, bytes32 commitA, bytes32 commitB, 
      // uint8 moveA, uint8 moveB, uint8 scoreA, uint8 scoreB, uint8 state
      // uint256 timeoutCommit, uint256 commitDeadline (新增字段)
      const creator = gameInfo[0]; // playerA
      const player2 = gameInfo[1]; // playerB
      const bet = gameInfo[2];     // bet
      const timeoutInterval = gameInfo[3]; // 揭示阶段超时时间
      const revealDeadline = gameInfo[4]; // 揭示阶段截止时间
      const creationTime = gameInfo[5]; // 游戏创建时间
      const joinDeadline = gameInfo[6]; // 加入游戏截止时间
      const totalTurns = gameInfo[7]; // 总回合数
      const currentTurn = gameInfo[8]; // 当前回合
      const commitA = gameInfo[9]; // 玩家A的提交哈希
      const commitB = gameInfo[10]; // 玩家B的提交哈希
      const moveA = gameInfo[11]; // 玩家A的移动
      const moveB = gameInfo[12]; // 玩家B的移动
      const player1Score = gameInfo[13]; // 玩家A得分
      const player2Score = gameInfo[14]; // 玩家B得分
      const state = gameInfo[15]; // 游戏状态
      const timeoutCommit = gameInfo[16]; // 新增: 提交阶段超时时间
      const commitDeadline = gameInfo[17]; // 新增: 提交阶段截止时间
      
      console.log('解析游戏数据 - 超时时间:', timeoutInterval.toString(), 
                '总回合数:', totalTurns.toString(), 
                '游戏状态:', state, 
                '状态名称:', GAME_STATES[state]);
      
      console.log('游戏状态:', state, GAME_STATES[state]);
      const isTokenGame = gameInfo.bet.eq(0); // 如果bet为0，则为Token游戏
      
      // 检查并使用正确的状态值
      // 注意: 先打印状态数字值和字符串值，以便调试
      console.log('当前游戏状态码:', state.toString(), '状态名:', GAME_STATES[state]);
      
      // 检查是否已有两个玩家
      const hasPlayer2 = player2 !== ethers.constants.AddressZero;
      console.log('第二个玩家状态:', hasPlayer2 ? '已加入' : '未加入', '玩家地址:', player2);
      
      // 检查CommitPhase状态
      if (hasPlayer2 && state.toString() === '0') {
        console.log('警告: 游戏已有第二个玩家但仍是Created状态，应该为CommitPhase');
        // // 这里我们将状态手动更正为CommitPhase(5)
        // console.log('手动将状态从', GAME_STATES[state], '更正为', GAME_STATES[5]);
        // state = 5; // 强制设置为CommitPhase
      }
      
      // 从游戏数据中获取玩家移动状态
      // 不再使用不存在的playerMoves函数
      // 直接从games函数返回的数据中获取移动信息
      let player1Moves = null;
      let player2Moves = null;
      
      try {
        // 根据合约结构和日志确认，索引对应如下：
        // commitA在索引[9]，commitB在[10]，moveA在[11]，moveB在[12]，scoreA在[13]，scoreB在[14]
        const commitA = gameInfo[9];
        const commitB = gameInfo[10];
        const moveA = gameInfo[11] ? Number(gameInfo[11]) : 0;
        const moveB = gameInfo[12] ? Number(gameInfo[12]) : 0;
        
        console.log('💡 解析移动数据 - moveA:', moveA, 'moveB:', moveB);
        
        // 创建玩家A的移动数据
        if (creator !== ethers.constants.AddressZero) {
          player1Moves = {
            committed: commitA && commitA !== ethers.constants.HashZero,
            revealed: moveA > 0,
            move: moveA
          };
          console.log('获取玩家A移动数据:', player1Moves);
        }
        
        // 创建玩家B的移动数据
        if (player2 !== ethers.constants.AddressZero) {
          player2Moves = {
            committed: commitB && commitB !== ethers.constants.HashZero,
            revealed: moveB > 0,
            move: moveB
          };
          console.log('获取玩家B移动数据:', player2Moves);
        }
      } catch (error) {
        console.error('处理玩家移动数据时出错:', error.message);
        // 设置默认移动数据
        if (creator !== ethers.constants.AddressZero) {
          player1Moves = { committed: false, revealed: false, move: 0 };
        }
        if (player2 !== ethers.constants.AddressZero) {
          player2Moves = { committed: false, revealed: false, move: 0 };
        }
      }
      
      // 判断当前用户在游戏中的角色
      const isPlayer1 = address && creator && address.toLowerCase() === creator.toLowerCase();
      const isPlayer2 = address && player2 && address.toLowerCase() === player2.toLowerCase();
      const isSpectator = !isPlayer1 && !isPlayer2;
      
      // 从合约获取超时时间
      // 获取并解析超时时间和截止时间
      // 处理revealDeadline（揭示阶段截止时间）
      const revealEndTime = typeof revealDeadline === 'object' && revealDeadline.toNumber 
                        ? revealDeadline.toNumber() 
                        : Number(revealDeadline || 0);
                        
      // 处理timeoutInterval（揭示阶段超时时间）
      const timeoutIntervalSeconds = typeof timeoutInterval === 'object' && timeoutInterval.toNumber 
                              ? timeoutInterval.toNumber() 
                              : Number(timeoutInterval || 300); // 默认5分钟
      
      // 新增: 处理timeoutCommit（提交阶段超时时间）
      const timeoutCommitSeconds = typeof timeoutCommit === 'object' && timeoutCommit.toNumber 
                             ? timeoutCommit.toNumber() 
                             : Number(timeoutCommit || 300); // 默认5分钟
      
      // 新增: 处理commitDeadline（提交阶段截止时间）
      const commitEndTime = typeof commitDeadline === 'object' && commitDeadline.toNumber 
                       ? commitDeadline.toNumber() 
                       : Number(commitDeadline || 0);
      
      console.log('提交阶段截止时间:', commitEndTime, '揭示阶段截止时间:', revealEndTime);
      
      // 如果合约中commitDeadline未设置（为0），使用当前时间+超时时间作为应急况绪UI显示用
      const currentTime = Math.floor(Date.now() / 1000);
      let commitPhaseDeadline = commitEndTime > 0 ? commitEndTime : currentTime + timeoutCommitSeconds;
      let revealPhaseDeadline = revealEndTime > 0 ? revealEndTime : 0;
      
      console.log('当前游戏状态:', GAME_STATES[state], '计算的提交超时时间:', commitPhaseDeadline, '揭示超时时间:', revealPhaseDeadline);
      
      // 构造完整的游戏对象
      const gameData = {
        id: gameId,
        creator: creator,
        player2: player2 !== ethers.constants.AddressZero ? player2 : null,
        betAmount: bet,
        totalTurns: typeof totalTurns === 'object' && totalTurns.toNumber ? totalTurns.toNumber() : Number(totalTurns),
        currentTurn: typeof currentTurn === 'object' && currentTurn.toNumber ? currentTurn.toNumber() : Number(currentTurn),
        player1Score: typeof player1Score === 'object' && player1Score.toNumber ? player1Score.toNumber() : Number(player1Score),
        player2Score: typeof player2Score === 'object' && player2Score.toNumber ? player2Score.toNumber() : Number(player2Score),
        gameType: isTokenGame ? 'token' : 'eth',
        state: state,
        timeoutInterval: timeoutInterval,
        joinDeadline: typeof joinDeadline === 'object' && joinDeadline.toNumber ? joinDeadline.toNumber() : Number(joinDeadline || 0),
        commitDeadline: commitPhaseDeadline,
        revealDeadline: revealPhaseDeadline,
        isPlayer1: isPlayer1,
        isPlayer2: isPlayer2,
        isSpectator: isSpectator,
        moves: {
          player1: player1Moves ? {
            committed: player1Moves.committed,
            revealed: player1Moves.revealed,
            move: player1Moves.move
          } : { committed: false, revealed: false, move: 0 },
          player2: player2Moves ? {
            committed: player2Moves.committed,
            revealed: player2Moves.revealed,
            move: player2Moves.move
          } : { committed: false, revealed: false, move: 0 }
        },
        winner: null, // 根据游戏状态在updateGamePhase中计算
        lastUpdated: Date.now()
      };
      
      // 更新游戏和回合状态
      setGame(gameData);
      setRoundsWon({
        player1: typeof player1Score === 'object' && player1Score.toNumber ? player1Score.toNumber() : Number(player1Score),
        player2: typeof player2Score === 'object' && player2Score.toNumber ? player2Score.toNumber() : Number(player2Score)
      });
      setCurrentRound(typeof currentTurn === 'object' && currentTurn.toNumber ? currentTurn.toNumber() : Number(currentTurn));
      updateGamePhase(gameData);
    } catch (error) {
      console.error('获取游戏详情失败:', error);
      toast.error('获取游戏详情失败: ' + (error.message || '未知错误'));
      setError('获取游戏详情失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [gameId, isConnected, contract, address, game, phaseLocked, phase, lastRefresh]);
  
  const updateGamePhase = (gameData) => {
    if (!gameData) return;
    
    // 判断游戏数据是否有实质的变化
    const hasChanged = JSON.stringify(previousGameRef.current?.state) !== JSON.stringify(gameData.state) ||
                      JSON.stringify(previousGameRef.current?.currentTurn) !== JSON.stringify(gameData.currentTurn);
    
    // 更新缓存的游戏数据
    previousGameRef.current = gameData;
    
    // 使用游戏数据提供的角色判断
    const isPlayer1 = gameData.isPlayer1;
    const isPlayer2 = gameData.isPlayer2;
    const isSpectator = gameData.isSpectator;
    
    // 检查玩家移动状态
    const player1Committed = gameData.moves && gameData.moves.player1 && gameData.moves.player1.committed;
    const player2Committed = gameData.moves && gameData.moves.player2 && gameData.moves.player2.committed;
    const player1Revealed = gameData.moves && gameData.moves.player1 && gameData.moves.player1.revealed;
    const player2Revealed = gameData.moves && gameData.moves.player2 && gameData.moves.player2.revealed;
    
    // 检查当前玩家是否已揭示
    const currentPlayerRevealed = isPlayer1 ? player1Revealed : (isPlayer2 ? player2Revealed : false);
    
    // 检查对手是否已揭示
    const opponentRevealed = isPlayer1 ? player2Revealed : (isPlayer2 ? player1Revealed : false);
    
    // 帮助函数：统一判断玩家阶段逻辑
    const determinePlayerPhase = (playerRevealed, opponentRevealed, playerCommitted) => {
      if (playerRevealed) {
        if (opponentRevealed) {
          console.log('✅✅ 双方都已揭示移动');
          return 'both_revealed';
        } else {
          console.log('✅⏳ 玩家已揭示，等待对手揭示');
          return 'waiting_opponent_reveal';
        }
      } else if (!playerCommitted) {
        console.log('📝 玩家尚未提交移动，显示提交界面');
        return 'commit';
      } else {
        // 玩家已提交但未揭示
        if (opponentRevealed) {
          console.log('⚠️ 对手已揭示，提示玩家需要揭示');
          return 'waiting_my_reveal';
        } else {
          console.log('🔒 玩家已提交移动但未揭示，显示揭示界面');
          return 'reveal';
        }
      }
    };
    
    // 根据游戏状态和玩家角色确定当前阶段
    const gameState = GAME_STATES[gameData.state] || 'unknown';
    console.log('游戏状态码:', gameData.state, '游戏状态:', gameState);
    
    // 如果玩家已揭示并且状态被锁定，保持状态不变
    if (phaseLocked && 
       (phase === 'player_revealed' || phase === 'waiting_opponent_reveal' || phase === 'both_revealed' || phase === 'waiting_my_reveal') && 
       gameData.state === 1) {
      console.log('状态已锁定，维持当前状态:', phase);
      
      // 为防止永久锁定，添加30秒后自动解锁
      if (!window._phaseLockTimer) {
        window._phaseLockTimer = setTimeout(() => {
          console.log('状态锁定超时，自动解锁');
          setPhaseLocked(false);
          window._phaseLockTimer = null;
        }, 30000);
      }
      
      return;
    }
    
    // 如果玩家刚刚采取了动作，也锁定状态一段时间
    if (actionTaken) {
      console.log('玩家刚刚采取了动作，暂时锁定状态');
      // 3秒后自动解锁
      setTimeout(() => setActionTaken(false), 3000);
      return;
    }
    
    // 处理特殊状态
    if (gameData.state === 3) { // 游戏已完成
      setPhaseLocked(false); // 解锁状态
      setPhase('finished');
      return;
    } else if (gameData.state === 4) { // 游戏已取消
      setPhaseLocked(false); // 解锁状态
      setPhase('cancelled');
      return;
    } else if (gameData.state === 2) { // 结果阶段
      setPhaseLocked(false); // 解锁状态
      setPhase('results');
      return;
    }
  
    // 检测是否是新回合的特殊情况
    // 对于新回合，合约状态可能是Committed(1)但commitA和commitB都被重置了
    const isNewRound = gameData.state === 1 && !player1Committed && !player2Committed;
    
    if (isNewRound) {
      console.log('检测到新回合开始: 回分3', gameData.currentTurn);
      setPhase('commit');
      return;
    }
    
    // 判断当前阶段 - 需要考虑玩家是否已提交移动
    if (gameData.state === 1) { // 状态为Committed
      console.log('当前为提交/揭示阶段 (合约状态为Committed)');
      
      // 首先打印所有相关目标状态信息，便于调试
      console.log('🔍 状态详细检查 - 当前回合:', gameData.currentTurn);
      console.log('🔍 玩家1 commitA:', gameData.commitA, '是否揭示:', player1Revealed);
      console.log('🔍 玩家2 commitB:', gameData.commitB, '是否揭示:', player2Revealed);
      
      if (isSpectator) {
        setPhase('spectating_reveal');
      } else if (isPlayer1) {
        // 检查玩家1和玩家2的揭示状态
        console.log('👤 玩家1状态检查 - 当前回合:', gameData.currentTurn);
        
        // *** 最重要的判断逻辑 ***
        // 1. 玩家已揭示时，显示已揭示状态
        // 2. 玩家未提交移动时，显示提交界面
        // 3. 玩家已提交但未揭示时，无论对手状态如何，都显示揭示界面
        
        console.log('玩家1状态判断 - 当前回合:', gameData.currentTurn);
        
        // 使用抽象函数确定玩家1的阶段
        const player1Phase = determinePlayerPhase(player1Revealed, player2Revealed, player1Committed);
        setPhase(player1Phase);
      } else if (isPlayer2) {
        // 检查玩家2的揭示状态
        console.log('👤 玩家2状态检查 - 当前回合:', gameData.currentTurn);
        
        // 使用抽象函数确定玩家2的阶段
        const player2Phase = determinePlayerPhase(player2Revealed, player1Revealed, player2Committed);
        setPhase(player2Phase);
      }
    } 
// 提交阶段的判断 - 状态为Created(0)或CommitPhase(5)
else if (gameData.state === 0 || gameData.state === 5) {
  // 首先确认游戏已有第二位玩家
  if (!gameData.player2) {
    // 处理游戏尚未有第二位玩家的情况
    if (isPlayer1) {
      setPhase('waiting_player2');
    } else {
      setPhase('join');
    }
  } else {
    console.log('当前为提交阶段 (合约状态为Created或CommitPhase)');
    // 正常提交阶段逻辑
    if (isSpectator) {
      setPhase('spectating_commit');
    } else if (isPlayer1) {
      if (player1Committed) {
        setPhase('waiting_opponent_commit');
      } else {
        setPhase('commit');
      }
    } else if (isPlayer2) {
      if (player2Committed) {
        setPhase('waiting_opponent_commit');
      } else {
        setPhase('commit');
      }
    }
  }
}
  };
  
  // 检查是否超时
  const isTimeoutExpired = (deadline) => {
    if (!deadline) return false;
    if (!provider) return false;
    
    // 使用直接对比，因为这个函数会被频繁调用
    try {
      const now = Math.floor(Date.now() / 1000);
      return deadline <= now;
    } catch (error) {
      console.error('检查超时状态失败:', error);
      return false;
    }
  };
  
  // 加入游戏功能
  const handleJoinGame = async () => {
    if (!isConnected || !contract || !gameId) {
      toast.error('请先连接钱包');
      return;
    }
    
    try {
      setJoining(true);
      setError(null);
      
      // 检查游戏存在并可以加入
      if (!game) {
        toast.error('游戏信息加载中，请稍候...');
        return;
      }
      
      if (game.player2) {
        toast.error('该游戏已有第二位玩家加入');
        return;
      }
      
      let tx;
      if (game.gameType === 'eth') {
        // 加入ETH游戏
        toast.loading('正在加入MAG游戏...', { id: 'joinGame' });
        
        tx = await contract.joinGameWithEth(gameId, {
          value: game.betAmount // 使用与创建者相同的押注金额
        });
      } else {
        // 加入代币游戏
        const tokenContract = new ethers.Contract(
          WINNING_TOKEN_ADDRESS,
          ['function approve(address spender, uint256 amount) external returns (bool)'],
          signer
        );
        
        // 检查并授权代币
        toast.loading('正在授权代币...', { id: 'approveToken' });
        const approveTx = await tokenContract.approve(ROCK_PAPER_SCISSORS_ADDRESS, 1);
        await approveTx.wait();
        toast.success('授权成功', { id: 'approveToken' });
        
        // 加入代币游戏
        toast.loading('正在加入代币游戏...', { id: 'joinGame' });
        tx = await contract.joinGameWithToken(gameId);
      }
      
      toast.loading('等待交易确认...', { id: 'joinGame' });
      await tx.wait();
      toast.success('成功加入游戏！', { id: 'joinGame' });
      
      // 重新加载游戏数据
      fetchGameDetails();
      
    } catch (error) {
      console.error('加入游戏失败:', error);
      toast.error(`加入游戏失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'joinGame' });
      setError(`加入游戏失败: ${error.message || '请重试'}`);
    } finally {
      setJoining(false);
    }
  };
  
  const handleSelectMove = (move) => {
    setSelectedMove(move);
  };
  
  /**
   * 检查当前玩家是否已经揭示了移动
   * @returns {boolean} 如果玩家已揭示移动则返回true
   */
  const playerHasRevealed = () => {
    if (!game || !address) return false;
    
    const isPlayer1 = address === game.creator;
    
    // 检查玩家的移动状态
    if (isPlayer1 && game.moves && game.moves.player1) {
      return game.moves.player1.revealed;
    } else if (!isPlayer1 && game.moves && game.moves.player2) {
      return game.moves.player2.revealed;
    }
    
    return false;
  };
  
  const handleCommitMove = async () => {
    if (!selectedMove) {
      toast.error('请先选择一个移动');
      setError('请先选择一个移动');
      return;
    }
    
    if (!isConnected || !contract || !gameId) {
      toast.error('请先连接钱包');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 让用户输入盐值
      let salt = prompt('请输入自定义盐值（建议8位以上随机字符串），如不输入将自动生成：');
      if (!salt || salt.length === 0) {
        // 自动生成
        const saltBytes = ethers.utils.randomBytes(32);
        salt = ethers.utils.hexlify(saltBytes);
        toast.success('已自动生成安全盐值：' + salt);
      } else {
        // 将用户输入的字符串转换为bytes32格式
        // 先将输入转为字节数组，再转为hex字符串
        let saltUtf8Bytes = ethers.utils.toUtf8Bytes(salt);
        
        // 如果长度<32，则需要padding到32字节
        if (saltUtf8Bytes.length < 32) {
          const newArray = new Uint8Array(32);
          newArray.set(saltUtf8Bytes);
          saltUtf8Bytes = newArray;
        } else if (saltUtf8Bytes.length > 32) {
          // 如果超过32字节，截取前32字节
          saltUtf8Bytes = saltUtf8Bytes.slice(0, 32);
        }
        
        salt = ethers.utils.hexlify(saltUtf8Bytes);
        
        if (salt.length < 8) {
          toast(`您输入的盐值较短，安全性较低，但仍将使用`);
        } else {
          toast.success('已接受您的自定义盐值: ' + salt);
        }
      }
      setSalt(salt);
      saltRef.current = salt;

      console.log('选择的移动:', selectedMove);
      console.log('最终使用的盐值:', salt);

      // 生成提交哈希
      const moveHash = ethers.utils.solidityKeccak256(
        ['uint8', 'bytes32', 'address'],
        [selectedMove, salt, address]
      );

      console.log('生成的移动哈希:', moveHash);

      // 保存盐值到本地存储，用于后续揭示
      if (typeof window !== 'undefined') {
        localStorage.setItem(`salt_${gameId}_${address}`, salt);
      }
      
      // 调用合约提交移动
      toast.loading('正在提交移动...', { id: 'commitMove' });
      const tx = await contract.commitMove(gameId, moveHash);
      
      toast.loading('等待区块链确认...', { id: 'commitMove' });
      const receipt = await tx.wait();
      
      toast.success('移动提交成功!', { id: 'commitMove' });
      console.log('移动提交交易收据:', receipt);
      
      // 刷新游戏状态
      await fetchGameDetails();
      
    } catch (error) {
      console.error('提交移动失败:', error);
      toast.error(`提交移动失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'commitMove' });
      setError(`提交移动失败: ${error.message || '请重试'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // 超时处理：当对手没有在时间内揭示移动时调用
  const handleTimeoutReveal = async () => {
    if (!isConnected || !contract || !gameId) {
      toast.error('请先连接钱包');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 调用智能合约的timeoutReveal函数
      const signerContract = contract.connect(signer);
      
      // 首先检查是否满足超时条件
      const canTimeout = await signerContract.canTimeoutReveal(gameId);
      console.log('检查是否可以超时揭示:', canTimeout);
      
      if (!canTimeout[0]) {
        toast.error('当前不满足超时条件');
        return;
      }
      
      toast.loading('正在处理超时...', { id: 'timeout' });
      const tx = await signerContract.timeoutReveal(gameId);
      
      toast.loading('等待区块链确认...', { id: 'timeout' });
      await tx.wait();
      
      toast.success('超时处理成功！', { id: 'timeout' });
      
      // 刷新游戏状态
      await fetchGameDetails();
      
    } catch (error) {
      console.error('超时处理失败:', error);
      toast.error(`超时处理失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'timeout' });
      setError(`超时处理失败: ${error.message || '请重试'}`);
    } finally {
      setLoading(false);
    }
  };

  // 超时处理：当对手没有在时间内提交移动时调用
  const handleTimeoutCommit = async () => {
    if (!isConnected || !contract || !gameId) {
      toast.error('请先连接钱包');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 调用智能合约的timeoutCommit函数
      const signerContract = contract.connect(signer);
      
      // 首先检查是否满足超时条件
      const canTimeout = await signerContract.canTimeoutCommit(gameId);
      console.log('检查是否可以超时提交:', canTimeout);
      
      if (!canTimeout[0]) {
        toast.error('当前不满足提交超时条件');
        return;
      }
      
      toast.loading('正在处理提交超时...', { id: 'timeout-commit' });
      const tx = await signerContract.timeoutCommit(gameId);
      
      toast.loading('等待区块链确认...', { id: 'timeout-commit' });
      await tx.wait();
      
      toast.success('提交超时处理成功！', { id: 'timeout-commit' });
      
      // 刷新游戏状态
      await fetchGameDetails();
      
    } catch (error) {
      console.error('提交超时处理失败:', error);
      toast.error(`提交超时处理失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'timeout-commit' });
      setError(`提交超时处理失败: ${error.message || '请重试'}`);
    } finally {
      setLoading(false);
    }
  };

  // 超时处理：当没有人在时间内加入游戏时调用
  const handleTimeoutJoin = async () => {
    if (!isConnected || !contract || !gameId) {
      toast.error('请先连接钱包');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 调用智能合约的timeoutJoin函数
      const signerContract = contract.connect(signer);
      
      // 首先检查是否满足超时条件
      const canTimeout = await signerContract.canTimeoutJoin(gameId);
      console.log('检查是否可以超时加入:', canTimeout);
      
      if (!canTimeout) {
        toast.error('当前不满足超时条件');
        return;
      }
      
      toast.loading('正在处理超时...', { id: 'timeout' });
      const tx = await signerContract.timeoutJoin(gameId);
      
      toast.loading('等待区块链确认...', { id: 'timeout' });
      await tx.wait();
      
      toast.success('游戏已取消！', { id: 'timeout' });
      
      // 返回游戏列表
      router.push('/games');
      
    } catch (error) {
      console.error('超时处理失败:', error);
      toast.error(`超时处理失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'timeout' });
      setError(`超时处理失败: ${error.message || '请重试'}`);
    } finally {
      setLoading(false);
    }
  };

  // 取消游戏（仅游戏创建者可调用）
  const handleCancelGame = async () => {
    if (!isConnected || !contract || !gameId) {
      toast.error('请先连接钱包');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const signerContract = contract.connect(signer);
      
      toast.loading('正在取消游戏...', { id: 'cancel-game' });
      const tx = await signerContract.cancelGame(Number(gameId));
      
      toast.loading('等待区块链确认...', { id: 'cancel-game' });
      await tx.wait();
      
      toast.success('游戏已成功取消！', { id: 'cancel-game' });
      
      // 返回游戏列表
      router.push('/games');
      
    } catch (error) {
      console.error('取消游戏失败:', error);
      toast.error(`取消游戏失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'cancel-game' });
      setError(`取消游戏失败: ${error.message || '请重试'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevealMove = async () => {
    if (!isConnected || !contract || !gameId) {
      toast.error('请先连接钱包');
      return;
    }
    
    try {
      // 设置动作标志，防止界面闪烁
      setActionTaken(true);
      setLoading(true);
      setError(null);
      
      // 优先使用state中的salt，其次使用ref中的salt，最后从本地存储获取
      let currentSalt = salt || saltRef.current;
      
      if (!currentSalt && typeof window !== 'undefined') {
        currentSalt = localStorage.getItem(`salt_${gameId}_${address}`);
      }
      
      // 新增：如果还没有盐值，弹窗让用户输入
      if (!currentSalt) {
        const inputSalt = prompt('本地未找到盐值，请输入你commit时用的盐值：');
        if (!inputSalt || inputSalt.length === 0) {
          toast.error('找不到盐值，无法揭示移动');
          setError('找不到盐值，无法揭示移动。请尝试刷新页面或重新提交移动。');
          setLoading(false);
          setActionTaken(false);
          return;
        }
        
        // 处理手动输入的盐值，将其转换为与提交阶段相同的格式
        let saltUtf8Bytes = ethers.utils.toUtf8Bytes(inputSalt);
        
        // 如果长度<32，则需要padding到32字节
        if (saltUtf8Bytes.length < 32) {
          const newArray = new Uint8Array(32);
          newArray.set(saltUtf8Bytes);
          saltUtf8Bytes = newArray;
        } else if (saltUtf8Bytes.length > 32) {
          // 如果超过32字节，截取前32字节
          saltUtf8Bytes = saltUtf8Bytes.slice(0, 32);
        }
        
        currentSalt = ethers.utils.hexlify(saltUtf8Bytes);
        
        if (inputSalt.length < 8) {
          toast(`您输入的盐值较短，安全性较低，但仍将使用`);
        } else {
          toast.success('已接受您的自定义盐值');
        }
      }
      // 保存正确的盐值到状态和引用
      setSalt(currentSalt);
      saltRef.current = currentSalt;

      console.log('选择的移动:', selectedMove);
      console.log('最终使用的盐值:', currentSalt);

      // 确保有一个选择的移动
      if (!selectedMove && game) {
        // 尝试从游戏状态获取之前提交的移动
        const isPlayer1 = game.isPlayer1;
        const playerMoveIndex = isPlayer1 ? game.moves.player1.move : game.moves.player2.move;
        
        if (playerMoveIndex > 0) {
          setSelectedMove(playerMoveIndex);
        } else {
          toast.error('无法确定要揭示的移动');
          setError('无法确定要揭示的移动。请尝试刷新页面或重新提交移动。');
          setLoading(false);
          setActionTaken(false);
          return;
        }
      }
      
      console.log('揭示移动:', selectedMove, '使用盐值:', currentSalt);
      
      // 调用合约揭示移动
      toast.loading('正在揭示移动...', { id: 'revealMove' });
      const tx = await contract.revealMove(gameId, selectedMove, currentSalt);
      
      toast.loading('等待区块链确认...', { id: 'revealMove' });
      const receipt = await tx.wait();
      
      toast.success('移动揭示成功!', { id: 'revealMove' });
      console.log('移动揭示交易收据:', receipt);
      
      // 设置状态为已揭示并锁定状态，避免界面闪烁
      setPhase('waiting_opponent_reveal'); // 使用新的状态名称，更准确地表达等待对手揭示
      setPhaseLocked(true);
      
      // 清除之前的状态锁定计时器，如果存在
      if (window._phaseLockTimer) {
        clearTimeout(window._phaseLockTimer);
        window._phaseLockTimer = null;
      }
      console.log('已锁定玩家揭示状态，防止界面闪烁');
      
      // 刷新游戏状态 - 但不会改变已锁定的界面状态
      await fetchGameDetails();
      
      // 清除盐值，因为它已经被使用
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`salt_${gameId}_${address}`);
      }
      setSalt(null);
      saltRef.current = null;
      
    } catch (error) {
      console.error('揭示移动失败:', error);
      toast.error(`揭示移动失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'revealMove' });
      setError(`揭示移动失败: ${error.message || '请重试'}`);
      setActionTaken(false); // 出错时解除动作锁定
    } finally {
      setLoading(false);
    }
  };
  
  const renderGameContent = () => {
    if (loading) {
      return <LoadingState message="加载游戏数据..." />;
    }
    
    if (error) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">错误! </strong>
          <span className="block sm:inline">{error}</span>
          <button 
            onClick={fetchGameDetails}
            className="mt-2 bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
          >
            重试
          </button>
        </div>
      );
    }
    
    if (!game) {
      return <div className="text-center text-gray-500">游戏不存在或数据加载失败</div>;
    }
    
    // 游戏存在但需要加入(游戏状态为'join')
    if (phase === 'join') {
      return renderJoinGame();
    }
    
    const isPlayer1 = address === game.creator;
    const player = isPlayer1 ? 'player1' : 'player2';
    const opponent = isPlayer1 ? 'player2' : 'player1';
    
    return (
      <div className="bg-blue-900/40 backdrop-blur-sm border-2 border-blue-500/30 rounded-lg p-6 shadow-[0_0_15px_rgba(59,130,246,0.3)] max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-medieval text-blue-200 mb-2">回合 {game.currentTurn}/{game.totalTurns}</h2>
          
          <div className="flex justify-center space-x-8 mb-4">
            <div className={`px-4 py-2 rounded ${roundsWon.player1 > roundsWon.player2 ? 'bg-blue-500/30 border border-blue-400/70' : 'bg-blue-800/30 border border-blue-600/30'}`}>
              <div className="font-bold text-sm text-blue-200">玩家1</div>
              <div className="text-2xl font-medieval text-blue-100">{roundsWon.player1}</div>
            </div>
            
            <div className="flex items-center">
              <span className="text-xl font-medieval text-blue-300 animate-pulse">VS</span>
            </div>
            
            <div className={`px-4 py-2 rounded ${roundsWon.player2 > roundsWon.player1 ? 'bg-blue-500/30 border border-blue-400/70' : 'bg-blue-800/30 border border-blue-600/30'}`}>
              <div className="font-bold text-sm text-blue-200">玩家2</div>
              <div className="text-2xl font-medieval text-blue-100">{roundsWon.player2}</div>
            </div>
          </div>
          
          {phase === 'waiting' && (
            <div className="bg-blue-900/50 border border-blue-400/50 text-blue-200 px-4 py-3 rounded relative shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              等待游戏开始...
            </div>
          )}
          
          {phase === 'commit' && (
            <div className="bg-blue-900/60 border border-blue-400/60 text-blue-200 px-4 py-3 rounded relative shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              <p className="mb-3">选择你的移动并提交</p>
              <CountdownTimer 
                deadline={game.commitDeadline} 
                onTimeout={() => console.log('提交阶段超时')} 
                isPaused={false}
              />
              <p className="mt-2 text-xs text-blue-300">提交时间受限制，请尽快提交以保持游戏流畅</p>
            </div>
          )}
          
          {phase === 'waiting_opponent_commit' && (
            <div className="bg-blue-900/50 border border-blue-400/50 text-blue-200 px-4 py-3 rounded relative shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              <p className="mb-2">等待对手提交移动...</p>
              <CountdownTimer 
                deadline={game.commitDeadline} 
                onTimeout={() => console.log('提交阶段超时')} 
                isPaused={false}
              />
              <p className="mt-2 text-xs text-blue-300">提交有严格时间限制，请耐心等待</p>
            </div>
          )}
          
          {phase === 'reveal' && (
            <div className="bg-blue-900/60 border border-blue-400/60 text-blue-200 px-4 py-3 rounded relative shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              <p className="mb-3">揭示你的移动</p>
              <CountdownTimer 
                deadline={game.revealDeadline} 
                onTimeout={() => console.log('揭示阶段超时')} 
                isPaused={false}
              />
            </div>
          )}
          
          {phase === 'waiting_opponent_reveal' && (
            <div className="bg-blue-900/50 border border-blue-400/50 text-blue-200 px-4 py-3 rounded relative shadow-[0_0_10px_rgba(59,130,246,0.3)]">
              <p className="mb-2">等待对手揭示移动...</p>
              <CountdownTimer 
                deadline={game.revealDeadline} 
                onTimeout={() => console.log('揭示阶段超时')} 
                isPaused={false}
              />
            </div>
          )}
          
          {phase === 'waiting_my_reveal' && (
            <div className="bg-yellow-900/60 border border-yellow-400/60 text-yellow-200 px-4 py-3 rounded relative shadow-[0_0_10px_rgba(234,179,8,0.3)]">
              <p className="text-lg font-bold mb-2">对手已揭示移动!</p>
              <p className="mb-2">请尽快揭示您的移动以完成本回合</p>
              <CountdownTimer 
                deadline={game.revealDeadline} 
                onTimeout={() => console.log('揭示阶段超时')} 
                isPaused={false}
              />
            </div>
          )}
          
          {phase === 'results' && (
            <div className="bg-indigo-900/50 border border-indigo-400/50 text-indigo-200 px-4 py-3 rounded relative shadow-[0_0_10px_rgba(99,102,241,0.4)]">
              回合结果计算中...
            </div>
          )}
          
          {phase === 'finished' && (
            <div className="bg-blue-900/50 border border-blue-400/50 rounded shadow-[0_0_15px_rgba(59,130,246,0.4)] p-4">
              <GameResult 
                player1Move={game.moves?.player1?.move}
                player2Move={game.moves?.player2?.move}
                winner={game.player1Score > game.player2Score ? 'player1' : (game.player2Score > game.player1Score ? 'player2' : null)}
                isRoundResult={false}
              />
            </div>
          )}
        </div>
        
        {(phase === 'commit' || phase === 'reveal' || phase === 'waiting_my_reveal') && (
          <div className="mb-6">
            {/* 检查提交阶段是否超时 */}
            {phase === 'commit' && isTimeoutByBlockchain(game.commitDeadline) ? (
              <div className="bg-red-900/60 border border-red-400/60 text-red-200 px-4 py-3 rounded relative shadow-[0_0_10px_rgba(220,38,38,0.3)] text-center">
                <p className="text-lg font-bold mb-2">提交移动已超时!</p>
                <p className="mb-2">您可以等待对手操作或使用超时处理功能</p>
                <p className="text-sm">超时处理按钮在下方游戏控制区域</p>
              </div>
            ) : phase === 'reveal' && isTimeoutByBlockchain(game.revealDeadline) ? (
              <div className="bg-red-900/60 border border-red-400/60 text-red-200 px-4 py-3 rounded relative shadow-[0_0_10px_rgba(220,38,38,0.3)] text-center">
                <p className="text-lg font-bold mb-2">揭示移动已超时!</p>
                <p className="mb-2">您可以等待对手操作或使用超时处理功能</p>
                <p className="text-sm">超时处理按钮在下方游戏控制区域</p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-medieval text-blue-400 mb-4 text-center">
                  {phase === 'commit' ? '选择你的移动' : '你选择的移动'}
                </h3>
                
                <MoveSelector 
                  selectedMove={selectedMove} 
                  onSelectMove={handleSelectMove} 
                  disabled={phase === 'reveal' && playerHasRevealed()}
                />
                {phase === 'commit' && !isTimeoutByBlockchain(game.commitDeadline) && (
                  <div className="text-center">
                    <button
                      onClick={handleCommitMove}
                      disabled={!selectedMove || loading}
                      className={`py-2 px-6 rounded-md ${!selectedMove || loading 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'} text-white font-medieval transition-colors`}
                    >
                      {loading ? '提交中...' : '提交移动'}
                    </button>
                  </div>
                )}
              </>
            )}
            
            {(phase === 'reveal' || phase === 'waiting_my_reveal') && !playerHasRevealed() && !isTimeoutByBlockchain(game.revealDeadline) && (
              <div className="text-center">
                <button
                  onClick={handleRevealMove}
                  disabled={!selectedMove || loading}
                  className={`py-2 px-6 rounded-md ${!selectedMove || loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'} text-white font-medieval transition-colors`}
                >
                  {loading ? '揭示中...' : '揭示移动'}
                </button>
              </div>
            )}
            
            {(phase === 'waiting_opponent_reveal' || phase === 'player_revealed') && (
              <div className="text-center bg-blue-900/60 border border-blue-400/60 text-blue-200 px-4 py-3 rounded relative mt-4 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                <p className="mb-2">您已成功揭示移动，等待对手揭示...</p>
                <CountdownTimer 
                  deadline={game.revealDeadline} 
                  onTimeout={() => console.log('揭示阶段超时')} 
                  isPaused={false}
                />
                <p className="mt-2 text-xs text-blue-300">揭示有严格时间限制，请耐心等待</p>
                
                <div className="mt-3 p-2 bg-blue-800/40 border border-blue-500/30 rounded text-blue-200 text-sm">
                  <p><span className="font-bold">提示：</span> 对手也需要揭示移动才能确定本回合结果</p>
                  <p className="mt-1">如果对手超时未揭示，您可以在计时结束后点击<span className="font-bold text-blue-300">游戏控制</span>区域中的<span className="font-bold text-blue-300">超时处理</span>按钮</p>
                </div>
              </div>
            )}
            
            {phase === 'both_revealed' && (
              <div className="text-center bg-blue-900/80 border border-blue-300 text-blue-100 px-4 py-3 rounded relative mt-4 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                <p className="mb-2 font-bold">双方均已揭示移动！</p>
                <p>正在计算回合结果...</p>
                <p className="mt-2 text-xs text-blue-300">区块链正在处理数据，请稍候</p>
              </div>
            )}
            
            {/* waiting_opponent_reveal 状态的UI已在上面实现 */}
            
            {/* 移除重复的waiting_my_reveal状态提示框和按钮，因为已经在顶部有提示 */}
          </div>
        )}
        
        <div className="mt-8 border-t border-blue-400/30 pt-4">
          <div className="flex justify-between text-sm text-blue-200">
            <div>
              <span className="font-bold">游戏ID: </span>
              <span className="font-mono">{game.id}</span>
            </div>
            <div>
              <span className="font-bold">投注: </span>
              <span>{ethers.utils.formatEther(game.betAmount)} MAG</span>
            </div>
          </div>
          
          {/* 游戏控制选项 */}
          <div className="mt-4 border-t border-amber-200 pt-4">
            <h3 className="text-md font-medieval text-blue-200 mb-3">游戏控制</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* 取消游戏按钮 - 仅当玩家是创建者且状态为Created时显示 */}
              {game.isPlayer1 && game.state === 0 && !game.player2 && (
                <button
                  onClick={handleCancelGame}
                  className="py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                >
                  取消游戏
                </button>
              )}
              
              {/* 加入超时按钮 - 当超过加入期限且状态为Created时显示 */}
              {game.state === 0 && game.joinDeadline > 0 && isTimeoutByBlockchain(game.joinDeadline) && (
                <button
                  onClick={handleTimeoutJoin}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                >
                  超时处理 (加入)
                </button>
              )}
              
              {/* 揭示超时按钮 - 当在Committed状态，且满足下列条件时显示：
                  1. revealDeadline已过期
                  2. 玩家已揭示移动
                  3. 对手未揭示移动 
              */}
              {game.state === 1 && game.revealDeadline > 0 && isTimeoutByBlockchain(game.revealDeadline) && (
                (game.isPlayer1 && game.moves?.player1?.revealed && !game.moves?.player2?.revealed ||
                 game.isPlayer2 && game.moves?.player2?.revealed && !game.moves?.player1?.revealed) && (
                  <button
                    onClick={handleTimeoutReveal}
                    className="py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm"
                  >
                    超时处理 (揭示)
                  </button>
                )
              )}
              
              {/* 提交超时按钮 - 当在CommitPhase状态(5)或游戏有第二位玩家的Created状态(0)，且commitDeadline已过期时显示 */}
              {(game.state === 5 || (game.state === 0 && game.player2)) && game.commitDeadline > 0 && isTimeoutByBlockchain(game.commitDeadline) && (
                <button
                  onClick={handleTimeoutCommit}
                  className="py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
                >
                  超时处理 (提交)
                </button>
              )}
              
              {/* 返回游戏列表按钮 */}
              <button
                onClick={() => router.push('/games')}
                className="py-2 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm"
              >
                返回游戏列表
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 检查用户是否已连接钱包
  if (!isConnected) {
    return (
      <div className="bg-blue-900/40 backdrop-blur-sm border-2 border-blue-500/30 rounded-lg p-6 shadow-[0_0_15px_rgba(59,130,246,0.3)] max-w-xl mx-auto text-center">
        <h2 className="text-2xl font-medieval text-blue-200 mb-4">请先连接钱包</h2>
        <p className="text-blue-300 mb-4">您需要连接钱包才能查看和参与游戏</p>
        <button
          onClick={() => router.push('/')}
          className="py-2 px-6 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medieval transition-colors"
        >
          返回首页
        </button>
      </div>
    );
  }
  
  return (
    <div className="game-component relative">
      <Toaster position="top-center" />
      
      {/* 手动刷新按钮 */}
      <div className="absolute top-3 right-3 z-30">
        <button 
          onClick={handleManualRefresh}
          disabled={refreshing}
          className="flex items-center justify-center p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
          title="刷新游戏状态"
        >
          <RefreshCw size={20} className={`${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <div className="max-w-4xl mx-auto py-4">
        <div className="mb-6">
          <button
            onClick={() => router.push('/games')}
            className="flex items-center text-amber-800 hover:text-amber-600 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回游戏列表
          </button>
        </div>
        {renderGameContent()}
      </div>
    </div>
  );
}