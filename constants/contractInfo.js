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

// 合约ABI - 使用Wagmi v1兼容的结构化格式
export const ABI = [
  // 游戏创建函数
  {
    name: 'createGameWithEth',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_totalTurns', type: 'uint256' },
      { name: '_timeoutInterval', type: 'uint256' },
      { name: '_timeoutCommit', type: 'uint256' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'createGameWithToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_totalTurns', type: 'uint256' },
      { name: '_timeoutInterval', type: 'uint256' },
      { name: '_timeoutCommit', type: 'uint256' }
    ],
    outputs: [{ type: 'uint256' }]
  },
  
  // 加入游戏函数
  {
    name: 'joinGameWithEth',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: '_gameId', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'joinGameWithToken',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_gameId', type: 'uint256' }],
    outputs: []
  },
  
  // 移动提交与揭示
  {
    name: 'commitMove',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_gameId', type: 'uint256' },
      { name: '_commitHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'revealMove',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_gameId', type: 'uint256' },
      { name: '_move', type: 'uint8' },
      { name: '_salt', type: 'bytes32' }
    ],
    outputs: []
  },
  
  // 超时处理函数
  {
    name: 'timeoutJoin',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_gameId', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'canTimeoutJoin',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_gameId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'timeoutCommit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_gameId', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'canTimeoutCommit',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_gameId', type: 'uint256' }],
    outputs: [
      { name: 'canTimeout', type: 'bool' },
      { name: 'winnerIfTimeout', type: 'address' }
    ]
  },
  {
    name: 'timeoutReveal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_gameId', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'canTimeoutReveal',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_gameId', type: 'uint256' }],
    outputs: [
      { name: 'canTimeout', type: 'bool' },
      { name: 'winnerIfTimeout', type: 'address' }
    ]
  },
  
  // 提取奖励
  {
    name: 'withdrawPrize',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'getPendingWithdrawals',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  
  // 游戏管理函数
  {
    name: 'cancelGame',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_gameId', type: 'uint256' }],
    outputs: []
  },

  // 管理员函数
  {
    name: 'adminAddress',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    name: 'setAdmin',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_newAdmin', type: 'address' }],
    outputs: []
  },
  {
    name: 'withdrawFees',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_amount', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'withdrawAllFunds',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_amount', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'accumulatedFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },

  // 读取函数
  {
    name: 'games',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'playerA', type: 'address' },
      { name: 'playerB', type: 'address' },
      { name: 'bet', type: 'uint256' },
      { name: 'timeoutInterval', type: 'uint256' },
      { name: 'revealDeadline', type: 'uint256' },
      { name: 'creationTime', type: 'uint256' },
      { name: 'joinDeadline', type: 'uint256' },
      { name: 'totalTurns', type: 'uint256' },
      { name: 'currentTurn', type: 'uint256' },
      { name: 'commitA', type: 'bytes32' },
      { name: 'commitB', type: 'bytes32' },
      { name: 'moveA', type: 'uint8' },
      { name: 'moveB', type: 'uint8' },
      { name: 'scoreA', type: 'uint8' },
      { name: 'scoreB', type: 'uint8' },
      { name: 'state', type: 'uint8' },
      { name: 'timeoutCommit', type: 'uint256' },
      { name: 'commitDeadline', type: 'uint256' }
    ]
  },
 
  // 事件
  {
    name: 'GameCreated',
    type: 'event',
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint256' },
      { indexed: true, name: 'creator', type: 'address' },
      { indexed: false, name: 'bet', type: 'uint256' },
      { indexed: false, name: 'totalTurns', type: 'uint256' }
    ]
  },
  {
    name: 'PlayerJoined',
    type: 'event',
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint256' },
      { indexed: true, name: 'player', type: 'address' }
    ]
  },
  {
    name: 'MoveCommitted',
    type: 'event',
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint256' },
      { indexed: true, name: 'player', type: 'address' },
      { indexed: false, name: 'currentTurn', type: 'uint256' }
    ]
  },
  {
    name: 'AllCommitted',
    type: 'event',
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint256' },
      { indexed: false, name: 'currentTurn', type: 'uint256' }
    ]
  },
  {
    name: 'MoveRevealed',
    type: 'event',
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint256' },
      { indexed: true, name: 'player', type: 'address' },
      { indexed: false, name: 'move', type: 'uint8' },
      { indexed: false, name: 'currentTurn', type: 'uint256' }
    ]
  },
  {
    name: 'TurnCompleted',
    type: 'event',
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint256' },
      { indexed: false, name: 'winner', type: 'address' },
      { indexed: false, name: 'currentTurn', type: 'uint256' }
    ]
  },
  {
    name: 'GameFinished',
    type: 'event',
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint256' },
      { indexed: false, name: 'winner', type: 'address' },
      { indexed: false, name: 'prize', type: 'uint256' }
    ]
  },
  {
    name: 'GameCancelled',
    type: 'event',
    inputs: [
      { indexed: true, name: 'gameId', type: 'uint256' }
    ]
  },
  {
    name: 'PrizeAvailable',
    type: 'event',
    inputs: [
      { indexed: true, name: 'player', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ]
  },
  {
    name: 'PrizeWithdrawn',
    type: 'event',
    inputs: [
      { indexed: true, name: 'player', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ]
  },
  {
    name: 'FeeCollected',
    type: 'event',
    inputs: [
      { indexed: false, name: 'gameId', type: 'uint256' },
      { indexed: false, name: 'feeAmount', type: 'uint256' }
    ]
  },
  {
    name: 'FeeWithdrawn',
    type: 'event',
    inputs: [
      { indexed: true, name: 'admin', type: 'address' },
      { indexed: false, name: 'amount', type: 'uint256' }
    ]
  }
];

// 代币ABI - 使用Wagmi v1兼容的结构化格式
export const TOKEN_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'transferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }
];
