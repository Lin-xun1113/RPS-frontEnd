# Rock Paper Scissors Frontend Integration Guide

This document provides all the necessary information to interact with the Rock Paper Scissors contract, including contract addresses, interface functions, game flow, and more.

## Contract Addresses

- **Network**: MagnetChain
- **RockPaperScissors Contract**: `0xE4B7CBa976294eDeb12C61e659423C0D843e0afE`
- **WinningToken Contract**: `0xd724606bb64456969c0848489dd1316627e0d0e3`

## Game States Enum

```
GameState:
0 - Created: Game is created but second player hasn't joined
1 - Committed: Both players have submitted moves, waiting for reveal
2 - Revealed: Moves have been revealed
3 - Finished: Game is finished
4 - Cancelled: Game has been cancelled
5 - CommitPhase: Current round has started, players can submit moves
```

## Move Types Enum

```
Move:
0 - None: No move
1 - Rock: Rock
2 - Paper: Paper
3 - Scissors: Scissors
```

## Main Interface Functions

### 1. Create Game

#### Create Game with ETH

```javascript
async function createGameWithEth(totalTurns, timeoutInterval, betAmount) {
  // totalTurns: Total number of rounds, must be odd
  // timeoutInterval: Timeout interval in seconds, minimum 300 seconds (5 minutes)
  // betAmount: Bet amount in ETH
  
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.createGameWithEth(totalTurns, timeoutInterval, {
    value: ethers.utils.parseEther(betAmount)
  });
  const receipt = await tx.wait();
  
  // Extract game ID from events
  const gameCreatedEvent = receipt.events.find(e => e.event === 'GameCreated');
  const gameId = gameCreatedEvent.args.gameId;
  
  return gameId;
}
```

#### Create Game with Token

```javascript
async function createGameWithToken(totalTurns, timeoutInterval) {
  // First approve token usage
  const tokenContract = new ethers.Contract(WINNING_TOKEN_ADDRESS, TOKEN_ABI, signer);
  await tokenContract.approve(ROCK_PAPER_SCISSORS_ADDRESS, 1);
  
  // Then create the game
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.createGameWithToken(totalTurns, timeoutInterval);
  const receipt = await tx.wait();
  
  // Extract game ID from events
  const gameCreatedEvent = receipt.events.find(e => e.event === 'GameCreated');
  const gameId = gameCreatedEvent.args.gameId;
  
  return gameId;
}
```

### 2. Join Game

#### Join Game with ETH

```javascript
async function joinGameWithEth(gameId, betAmount) {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  // First get game info to confirm bet amount
  const gameInfo = await contract.games(gameId);
  
  const tx = await contract.joinGameWithEth(gameId, {
    value: gameInfo.bet // Must match creator's bet amount
  });
  
  return await tx.wait();
}
```

#### Join Game with Token

```javascript
async function joinGameWithToken(gameId) {
  // First approve token usage
  const tokenContract = new ethers.Contract(WINNING_TOKEN_ADDRESS, TOKEN_ABI, signer);
  await tokenContract.approve(ROCK_PAPER_SCISSORS_ADDRESS, 1);
  
  // Then join the game
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.joinGameWithToken(gameId);
  
  return await tx.wait();
}
```

### 3. Commit Move

```javascript
async function commitMove(gameId, move) {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  // Get current wallet address
  const playerAddress = await signer.getAddress();
  
  // Generate random salt value
  const saltBytes = ethers.utils.randomBytes(32);
  const salt = ethers.utils.hexlify(saltBytes);
  
  // Generate commit hash
  const moveHash = ethers.utils.solidityKeccak256(
    ['uint8', 'bytes32', 'address'],
    [move, salt, playerAddress] // Move (1-3), salt, and player address
  );
  
  // Save salt for later reveal
  localStorage.setItem(`salt_${gameId}_${await signer.getAddress()}`, salt);
  
  const tx = await contract.commitMove(gameId, moveHash);
  return await tx.wait();
}
```

### 4. Reveal Move

```javascript
async function revealMove(gameId, move) {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  // Get previously saved salt from local storage
  const playerAddress = await signer.getAddress();
  const salt = localStorage.getItem(`salt_${gameId}_${playerAddress}`);
  
  if (!salt) {
    throw new Error('Cannot find salt, unable to reveal move');
  }
  
  const tx = await contract.revealMove(gameId, move, salt);
  return await tx.wait();
}
```

### 5. Withdraw Prize

```javascript
async function withdrawPrize() {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.withdrawPrize();
  return await tx.wait();
}
```

### 6. Handle Timeouts

#### Join Timeout

```javascript
async function timeoutJoin(gameId) {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.timeoutJoin(gameId);
  return await tx.wait();
}
```

#### Reveal Timeout

```javascript
async function timeoutReveal(gameId) {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.timeoutReveal(gameId);
  return await tx.wait();
}
```

### 7. Cancel Game

```javascript
async function cancelGame(gameId) {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.cancelGame(gameId);
  return await tx.wait();
}
```

## Event Listening

Here's how to listen for contract events:

```javascript
// Initialize contract instance
const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);

// Listen for game creation events
contract.on('GameCreated', (gameId, creator, bet, totalTurns) => {
  console.log(`New game created: ID=${gameId}, Creator=${creator}, Bet=${ethers.utils.formatEther(bet)} ETH, Rounds=${totalTurns}`);
});

// Listen for player join events
contract.on('PlayerJoined', (gameId, player) => {
  console.log(`Player joined: Game ID=${gameId}, Player=${player}`);
});

// Listen for move commit events
contract.on('MoveCommitted', (gameId, player, currentTurn) => {
  console.log(`Move committed: Game ID=${gameId}, Player=${player}, Current Turn=${currentTurn}`);
});

// Listen for move reveal events
contract.on('MoveRevealed', (gameId, player, move, currentTurn) => {
  const moves = ['None', 'Rock', 'Paper', 'Scissors'];
  console.log(`Move revealed: Game ID=${gameId}, Player=${player}, Move=${moves[move]}, Current Turn=${currentTurn}`);
});

// Listen for turn completion events
contract.on('TurnCompleted', (gameId, winner, currentTurn) => {
  console.log(`Turn completed: Game ID=${gameId}, Winner=${winner}, Current Turn=${currentTurn}`);
});

// Listen for game finished events
contract.on('GameFinished', (gameId, winner, prize) => {
  console.log(`Game finished: Game ID=${gameId}, Winner=${winner}, Prize=${ethers.utils.formatEther(prize)} ETH`);
});
```

## Get Game Status

```javascript
async function getGameInfo(gameId) {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);
  const game = await contract.games(gameId);
  
  // Game struct data is returned as an array and needs to be converted to an object
  return {
    playerA: game[0],
    playerB: game[1],
    bet: game[2],
    timeoutInterval: game[3],
    revealDeadline: game[4],
    creationTime: game[5],
    joinDeadline: game[6],
    totalTurns: game[7],
    currentTurn: game[8],
    commitA: game[9],
    commitB: game[10],
    moveA: game[11],
    moveB: game[12],
    scoreA: game[13],
    scoreB: game[14],
    state: game[15],  // Game state corresponds to GameState enum
  };
}
```

## Complete Game Flow Example

Here's a complete game flow example using ETH:

```javascript
// 1. Create game
async function startGame() {
  const totalTurns = 3;  // Must be odd
  const timeoutInterval = 600;  // 10 minutes
  const betAmount = "0.1";  // 0.1 ETH
  
  const gameId = await createGameWithEth(totalTurns, timeoutInterval, betAmount);
  console.log(`Game created successfully, ID: ${gameId}`);
  return gameId;
}

// 2. Player B joins game
async function joinGame(gameId) {
  const gameInfo = await getGameInfo(gameId);
  const betAmount = ethers.utils.formatEther(gameInfo.bet);
  
  await joinGameWithEth(gameId, betAmount);
  console.log(`Successfully joined game ${gameId}`);
}

// 3. Start round, commit move first
async function playTurn(gameId, moveChoice) {
  // moveChoice should be 1 (Rock), 2 (Paper), or 3 (Scissors)
  await commitMove(gameId, moveChoice);
  console.log(`Move committed successfully: ${['', 'Rock', 'Paper', 'Scissors'][moveChoice]}`);
}

// 4. Reveal move
async function revealMyMove(gameId, moveChoice) {
  await revealMove(gameId, moveChoice);
  console.log(`Move revealed successfully: ${['', 'Rock', 'Paper', 'Scissors'][moveChoice]}`);
}

// 5. Withdraw prize after game ends
async function claimPrize() {
  const receipt = await withdrawPrize();
  console.log('Prize withdrawn successfully!');
  return receipt;
}
```

## Appendix: RockPaperScissors Contract ABI

For convenience, here's a simplified version of the ABI (including only the main functions):

```json
const ABI = [
  // Game creation functions
  "function createGameWithEth(uint256 _totalTurns, uint256 _timeoutInterval) external payable returns (uint256)",
  "function createGameWithToken(uint256 _totalTurns, uint256 _timeoutInterval) external returns (uint256)",
  
  // Join game functions
  "function joinGameWithEth(uint256 _gameId) external payable",
  "function joinGameWithToken(uint256 _gameId) external",
  
  // Game play functions
  "function commitMove(uint256 _gameId, bytes32 _commitHash) external",
  "function revealMove(uint256 _gameId, uint8 _move, bytes32 _salt) external",
  "function cancelGame(uint256 _gameId) external",
  
  // Timeout functions
  "function timeoutJoin(uint256 _gameId) external",
  "function timeoutReveal(uint256 _gameId) external",
  
  // Prize functions
  "function withdrawPrize() external returns (bool)",
  
  // Query functions
  "function games(uint256) external view returns (address playerA, address playerB, uint256 bet, uint256 timeoutInterval, uint256 revealDeadline, uint256 creationTime, uint256 joinDeadline, uint256 totalTurns, uint256 currentTurn, bytes32 commitA, bytes32 commitB, uint8 moveA, uint8 moveB, uint8 scoreA, uint8 scoreB, uint8 state)",
  "function winningToken() external view returns (address)",
  
  // Events
  "event GameCreated(uint256 indexed gameId, address indexed creator, uint256 bet, uint256 totalTurns)",
  "event PlayerJoined(uint256 indexed gameId, address indexed player)",
  "event MoveCommitted(uint256 indexed gameId, address indexed player, uint256 currentTurn)",
  "event MoveRevealed(uint256 indexed gameId, address indexed player, uint8 move, uint256 currentTurn)",
  "event TurnCompleted(uint256 indexed gameId, address winner, uint256 currentTurn)",
  "event GameFinished(uint256 indexed gameId, address winner, uint256 prize)",
  "event GameCancelled(uint256 indexed gameId)"
];
```

## WinningToken Contract ABI

```json
const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)",
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function owner() external view returns (address)"
];
```
