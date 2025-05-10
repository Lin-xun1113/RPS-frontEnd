import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAccount, useProvider, useSigner } from 'wagmi';
import Layout from '../components/Layout';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Head from 'next/head';
import { ethers } from 'ethers';
import { toast, Toaster } from 'react-hot-toast';
import { ROCK_PAPER_SCISSORS_ADDRESS, ABI, WINNING_TOKEN_ADDRESS, TOKEN_ABI, GAME_STATES } from '../constants/contractInfo';
import { createTransactionParams } from '../utils/transactionUtils';

// 安全的客户端组件包装器
const SafeHydrate = ({ children }) => {
  return (
    <div suppressHydrationWarning>
      {typeof window === 'undefined' ? null : children}
    </div>
  );
};

// 页面主组件 - 使用Layout作为顶层容器
export default function GamesSafeWrapper() {
  return (
    <Layout>
      <Head>
        <title>游戏列表 | 石头剑刀布游戏</title>
        <meta name="description" content="查看并加入石头剑刀布游戏，高雅的区块链对决游戏。" />
      </Head>
      <SafeHydrate>
        <GamesContent />
      </SafeHydrate>
    </Layout>
  );
}

// 使用动态导入避免服务端渲染React Query相关组件
const GamesContent = dynamic(() => Promise.resolve(GamesWithoutLayout), {
  ssr: false,
  loading: () => (
    <div className="max-w-5xl mx-auto flex justify-center items-center" style={{ minHeight: '60vh' }}>
      <div className="animate-spin w-12 h-12 border-4 border-amber-800 border-t-transparent rounded-full"></div>
      <p className="ml-4 text-amber-800">正在加载游戏数据...</p>
    </div>
  )
});

// 创建没有Layout包装的纯内容组件
function GamesWithoutLayout() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const provider = useProvider();
  const { data: signer } = useSigner(); // 直接使用wagmi的useSigner钩子
  
  // 初始化主要state hooks
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, eth, token, my
  const [showJoinableOnly, setShowJoinableOnly] = useState(false); // 新增：只显示可加入的游戏
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // 用于客户端渲染检测
  const [maxBlockRange, setMaxBlockRange] = useState(20000); // 默认查询最大20000个区块
  const [loadingMoreBlocks, setLoadingMoreBlocks] = useState(false); // 加载更多区块状态
  
  // 调试日志 - signer状态
  useEffect(() => {
    if (isMounted) {
      console.log('Signer状态更新:', signer ? '已加载' : '未加载');
    }
  }, [signer, isMounted]);
  
  // 客户端挂载检测 - 设置客户端状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('客户端挂载中...');
      setIsMounted(true);
    }
  }, []);

  // 使用useMemo缓存合约实例
  const contract = useMemo(() => {
    if (!provider) return null;
    return new ethers.Contract(
      ROCK_PAPER_SCISSORS_ADDRESS, 
      ABI, 
      provider
    );
  }, [provider]);
  
  // 从合约事件获取游戏列表（使用动态区块范围和分页优化性能）
  const fetchGameIdsFromEvents = useCallback(async (maxResults = 50, minDesiredResults = 5, customBlockRange = null) => {
    try {
      if (!contract) return [];
      
      // 获取当前区块高度
      const latestBlock = await provider.getBlockNumber();
      console.log('当前区块高度:', latestBlock);
      
      // 如果提供了自定义区块范围，则直接使用
      if (customBlockRange) {
        console.log(`使用自定义区块范围: ${customBlockRange} 个区块`);
        const fromBlock = Math.max(0, latestBlock - customBlockRange);
        
        console.log(`查询区块范围: 从 ${fromBlock} 到最新区块`);
        
        // 获取GameCreated事件
        const createEvents = await contract.queryFilter(
          contract.filters.GameCreated(), 
          fromBlock, 
          'latest'
        );
        
        console.log(`查询到 ${createEvents.length} 个游戏创建事件`);
        
        // 提取游戏ID和基本信息
        const gameIds = createEvents
          .slice(0, maxResults)
          .map(event => {
            // ...获取游戏数据的逻辑保持不变...
            const gameId = event.args[0].toString();
            const creator = event.args[1];
            const bet = event.args[2];
            const totalTurns = event.args[3];
            const isTokenGame = bet.toString() === '0';
            let creationTime = new Date().getTime();
            
            if (event.blockTimestamp) {
              creationTime = new Date(event.blockTimestamp * 1000).getTime();
            }
            
            return {
              id: gameId.toString(),
              creator,
              betAmount: bet,
              blockNumber: event.blockNumber,
              totalTurns: typeof totalTurns === 'object' && totalTurns.toNumber ? totalTurns.toNumber() : Number(totalTurns || 0),
              gameType: isTokenGame ? 'token' : 'eth',
              createdAt: creationTime,
            };
          });
        
        return gameIds;
      }
      
      // 定义可能的查询范围（区块数量）
      const blockRanges = [5000, 10000, maxBlockRange]; // 使用当前设置的最大区块范围
      let createEvents = [];
      
      // 动态调整查询范围以获取足够的游戏
      for (let i = 0; i < blockRanges.length; i++) {
        const currentMaxBlocks = blockRanges[i];
        const fromBlock = Math.max(0, latestBlock - currentMaxBlocks);
        
        console.log(`尝试查询 ${currentMaxBlocks} 个区块，从 ${fromBlock} 到最新区块`);
        
        // 获取GameCreated事件
        createEvents = await contract.queryFilter(
          contract.filters.GameCreated(), 
          fromBlock, 
          'latest'
        );
        
        console.log(`查询到 ${createEvents.length} 个游戏创建事件`);
        
        // 如果查询到足够多的游戏，或者已经尝试了最大范围，则停止查询
        if (createEvents.length >= minDesiredResults || i === blockRanges.length - 1) {
          console.log(`已查询到 ${createEvents.length} 个游戏，${createEvents.length >= minDesiredResults ? '数量足够' : '已达到最大查询范围'}`);
          break;
        } else {
          console.log(`查询到的游戏数量不足(${createEvents.length}/${minDesiredResults})，尝试扩大查询范围`);
        }
      }
      
      // 提取游戏ID和基本信息
      const gameIds = createEvents
        .slice(0, maxResults)
        .map(event => {
          const gameId = event.args[0].toString();
          const creator = event.args[1];
          const bet = event.args[2];
          const totalTurns = event.args[3];
          // 根据bet金额判断游戏类型（0表示代币游戏，>0表示ETH游戏）
          const isTokenGame = bet.toString() === '0';
          let creationTime = new Date().getTime(); // 使用当前时间作为创建时间
          
          // 如果transaction的时间戳可用，则使用该时间戳
          if (event.blockTimestamp) {
            creationTime = new Date(event.blockTimestamp * 1000).getTime();
          }
          
          return {
            id: gameId.toString(),
            creator,
            betAmount: bet,
            blockNumber: event.blockNumber,
            totalTurns: typeof totalTurns === 'object' && totalTurns.toNumber ? totalTurns.toNumber() : Number(totalTurns || 0),
            gameType: isTokenGame ? 'token' : 'eth',
            createdAt: creationTime,
          };
        });
      
      return gameIds;
    } catch (error) {
      console.error('[生产环境错误] 获取游戏事件失败:', error);
      setError('无法连接区块链网络，请检查您的网络连接并刷新页面');
      return [];
    }
  }, [contract, provider]);

  // 批量获取游戏详情
  const fetchGameDetails = useCallback(async (gameBasicInfoList) => {
    try {
      if (!contract || !gameBasicInfoList.length) return [];
      
      // 批量获取游戏详情
      const promises = gameBasicInfoList.map(async (basicInfo) => {
        try {
          const gameId = basicInfo.id;
          
          // 尝试获取游戏状态
          let creator, player2, bet, totalTurns, player1Score, player2Score, currentTurn, state, joinDeadline;
          try {
            // 注意：直接使用games函数
            const gameInfo = await contract.games(gameId);
            
            // 保存原始数据方便调试
            const rawGameInfo = [];
            for (let i = 0; i < gameInfo.length; i++) {
              rawGameInfo.push(gameInfo[i] && gameInfo[i].toString ? gameInfo[i].toString() : gameInfo[i]);
            }
            console.log(`游戏ID ${gameId} 原始数据:`, rawGameInfo);

            // 从游戏基本信息中提取数据 - 按照合约Game结构体定义的顺序
            // address playerA, address playerB, uint256 bet, uint256 timeoutInterval, 
            // uint256 revealDeadline, uint256 creationTime, uint256 joinDeadline, 
            // uint256 totalTurns, uint256 currentTurn, bytes32 commitA, bytes32 commitB, 
            // uint8 moveA, uint8 moveB, uint8 scoreA, uint8 scoreB, uint8 state
            creator = gameInfo[0]; // playerA
            player2 = gameInfo[1]; // playerB
            bet = gameInfo[2];     // bet
            const timeoutInterval = gameInfo[3]; // 超时时间
            const revealDeadline = gameInfo[4]; // 揭示阶段截止时间
            const creationTime = gameInfo[5]; // 游戏创建时间
            joinDeadline = gameInfo[6]; // 加入游戏截止时间
            totalTurns = gameInfo[7]; // 总回合数
            currentTurn = gameInfo[8]; // 当前回合
            const commitA = gameInfo[9]; // 玩家A的提交哈希
            const commitB = gameInfo[10]; // 玩家B的提交哈希
            const moveA = gameInfo[11]; // 玩家A的移动
            const moveB = gameInfo[12]; // 玩家B的移动
            player1Score = gameInfo[13]; // 玩家A得分
            player2Score = gameInfo[14]; // 玩家B得分
            state = gameInfo[15]; // 游戏状态 - 索引为15
            
            console.log('解析游戏数据 - 超时时间:', timeoutInterval.toString(), 
                      '总回合数:', totalTurns.toString(), 
                      '游戏状态:', state, 
                      '状态名称:', GAME_STATES[state]);
          } catch (statusError) {
            // 如果获取失败则记录错误
            console.warn(`[警告] 游戏 #${gameId} 获取状态失败:`, statusError.message);
            return null; // 跳过这个游戏
          }
          
          // 缓存结果到一个结构化对象
          return {
            ...basicInfo,
            status: GAME_STATES[state] || 'unknown',
            player2: player2 !== ethers.constants.AddressZero ? player2 : null,
            player1Score: typeof player1Score === 'object' && player1Score.toNumber ? player1Score.toNumber() : Number(player1Score || 0),
            player2Score: typeof player2Score === 'object' && player2Score.toNumber ? player2Score.toNumber() : Number(player2Score || 0),
            currentTurn: typeof currentTurn === 'object' && currentTurn.toNumber ? currentTurn.toNumber() : Number(currentTurn || 0),
            joinDeadline: typeof joinDeadline === 'object' && joinDeadline.toNumber ? joinDeadline.toNumber() : Number(joinDeadline || 0),
            lastUpdated: Date.now()
          };
        } catch (error) {
          console.warn(`[生产环境警告] 获取游戏 #${basicInfo.id} 详情失败:`, error);
          return null; // 单个游戏详情获取失败不应影响其他游戏
        }
      });
      
      // 并行执行所有获取请求 - 请注意这里会有大量网络请求，如有性能问题考虑分批执行
      const results = await Promise.all(promises);
      
      // 过滤掉失败的请求
      return results.filter(game => game !== null);
    } catch (error) {
      console.error('[生产环境错误] 批量获取游戏详情失败:', error);
      return [];
    }
  }, [contract]);

  // 主获取游戏函数（生产环境实现）
  const fetchGames = useCallback(async (customBlockRange = null) => {
    if (!isConnected || !contract) return;

    try {
      // 只有在正常加载时设置loading状态，在加载更多区块时不设置
      if (!customBlockRange) {
        setLoading(true);
      }
      setError(null);
      
      // 获取游戏基本信息列表 - 指定结果数量上限和最小期望结果数量
      // 最多返回100个游戏，但至少希望有10个游戏
      // 如果提供了自定义区块范围，则使用该范围
      const gameBasicInfoList = await fetchGameIdsFromEvents(100, 10, customBlockRange);
      
      // 如果没有游戏，直接返回
      if (!gameBasicInfoList.length) {
        setGames([]);
        setLastUpdated(Date.now());
        return;
      }
      
      // 批量获取游戏详情
      const gamesWithDetails = await fetchGameDetails(gameBasicInfoList);
      
      // 应用筛选
      let filteredGames;
      // 输出调试信息
      console.log('获取到的所有游戏:', gamesWithDetails);
      console.log('当前用户地址:', address);
      
      // 先按类型筛选
      if (filter === 'all') {
        filteredGames = gamesWithDetails;
      } else if (filter === 'my') {
        // 筛选当前用户创建的游戏
        console.log('筛选我的游戏...');
        filteredGames = gamesWithDetails.filter(game => {
          console.log(`比较游戏${game.id}创建者:`, game.creator, '与当前用户:', address);
          return game.creator && game.creator.toLowerCase() === address?.toLowerCase();
        });
        console.log('我的游戏筛选结果:', filteredGames);
      } else {
        // 按游戏类型筛选 (eth/token)
        filteredGames = gamesWithDetails.filter(game => game.gameType === filter);
      }
      
      // 如果选择只显示可加入的游戏，进一步筛选
      if (showJoinableOnly) {
        console.log('只显示等待玩家的游戏');
        // 输出筛选前的所有游戏状态
        console.log('筛选前游戏状态:', filteredGames.map(g => ({
          id: g.id, 
          status: g.status, 
          normalizedStatus: String(g.status).toUpperCase(),
          creator: g.creator ? g.creator.slice(0, 8) : 'null',
          playerB: g.player2 ? g.player2.slice(0, 8) : 'null',
          isUserCreator: g.creator && g.creator.toLowerCase() === address?.toLowerCase()
        })));
        
        // 重新定义筛选逻辑，确保正确识别可加入的游戏
        filteredGames = filteredGames.filter(game => {
          // 三种查找游戏状态的方式
          const gameStatus = String(game.status || '').toUpperCase();
          const gameStateNumeric = typeof game.state === 'number' ? game.state : -1;
          const statusText = getLocalizedStatus(game.status);

          // 判断当前用户是否是创建者
          const isCreator = game.creator && game.creator.toLowerCase() === address?.toLowerCase();
          
          // 判断游戏是否已有第二个玩家
          const hasSecondPlayer = game.player2 && game.player2 !== ethers.constants.AddressZero;
          
          // 根据多种方式判断游戏是否处于'CREATED'状态
          const isCreatedState = 
            gameStatus === 'CREATED' || 
            gameStateNumeric === 0 || 
            statusText === '等待玩家' ||
            (game.player2 === ethers.constants.AddressZero && game.state === 0);
            
          // 只返回正在等待玩家加入且当前用户不是创建者的游戏
          const canJoin = isCreatedState && !isCreator && !hasSecondPlayer;
          
          // 游戏状态调试日志
          if (isCreatedState) {
            console.log(`可加入游戏 #${game.id}: 状态=${game.status}, 是否创建者=${isCreator}, 是否有玩家2=${hasSecondPlayer}, 可加入=${canJoin}`);
          }
          
          return canJoin;
        });
        
        // 输出筛选后的所有游戏状态
        console.log('筛选后游戏状态:', filteredGames.map(g => ({id: g.id, status: g.status, normalizedStatus: String(g.status).toUpperCase()})));
      }
      
      // 排序：按创建时间/ID降序
      filteredGames.sort((a, b) => {
        // 优先按区块号排序（如果有）
        if (a.blockNumber && b.blockNumber) {
          return b.blockNumber - a.blockNumber;
        }
        // 其次按ID排序
        return parseInt(b.id) - parseInt(a.id);
      });
      
      setGames(filteredGames);
      setLastUpdated(Date.now());
    } catch (error) {
      console.error('[生产环境错误] 获取游戏列表失败:', error);
      setError('获取游戏数据时发生错误，请稍后再试');
      toast.error('获取游戏列表失败');
    } finally {
      setLoading(false);
    }
  }, [contract, filter, isConnected, fetchGameIdsFromEvents, fetchGameDetails, address]);

  // 客户端渲染检测
  useEffect(() => {
    console.log('客户端挂载中...');
    setIsMounted(true);
  }, []);

  // 初始加载和筛选切换时获取游戏列表
  useEffect(() => {
    if (isConnected && contract && isMounted) {
      console.log('筛选条件改变，重新获取游戏数据');
      console.log('filter:', filter, 'showJoinableOnly:', showJoinableOnly);
      fetchGames();
    } else if (!isConnected) {
      setGames([]);
      setLoading(false);
      setError(null);
    }
  }, [isConnected, contract, fetchGames, isMounted, filter, showJoinableOnly]);
  
  // 监听合约事件实现实时更新
  useEffect(() => {
    if (!contract || !isConnected) return;

    const setupEventListeners = () => {
      // 游戏创建事件
      const gameCreatedFilter = contract.filters.GameCreated();
      // 游戏加入事件
      const gameJoinedFilter = contract.filters.PlayerJoined();
      // 游戏完成事件
      const gameFinishedFilter = contract.filters.GameFinished();

      const handleGameEvent = () => {
        // 使用节流避免短时间内多次更新
        if (!isRefreshing) {
          setIsRefreshing(true);
          fetchGames().finally(() => {
            setTimeout(() => setIsRefreshing(false), 3000); // 3秒内不重复更新
          });
        }
      };

      // 添加事件监听器
      contract.on(gameCreatedFilter, handleGameEvent);
      contract.on(gameJoinedFilter, handleGameEvent);
      contract.on(gameFinishedFilter, handleGameEvent);

      // 清理函数
      return () => {
        contract.off(gameCreatedFilter, handleGameEvent);
        contract.off(gameJoinedFilter, handleGameEvent);
        contract.off(gameFinishedFilter, handleGameEvent);
      };
    };

    const cleanup = setupEventListeners();
    return cleanup;
  }, [contract, isConnected, isRefreshing, fetchGames]);

  // 点击加入游戏
  const handleJoinGame = useCallback(async (gameId, bet) => {
    if (!signer || !contract) {
      toast.error('未连接钱包或合约实例初始化失败');
      return;
    }

    try {
      // 创建可签名合约实例
      const signerContract = contract.connect(signer);

      // 是否是代币游戏
      const game = games.find(g => g.id === gameId);
      const isTokenGame = game?.gameType === 'token';

      toast.loading('正在准备加入游戏...', { id: 'join-game' });
      let tx;
      
      try {
        if (isTokenGame) {
          // 如果是代币游戏，需要先授权代币使用
          try {
            // 创建代币合约实例
            const tokenContract = new ethers.Contract(
              WINNING_TOKEN_ADDRESS,
              [
                'function approve(address spender, uint256 amount) external returns (bool)',
                'function allowance(address owner, address spender) external view returns (uint256)'
              ],
              signer
            );
            
            // 检查当前授权额度
            const address = await signer.getAddress();
            const allowance = await tokenContract.allowance(address, ROCK_PAPER_SCISSORS_ADDRESS);
            
            // 如果授权额度不足，需要请求授权
            if (allowance.lt(1)) {
              toast.loading('正在授权代币...', { id: 'join-game' });
              const approveTx = await tokenContract.approve(ROCK_PAPER_SCISSORS_ADDRESS, 1);
              await approveTx.wait();
              toast.loading('授权成功，正在加入游戏...', { id: 'join-game' });
            }
          } catch (approveError) {
            console.error('[生产环境错误] 代币授权失败:', approveError);
            toast.error(`代币授权失败: ${approveError.message.slice(0, 50)}...`, { id: 'join-game' });
            return;
          }
          
          // 授权成功后加入代币游戏
          tx = await signerContract.joinGameWithToken(gameId);
          console.log('加入代币游戏:', gameId);
        } else {
          // ETH游戏使用joinGameWithEth函数，需要发送相同金额的ETH
          tx = await signerContract.joinGameWithEth(gameId, createTransactionParams({ value: bet }));
          console.log('加入MAG游戏:', gameId, '下注:', ethers.utils.formatEther(bet), 'MAG');
        }
        
        // 等待交易确认
        toast.loading('等待区块确认...', { id: 'join-game' });
        await tx.wait();
        
        toast.success('成功加入游戏!', { id: 'join-game' });
      } catch (error) {
        console.error('[生产环境错误] 加入游戏失败:', error);
        
        // 检查特定错误类型
        const errorMessage = error.message || '';
        if (errorMessage.includes('Game already has a second player')) {
          toast.error('无法加入游戏: 该游戏已有第二位玩家', { id: 'join-game' });
          // 刷新游戏列表以更新状态
          fetchGames();
        } else {
          toast.error(`加入游戏失败: ${errorMessage.slice(0, 50)}...`, { id: 'join-game' });
        }
        return;
      }
      
      // 跳转到游戏详情页，并向URL添加refresh参数强制刷新
      router.push({
        pathname: `/game/${gameId}`,
        query: { refresh: Date.now() } // 添加时间戳参数强制刷新
      });
    } catch (error) {
      console.error('[生产环境错误] 加入游戏失败:', error);
      toast.error(`加入游戏失败: ${error.message || error.reason || '未知错误'}`, { id: 'join-game' });
    }
  }, [contract, games, router, signer]);
  
  // 加载更多区块的函数
  const loadMoreBlocks = useCallback(async () => {
    if (loadingMoreBlocks || !contract || !isConnected) return;
    
    try {
      setLoadingMoreBlocks(true);
      
      // 增加区块范围（增加50000个区块）
      const newBlockRange = maxBlockRange + 50000;
      setMaxBlockRange(newBlockRange);
      
      console.log(`增加区块范围至${newBlockRange}个区块`);
      
      // 使用新的区块范围获取游戏列表
      await fetchGames(newBlockRange);
      
    } catch (error) {
      console.error('加载更多区块失败:', error);
      toast.error('加载更多区块失败，请稍后再试');
    } finally {
      setLoadingMoreBlocks(false);
    }
  }, [contract, isConnected, fetchGames, loadingMoreBlocks, maxBlockRange]);
  
  // 手动刷新游戏列表
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    await fetchGames();
    setTimeout(() => setIsRefreshing(false), 1000);
  }, [fetchGames, isRefreshing]);

  // 筛选按钮组件
  const FilterButton = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`py-2 px-4 font-medieval rounded-md transition-all duration-300 ${
        active 
          ? 'bg-amber-800 text-amber-100 shadow-md' 
          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
      }`}
    >
      {children}
    </button>
  );

  // 游戏卡片组件
  const GameCard = ({ game, currentUser, onJoin }) => {
    const isCreator = game.creator?.toLowerCase() === currentUser?.toLowerCase();
    // 判断游戏是否已有第二个玩家 (无论状态如何)
    const hasSecondPlayer = game.player2 && game.player2 !== ethers.constants.AddressZero;
    // 使用大小写不敏感的比较，并且确保没有第二个玩家
    const canJoin = String(game.status).toUpperCase() === 'CREATED' && !isCreator && !hasSecondPlayer;
    const isParticipant = isCreator || game.player2?.toLowerCase() === currentUser?.toLowerCase();
    const formattedBet = game.betAmount ? ethers.utils.formatEther(game.betAmount) : '0';
    
    return (
      <motion.div
        whileHover={{ y: -5 }}
        className="bg-amber-50 border border-amber-300 rounded-lg p-6 shadow-md"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-medieval text-amber-900">游戏 #{game.id}</h3>
            <p className="text-sm text-amber-700">
              {new Date(game.createdAt).toLocaleString()}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medieval ${
            game.gameType === 'eth' 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-purple-100 text-purple-800'
          }`}>
            {game.gameType === 'eth' ? 'MAG游戏' : '代币游戏'}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-amber-700">回合数:</span>
            <span className="font-medium text-amber-900">{game.totalTurns}</span>
          </div>
          {game.gameType === 'eth' && (
            <div className="flex justify-between mb-2">
              <span className="text-amber-700">投注金额:</span>
              <span className="font-medium text-amber-900">
                {formattedBet} MAG
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-amber-700">状态:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusInfo(game.status).color} border border-current`}>
              {getLocalizedStatus(game.status)}
            </span>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-amber-700">创建者:</span>
            <span className="font-medium text-amber-900">
              {shortenAddress(game.creator)}
              {isCreator && <span className="ml-1 text-xs text-amber-600">(您)</span>}
            </span>
          </div>
          {game.player2 && (
            <div className="flex justify-between mt-2">
              <span className="text-amber-700">玩家2:</span>
              <span className="font-medium text-amber-900">
                {shortenAddress(game.player2)}
                {game.player2?.toLowerCase() === currentUser?.toLowerCase() && 
                  <span className="ml-1 text-xs text-amber-600">(您)</span>
                }
              </span>
            </div>
          )}
        </div>
        
        <div className="mt-6">
          {canJoin ? (
            <button
              onClick={() => onJoin(game.id, game.betAmount)}
              className="w-full py-2 bg-gradient-to-r from-amber-600 to-amber-800 text-amber-100 font-medieval rounded border border-amber-700 shadow-sm hover:shadow-md transition-all duration-300"
            >
              加入游戏
            </button>
          ) : isParticipant ? (
            // 根据游戏状态显示不同的按钮样式和文本
            <button
              onClick={() => router.push(`/game/${game.id}`)}
              className={`w-full py-2 font-medieval rounded border shadow-sm hover:shadow-md transition-all duration-300 ${
                String(game.status).toUpperCase() === 'FINISHED' || 
                String(game.status).toUpperCase() === 'REVEALED' && game.currentTurn >= game.totalTurns ?
                  'bg-gradient-to-r from-purple-600 to-purple-800 text-purple-100 border-purple-700' :
                String(game.status).toUpperCase() === 'CANCELLED' ?
                  'bg-gradient-to-r from-red-600 to-red-800 text-red-100 border-red-700' :
                String(game.status).toUpperCase() === 'COMMITTED' || 
                String(game.status).toUpperCase() === 'COMMITPHASE' ?
                  'bg-gradient-to-r from-blue-600 to-blue-800 text-blue-100 border-blue-700' :
                  'bg-gradient-to-r from-green-600 to-green-800 text-green-100 border-green-700'
              }`}
            >
              {String(game.status).toUpperCase() === 'FINISHED' ? '查看结果' :
               String(game.status).toUpperCase() === 'CANCELLED' ? '已取消' :
               String(game.status).toUpperCase() === 'REVEALED' && game.currentTurn >= game.totalTurns ? '查看结果' :
               '继续游戏'}
            </button>
          ) : (
            <button
              onClick={() => router.push(`/game/${game.id}`)}
              className="w-full py-2 bg-amber-200 text-amber-800 font-medieval rounded border border-amber-300 hover:bg-amber-300 transition-all duration-300"
            >
              查看游戏
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  // 辅助函数
  const shortenAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'CREATED': return 'bg-blue-100 text-blue-800';
      case 'ACTIVE': return 'bg-amber-100 text-amber-800';
      case 'FINISHED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusInfo = (status) => {
    // 确保状态是字符串并统一转换为大写进行比较
    const normalizedStatus = String(status).toUpperCase();
    
    // 状态映射对象，包含文本和颜色
    const statusMap = {
      'CREATED': { text: '等待玩家', color: 'bg-green-100 text-green-800' },
      'ACTIVE': { text: '进行中', color: 'bg-amber-100 text-amber-800' },
      'COMMITTED': { text: '揭示阶段', color: 'bg-indigo-100 text-indigo-800' },
      'COMMITPHASE': { text: '提交阶段', color: 'bg-blue-100 text-blue-800' },
      'REVEALED': { text: '揭示阶段', color: 'bg-indigo-100 text-indigo-800' },
      'REVEALPHASE': { text: '揭示阶段', color: 'bg-indigo-100 text-indigo-800' },
      'FINISHED': { text: '已结束', color: 'bg-gray-700 text-gray-100' },
      'CANCELLED': { text: '已取消', color: 'bg-red-700 text-red-100' }
    };
    
    return statusMap[normalizedStatus] || { text: '未知(' + status + ')', color: 'bg-gray-100 text-gray-800' };
  };
  
  const getLocalizedStatus = (status) => {
    return getStatusInfo(status).text;
  };

  // 游戏列表页面内容 - 没有外层Layout
  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-medieval text-amber-900 mb-6">请先连接钱包以查看游戏</h2>
      </div>
    );
  }
  
  return (
    <div className="max-w-5xl mx-auto">
      <Head>
        <title>游戏列表 | 石头剪刀布游戏</title>
        <meta name="description" content="查看并加入石头剪刀布游戏，高雅的区块链对决游戏。" />
      </Head>
      {!isMounted ? (
        <div className="max-w-5xl mx-auto flex justify-center items-center" style={{ minHeight: '60vh' }}>
          <div className="animate-spin w-12 h-12 border-4 border-amber-800 border-t-transparent rounded-full"></div>
          <p className="ml-4 text-amber-800">加载中...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-5xl mx-auto"
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-medieval text-amber-900">游戏列表</h1>
              {lastUpdated && (
                <p className="text-xs text-amber-700 mt-1">
                  最后更新: {new Date(lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className={`p-2 rounded-full border-2 border-amber-600 ${isRefreshing ? 'bg-amber-200' : 'bg-amber-100 hover:bg-amber-200'} transition-all duration-300`}
                aria-label="刷新游戏列表"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-amber-800 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/create-game')}
                className="py-2 px-6 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-medieval rounded-md border-2 border-amber-600 shadow-md hover:shadow-amber-600/20 transition-all duration-300"
              >
                创建游戏
              </motion.button>
            </div>
          </div>

          <div className="relative min-h-[600px] mb-8 overflow-hidden rounded-lg">
            {/* 固定大小的卷轴背景，不受内容变化影响 */}
            <div className="absolute inset-0" style={{
              backgroundImage: 'url(/images/scroll-wide.png)', 
              backgroundSize: 'cover', 
              backgroundPosition: 'center', 
              backgroundRepeat: 'no-repeat', 
              zIndex: 0
            }}></div>
            
            {/* 内容容器 */}
            <div className="relative z-10 py-10 px-8">
              {/* 过滤按钮 */}
              <div className="relative w-full">
                {/* 只显示可加入的游戏勾选框 - 放在左上角的游戏列表的稍偏右下一些的位置 */}
                <div className="absolute -top-10 right-0 flex items-center">
                  <input
                    type="checkbox"
                    id="showJoinableOnly"
                    checked={showJoinableOnly}
                    onChange={(e) => {
                      // 获取新的勾选状态
                      const newState = e.target.checked;
                      console.log('勾选状态变更:', newState);
                      
                      // 更新状态
                      setShowJoinableOnly(newState);
                      
                      // 当前所选的分类
                      const currentFilter = filter;
                      console.log('当前筛选分类:', currentFilter);
                      
                      // 模拟用户点击另一个分类，然后再点回来
                      // 先切换到一个不同的分类
                      const tempFilter = currentFilter === 'all' ? 'eth' : 'all';
                      console.log('临时切换到分类:', tempFilter);
                      
                      // 执行顺序：先切换到临时分类，然后快速切回原分类
                      setTimeout(() => {
                        setFilter(tempFilter);
                        
                        // 等待100ms后切回原来的分类
                        setTimeout(() => {
                          console.log('切回原始分类:', currentFilter);
                          setFilter(currentFilter);
                        }, 100);
                      }, 10);
                    }}
                    className="mr-2 h-4 w-4 text-amber-900 border-amber-700 focus:ring-amber-700"
                  />
                  <label htmlFor="showJoinableOnly" className="text-amber-900 font-medieval cursor-pointer select-none text-xl">
                    只显示可加入的游戏
                  </label>
                </div>
                
                <div className="flex justify-center space-x-4 mb-8 mt-4">
                  <FilterButton 
                    active={filter === 'all'}
                    onClick={() => setFilter('all')}
                  >
                    全部游戏
                  </FilterButton>
                  <FilterButton 
                    active={filter === 'eth'}
                    onClick={() => setFilter('eth')}
                  >
                    MAG游戏
                  </FilterButton>
                  <FilterButton 
                    active={filter === 'token'}
                    onClick={() => setFilter('token')}
                  >
                    代币游戏
                  </FilterButton>
                  <FilterButton 
                    active={filter === 'my'}
                    onClick={() => setFilter('my')}
                  >
                    我的游戏
                  </FilterButton>
                </div>
              </div>
              
              {/* 错误显示 */}
              {error && !loading && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-center">
                  <p className="text-red-800 font-medieval">
                    <span className="inline-block mr-2">⚠️</span>
                    {error}
                  </p>
                  <button 
                    onClick={handleRefresh}
                    className="mt-2 text-sm text-red-700 underline hover:text-red-900"
                    disabled={isRefreshing}
                  >
                    点击重试
                  </button>
                </div>
              )}
              
              {/* 加载状态 */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-amber-800 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-4 text-amber-800 font-medieval">从区块链获取游戏数据中...</p>
                </div>
              ) : games.length === 0 && !error ? (
                <div className="text-center py-20">
                  <div className="mb-6">
                    <img src="/images/empty-scroll.png" alt="无游戏" className="w-32 h-32 mx-auto opacity-60" />
                  </div>
                  <p className="text-amber-800 font-medieval mb-4">暂无{filter !== 'all' ? `${filter === 'eth' ? 'ETH' : '代币'}类型的` : ''}游戏</p>
                  <button 
                    onClick={() => router.push('/create-game')}
                    className="py-2 px-6 bg-amber-100 text-amber-800 font-medieval rounded-md border border-amber-300 hover:bg-amber-200 transition-all duration-300"
                  >
                    创建第一个游戏
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {games.map((game) => (
                    <GameCard 
                      key={game.id}
                      game={game}
                      currentUser={address}
                      onJoin={handleJoinGame}
                    />
                  ))}
                </div>
              )}
              
              {/* 游戏数量显示 */}
              {!loading && games.length > 0 && (
                <div className="text-center mt-8 text-amber-700 text-sm">
                  当前显示 {games.length} 个{filter !== 'all' ? (filter === 'eth' ? 'MAG' : '代币') : ''}游戏
                </div>
              )}
              
              {/* 加载更多区块按钮 - 无论当前筛选结果如何都显示，只要不在加载中状态 */}
              {!loading && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={loadMoreBlocks}
                    disabled={loadingMoreBlocks}
                    className={`py-2 px-6 rounded-md border-2 font-medieval text-lg transition-all duration-300 ${
                      loadingMoreBlocks 
                        ? 'bg-amber-100 text-amber-400 border-amber-200 cursor-not-allowed' 
                        : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 hover:border-amber-400'
                    }`}
                  >
                    {loadingMoreBlocks ? (
                      <div className="flex items-center">
                        <div className="animate-spin w-5 h-5 border-2 border-amber-800 border-t-transparent rounded-full mr-2"></div>
                        加载中...
                      </div>
                    ) : (
                      `加载更多区块 (当前: ${maxBlockRange.toLocaleString()})`
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
