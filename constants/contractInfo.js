// 智能合约地址和ABI信息

// 合约地址
export const ROCK_PAPER_SCISSORS_ADDRESS = '0x3c5c0e1be0649D7aAa181271AebdEae12c82d7c5';
export const WINNING_TOKEN_ADDRESS = '0x5BA41CFe93fcD6Bc5BDc00A83BDd5d7E8F696F1E';

// 网络配置
export const NETWORK = {
  name: 'MagnetChain',
  chainId: 114514, 
  rpcUrl: 'https://node2.magnetchain.xyz',
};

// 游戏状态枚举 - 与合约中的GameState枚举保持一致
export const GAME_STATES = {
  0: 'Created',    // 游戏已创建但第二位玩家尚未加入
  1: 'Committed',  // 双方都已提交移动，等待揭示
  2: 'Revealed',   // 移动已被揭示
  3: 'Finished',   // 游戏已完成
  4: 'Cancelled',  // 游戏已取消
  5: 'CommitPhase' // 当前回合已开始，玩家可以提交移动
};

// 移动类型枚举 - 与合约中的Move枚举保持一致
export const MOVE_TYPES = {
  0: 'None',      // 未选择
  1: 'Rock',      // 石头
  2: 'Paper',     // 布
  3: 'Scissors'   // 剪刀
};

// 移动类型枚举
export const MOVES = {
  0: {
    name: '无',
    icon: '/images/none.png'
  },
  1: {
    name: '石头',
    icon: '/images/rock.png',
    beats: 3 // 石头胜剪刀
  },
  2: {
    name: '剪刀',
    icon: '/images/scissors.png',
    beats: 3 // 剪刀胜布
  },
  3: {
    name: '布',
    icon: '/images/paper.png',
    beats: 1 // 布胜石头
  }
};

// 合约ABI
export const ABI = [
  // 游戏创建函数
  "function createGameWithEth(uint256 _totalTurns, uint256 _timeoutInterval, uint256 _timeoutCommit) external payable returns (uint256)",
  "function createGameWithToken(uint256 _totalTurns, uint256 _timeoutInterval, uint256 _timeoutCommit) external returns (uint256)",
  
  // 加入游戏函数
  "function joinGameWithEth(uint256 _gameId) external payable",
  "function joinGameWithToken(uint256 _gameId) external",
  
  // 移动提交与揭示
  "function commitMove(uint256 _gameId, bytes32 _commitHash) external",
  "function revealMove(uint256 _gameId, uint8 _move, bytes32 _salt) external",
  
  // 超时处理函数
  "function timeoutJoin(uint256 _gameId) external",
  "function canTimeoutJoin(uint256 _gameId) external view returns (bool)",
  "function timeoutCommit(uint256 _gameId) external",
  "function canTimeoutCommit(uint256 _gameId) external view returns (bool canTimeout, address winnerIfTimeout)",
  "function timeoutReveal(uint256 _gameId) external",
  "function canTimeoutReveal(uint256 _gameId) external view returns (bool canTimeout, address winnerIfTimeout)",
  
  // 提取奖励
  "function withdrawPrize() external returns(bool)",
  "function getPendingWithdrawals(address player) external view returns(uint256)",
  
  // 游戏管理函数
  "function cancelGame(uint256 _gameId) external",

  // 读取函数
  "function games(uint256) external view returns (address playerA, address playerB, uint256 bet, uint256 timeoutInterval, uint256 revealDeadline, uint256 creationTime, uint256 joinDeadline, uint256 totalTurns, uint256 currentTurn, bytes32 commitA, bytes32 commitB, uint8 moveA, uint8 moveB, uint8 scoreA, uint8 scoreB, uint8 state, uint256 timeoutCommit, uint256 commitDeadline)",
 
  // 事件
  "event GameCreated(uint256 indexed gameId, address indexed creator, uint256 bet, uint256 totalTurns)",
  "event PlayerJoined(uint256 indexed gameId, address indexed player)",
  "event MoveCommitted(uint256 indexed gameId, address indexed player, uint256 currentTurn)",
  "event AllCommitted(uint256 indexed gameId, uint256 currentTurn)",
  "event MoveRevealed(uint256 indexed gameId, address indexed player, uint8 move, uint256 currentTurn)",
  "event TurnCompleted(uint256 indexed gameId, address winner, uint256 currentTurn)",
  "event GameFinished(uint256 indexed gameId, address winner, uint256 prize)",
  "event GameCancelled(uint256 indexed gameId)",
  "event PrizeAvailable(address indexed player, uint256 amount)",
  "event PrizeWithdrawn(address indexed player, uint256 amount)",
  "event FeeCollected(uint256 gameId, uint256 feeAmount)",
  "event FeeWithdrawn(address indexed admin, uint256 amount)"
];

// 代币ABI
export const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)"
];
