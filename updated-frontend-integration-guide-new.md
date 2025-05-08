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
- **Chain ID**: 114514
- **Node URL**: https://node2.magnetchain.xyz
- **RockPaperScissors Contract**: `0x3c5c0e1be0649D7aAa181271AebdEae12c82d7c5`
- **WinningToken Contract**: `0xE40363A17846E7e55BF7afA2Ec601dA8F21e2ac0`

## Smart Contract Overview

The Rock Paper Scissors smart contract system implements a fair, multi-round game using a commit-reveal pattern to ensure fairness. It supports both ETH-based games and token-based games using the WinningToken (RPSW).

### Key Features

- **Commit-Reveal Pattern**: Players first commit to a move (without revealing it), then reveal their move once all commitments are made
- **Multi-Round Games**: Supports multi-round games with configurable number of rounds (must be odd)
- **Dual Currency Support**: Play with ETH or RPSW tokens
- **Timeout Protection**: Built-in timeout mechanisms for both commit and reveal phases
- **Winner Rewards**: Winners receive both the prize money and a RPSW token

## Data Structures

### Game States

```typescript
enum GameState {
  Created = 0,     // Game created, waiting for second player
  Committed = 1,   // All players have committed their moves for the current round
  Revealed = 2,    // Moves have been revealed for the current round
  Finished = 3,    // Game is complete
  Cancelled = 4,   // Game was cancelled
  CommitPhase = 5  // Waiting for players to commit their moves
}
```

### State Transitions

```
Created 
    ↓
Player B joins
    ↓
CommitPhase (Players can submit their moves)
    ↓
Both players committed → Committed (Reveal phase begins)
    ↓
Both players revealed → Revealed 
    ↓
Round ends, game not complete → CommitPhase (New round)
    ↓
Game complete → Finished
```

### Move Types

```typescript
enum Move {
  None = 0,
  Rock = 1,
  Paper = 2,
  Scissors = 3
}
```

### Game Structure

```typescript
interface Game {
        address playerA; // Creator of the game
        address playerB; // Second player to join
        uint256 bet; // Amount of ETH bet
        uint256 timeoutInterval; // Time allowed for reveal phase
        uint256 revealDeadline; // Deadline for revealing moves
        uint256 creationTime; // When the game was created
        uint256 joinDeadline; // Deadline for someone to join the game
        uint256 totalTurns; // Total number of turns in the game
        uint256 currentTurn; // Current turn number
        bytes32 commitA; // Hashed move from player A
        bytes32 commitB; // Hashed move from player B
        Move moveA; // Revealed move from player A
        Move moveB; // Revealed move from player B
        uint8 scoreA; // Score for player A
        uint8 scoreB; // Score for player B
        GameState state; // Current state of the game
        uint256 timeoutCommit; // Time allowed for commit
        uint256 commitDeadline; // Deadline for commitPhase
}
```

## Core API Reference

### Game Creation

#### Create Game with ETH

```typescript
async function createGameWithEth(
  provider: ethers.providers.Web3Provider,
  totalTurns: number,
  timeoutInterval: number,
  timeoutCommit: number,
  betAmount: ethers.BigNumber
): Promise<number> {  // Returns game ID
  // Input validation
  if (totalTurns % 2 !== 1) {
    throw new Error("Total turns must be an odd number");
  }
  if (timeoutInterval < 300) { // 5 minutes in seconds
    throw new Error("Timeout must be at least 5 minutes");
  }
  if (timeoutCommit < 300) {
    throw new Error("Commit timeout must be at least 5 minutes");
  }
  
  const signer = provider.getSigner();
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  const tx = await contract.createGameWithEth(totalTurns, timeoutInterval, timeoutCommit, {
    value: betAmount
  });
  const receipt = await tx.wait();
  
  // Parse the GameCreated event to get the game ID
  const event = receipt.events.find(e => e.event === 'GameCreated');
  return event.args.gameId.toNumber();
}
```

#### Create Game with Token

```typescript
async function createGameWithToken(
  provider: ethers.providers.Web3Provider,
  totalTurns: number,
  timeoutInterval: number,
  timeoutCommit: number,
): Promise<number> {  // Returns game ID
  // Input validation similar to ETH function
  
  const signer = provider.getSigner();
  const tokenContract = new ethers.Contract(WINNING_TOKEN_ADDRESS, TOKEN_ABI, signer);
  const gameContract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  // First approve the game contract to burn the token
  const approveTx = await tokenContract.approve(ROCK_PAPER_SCISSORS_ADDRESS, 1);
  await approveTx.wait();
  
  // Then create the game
  const tx = await gameContract.createGameWithToken(totalTurns, timeoutInterval, timeoutCommit);
  const receipt = await tx.wait();
  
  const event = receipt.events.find(e => e.event === 'GameCreated');
  return event.args.gameId.toNumber();
}
```

### Joining Games

#### Join Game with ETH

```typescript
async function joinGameWithEth(
  provider: ethers.providers.Web3Provider,
  gameId: number,
  betAmount: ethers.BigNumber
): Promise<void> {
  const signer = provider.getSigner();
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  const tx = await contract.joinGameWithEth(gameId, { value: betAmount });
  await tx.wait();
}
```

#### Join Game with Token

```typescript
async function joinGameWithToken(
  provider: ethers.providers.Web3Provider,
  gameId: number
): Promise<void> {
  const signer = provider.getSigner();
  const tokenContract = new ethers.Contract(WINNING_TOKEN_ADDRESS, TOKEN_ABI, signer);
  const gameContract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  // First approve the game contract to burn the token
  const approveTx = await tokenContract.approve(ROCK_PAPER_SCISSORS_ADDRESS, 1);
  await approveTx.wait();
  
  // Then join the game
  const tx = await gameContract.joinGameWithToken(gameId);
  await tx.wait();
}
```

### Game Play - Commit Phase

#### Commit Move

```typescript
async function commitMove(
  provider: ethers.providers.Web3Provider,
  gameId: number,
  move: Move,  // 1=Rock, 2=Paper, 3=Scissors
  salt: string // Random string or bytes32
): Promise<void> {
  const signer = provider.getSigner();
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  const signerAddress = await signer.getAddress();
  
  // Create the commit hash: keccak256(move + salt + player address)
  const abiCoder = new ethers.utils.AbiCoder();
  const encoded = abiCoder.encode(['uint8', 'bytes32', 'address'], [move, salt, signerAddress]);
  const commitHash = ethers.utils.keccak256(encoded);
  
  // Submit the commitment
  const tx = await contract.commitMove(gameId, commitHash);
  await tx.wait();
}
```

#### Generate Random Salt

```typescript
function generateRandomSalt(): string {
  // Generate a random 32-byte value
  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  return ethers.utils.hexlify(randomBytes);
}
```

### Game Play - Reveal Phase

#### Reveal Move

```typescript
async function revealMove(
  provider: ethers.providers.Web3Provider,
  gameId: number,
  move: Move,  // Must match the committed move
  salt: string // Must match the salt used in the commit
): Promise<void> {
  const signer = provider.getSigner();
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  const tx = await contract.revealMove(gameId, move, salt);
  await tx.wait();
}
```

### Timeout Handling

#### Handle Commit Timeout

```typescript
async function timeoutCommit(
  provider: ethers.providers.Web3Provider,
  gameId: number
): Promise<void> {
  const signer = provider.getSigner();
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  const tx = await contract.timeoutCommit(gameId);
  await tx.wait();
}
```

#### Check if Commit Timeout is Possible

```typescript
async function canTimeoutCommit(
  provider: ethers.providers.Provider,
  gameId: number
): Promise<{canTimeout: boolean, winnerIfTimeout: string}> {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);
  return await contract.canTimeoutCommit(gameId);
}
```

#### Handle Reveal Timeout

```typescript
async function timeoutReveal(
  provider: ethers.providers.Web3Provider,
  gameId: number
): Promise<void> {
  const signer = provider.getSigner();
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  const tx = await contract.timeoutReveal(gameId);
  await tx.wait();
}
```

#### Check if Reveal Timeout is Possible

```typescript
async function canTimeoutReveal(
  provider: ethers.providers.Provider,
  gameId: number
): Promise<{canTimeout: boolean, winnerIfTimeout: string}> {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);
  return await contract.canTimeoutReveal(gameId);
}
```

### Prize and Withdrawals

#### Check Pending Withdrawals

```typescript
async function getPendingWithdrawals(
  provider: ethers.providers.Provider,
  address: string
): Promise<ethers.BigNumber> {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);
  return await contract.getPendingWithdrawals(address);
}
```

#### Withdraw Prize

```typescript
async function withdrawPrize(
  provider: ethers.providers.Web3Provider
): Promise<boolean> {
  const signer = provider.getSigner();
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, signer);
  
  const tx = await contract.withdrawPrize();
  const receipt = await tx.wait();
  
  // Check if withdrawal was successful
  return receipt.status === 1;
}
```

## Game Flow Implementation

### Complete Game Flow with Events

```typescript
// Game creation
const gameId = await createGameWithEth(provider, 3, 600, 600, ethers.utils.parseEther('0.1'));

// Set up event listeners for this game
setupGameEventListeners(gameId, provider);

// Functions to handle different game phases
function handleCommitPhase(gameId: number) {
  // Generate random salt for this round
  const salt = generateRandomSalt();
  
  // Store the salt and move for later reveal (e.g., in localStorage)
  const move = getUserSelectedMove(); // 1, 2, or 3
  localStorage.setItem(`game-${gameId}-salt`, salt);
  localStorage.setItem(`game-${gameId}-move`, move.toString());
  
  // Commit the move
  commitMove(provider, gameId, move, salt)
    .then(() => console.log("Move committed successfully"))
    .catch(console.error);
}

function handleRevealPhase(gameId: number) {
  // Retrieve the stored salt and move
  const salt = localStorage.getItem(`game-${gameId}-salt`);
  const move = parseInt(localStorage.getItem(`game-${gameId}-move`));
  
  if (!salt || !move) {
    console.error("Could not find stored move or salt");
    return;
  }
  
  // Reveal the move
  revealMove(provider, gameId, move, salt)
    .then(() => console.log("Move revealed successfully"))
    .catch(console.error);
}

function checkTimeouts(gameId: number) {
  // Check for commit timeout
  canTimeoutCommit(provider, gameId).then(({canTimeout, winnerIfTimeout}) => {
    if (canTimeout) {
      timeoutCommit(provider, gameId)
        .then(() => console.log("Commit timeout processed"))
        .catch(console.error);
    }
  });
  
  // Check for reveal timeout
  canTimeoutReveal(provider, gameId).then(({canTimeout, winnerIfTimeout}) => {
    if (canTimeout) {
      timeoutReveal(provider, gameId)
        .then(() => console.log("Reveal timeout processed"))
        .catch(console.error);
    }
  });
}
```

## Event Handling

### Setting Up Event Listeners

```typescript
function setupGameEventListeners(gameId: number, provider: ethers.providers.Provider) {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);
  
  // Filter for events specific to this game
  const gameFilter = contract.filters.GameCreated(gameId);
  const joinFilter = contract.filters.PlayerJoined(gameId);
  const commitFilter = contract.filters.MoveCommitted(gameId);
  const revealFilter = contract.filters.MoveRevealed(gameId);
  const allCommittedFilter = contract.filters.AllCommitted(gameId);
  const turnFilter = contract.filters.TurnCompleted(gameId);
  const finishFilter = contract.filters.GameFinished(gameId);
  const cancelFilter = contract.filters.GameCancelled(gameId);
  
  // Set up listeners
  contract.on(joinFilter, (gameId, player) => {
    console.log(`Player ${player} joined game ${gameId}`);
    updateGameState(gameId, provider);
  });
  
  contract.on(commitFilter, (gameId, player, currentTurn) => {
    console.log(`Player ${player} committed move for turn ${currentTurn}`);
    updateGameState(gameId, provider);
  });
  
  contract.on(allCommittedFilter, (gameId, currentTurn) => {
    console.log(`All players committed their moves for turn ${currentTurn}`);
    updateGameState(gameId, provider);
    // Transition UI to reveal phase
  });
  
  contract.on(revealFilter, (gameId, player, move, currentTurn) => {
    console.log(`Player ${player} revealed move ${move} for turn ${currentTurn}`);
    updateGameState(gameId, provider);
  });
  
  contract.on(turnFilter, (gameId, winner, currentTurn) => {
    console.log(`Turn ${currentTurn} completed, winner: ${winner}`);
    updateGameState(gameId, provider);
    // Update UI for next turn if game continues
  });
  
  contract.on(finishFilter, (gameId, winner, prize) => {
    console.log(`Game ${gameId} finished, winner: ${winner}, prize: ${ethers.utils.formatEther(prize)} ETH`);
    updateGameState(gameId, provider);
    // Show game results
  });
  
  contract.on(cancelFilter, (gameId) => {
    console.log(`Game ${gameId} was cancelled`);
    updateGameState(gameId, provider);
    // Update UI to show cancellation
  });

  // Function to update game state
  async function updateGameState(gameId: number, provider: ethers.providers.Provider) {
    const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);
    const gameData = await contract.games(gameId);
    // Process and update UI with game data
    return gameData;
  }
}
```

## Helper Functions

### Get Game Information

```typescript
async function getGameInfo(provider: ethers.providers.Provider, gameId: number): Promise<Game> {
  const contract = new ethers.Contract(ROCK_PAPER_SCISSORS_ADDRESS, ABI, provider);
  const gameData = await contract.games(gameId);
  
  return {
    playerA: gameData.playerA,
    playerB: gameData.playerB,
    bet: gameData.bet,
    timeoutInterval: gameData.timeoutInterval.toNumber(),
    revealDeadline: gameData.revealDeadline.toNumber(),
    timeoutCommit: gameData.timeoutCommit.toNumber(),
    commitDeadline: gameData.commitDeadline.toNumber(),
    creationTime: gameData.creationTime.toNumber(),
    joinDeadline: gameData.joinDeadline.toNumber(),
    totalTurns: gameData.totalTurns.toNumber(),
    currentTurn: gameData.currentTurn.toNumber(),
    scoreA: gameData.scoreA,
    scoreB: gameData.scoreB,
    state: gameData.state
  };
}
```

### Check User's Game Role

```typescript
async function getUserGameRole(provider: ethers.providers.Provider, gameId: number): Promise<'playerA' | 'playerB' | 'spectator'> {
  const signer = provider.getSigner();
  const userAddress = await signer.getAddress();
  
  const gameInfo = await getGameInfo(provider, gameId);
  
  if (userAddress.toLowerCase() === gameInfo.playerA.toLowerCase()) {
    return 'playerA';
  } else if (userAddress.toLowerCase() === gameInfo.playerB.toLowerCase()) {
    return 'playerB';
  } else {
    return 'spectator';
  }
}
```

## Contract ABIs

### RockPaperScissors ABI

```javascript
const ABI = [
  // Game creation functions
  "function createGameWithEth(uint256 _totalTurns, uint256 _timeoutInterval, uint256 _timeoutCommit) external payable returns (uint256)",
  "function createGameWithToken(uint256 _totalTurns, uint256 _timeoutInterval, uint256 _timeoutCommit) external returns (uint256)",
  
  // Game joining functions
  "function joinGameWithEth(uint256 _gameId) external payable",
  "function joinGameWithToken(uint256 _gameId) external",
  
  // Game play functions
  "function commitMove(uint256 _gameId, bytes32 _commitHash) external",
  "function revealMove(uint256 _gameId, uint8 _move, bytes32 _salt) external",
  
  // Timeout functions
  "function timeoutCommit(uint256 _gameId) external",
  "function timeoutReveal(uint256 _gameId) external",
  "function canTimeoutCommit(uint256 _gameId) external view returns (bool canTimeout, address winnerIfTimeout)",
  "function canTimeoutReveal(uint256 _gameId) external view returns (bool canTimeout, address winnerIfTimeout)",
  
  // Game cancellation
  "function cancelGame(uint256 _gameId) external",
  "function timeoutJoin(uint256 _gameId) external",
  "function canTimeoutJoin(uint256 _gameId) external view returns (bool)",
  
  // Withdraw functions
  "function withdrawPrize() external returns (bool)",
  "function getPendingWithdrawals(address player) external view returns(uint256)",
  
  // Game data
  "function games(uint256) external view returns (address playerA, address playerB, uint256 bet, uint256 timeoutInterval, uint256 revealDeadline, uint256 creationTime, uint256 joinDeadline, uint256 totalTurns, uint256 currentTurn, bytes32 commitA, bytes32 commitB, uint8 moveA, uint8 moveB, uint8 scoreA, uint8 scoreB, uint8 state, uint256 timeoutCommit, uint256 commitDeadline)",
  
  // Events
  "event GameCreated(uint256 indexed gameId, address indexed creator, uint256 bet, uint256 totalTurns)",
  "event PlayerJoined(uint256 indexed gameId, address indexed player)",
  "event MoveCommitted(uint256 indexed gameId, address indexed player, uint256 currentTurn)",
  "event AllCommitted(uint256 indexed gameId, uint256 currentTurn)",
  "event MoveRevealed(uint256 indexed gameId, address indexed player, uint8 move, uint256 currentTurn)",
  "event TurnCompleted(uint256 indexed gameId, address winner, uint256 currentTurn)",
  "event GameFinished(uint256 indexed gameId, address winner, uint256 prize)",
  "event GameCancelled(uint256 indexed gameId)",
  "event PrizeAvailable(address indexed player, uint256 amount)",
  "event PrizeWithdrawn(address indexed player, uint256 amount)"
];
```

### WinningToken ABI

```javascript
const TOKEN_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function owner() external view returns (address)",
  "function decimals() external view returns (uint8)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];
```
