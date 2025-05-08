# 石头剪刀布游戏合约部署信息

## 部署信息

- 区块链网络：MagnetChain
- 链ID：114514
- 节点URL：https://node2.magnetchain.xyz

## 合约地址

1. **WinningToken合约**
   - 地址：`0x5BA41CFe93fcD6Bc5BDc00A83BDd5d7E8F696F1E`
   - 部署交易哈希：`0xaa2ed5eda5451dfe2cc60ec0d83319691b4cf53674e26bcf52abec0a9b444e9e`
   - 部署者：`0x3c5c0e1be0649D7aAa181271AebdEae12c82d7c5`

2. **RockPaperScissors游戏合约**
   - 地址：`0x3c5c0e1be0649D7aAa181271AebdEae12c82d7c5`
   - 部署交易哈希：`0xd6eef2c02e13353295320e07f25808e26904645de3eeea91986d669d092b3816`
   - 部署者：`0xA795CEDd3962232e5A58EcB59BBb85ACa7f24781`

## 所有权转移

- WinningToken合约的所有权已转移给RockPaperScissors合约
- 转移交易哈希：`0xb93870954d97db4278f7c1ff4229d0885201c4764142df5fe9674b31c65e53af`

## 接口

### WinningToken合约

- 代币名称：Rock Paper Scissors Winner Token
- 代币符号：RPSW
- 主要功能：
  - `mint(address to, uint256 amount)`: 铸造代币（仅限所有者）
  - `burn(uint256 value)`: 销毁代币
  - `burnFrom(address account, uint256 value)`: 从指定账户销毁代币

### RockPaperScissors游戏合约

- 主要功能：
  - `createGameWithEth(uint256 _totalTurns, uint256 _timeoutInterval, uint256 _timeoutCommit)`: 创建ETH游戏
  - `createGameWithToken(uint256 _totalTurns, uint256 _timeoutInterval, uint256 _timeoutCommit)`: 创建代币游戏
  - `joinGameWithEth(uint256 _gameId)`: 加入ETH游戏
  - `joinGameWithToken(uint256 _gameId)`: 加入代币游戏
  - `commitMove(uint256 _gameId, bytes32 _commitHash)`: 提交移动
  - `revealMove(uint256 _gameId, uint8 _move, bytes32 _salt)`: 揭示移动
  - `timeoutCommit(uint256 _gameId)`: 提交阶段超时处理
  - `timeoutReveal(uint256 _gameId)`: 揭示阶段超时处理
  - `withdrawPrize()`: 提取奖励

## 注意事项

1. 游戏创建时需要指定奇数回合数（如1、3、5等），以确保有明确的胜者。
2. 游戏使用承诺-揭示机制，确保玩家不能看到对方的选择。
3. 合约包含超时处理机制，防止玩家不揭示移动。
4. 赢家可以获得奖励代币，可用于未来的游戏。
