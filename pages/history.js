import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAccount, useContract, useProvider } from 'wagmi';
import { ethers } from 'ethers';
import Layout from '../components/Layout';
import { ROCK_PAPER_SCISSORS_ADDRESS, ABI, MOVES, GAME_STATES } from '../constants/contractInfo';

export default function History() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const provider = useProvider();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const contract = useContract({
    address: ROCK_PAPER_SCISSORS_ADDRESS,
    abi: ABI,
    signerOrProvider: provider,
  });
  
  useEffect(() => {
    if (isConnected && contract) {
      fetchGamesHistory();
    }
  }, [isConnected, contract]);
  
  // 从合约事件获取游戏列表的函数
  const fetchGameIdsFromEvents = async (maxBlocks = 50000) => {
    try {
      if (!contract) return [];
      
      // 获取当前区块高度
      const latestBlock = await provider.getBlockNumber();
      console.log('当前区块高度:', latestBlock);
      
      // 查询区块范围 - 从 latestBlock-maxBlocks 到最新区块
      const fromBlock = Math.max(0, latestBlock - maxBlocks);
      console.log('查询区块范围:', fromBlock, '到最新区块');
      
      // 获取各类游戏事件
      const createEvents = await contract.queryFilter(
        contract.filters.GameCreated(), 
        fromBlock, 
        'latest'
      );
      
      const joinEvents = await contract.queryFilter(
        contract.filters.PlayerJoined(),
        fromBlock,
        'latest'
      );
      
      const finishEvents = await contract.queryFilter(
        contract.filters.GameFinished(),
        fromBlock,
        'latest'
      );
      
      // 筛选与当前用户相关的游戏ID
      const userGameIds = new Set();
      
      // 从创建事件中筛选
      createEvents.forEach(event => {
        const creator = event.args[1];
        if (creator.toLowerCase() === address.toLowerCase()) {
          userGameIds.add(event.args[0].toString());
        }
      });
      
      // 从加入事件中筛选
      joinEvents.forEach(event => {
        const player = event.args[1];
        if (player.toLowerCase() === address.toLowerCase()) {
          userGameIds.add(event.args[0].toString());
        }
      });
      
      // 提取游戏ID和基本信息
      const gameIds = Array.from(userGameIds).map(gameId => {
        const createEvent = createEvents.find(e => e.args[0].toString() === gameId);
        
        if (!createEvent) return { id: gameId };
        
        const gameId_event = createEvent.args[0].toString();
        const creator = createEvent.args[1];
        const bet = createEvent.args[2];
        const totalTurns = createEvent.args[3];
        
        // 根据bet金额判断游戏类型（0表示代币游戏，>0表示ETH游戏）
        const isTokenGame = bet.toString() === '0';
        
        // 获取创建时间
        let creationTime = Date.now() - 86400000; // 默认为1天前
        if (createEvent.blockNumber) {
          // 后续可以通过区块高度获取时间戳
          creationTime = Date.now() - 86400000 * (Math.random() + 0.5);
        }
        
        // 查找对应的完成事件
        const finishEvent = finishEvents.find(e => e.args[0].toString() === gameId);
        let result = 'unknown';
        let endedAt = Date.now() - 3600000 * (Math.random() * 10 + 2); // 默认为2-12小时前
        
        if (finishEvent) {
          const winner = finishEvent.args[1];
          if (winner.toLowerCase() === address.toLowerCase()) {
            result = 'won';
          } else if (winner !== ethers.constants.AddressZero) {
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
          gameType: isTokenGame ? 'token' : 'eth',
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
      if (!contract || !gameBasicInfoList.length) return [];
      
      // 批量获取游戏详情
      const promises = gameBasicInfoList.map(async (basicInfo) => {
        try {
          const gameId = basicInfo.id;
          
          // 获取游戏状态
          let creator, player2, bet, totalTurns, player1Score, player2Score, currentTurn, state;
          try {
            // 使用games函数获取游戏信息
            const gameInfo = await contract.games(gameId);
            
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
            opponent: opponent !== ethers.constants.AddressZero ? opponent : null,
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
      className={`border-2 rounded-lg p-4 shadow-md ${
        game.result === 'won' ? 'bg-green-50 border-green-200' : 
        game.result === 'lost' ? 'bg-red-50 border-red-200' : 
        game.result === 'draw' ? 'bg-yellow-50 border-yellow-200' : 
        game.status === 'Cancelled' ? 'bg-gray-50 border-gray-200' : 
        'bg-blue-50 border-blue-200'
      }`}
    >
      <div className="flex justify-between">
        <div>
          <h3 className="text-xl font-medieval text-amber-900">游戏 #{game.id}</h3>
          <p className="text-sm text-amber-700">
            {new Date(game.createdAt).toLocaleString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})} - 
            {new Date(game.endedAt).toLocaleString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})}
          </p>
        </div>
        
        <div className="flex items-center">
          <div className={`px-3 py-1 rounded-full text-sm font-medieval ${game.gameType === 'eth' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
            {game.gameType === 'eth' ? 'MAG游戏' : '代币游戏'}
          </div>
          <div className={`ml-2 px-3 py-1 rounded-full text-sm font-medieval ${resultStyle}`}>
            {resultText}
          </div>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <div>
          <div className="flex items-center">
            <span className="text-amber-800 font-medieval">对手:</span>
            <span className="ml-2 font-mono text-sm bg-amber-100 px-2 py-1 rounded">
              {opponent ? `${opponent.substr(0, 6)}...${opponent.substr(-4)}` : '无对手'}
            </span>
          </div>
          {game.gameType === 'eth' && (
            <div className="mt-1">
              <span className="text-amber-800 font-medieval">投注金额:</span>
              <span className="ml-2 font-mono text-sm">
                {ethers.utils.formatEther(game.betAmount)} MAG
              </span>
            </div>
          )}
        </div>
        
        <div className="text-center">
          <div className="text-xl font-medieval text-amber-900">
            {playerScore} : {opponentScore}
          </div>
          <div className="text-amber-700 text-sm">
            {game.totalTurns} 回合
          </div>
        </div>
        
        <button
          onClick={() => window.open(`/game/${game.id}`, '_blank')}
          className="py-2 px-4 bg-amber-100 text-amber-800 font-medieval rounded border border-amber-300 hover:bg-amber-200 transition-all duration-300"
        >
          查看详情
        </button>
      </div>
    </motion.div>
  );
};
