# Rock Paper Scissors - Frontend Integration Guide

## Table of Contents

1. [Contract Information](#contract-information)
2. [Smart Contract Overview](#smart-contract-overview)
3. [Data Structures](#data-structures)
4. [Core API Reference](#core-api-reference)
5. [Game Flow Implementation](#game-flow-implementation)
6. [Event Handling](#event-handling)
7. [Helper Functions](#helper-functions)
8. [Complete Implementation Examples](#complete-implementation-examples)
9. [Contract ABIs](#contract-abis)

## Contract Information

- **Network**: MagnetChain
- **RockPaperScissors Contract**: `0xE4B7CBa976294eDeb12C61e659423C0D843e0afE`
- **WinningToken Contract**: `0x5BA41CFe93fcD6Bc5BDc00A83BDd5d7E8F696F1E`

## Smart Contract Overview

The Rock Paper Scissors smart contract system implements a fair, multi-round game using a commit-reveal pattern to ensure fairness. It supports both ETH-based games and token-based games using the WinningToken (RPSW).

### Key Features

- **Commit-Reveal Pattern**: Players first commit to a move (without revealing it), then reveal their move once all commitments are made
- **Multi-Round Games**: Supports multi-round games with configurable number of rounds (must be odd)
- **Dual Currency Support**: Play with ETH or RPSW tokens
- **Timeout Protection**: Built-in timeout mechanisms to protect honest players
- **Winner Rewards**: Winners receive both the prize money and a RPSW token

## Data Structures

### Game States

```typescript
enum GameState {
  Created = 0,     // Game created, waiting for second player
  Committed = 1,   // Both players committed their moves, waiting for reveals
  Revealed = 2,    // Moves have been revealed
  Finished = 3,    // Game is complete
  Cancelled = 4,   // Game was cancelled
  CommitPhase = 5  // Current round started, players can commit moves
}
```

#### State Transitions

```
1. Created: 初始状态，游戏创建后等待第二位玩家加入
   ↓
2. CommitPhase: 玩家B加入后或新回合开始时的状态，双方可以提交移动
   ↓
3. Committed: 双方都已提交移动，等待双方揭示
   ↓
4. Revealed: 双方都已揭示移动，回合结束
   ↓(如果游戏未结束)→ CommitPhase(开始新回合)
   ↓(如果游戏结束)→ Finished

- Cancelled: 游戏被取消的状态，可以从Created状态通过调用cancelGame或timeoutJoin进入
```

**重要说明**:
- 当第一位玩家提交移动时，游戏状态会从CommitPhase更新为Committed
- 当双方都提交移动后，游戏状态将固定为Committed直到双方揭示或超时
- 游戏状态会影响函数调用的有效性，例如commitMove只能在Created、CommitPhase或Committed状态调用

### Move Types

```typescript
enum Move {
  None = 0,      // No move selected
  Rock = 1,       // Rock
  Paper = 2,      // Paper
  Scissors = 3    // Scissors
}
```

### Game Structure

```typescript
interface Game {
  playerA: string;            // Creator of the game (address)
  playerB: string;            // Second player (address)
  bet: BigNumber;            // ETH amount bet
  timeoutInterval: number;   // Reveal phase timeout (seconds)
  revealDeadline: number;    // Deadline for revealing moves
  creationTime: number;      // When game was created
  joinDeadline: number;      // Deadline for joining the game
  totalTurns: number;        // Total number of turns in the game
  currentTurn: number;       // Current turn number
  commitA: string;           // Hash of player A's committed move
  commitB: string;           // Hash of player B's committed move
  moveA: number;             // Player A's revealed move
  moveB: number;             // Player B's revealed move
  scoreA: number;            // Player A's score
  scoreB: number;            // Player B's score
  state: number;             // Current game state
}
```

## Core API Reference

### Game Creation

#### Create Game with ETH

```typescript
async function createGameWithEth(
  totalTurns: number,       // Must be odd
  timeoutInterval: number,  // Seconds (minimum 300)
  betAmount: string         // ETH amount (e.g., "0.1") - sent as transaction value
): Promise<number> {        // Returns game ID
  // Input validation
  if (totalTurns % 2 !== 1) {
    throw new Error("Total turns must be an odd number");
  }
  
  if (timeoutInterval < 300) {
    throw new Error("Timeout interval must be at least 300 seconds (5 minutes)");
  }
  
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  // Convert ETH amount to wei
  const betValue = ethers.utils.parseEther(betAmount);
  
  // Call contract function with ETH value
  const tx = await contract.createGameWithEth(totalTurns, timeoutInterval, {
    value: betValue  // ETH is sent as transaction value, not as a function parameter
  });
  
  // Wait for transaction confirmation
  const receipt = await tx.wait();
  
  // Parse event to get game ID
  const gameCreatedEvent = receipt.events.find(e => e.event === 'GameCreated');
  return gameCreatedEvent.args.gameId.toNumber();
}
```

#### Create Game with Token

```typescript
async function createGameWithToken(
  totalTurns: number,       // Must be odd
  timeoutInterval: number   // Seconds (minimum 300)
): Promise<number> {        // Returns game ID
  // Input validation
  if (totalTurns % 2 !== 1) {
    throw new Error("Total turns must be an odd number");
  }
  
  if (timeoutInterval < 300) {
    throw new Error("Timeout interval must be at least 300 seconds (5 minutes)");
  }
  
  // Step 1: Approve token transfer
  const tokenContract = new ethers.Contract(WINNING_TOKEN_ADDRESS, TOKEN_ABI, signer);
  const approveTx = await tokenContract.approve(ROCK_PAPER_SCISSORS_ADDRESS, 1);
  await approveTx.wait();
  
  // Step 2: Create game
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.createGameWithToken(totalTurns, timeoutInterval);
  const receipt = await tx.wait();
  
  // Parse event to get game ID
  const gameCreatedEvent = receipt.events.find(e => e.event === 'GameCreated');
  return gameCreatedEvent.args.gameId.toNumber();
}
```

### Game Joining

#### Join Game with ETH

```typescript
async function joinGameWithEth(gameId: number): Promise<void> {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  // First, get game information to determine the bet amount
  const gameInfo = await contract.games(gameId);
  const betAmount = gameInfo.bet;
  
  // Join the game with the required ETH
  // ETH is sent as transaction value, not as a function parameter
  const tx = await contract.joinGameWithEth(gameId, {
    value: betAmount  // Bet amount must match the creator's bet
  });
  
  await tx.wait();
}
```

#### Join Game with Token

```typescript
async function joinGameWithToken(gameId: number): Promise<void> {
  // Step 1: Approve token transfer
  const tokenContract = new ethers.Contract(WINNING_TOKEN_ADDRESS, TOKEN_ABI, signer);
  const approveTx = await tokenContract.approve(ROCK_PAPER_SCISSORS_ADDRESS, 1);
  await approveTx.wait();
  
  // Step 2: Join the game
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.joinGameWithToken(gameId);
  await tx.wait();
}
```

### Game Play

#### Commit Move

```typescript
async function commitMove(
  gameId: number,
  move: number     // 1=Rock, 2=Paper, 3=Scissors
): Promise<string> {  // Returns the salt (save for reveal)
  // Input validation
  if (move < 1 || move > 3) {
    throw new Error("Move must be 1 (Rock), 2 (Paper), or 3 (Scissors)");
  }
  
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  // Get current wallet address
  const playerAddress = await signer.getAddress();
  
  // Generate random salt value
  const saltBytes = ethers.utils.randomBytes(32);
  const salt = ethers.utils.hexlify(saltBytes);
  
  // Calculate the commit hash: keccak256(abi.encodePacked(move, salt, playerAddress))
  // 与合约实现保持一致：bytes32 commit = keccak256(abi.encodePacked(move, _salt, msg.sender));
  const moveHash = ethers.utils.keccak256(
    ethers.utils.solidityPack(['uint8', 'bytes32', 'address'], [move, salt, playerAddress])
  );
  
  // Send the commit transaction
  const tx = await contract.commitMove(gameId, moveHash);
  await tx.wait();
  
  // Return the salt to be saved for the reveal phase
  return salt;
}
```

#### Reveal Move

```typescript
async function revealMove(
  gameId: number,
  move: number,     // 1=Rock, 2=Paper, 3=Scissors
  salt: string      // Salt returned from commitMove
): Promise<void> {
  // Input validation
  if (move < 1 || move > 3) {
    throw new Error("Move must be 1 (Rock), 2 (Paper), or 3 (Scissors)");
  }
  
  if (!salt || !salt.startsWith('0x')) {
    throw new Error("Invalid salt value");
  }
  
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  const tx = await contract.revealMove(gameId, move, salt);
  await tx.wait();
}
```

### Timeouts and Cancellations

#### Handle Join Timeout

```typescript
async function timeoutJoin(gameId: number): Promise<void> {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.timeoutJoin(gameId);
  await tx.wait();
}
```

#### Handle Reveal Timeout

```typescript
async function timeoutReveal(gameId: number): Promise<void> {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.timeoutReveal(gameId);
  await tx.wait();
}
```

#### Cancel Game

```typescript
async function cancelGame(gameId: number): Promise<void> {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.cancelGame(gameId);
  await tx.wait();
}
```

### Prize Claims

#### Withdraw Prize

```typescript
async function withdrawPrize(): Promise<boolean> {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const tx = await contract.withdrawPrize();
  const receipt = await tx.wait();
  
  // Check transaction success - the contract function returns boolean
  const successEvent = receipt.events.find(e => e.event === 'PrizeWithdrawn');
  return successEvent !== undefined;
}
```

## Game Flow Implementation

### Complete Game Lifecycle

This section outlines the complete flow of a Rock Paper Scissors game from creation to completion.

```typescript
async function runCompleteGame() {
  // Step 1: Player A creates a 3-round game with 0.1 ETH
  const gameId = await createGameWithEth(3, 600, "0.1");
  console.log(`Game created with ID: ${gameId}`);
  
  // Step 2: Player B joins the game
  await joinGameWithEth(gameId);
  console.log("Player B joined the game");
  
  // Game automatically enters CommitPhase for round 1
  
  // Step 3: Both players commit their moves
  // Player A commits Rock (1)
  const saltA = await commitMove(gameId, 1);
  console.log("Player A committed move");
  
  // Store salt locally (important!)
  localStorage.setItem(`game_${gameId}_salt_playerA`, saltA);
  
  // Player B commits Scissors (3)
  const saltB = await commitMove(gameId, 3);
  console.log("Player B committed move");
  localStorage.setItem(`game_${gameId}_salt_playerB`, saltB);
  
  // Game automatically enters Committed state
  
  // Step 4: Both players reveal their moves
  await revealMove(gameId, 1, saltA);
  console.log("Player A revealed move");
  
  await revealMove(gameId, 3, saltB);
  console.log("Player B revealed move");
  
  // Game automatically processes round result
  // Player A wins round 1 (Rock beats Scissors)
  // Game automatically enters CommitPhase for round 2
  
  // Steps 3-4 repeat for each round until game completes
  // ...
  
  // When game finishes, winner can withdraw prize
  await withdrawPrize();
  console.log("Prize withdrawn successfully");
}
```

### Handling Timeouts

```typescript
async function handleTimeouts(gameId: number) {
  const gameInfo = await getGameInfo(gameId);
  
  // Case 1: Join timeout - no player B joined after deadline
  if (gameInfo.state === 0 && Date.now() / 1000 > gameInfo.joinDeadline) {
    await timeoutJoin(gameId);
    console.log("Game cancelled due to join timeout");
    return;
  }
  
  // Case 2: Reveal timeout - opponent didn't reveal move after deadline
  if (gameInfo.state === 1 && Date.now() / 1000 > gameInfo.revealDeadline) {
    await timeoutReveal(gameId);
    console.log("Round forfeited by non-revealing player");
  }
}
```

## Event Handling

### Setting Up Event Listeners

```typescript
function setupEventListeners() {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);
  
  // Game creation events
  contract.on('GameCreated', (gameId, creator, bet, totalTurns) => {
    console.log(`New game created: ID=${gameId}, Creator=${creator}, ` +
                `Bet=${ethers.utils.formatEther(bet)} ETH, Rounds=${totalTurns}`);
  });
  
  // Player join events
  contract.on('PlayerJoined', (gameId, player) => {
    console.log(`Player joined: Game ID=${gameId}, Player=${player}`);
  });
  
  // Moves committed
  contract.on('MoveCommitted', (gameId, player, currentTurn) => {
    console.log(`Move committed: Game ID=${gameId}, Player=${player}, ` +
                `Current Turn=${currentTurn}`);
  });
  
  // Moves revealed
  contract.on('MoveRevealed', (gameId, player, move, currentTurn) => {
    const moveTypes = ['None', 'Rock', 'Paper', 'Scissors'];
    console.log(`Move revealed: Game ID=${gameId}, Player=${player}, ` +
                `Move=${moveTypes[move]}, Current Turn=${currentTurn}`);
  });
  
  // Turn completed
  contract.on('TurnCompleted', (gameId, winner, currentTurn) => {
    console.log(`Turn ${currentTurn} completed: Game ID=${gameId}, ` +
                `Winner=${winner === ethers.constants.AddressZero ? 'Draw' : winner}`);
  });
  
  // Game finished
  contract.on('GameFinished', (gameId, winner, prize) => {
    console.log(`Game finished: ID=${gameId}, Winner=${winner}, ` +
                `Prize=${ethers.utils.formatEther(prize)} ETH`);
  });
  
  // Game cancelled
  contract.on('GameCancelled', (gameId) => {
    console.log(`Game cancelled: ID=${gameId}`);
  });
  
  // Prize available for withdrawal
  contract.on('PrizeAvailable', (player, amount) => {
    console.log(`Prize available: Player=${player}, ` +
                `Amount=${ethers.utils.formatEther(amount)} ETH`);
  });
  
  // Prize withdrawn
  contract.on('PrizeWithdrawn', (player, amount) => {
    console.log(`Prize withdrawn: Player=${player}, ` +
                `Amount=${ethers.utils.formatEther(amount)} ETH`);
  });
  
  // Fee collected
  contract.on('FeeCollected', (gameId, feeAmount) => {
    console.log(`Fee collected: Game ID=${gameId}, ` +
                `Amount=${ethers.utils.formatEther(feeAmount)} ETH`);
  });
}
```

### Getting Historical Events

```typescript
async function getGameHistory(gameId: number) {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);
  
  // Filter for events related to this game
  const filter = contract.filters.GameCreated(gameId);
  
  // Get block of game creation
  const createEvents = await contract.queryFilter(filter);
  if (createEvents.length === 0) {
    throw new Error(`Game ${gameId} not found`);
  }
  
  const creationBlock = createEvents[0].blockNumber;
  const currentBlock = await provider.getBlockNumber();
  
  // Get all events for this game
  const events = await contract.queryFilter({
    address: ROCK_PAPER_SCISSORS_ADDRESS,
    topics: [null, ethers.utils.hexZeroPad(ethers.utils.hexlify(gameId), 32)]
  }, creationBlock, currentBlock);
  
  return events.map(event => ({
    name: event.event,
    args: event.args,
    blockNumber: event.blockNumber,
    timestamp: null // Need to get block timestamp separately
  }));
}
```

## Helper Functions

### Get Game Information

```typescript
async function getGameInfo(gameId: number): Promise<Game> {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);
  const result = await contract.games(gameId);
  
  return {
    playerA: result.playerA,
    playerB: result.playerB,
    bet: result.bet,
    timeoutInterval: result.timeoutInterval.toNumber(),
    revealDeadline: result.revealDeadline.toNumber(),
    creationTime: result.creationTime.toNumber(),
    joinDeadline: result.joinDeadline.toNumber(),
    totalTurns: result.totalTurns.toNumber(),
    currentTurn: result.currentTurn.toNumber(),
    commitA: result.commitA,
    commitB: result.commitB,
    moveA: result.moveA,
    moveB: result.moveB,
    scoreA: result.scoreA,
    scoreB: result.scoreB,
    state: result.state
  };
}
```

### Check User's Pending Withdrawals

```typescript
async function checkPendingWithdrawals(): Promise<string> {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);
  const userAddress = await signer.getAddress();
  
  const pendingAmount = await contract.pendingWithdrawals(userAddress);
  return ethers.utils.formatEther(pendingAmount);
}
```

### Get User's Token Balance

```typescript
async function getTokenBalance(): Promise<string> {
  const tokenContract = new ethers.Contract(WINNING_TOKEN_ADDRESS, TOKEN_ABI, provider);
  const userAddress = await signer.getAddress();
  
  const balance = await tokenContract.balanceOf(userAddress);
  return balance.toString();
}
```

## Complete Implementation Examples

### React Component Example

```tsx
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const RockPaperScissorsGame = ({ provider, signer }) => {
  const [gameId, setGameId] = useState(null);
  const [gameInfo, setGameInfo] = useState(null);
  const [salt, setSalt] = useState(null);
  const [selectedMove, setSelectedMove] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Create a new game
  const createGame = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const id = await createGameWithEth(3, 600, "0.1");
      setGameId(id);
      
      // Load game info
      const info = await getGameInfo(id);
      setGameInfo(info);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Commit move
  const handleCommitMove = async (move) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedMove(move);
      
      const generatedSalt = await commitMove(gameId, move);
      setSalt(generatedSalt);
      
      // Reload game info
      const info = await getGameInfo(gameId);
      setGameInfo(info);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Reveal move
  const handleRevealMove = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await revealMove(gameId, selectedMove, salt);
      
      // Reload game info
      const info = await getGameInfo(gameId);
      setGameInfo(info);
      
      // Reset move and salt after reveal
      setSelectedMove(null);
      setSalt(null);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Render game UI
  return (
    <div>
      <h2>Rock Paper Scissors Game</h2>
      
      {error && <div className="error">{error}</div>}
      
      {!gameId ? (
        <button onClick={createGame} disabled={loading}>
          {loading ? 'Creating...' : 'Create New Game'}
        </button>
      ) : (
        <div>
          <p>Game ID: {gameId}</p>
          
          {gameInfo && (
            <div>
              <p>Game State: {['Created', 'Committed', 'Revealed', 'Finished', 'Cancelled', 'CommitPhase'][gameInfo.state]}</p>
              <p>Current Turn: {gameInfo.currentTurn} / {gameInfo.totalTurns}</p>
              <p>Score: {gameInfo.scoreA} - {gameInfo.scoreB}</p>
            </div>
          )}
          
          {gameInfo && gameInfo.state === 5 && !salt && (
            <div>
              <p>Select your move:</p>
              <button onClick={() => handleCommitMove(1)}>Rock</button>
              <button onClick={() => handleCommitMove(2)}>Paper</button>
              <button onClick={() => handleCommitMove(3)}>Scissors</button>
            </div>
          )}
          
          {gameInfo && gameInfo.state === 1 && salt && (
            <button onClick={handleRevealMove} disabled={loading}>
              {loading ? 'Revealing...' : 'Reveal Move'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RockPaperScissorsGame;
```

## Contract ABIs

### RockPaperScissors Contract ABI

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
  "function pendingWithdrawals(address) external view returns (uint256)",
  
  // Events
  "event GameCreated(uint256 indexed gameId, address indexed creator, uint256 bet, uint256 totalTurns)",
  "event PlayerJoined(uint256 indexed gameId, address indexed player)",
  "event MoveCommitted(uint256 indexed gameId, address indexed player, uint256 currentTurn)",
  "event MoveRevealed(uint256 indexed gameId, address indexed player, uint8 move, uint256 currentTurn)",
  "event TurnCompleted(uint256 indexed gameId, address winner, uint256 currentTurn)",
  "event GameFinished(uint256 indexed gameId, address winner, uint256 prize)",
  "event GameCancelled(uint256 indexed gameId)",
  "event PrizeAvailable(address indexed player, uint256 amount)",
  "event PrizeWithdrawn(address indexed player, uint256 amount)"
];
```

### WinningToken Contract ABI

```json
const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)",
  "function transfer(address recipient, uint256 amount) external returns (bool)",
  "function owner() external view returns (address)",
  "function decimals() external view returns (uint8)"
];
```
