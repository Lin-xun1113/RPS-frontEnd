import { MOVES, GAME_STATES } from '../constants/contractInfo';

/**
 * 判断游戏胜负
 * @param {number} player1Move - 玩家1的移动 (1=石头, 2=剪刀, 3=布)
 * @param {number} player2Move - 玩家2的移动 (1=石头, 2=剪刀, 3=布)
 * @returns {string|null} - 'player1'表示玩家1获胜，'player2'表示玩家2获胜，null表示平局
 */
export const determineWinner = (player1Move, player2Move) => {
  // 如果任一玩家没有选择移动，无法判断胜负
  if (!player1Move || !player2Move) return null;
  
  // 平局
  if (player1Move === player2Move) return null;
  
  // 石头(1)胜剪刀(2)，剪刀(2)胜布(3)，布(3)胜石头(1)
  if (
    (player1Move === 1 && player2Move === 2) || // 石头胜剪刀
    (player1Move === 2 && player2Move === 3) || // 剪刀胜布
    (player1Move === 3 && player2Move === 1)    // 布胜石头
  ) {
    return 'player1';
  } else {
    return 'player2';
  }
};

/**
 * 获取游戏状态的文本描述
 * @param {number} gameState - 游戏状态码
 * @returns {object} - 包含状态文本和颜色的对象
 */
export const getGameStatusInfo = (gameState) => {
  const statusKey = Object.keys(GAME_STATES).find(
    key => GAME_STATES[key] === gameState
  );
  
  const statusMap = {
    Creating: { text: '创建中', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    Cancelled: { text: '已取消', color: 'text-red-600', bgColor: 'bg-red-100' },
    Committed: { text: '已提交', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    Revealed: { text: '已揭示', color: 'text-purple-600', bgColor: 'bg-purple-100' },
    Finished: { text: '已完成', color: 'text-green-600', bgColor: 'bg-green-100' },
    CommitPhase: { text: '提交阶段', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    RevealPhase: { text: '揭示阶段', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
    Timeout: { text: '已超时', color: 'text-red-600', bgColor: 'bg-red-100' },
  };
  
  return statusMap[statusKey] || { text: '未知状态', color: 'text-gray-600', bgColor: 'bg-gray-100' };
};

/**
 * 获取移动名称
 * @param {number} moveId - 移动ID (1=石头, 2=剪刀, 3=布)
 * @returns {string} 移动名称
 */
export const getMoveName = (moveId) => {
  return MOVES[moveId]?.name || '未选择';
};

/**
 * 格式化时间戳为日期时间字符串
 * @param {number} timestamp - Unix时间戳（秒）
 * @returns {string} 格式化的日期时间字符串
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '-';
  
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * 计算游戏结束前的剩余回合数
 * @param {number} currentRound - 当前回合
 * @param {number} totalRounds - 总回合数
 * @returns {number} 剩余回合数
 */
export const getRemainingRounds = (currentRound, totalRounds) => {
  return Math.max(0, totalRounds - currentRound + 1);
};

/**
 * 检查用户是否可以对游戏执行特定操作
 * @param {object} game - 游戏对象
 * @param {string} userAddress - 用户地址
 * @returns {object} 包含各种操作权限的对象
 */
export const getUserGamePermissions = (game, userAddress) => {
  if (!game || !userAddress) {
    return {
      canJoin: false,
      canCommit: false,
      canReveal: false,
      canWithdraw: false,
      canTimeout: false,
      isPlayer: false,
      isCreator: false,
      isOpponent: false
    };
  }
  
  // 标准化地址格式，避免大小写问题
  const normalizedUserAddress = userAddress.toLowerCase();
  const normalizedCreator = game.creator.toLowerCase();
  const normalizedPlayer2 = game.player2 ? game.player2.toLowerCase() : null;
  
  // 检查用户是否是游戏参与者
  const isCreator = normalizedUserAddress === normalizedCreator;
  const isOpponent = normalizedPlayer2 && normalizedUserAddress === normalizedPlayer2;
  const isPlayer = isCreator || isOpponent;
  
  // 初始化权限对象
  const permissions = {
    canJoin: false,
    canCommit: false,
    canReveal: false,
    canWithdraw: false,
    canTimeout: false,
    isPlayer,
    isCreator,
    isOpponent
  };
  
  // 根据游戏状态和用户角色设置权限
  if (game.state === GAME_STATES.Creating && !isCreator && !isOpponent) {
    permissions.canJoin = true;
  }
  
  if (game.state === GAME_STATES.CommitPhase && isPlayer) {
    // 检查用户是否已经提交了移动
    if (isCreator && !game.moves.player1.committed) {
      permissions.canCommit = true;
    } else if (isOpponent && !game.moves.player2.committed) {
      permissions.canCommit = true;
    }
  }
  
  if (game.state === GAME_STATES.RevealPhase && isPlayer) {
    // 检查用户是否已经揭示了移动
    if (isCreator && !game.moves.player1.revealed) {
      permissions.canReveal = true;
    } else if (isOpponent && !game.moves.player2.revealed) {
      permissions.canReveal = true;
    }
    
    // 检查是否可以声明超时（如果对手未揭示且超过了截止时间）
    const now = Math.floor(Date.now() / 1000);
    if (game.revealDeadline && now > game.revealDeadline) {
      permissions.canTimeout = true;
    }
  }
  
  // 如果游戏已完成，检查是否可以提取奖励
  if (game.state === GAME_STATES.Finished && isPlayer) {
    permissions.canWithdraw = true;
  }
  
  return permissions;
};
