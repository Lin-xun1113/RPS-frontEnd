// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./WinningToken.sol";

/**
 * @title Rock Paper Scissors Game
 * @notice A fair implementation of Rock Paper Scissors on Ethereum
 * @dev Players commit hashed moves, then reveal them to determine the winner
 */
contract RockPaperScissors {
    // Game moves
    enum Move {
        None,
        Rock,
        Paper,
        Scissors
    }

    // Game states
    enum GameState {
        Created,
        Committed, // 全部都已提交（已默认进入可reveal阶段，reveal计时器开始计时）
        Revealed,
        Finished,
        Cancelled,
        CommitPhase // 还存在未提交的玩家的阶段（一个或两个未提交）
    }

    // Game structure
    struct Game {
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

    // Mapping of game ID to game data
    mapping(uint256 => Game) public games;

    // Counter for game IDs
    uint256 public gameCounter;

    // Token for winners
    WinningToken public immutable winningToken;

    // Admin address for ownership functions
    address public adminAddress;

    // Deposit amounts and timeouts
    uint256 public constant minBet = 0.01 ether;
    uint256 public joinTimeout = 24 hours; // Time allowed for someone to join the game

    // Protocol fee percentage (10%)
    uint256 public constant PROTOCOL_FEE_PERCENT = 10;

    // Accumulated fees that the admin can withdraw
    uint256 public accumulatedFees;
    
    // Mapping to track pending withdrawals
    mapping(address => uint256) public pendingWithdrawals;

    // Accumulated total Pending of all games
    uint256 public totalPending;

    // Events
    event GameCreated(uint256 indexed gameId, address indexed creator, uint256 bet, uint256 totalTurns);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event MoveCommitted(uint256 indexed gameId, address indexed player, uint256 currentTurn);
    event MoveRevealed(uint256 indexed gameId, address indexed player, Move move, uint256 currentTurn);
    event TurnCompleted(uint256 indexed gameId, address winner, uint256 currentTurn);
    event GameFinished(uint256 indexed gameId, address winner, uint256 prize);
    event GameCancelled(uint256 indexed gameId);
    event JoinTimeoutUpdated(uint256 oldTimeout, uint256 newTimeout);
    event FeeCollected(uint256 gameId, uint256 feeAmount);
    event FeeWithdrawn(address indexed admin, uint256 amount);
    event PrizeAvailable(address indexed player, uint256 amount);
    event PrizeWithdrawn(address indexed player, uint256 amount);
    event AllCommitted(uint256 indexed gameId, uint256 currentTurn);
    /**
     * @dev Constructor sets up the winning token and admin
     */
    constructor() {
        winningToken = new WinningToken();
        adminAddress = msg.sender;
    }

    /**
     * @notice Create a new game with ETH bet
     * @param _totalTurns Number of turns for the game (must be odd)
     * @param _timeoutInterval Seconds allowed for reveal phase
     */
    function createGameWithEth(uint256 _totalTurns, uint256 _timeoutInterval, uint256 _timeoutCommit) external payable returns (uint256) {
        require(msg.value >= minBet, "Bet amount too small");
        require(_totalTurns > 0, "Must have at least one turn");
        require(_totalTurns % 2 == 1, "Total turns must be odd");
        require(_timeoutInterval >= 5 minutes, "Timeout must be at least 5 minutes");

        uint256 gameId = gameCounter++;

        Game storage game = games[gameId];
        game.playerA = msg.sender;
        game.bet = msg.value;
        game.timeoutInterval = _timeoutInterval;
        game.creationTime = block.timestamp;
        game.joinDeadline = block.timestamp + joinTimeout;
        game.totalTurns = _totalTurns;
        game.currentTurn = 1;
        game.state = GameState.Created;
        game.timeoutCommit = _timeoutCommit;

        emit GameCreated(gameId, msg.sender, msg.value, _totalTurns);

        return gameId;
    }

    /**
     * @notice Create a new game with winning token
     * @param _totalTurns Number of turns for the game (must be odd)
     * @param _timeoutInterval Seconds allowed for reveal phase
     */
    function createGameWithToken(uint256 _totalTurns, uint256 _timeoutInterval, uint256 _timeoutCommit) external returns (uint256) {
        require(winningToken.balanceOf(msg.sender) >= 1, "Must have winning token");
        require(_totalTurns > 0, "Must have at least one turn");
        require(_totalTurns % 2 == 1, "Total turns must be odd");
        require(_timeoutInterval >= 5 minutes, "Timeout must be at least 5 minutes");

        // 直接燃烧代币而不是转移到合约中
        winningToken.burnFrom(msg.sender, 1);

        uint256 gameId = gameCounter++;

        Game storage game = games[gameId];
        game.playerA = msg.sender;
        game.bet = 0; // Zero ether bet because using token
        game.timeoutInterval = _timeoutInterval;
        game.creationTime = block.timestamp;
        game.joinDeadline = block.timestamp + joinTimeout;
        game.totalTurns = _totalTurns;
        game.currentTurn = 1;
        game.state = GameState.Created;
        game.timeoutCommit = _timeoutCommit;

        emit GameCreated(gameId, msg.sender, 0, _totalTurns);

        return gameId;
    }

    /**
     * @notice Join an existing game with ETH bet
     * @param _gameId ID of the game to join
     */
    function joinGameWithEth(uint256 _gameId) external payable {
        Game storage game = games[_gameId];

        require(game.state == GameState.Created, "Game not open to join");
        require(game.playerA != msg.sender, "Cannot join your own game");
        require(block.timestamp <= game.joinDeadline, "Join deadline passed");
        // 添加检查确保playerB尚未设置
        require(game.playerB == address(0), "Game already has a second player");
        // 添加检查确保不能用ETH加入代币游戏
        require(game.bet > 0, "This game requires token to join");
        require(msg.value == game.bet, "Bet amount must match creator's bet");

        game.playerB = msg.sender;
        game.state = GameState.CommitPhase;
        emit PlayerJoined(_gameId, msg.sender);
    }

    /**
     * @notice Join an existing game with token
     * @param _gameId ID of the game to join
     */
    function joinGameWithToken(uint256 _gameId) external {
        Game storage game = games[_gameId];

        require(game.state == GameState.Created, "Game not open to join");
        require(game.playerA != msg.sender, "Cannot join your own game");
        require(block.timestamp <= game.joinDeadline, "Join deadline passed");
        require(game.bet == 0, "This game requires ETH bet");
        require(winningToken.balanceOf(msg.sender) >= 1, "Must have winning token");
        // 添加检查确保playerB尚未设置
        require(game.playerB == address(0), "Game already has a second player");

        // 直接燃烧代币而不是转移到合约中
        winningToken.burnFrom(msg.sender, 1);
        game.state = GameState.CommitPhase;
        game.playerB = msg.sender;
        emit PlayerJoined(_gameId, msg.sender);
    }

    /**
     * @notice Commit a hashed move (keccak256(move + salt + player address))
     * @param _gameId ID of the game
     * @param _commitHash Hashed move with salt and player address
     */
    function commitMove(uint256 _gameId, bytes32 _commitHash) external {
        Game storage game = games[_gameId];

        require(msg.sender == game.playerA || msg.sender == game.playerB, "Not a player in this game");
        // 修改：增加对CommitPhase状态的支持
        // require(game.state == GameState.Created || game.state == GameState.Committed || game.state == GameState.CommitPhase, "Game not in commit phase");

        require(game.state == GameState.CommitPhase, "Game not in commit phase");
        // if (game.currentTurn == 1 && game.commitA == bytes32(0) && game.commitB == bytes32(0)) {
        //     // First turn, first commits
        //     require(game.playerB != address(0), "Waiting for player B to join");
        //     game.state = GameState.Committed;
        // } else {
        //     // Later turns or second player committing
        //     // 修改：增加对CommitPhase状态的支持
        //     require(game.state == GameState.Committed || game.state == GameState.CommitPhase, "Not in commit phase");
        //     require(game.moveA == Move.None && game.moveB == Move.None, "Moves already committed for this turn");
        // }

        if (msg.sender == game.playerA) {
            require(game.commitA == bytes32(0), "Already committed");
            game.commitA = _commitHash;
        } else {
            require(game.commitB == bytes32(0), "Already committed");
            game.commitB = _commitHash;
        }

        if (game.commitDeadline == 0) {
            game.commitDeadline = block.timestamp + game.timeoutCommit;
        } else{
            require(block.timestamp <= game.commitDeadline, "commit phase timed out");
        }

        emit MoveCommitted(_gameId, msg.sender, game.currentTurn);


        // If both players have committed, change state to Committed
        if (game.commitA != bytes32(0) && game.commitB != bytes32(0)) {
            // 确保状态更新为Committed，表示现在可以进入揭示阶段
            game.state = GameState.Committed;
            game.revealDeadline = block.timestamp + game.timeoutInterval;
            emit AllCommitted(_gameId, game.currentTurn);
        }
    }

    /**
     * @notice Reveal committed move
     * @param _gameId ID of the game
     * @param _move Player's move (1=Rock, 2=Paper, 3=Scissors)
     * @param _salt Random salt used in the commit phase
     */
    function revealMove(uint256 _gameId, uint8 _move, bytes32 _salt) external {
        Game storage game = games[_gameId];

        require(msg.sender == game.playerA || msg.sender == game.playerB, "Not a player in this game");
        // 确保游戏状态是Committed(已提交)状态，且双方都已提交
        require(game.state == GameState.Committed, "Game not in reveal phase");
        require(block.timestamp <= game.revealDeadline, "Reveal phase timed out");
        require(_move >= 1 && _move <= 3, "Invalid move");

        Move move = Move(_move);
        // 修改：在哈希中加入玩家地址，防止重放攻击
        bytes32 commit = keccak256(abi.encodePacked(move, _salt, msg.sender));

        if (msg.sender == game.playerA) {
            require(commit == game.commitA, "Hash doesn't match commitment");
            require(game.moveA == Move.None, "Move already revealed");
            game.moveA = move;
        } else {
            require(commit == game.commitB, "Hash doesn't match commitment");
            require(game.moveB == Move.None, "Move already revealed");
            game.moveB = move;
        }

        emit MoveRevealed(_gameId, msg.sender, move, game.currentTurn);

        // If both players have revealed, determine the winner for this turn
        if (game.moveA != Move.None && game.moveB != Move.None) {
            game.state = GameState.Revealed;
            _determineWinner(_gameId);
        }
    }

    /**
     * @notice Claim win if opponent didn't commit in time
     * @param _gameId ID of the game
     */
    function timeoutCommit(uint256 _gameId) external {
        Game storage game = games[_gameId];

        require(msg.sender == game.playerA || msg.sender == game.playerB, "Not a player in this game");
        require(game.state == GameState.CommitPhase, "Game not in commit phase");
        // 添加检查确保两个玩家都已提交移动
        require(game.commitA == bytes32(0) || game.commitB == bytes32(0), "Both players already committed");
        require(game.commitDeadline > 0, "commit deadline not set");
        require(block.timestamp > game.commitDeadline, "Reveal phase not timed out yet");

        // If player calling timeout has revealed but opponent hasn't, they win
        bool playerACommitted = game.commitA != bytes32(0);
        bool playerBCommitted = game.commitB != bytes32(0);

        if (playerACommitted && !playerBCommitted) {
            // Player A wins by timeout
            _finishGame(_gameId, game.playerA);
        } else if (playerBCommitted && !playerACommitted) {
            // Player B wins by timeout
            _finishGame(_gameId, game.playerB);
        } else if (!playerACommitted && !playerBCommitted) {
            // Neither player revealed, cancel the game and refund
            _cancelGame(_gameId);
        } else {
            revert("Invalid timeout claim");
        }
    }

    /**
     * @notice Check if a game is eligible for a commit timeout
     * @param _gameId ID of the game to check
     * @return canTimeout Whether the game can be timed out
     * @return winnerIfTimeout The address of the winner if timed out, or address(0) if tied
     */
    function canTimeoutCommit(uint256 _gameId) external view returns (bool canTimeout, address winnerIfTimeout) {
        Game storage game = games[_gameId];

        // 确保游戏状态正确并且双方都已提交移动
        if (game.state != GameState.CommitPhase || 
            game.commitDeadline == 0 || 
            block.timestamp <= game.commitDeadline) {
            return (false, address(0));
        }

        bool playerACommitted = game.commitA != bytes32(0);
        bool playerBCommitted = game.commitB != bytes32(0);

        if (playerACommitted && !playerBCommitted) {
            return (true, game.playerA);
        } else if (!playerACommitted && playerBCommitted) {
            return (true, game.playerB);
        } else if (!playerACommitted && !playerBCommitted) {
            return (true, address(0)); // Both forfeit
        }

        return (false, address(0));
    }
    /**
     * @notice Claim win if opponent didn't reveal in time
     * @param _gameId ID of the game
     */
    function timeoutReveal(uint256 _gameId) external {
        Game storage game = games[_gameId];

        require(msg.sender == game.playerA || msg.sender == game.playerB, "Not a player in this game");
        require(game.state == GameState.Committed, "Game not in reveal phase");
        // 添加检查确保两个玩家都已提交移动
        require(game.commitA != bytes32(0) && game.commitB != bytes32(0), "Both players must commit first");
        // 确保revealDeadline已经设置(双方都提交了移动才会设置该值)
        require(game.revealDeadline > 0, "Reveal deadline not set");
        require(block.timestamp > game.revealDeadline, "Reveal phase not timed out yet");

        // If player calling timeout has revealed but opponent hasn't, they win
        bool playerARevealed = game.moveA != Move.None;
        bool playerBRevealed = game.moveB != Move.None;

        if (msg.sender == game.playerA && playerARevealed && !playerBRevealed) {
            // Player A wins by timeout
            _finishGame(_gameId, game.playerA);
        } else if (msg.sender == game.playerB && playerBRevealed && !playerARevealed) {
            // Player B wins by timeout
            _finishGame(_gameId, game.playerB);
        } else if (!playerARevealed && !playerBRevealed) {
            // Neither player revealed, cancel the game and refund
            _cancelGame(_gameId);
        } else {
            revert("Invalid timeout claim");
        }
    }

    /**
     * @notice Check if a game is eligible for a reveal timeout
     * @param _gameId ID of the game to check
     * @return canTimeout Whether the game can be timed out
     * @return winnerIfTimeout The address of the winner if timed out, or address(0) if tied
     */
    function canTimeoutReveal(uint256 _gameId) external view returns (bool canTimeout, address winnerIfTimeout) {
        Game storage game = games[_gameId];

        // 确保游戏状态正确并且双方都已提交移动
        if (game.state != GameState.Committed || 
            game.commitA == bytes32(0) || 
            game.commitB == bytes32(0) || 
            game.revealDeadline == 0 || 
            block.timestamp <= game.revealDeadline) {
            return (false, address(0));
        }

        bool playerARevealed = game.moveA != Move.None;
        bool playerBRevealed = game.moveB != Move.None;

        if (playerARevealed && !playerBRevealed) {
            return (true, game.playerA);
        } else if (!playerARevealed && playerBRevealed) {
            return (true, game.playerB);
        } else if (!playerARevealed && !playerBRevealed) {
            return (true, address(0)); // Both forfeit
        }

        return (false, address(0));
    }


    /**
     * @notice Cancel game and refund if still in created state
     * @param _gameId ID of the game
     */
    function cancelGame(uint256 _gameId) external {
        Game storage game = games[_gameId];

        require(game.state == GameState.Created, "Game must be in created state");
        require(msg.sender == game.playerA, "Only creator can cancel");

        _cancelGame(_gameId);
    }

    /**
     * @notice Cancel game if the join timeout has passed and no one has joined
     * @param _gameId ID of the game
     */
    function timeoutJoin(uint256 _gameId) external {
        Game storage game = games[_gameId];

        require(game.state == GameState.Created, "Game must be in created state");
        require(block.timestamp > game.joinDeadline, "Join deadline not reached yet");
        require(game.playerB == address(0), "Someone has already joined the game");

        _cancelGame(_gameId);
    }

    /**
     * @notice Set the join timeout period (admin function)
     * @param _newTimeout New timeout value in seconds
     */
    function setJoinTimeout(uint256 _newTimeout) external {
        require(msg.sender == owner(), "Only owner can set timeout");
        require(_newTimeout >= 1 hours, "Timeout must be at least 1 hour");

        uint256 oldTimeout = joinTimeout;
        joinTimeout = _newTimeout;

        emit JoinTimeoutUpdated(oldTimeout, _newTimeout);
    }

    /**
     * @notice Check if a game is eligible for a join timeout
     * @param _gameId ID of the game to check
     * @return True if the game can be timed out, false otherwise
     */
    function canTimeoutJoin(uint256 _gameId) external view returns (bool) {
        Game storage game = games[_gameId];

        return (game.state == GameState.Created && block.timestamp > game.joinDeadline && game.playerB == address(0));
    }

    /**
     * @notice Get the contract owner (the deployer)
     * @return The owner address
     */
    function owner() public view returns (address) {
        return adminAddress;
    }

    /**
     * @notice Get the owner of the token contract
     * @return The token owner address
     */
    function tokenOwner() public view returns (address) {
        return winningToken.owner();
    }

    /**
     * @notice Set a new admin address (only callable by current admin)
     * @param _newAdmin The new admin address
     */
    function setAdmin(address _newAdmin) external {
        require(msg.sender == adminAddress, "Only admin can set new admin");
        require(_newAdmin != address(0), "Admin cannot be zero address");

        adminAddress = _newAdmin;
    }

    /**
     * @notice Allows the admin to withdraw accumulated protocol fees
     * @param _amount The amount to withdraw (0 for all)
     */
    function withdrawFees(uint256 _amount) external {
        require(msg.sender == adminAddress, "Only admin can withdraw fees");

        uint256 amountToWithdraw = _amount == 0 ? accumulatedFees : _amount;
        require(amountToWithdraw <= accumulatedFees, "Insufficient fee balance");

        accumulatedFees -= amountToWithdraw;

        (bool success,) = adminAddress.call{value: amountToWithdraw}("");
        require(success, "Fee withdrawal failed");

        emit FeeWithdrawn(adminAddress, amountToWithdraw);
    }

    /**
     * @dev Internal function to determine winner for the current turn
     * @param _gameId ID of the game
     */
    function _determineWinner(uint256 _gameId) internal {
        Game storage game = games[_gameId];

        address turnWinner = address(0);

        // Rock = 1, Paper = 2, Scissors = 3
        if (game.moveA == game.moveB) {
            // Tie, no points
            turnWinner = address(0);
        } else if (
            (game.moveA == Move.Rock && game.moveB == Move.Scissors)
                || (game.moveA == Move.Paper && game.moveB == Move.Rock)
                || (game.moveA == Move.Scissors && game.moveB == Move.Paper)
        ) {
            // Player A wins
            game.scoreA++;
            turnWinner = game.playerA;
        } else {
            // Player B wins
            game.scoreB++;
            turnWinner = game.playerB;
        }


        // Calculate the remaining turns
        uint256 remainingTurns = game.totalTurns - game.currentTurn;
        
        // Check if either player has already won mathematically
        // (i.e., has more points than the other player could possibly get)
        bool playerAWonMajority = game.scoreA > (game.scoreB + remainingTurns);
        bool playerBWonMajority = game.scoreB > (game.scoreA + remainingTurns);
        
        // End game immediately if either player has mathematically won
        if (playerAWonMajority) {
            _finishGame(_gameId, game.playerA);
            return;
        } else if (playerBWonMajority) {
            _finishGame(_gameId, game.playerB);
            return;
        }
        
        emit TurnCompleted(_gameId, turnWinner, game.currentTurn);

        // 主要用来处理平局
        if (game.currentTurn == game.totalTurns || playerAWonMajority || playerBWonMajority) {
            // End game - all turns completed or mathematical win
            address winner;
            if (game.scoreA > game.scoreB) {
                winner = game.playerA;
            } else if (game.scoreB > game.scoreA) {
                winner = game.playerB;
            } else {
                // This should never happen with odd turns, but just in case
                // of timeouts or other unusual scenarios, handle as a tie
                _handleTie(_gameId);
                return;
            }

            _finishGame(_gameId, winner);
        } else {
            // Reset for next turn
            game.currentTurn++;
            game.commitA = bytes32(0);
            game.commitB = bytes32(0);
            game.moveA = Move.None;
            game.moveB = Move.None;
            // 修改：将状态设置为CommitPhase而不是Committed，确保需要重新提交
            game.state = GameState.CommitPhase;
            game.commitDeadline = 0;
            game.revealDeadline = 0;
        }
    }

    /**
     * @dev Internal function to finish the game and distribute prizes
     * @param _gameId ID of the game
     * @param _winner Address of the winner
     */
    function _finishGame(uint256 _gameId, address _winner) internal {
        Game storage game = games[_gameId];

        game.state = GameState.Finished;

        uint256 prize = 0;

        // Handle ETH prizes
        if (game.bet > 0) {
            // Calculate total pot and fee
            uint256 totalPot = game.bet * 2;
            uint256 fee = (totalPot * PROTOCOL_FEE_PERCENT) / 100;
            prize = totalPot - fee;

            // Accumulate fees for admin to withdraw later
            accumulatedFees += fee;
            emit FeeCollected(_gameId, fee);

            // Add prize to winner's pending withdrawals instead of sending directly
            pendingWithdrawals[_winner] += prize;
            totalPending += prize;
            emit PrizeAvailable(_winner, prize);
        }

        // Handle token prizes - winner gets both tokens
        if (game.bet == 0) {
            // Mint a winning token
            winningToken.mint(_winner, 2);
        } else {
            // Mint a winning token for ETH games too
            winningToken.mint(_winner, 1);
        }

        emit GameFinished(_gameId, _winner, prize);
    }

    /**
     * @dev Handle a tie
     * @param _gameId ID of the game
     */
    function _handleTie(uint256 _gameId) internal {
        Game storage game = games[_gameId];

        game.state = GameState.Finished;

        // Return ETH bets to both players, minus protocol fee
        if (game.bet > 0) {
            // Calculate protocol fee (10% of total pot)
            uint256 totalPot = game.bet * 2;
            // 使用更精确的计算方法，避免舍入错误
            // 直接计算每个玩家应得的金额：(总金额 * (100 - 手续费百分比)) / 200
            uint256 refundPerPlayer = (totalPot * (100 - PROTOCOL_FEE_PERCENT)) / 200;
            uint256 fee = totalPot - (refundPerPlayer * 2);

            // Accumulate fees for admin
            accumulatedFees += fee;
            emit FeeCollected(_gameId, fee);

            // Add refunds to pending withdrawals for both players
            pendingWithdrawals[game.playerA] += refundPerPlayer;
            emit PrizeAvailable(game.playerA, refundPerPlayer);
            
            pendingWithdrawals[game.playerB] += refundPerPlayer;
            emit PrizeAvailable(game.playerB, refundPerPlayer);

            totalPending += (2 * refundPerPlayer);
        }

        // Return tokens for token games
        if (game.bet == 0) {
            winningToken.mint(game.playerA, 1);
            winningToken.mint(game.playerB, 1);
        }

        // Since in a tie scenario, the total prize is split equally
        emit GameFinished(_gameId, address(0), 0);
    }

    /**
     * @dev Cancel game and refund
     * @param _gameId ID of the game
     */
    function _cancelGame(uint256 _gameId) internal {
        Game storage game = games[_gameId];

        game.state = GameState.Cancelled;

        // Refund ETH to players through pending withdrawals
        if (game.bet > 0) {
            pendingWithdrawals[game.playerA] += game.bet;
            emit PrizeAvailable(game.playerA, game.bet);
            totalPending += game.bet;

            if (game.playerB != address(0)) {
                pendingWithdrawals[game.playerB] += game.bet;
                emit PrizeAvailable(game.playerB, game.bet);
                totalPending += game.bet;
            }
        }

        // Return tokens for token games
        if (game.bet == 0) {
            if (game.playerA != address(0)) {
                winningToken.mint(game.playerA, 1);
            }
            if (game.playerB != address(0)) {
                winningToken.mint(game.playerB, 1);
            }
        }

        emit GameCancelled(_gameId);
    }

    /**
     * @dev Fallback function to accept ETH
     */
    receive() external payable {
        // Allow contract to receive ETH
        // 添加到accumulatedFees中，确保可以提取
        accumulatedFees += msg.value;
    }
    
    /**
     * @notice Allows admin to withdraw all ETH in the contract
     * @dev This is an emergency function to prevent funds from being locked
     * @param _amount The amount to withdraw (0 for maximum available)
     */
    function withdrawAllFunds(uint256 _amount) external {
        require(msg.sender == adminAddress, "Only admin can withdraw funds");
        
        // Calculate available balance (total balance - pending withdrawals)
        uint256 availableBalance = address(this).balance;
        uint256 totalPendingWithdrawals = totalPending;
        
        // Calculate maximum amount to withdraw
        uint256 maxWithdrawAmount = availableBalance > totalPendingWithdrawals ? 
                                  availableBalance - totalPendingWithdrawals : 0;
        
        uint256 amountToWithdraw = _amount == 0 ? maxWithdrawAmount : _amount;
        require(amountToWithdraw <= maxWithdrawAmount, "Insufficient available balance");
        
        // Send funds to admin
        (bool success,) = adminAddress.call{value: amountToWithdraw}("");
        require(success, "Fund withdrawal failed");
        
        emit FeeWithdrawn(adminAddress, amountToWithdraw);
    }
    
    /**
     * @notice Allows a player to withdraw their pending ETH rewards
     * @dev Implements pull pattern to avoid DoS attacks from malicious contracts
     * @return True if withdrawal was successful
     */
    function withdrawPrize() external returns (bool) {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No prizes available to withdraw");
        
        // Zero out balance before transfer to prevent re-entrancy
        pendingWithdrawals[msg.sender] = 0;
        totalPending -= amount;
        
        // Transfer ETH to the user
        (bool success,) = msg.sender.call{value: amount}("");
        
        // If transfer fails, restore the balance
        if (!success) {
            pendingWithdrawals[msg.sender] = amount;
            totalPending += amount;
            return false;
        }
        
        emit PrizeWithdrawn(msg.sender, amount);
        return true;
    }

    function getPendingWithdrawals(address player) external view returns(uint256){
        return pendingWithdrawals[player];
    }
}
