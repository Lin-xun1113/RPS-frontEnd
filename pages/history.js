import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAccount, usePublicClient } from 'wagmi';
import { readContract, getContract } from 'wagmi/actions';
import { formatEther } from 'viem';

// 定义零地址常量
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
import Layout from '../components/Layout';
import { ROCK_PAPER_SCISSORS_ADDRESS, ABI, MOVES, GAME_STATES } from '../constants/contractInfo';

export default function History() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blockRange, setBlockRange] = useState(50000); // 默认查询50000个区块
  const [loadingMore, setLoadingMore] = useState(false); // 加载更多状态
  
  // Wagmi v1 不再使用 useContract钩子
  // 而是使用 readContract和 getContract actions
  
  useEffect(() => {
    if (isConnected && publicClient) {
      fetchGamesHistory();
    }
  }, [isConnected, publicClient]);
  
  // 从合约事件获取游戏列表的函数
  const fetchGameIdsFromEvents = async (maxBlocks = blockRange) => {
    try {
      if (!publicClient) return [];
      
      // 获取当前区块高度 - 使用 publicClient
      const blockNumber = await publicClient.getBlockNumber();
      const latestBlock = Number(blockNumber);
      console.log('当前区块高度:', latestBlock);
      
      // 查询区块范围 - 从 latestBlock-maxBlocks 到最新区块
      const fromBlock = Math.max(0, latestBlock - maxBlocks);
      console.log('查询区块范围:', fromBlock, '到最新区块');
      
      // 获取各类游戏事件 - 使用 Wagmi v1 API 和结构化ABI对象
      const createEvents = await publicClient.getContractEvents({
        address: ROCK_PAPER_SCISSORS_ADDRESS,
        abi: [{
          name: 'GameCreated',
          type: 'event',
          inputs: [
            { indexed: true, name: 'gameId', type: 'uint256' },
            { indexed: true, name: 'creator', type: 'address' },
            { indexed: false, name: 'bet', type: 'uint256' },
            { indexed: false, name: 'totalTurns', type: 'uint256' }
          ]
        }],
        eventName: 'GameCreated',
        fromBlock: BigInt(fromBlock),
        toBlock: 'latest'
      });
      
      const joinEvents = await publicClient.getContractEvents({
        address: ROCK_PAPER_SCISSORS_ADDRESS,
        abi: [{
          name: 'PlayerJoined',
          type: 'event',
          inputs: [
            { indexed: true, name: 'gameId', type: 'uint256' },
            { indexed: true, name: 'player', type: 'address' }
          ]
        }],
        eventName: 'PlayerJoined',
        fromBlock: BigInt(fromBlock),
        toBlock: 'latest'
      });
      
      const finishEvents = await publicClient.getContractEvents({
        address: ROCK_PAPER_SCISSORS_ADDRESS,
        abi: [{
          name: 'GameFinished',
          type: 'event',
          inputs: [
            { indexed: true, name: 'gameId', type: 'uint256' },
            { indexed: false, name: 'winner', type: 'address' },
            { indexed: false, name: 'prize', type: 'uint256' }
          ]
        }],
        eventName: 'GameFinished',
        fromBlock: BigInt(fromBlock),
        toBlock: 'latest'
      });
      
      // 筛选与当前用户相关的游戏ID
      const userGameIds = new Set();
      
      // 从创建事件中筛选 - 适配Wagmi v1的事件结构
      createEvents.forEach(event => {
        console.log('处理创建事件:', event);
        
        // 适配不同的args结构
        const args = event.args;
        let gameId, creator;
        
        if (args && typeof args === 'object' && !Array.isArray(args)) {
          // 如果args是对象格式（Wagmi v1风格）
          gameId = args.gameId;
          creator = args.creator;
        } else if (Array.isArray(args)) {
          // 如果args是数组格式（传统风格）
          gameId = args[0];
          creator = args[1];
        } else {
          console.error('无法解析事件参数:', event);
          return;
        }
        
        if (creator && gameId && creator.toLowerCase() === address.toLowerCase()) {
          userGameIds.add(gameId.toString());
        }
      });
      
      // 从加入事件中筛选 - 适配Wagmi v1的事件结构
      joinEvents.forEach(event => {
        console.log('处理加入事件:', event);
        
        // 适配不同的args结构
        const args = event.args;
        let gameId, player;
        
        if (args && typeof args === 'object' && !Array.isArray(args)) {
          // 如果args是对象格式（Wagmi v1风格）
          gameId = args.gameId;
          player = args.player;
        } else if (Array.isArray(args)) {
          // 如果args是数组格式（传统风格）
          gameId = args[0];
          player = args[1];
        } else {
          console.error('无法解析事件参数:', event);
          return;
        }
        
        if (player && gameId && player.toLowerCase() === address.toLowerCase()) {
          userGameIds.add(gameId.toString());
        }
      });
      
      // 提取游戏ID和基本信息 - 适配Wagmi v1的事件结构
      const gameIds = Array.from(userGameIds).map(gameId => {
        // 匹配游戏ID，兼容两种结构
        const createEvent = createEvents.find(e => {
          const args = e.args;
          if (args && typeof args === 'object' && !Array.isArray(args)) {
            // 如果args是对象
            return args.gameId && args.gameId.toString() === gameId;
          } else if (Array.isArray(args)) {
            // 如果args是数组
            return args[0] && args[0].toString() === gameId;
          }
          return false;
        });
        
        if (!createEvent) return { id: gameId };
        
        // 从事件中提取数据
        const args = createEvent.args;
        let gameId_event, creator, bet, totalTurns;
        
        if (args && typeof args === 'object' && !Array.isArray(args)) {
          // 如果args是对象
          gameId_event = args.gameId ? args.gameId.toString() : gameId;
          creator = args.creator;
          bet = args.bet;
          totalTurns = args.totalTurns;
        } else if (Array.isArray(args)) {
          // 如果args是数组
          gameId_event = args[0] ? args[0].toString() : gameId;
          creator = args[1];
          bet = args[2];
          totalTurns = args[3];
        } else {
          console.error('无法解析事件参数:', createEvent);
          return { id: gameId };
        }
        
        // 添加空值检查
        if (!bet || !totalTurns) {
          console.error('事件数据不完整:', createEvent);
          return { id: gameId };
        }
        
        // 根据bet金额判断游戏类型（0表示代币游戏，>0表示ETH游戏）
        const isTokenGame = bet && bet.toString() === '0';
        
        // 获取创建时间
        let creationTime = Date.now() - 86400000; // 默认为1天前
        if (createEvent.blockNumber) {
          // 后续可以通过区块高度获取时间戳
          creationTime = Date.now() - 86400000 * (Math.random() + 0.5);
        }
        
        // 查找对应的完成事件 - 适配Wagmi v1的事件结构
        const finishEvent = finishEvents.find(e => {
          const args = e.args;
          if (args && typeof args === 'object' && !Array.isArray(args)) {
            // 如果args是对象
            return args.gameId && args.gameId.toString() === gameId;
          } else if (Array.isArray(args)) {
            // 如果args是数组
            return args[0] && args[0].toString() === gameId;
          }
          return false;
        });
        
        let result = 'unknown';
        let endedAt = Date.now() - 3600000 * (Math.random() * 10 + 2); // 默认为2-12小时前
        
        if (finishEvent) {
          // 从事件中提取winner信息
          const args = finishEvent.args;
          let winner;
          
          if (args && typeof args === 'object' && !Array.isArray(args)) {
            // 如果args是对象
            winner = args.winner;
          } else if (Array.isArray(args)) {
            // 如果args是数组
            winner = args[1];
          } else {
            console.error('无法解析完成事件参数:', finishEvent);
            return { id: gameId };
          }
          
          if (winner && winner.toLowerCase() === address.toLowerCase()) {
            result = 'won';
          } else if (winner && winner.toLowerCase() !== ZERO_ADDRESS.toLowerCase()) {
            result = 'lost';
          } else {
            result = 'draw';
          }
        }
        
        return {
          id: gameId_event,
          creator,
          betAmount: bet,
          totalTurns: typeof totalTurns === 'object' && totalTurns.toNumber ? totalTurns.toNumber() : Number(totalTurns || 0),
          gameType: isTokenGame ? 'token' : 'MAG',
          createdAt: creationTime,
          endedAt: endedAt,
          result: result
        };
      });
      
      return gameIds;
    } catch (error) {
      console.error('获取游戏事件失败:', error);
      return [];
    }
  };

  // 获取游戏详情
  const fetchGameDetails = async (gameBasicInfoList) => {
    try {
      if (!publicClient || !gameBasicInfoList.length) return [];
      
      // 批量获取游戏详情
      const promises = gameBasicInfoList.map(async (basicInfo) => {
        try {
          const gameId = basicInfo.id;
          
          // 获取游戏状态
          let creator, player2, bet, totalTurns, player1Score, player2Score, currentTurn, state;
          try {
            // 使用 Wagmi v1 readContract API 获取游戏信息
            const gameInfo = await readContract({
              address: ROCK_PAPER_SCISSORS_ADDRESS,
              abi: ABI,
              functionName: 'games',
              args: [gameId]
            });
            
            console.log(`游戏ID ${gameId} 原始数据:`, gameInfo);

            // 从游戏基本信息中提取数据
            creator = gameInfo[0]; // playerA
            player2 = gameInfo[1]; // playerB
            bet = gameInfo[2];     // bet
            totalTurns = gameInfo[7]; // 总回合数
            currentTurn = gameInfo[8]; // 当前回合
            player1Score = gameInfo[13]; // 玩家A得分
            player2Score = gameInfo[14]; // 玩家B得分
            state = gameInfo[15]; // 游戏状态
          } catch (statusError) {
            console.warn(`游戏 #${gameId} 获取状态失败:`, statusError.message);
            return null; // 跳过这个游戏
          }
          
          // 判断当前用户是创建者还是加入者
          const isCreator = creator && creator.toLowerCase() === address?.toLowerCase();
          const opponent = isCreator ? player2 : creator;
          
          // 计算玩家得分
          const playerScore = isCreator ? 
            (typeof player1Score === 'object' && player1Score.toNumber ? player1Score.toNumber() : Number(player1Score || 0)) : 
            (typeof player2Score === 'object' && player2Score.toNumber ? player2Score.toNumber() : Number(player2Score || 0));
          
          const opponentScore = isCreator ? 
            (typeof player2Score === 'object' && player2Score.toNumber ? player2Score.toNumber() : Number(player2Score || 0)) : 
            (typeof player1Score === 'object' && player1Score.toNumber ? player1Score.toNumber() : Number(player1Score || 0));
          
          return {
            ...basicInfo,
            status: GAME_STATES[state] || 'unknown',
            opponent: opponent.toLowerCase() !== ZERO_ADDRESS.toLowerCase() ? opponent : null,
            playerScore: playerScore,
            opponentScore: opponentScore,
            lastUpdated: Date.now()
          };
        } catch (error) {
          console.warn(`获取游戏 #${basicInfo.id} 详情失败:`, error);
          return null; // 单个游戏详情获取失败不应影响其他游戏
        }
      });
      
      // 并行执行所有获取请求
      const results = await Promise.all(promises);
      
      // 过滤掉失败的请求
      return results.filter(game => game !== null);
    } catch (error) {
      console.error('批量获取游戏详情失败:', error);
      return [];
    }
  };

  // 加载更多区块的游戏历史
  const loadMoreGames = async () => {
    try {
      setLoadingMore(true);
      
      // 增加查询区块范围（每次增加100000个区块）
      const newBlockRange = blockRange + 100000;
      setBlockRange(newBlockRange);
      
      console.log(`增加查询区块范围至${newBlockRange}个区块`);
      
      // 使用新的区块范围获取用户相关的游戏基本信息
      const gameBasicInfoList = await fetchGameIdsFromEvents(newBlockRange);
      
      // 如果没有游戏，直接返回
      if (!gameBasicInfoList.length) {
        setLoadingMore(false);
        return;
      }
      
      // 批量获取游戏详情
      const gamesWithDetails = await fetchGameDetails(gameBasicInfoList);
      
      // 按游戏序号排序（从大到小，确保最新的游戏显示在最上面）
      gamesWithDetails.sort((a, b) => parseInt(b.id) - parseInt(a.id));
      
      setGames(gamesWithDetails);
      setLoadingMore(false);
    } catch (error) {
      console.error('加载更多游戏历史失败:', error);
      setLoadingMore(false);
    }
  };

  const fetchGamesHistory = async () => {
    try {
      setLoading(true);
      
      // 获取用户相关的游戏基本信息
      const gameBasicInfoList = await fetchGameIdsFromEvents();
      
      // 如果没有游戏，直接返回
      if (!gameBasicInfoList.length) {
        setGames([]);
        setLoading(false);
        return;
      }
      
      // 批量获取游戏详情
      const gamesWithDetails = await fetchGameDetails(gameBasicInfoList);
      
      // 按游戏序号排序（从大到小，确保最新的游戏显示在最上面）
      gamesWithDetails.sort((a, b) => parseInt(b.id) - parseInt(a.id));
      
      setGames(gamesWithDetails);
      setLoading(false);
    } catch (error) {
      console.error('获取游戏历史失败:', error);
      setLoading(false);
    }
  };
  
  if (!isConnected) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-medieval text-amber-900 mb-6">请先连接钱包以查看您的游戏历史</h2>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-medieval text-amber-900">游戏历史记录</h1>
          
          <button
            onClick={() => router.push('/games')}
            className="py-2 px-4 bg-amber-100 text-amber-800 font-medieval rounded border border-amber-300 hover:bg-amber-200 transition-all duration-300"
          >
            返回游戏列表
          </button>
        </div>
        
        {/* <div 
          className="
            bg-[url('/images/scroll-wide.png')] 
            bg-fixed 
            bg-[length:120%_auto] 
            bg-top 
            bg-no-repeat 
            py-20 
            px-16 
            mb-8
            relative
            shadow-xl
          "
        > */}
        <div className="relative mx-auto max-w-5xl"
          style={{
            backgroundImage: "url('/images/scroll-wide.png')",
            backgroundSize: "contain",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
            padding: "4rem 3rem",
            marginBottom: "2rem",
            minHeight: "700px"
          }}
        >
          <div className="bg-amber-50/90 p-6 rounded-lg shadow-inner">
            <div className="mb-6">
              <h2 className="text-2xl font-medieval text-amber-900 mb-4">游戏统计</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                  title="游戏总数" 
                  value={games.length} 
                  icon="/images/game-icon.png"
                />
                <StatCard 
                  title="胜利场数" 
                  value={games.filter(game => game.result === 'won').length} 
                  icon="/images/win-icon.png"
                />
                <StatCard 
                  title="胜率" 
                  value={`${Math.round((games.filter(game => game.result === 'won').length / games.length) * 100)}%`} 
                  icon="/images/rate-icon.png"
                />
              </div>
            </div>
            
            <h2 className="text-2xl font-medieval text-amber-900 mb-4">历史游戏</h2>
            
            {loading ? (
              <div className="text-center py-10">
                <div className="animate-spin w-12 h-12 border-4 border-amber-800 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-amber-800 font-medieval">正在加载游戏历史...</p>
              </div>
            ) : games.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-amber-800 font-medieval">您还没有参与过游戏，赶紧去创建或加入一局吧！</p>
              </div>
            ) : (
              <div className="space-y-4">
                {games.map((game) => (
                  <GameHistoryCard key={game.id} game={game} address={address} />
                ))}
                
                {/* 加载更多按钮 */}
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMoreGames}
                    disabled={loadingMore}
                    className={`py-2 px-6 rounded-md border-2 font-medieval text-lg transition-all duration-300 ${
                      loadingMore 
                        ? 'bg-amber-100 text-amber-400 border-amber-200 cursor-not-allowed' 
                        : 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 hover:border-amber-400'
                    }`}
                  >
                    {loadingMore ? (
                      <div className="flex items-center">
                        <div className="animate-spin w-5 h-5 border-2 border-amber-800 border-t-transparent rounded-full mr-2"></div>
                        加载中...
                      </div>
                    ) : (
                      `加载更多区块 (当前: ${blockRange.toLocaleString()})`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}

const StatCard = ({ title, value, icon }) => (
  <div className="bg-amber-100 border border-amber-300 rounded-lg p-4 flex items-center shadow-md">
    <div className="w-12 h-12 relative mr-4">
      <div className="w-full h-full bg-amber-200 rounded-full flex items-center justify-center">
        {icon && (
          <div className="relative w-6 h-6">
            <img src={icon} alt={title} className="w-full h-full object-contain" />
          </div>
        )}
      </div>
    </div>
    <div>
      <h3 className="text-lg font-medieval text-amber-900">{title}</h3>
      <p className="text-2xl font-bold text-amber-800">{value}</p>
    </div>
  </div>
);

const GameHistoryCard = ({ game, address }) => {
  const isCreator = game.creator === address;
  const opponent = isCreator ? game.opponent : game.creator;
  const playerScore = isCreator ? game.playerScore : game.opponentScore;
  const opponentScore = isCreator ? game.opponentScore : game.playerScore;
  
  // 不同类型的游戏状态
  const gameStatus = game.status;
  let resultStyle = '';
  let resultText = '';
  
  if (game.result === 'won') {
    resultStyle = 'bg-green-100 text-green-800';
    resultText = '胜利';
  } else if (game.result === 'lost') {
    resultStyle = 'bg-red-100 text-red-800';
    resultText = '失败';
  } else if (game.result === 'draw') {
    resultStyle = 'bg-yellow-100 text-yellow-800';
    resultText = '平局';
  } else if (gameStatus === 'Cancelled') {
    resultStyle = 'bg-gray-100 text-gray-800';
    resultText = '已取消';
  } else if (gameStatus === 'Created' || gameStatus === 'CommitPhase' || gameStatus === 'Committed') {
    resultStyle = 'bg-blue-100 text-blue-800';
    resultText = '进行中';
  } else {
    resultStyle = 'bg-purple-100 text-purple-800';
    resultText = '未知';
  }
  
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`border-2 rounded-lg p-3 sm:p-4 shadow-md ${
        game.result === 'won' ? 'bg-green-50 border-green-200' : 
        game.result === 'lost' ? 'bg-red-50 border-red-200' : 
        game.result === 'draw' ? 'bg-yellow-50 border-yellow-200' : 
        game.status === 'Cancelled' ? 'bg-gray-50 border-gray-200' : 
        'bg-blue-50 border-blue-200'
      }`}
    >
      {/* 卡片头部 - 改进响应式布局 */}
      <div className="flex flex-col sm:flex-row sm:justify-between gap-2 sm:gap-0">
        <div>
          <h3 className="text-xl font-medieval text-amber-900">游戏 #{game.id}</h3>
          <p className="text-xs sm:text-sm text-amber-700 truncate max-w-[280px]">
            {new Date(game.createdAt).toLocaleString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})} - 
            {new Date(game.endedAt).toLocaleString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 items-center">
          <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medieval ${game.gameType === 'MAG' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
            {game.gameType === 'MAG' ? 'MAG游戏' : '代币游戏'}
          </div>
          <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medieval ${resultStyle}`}>
            {resultText}
          </div>
        </div>
      </div>
      
      {/* 卡片底部 - 改进响应式布局 */}
      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0">
        <div>
          <div className="flex items-center flex-wrap">
            <span className="text-amber-800 font-medieval text-sm">对手:</span>
            <span className="ml-1 sm:ml-2 font-mono text-xs sm:text-sm bg-amber-100 px-2 py-1 rounded">
              {opponent ? `${opponent.substr(0, 6)}...${opponent.substr(-4)}` : '无对手'}
            </span>
          </div>
          {game.gameType === 'MAG' && (
            <div className="mt-1 flex items-center flex-wrap">
              <span className="text-amber-800 font-medieval text-sm">投注金额:</span>
              <span className="ml-1 sm:ml-2 font-mono text-xs sm:text-sm">
                {formatEther(BigInt(game.betAmount))} MAG
              </span>
            </div>
          )}
        </div>
        
        <div className="text-center order-first sm:order-none bg-amber-50 sm:bg-transparent py-1 px-2 rounded-lg sm:rounded-none">
          <div className="text-xl font-medieval text-amber-900">
            {playerScore} : {opponentScore}
          </div>
          <div className="text-amber-700 text-xs sm:text-sm">
            {game.totalTurns} 回合
          </div>
        </div>
        
        <button
          onClick={() => window.open(`/game/${game.id}`, '_blank')}
          className="py-1 sm:py-2 px-3 sm:px-4 bg-amber-100 text-amber-800 font-medieval text-sm sm:text-base rounded border border-amber-300 hover:bg-amber-200 transition-all duration-300"
        >
          查看详情
        </button>
      </div>
    </motion.div>
  );
};
