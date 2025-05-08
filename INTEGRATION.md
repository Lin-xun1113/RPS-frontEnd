# 石头剪刀布游戏 - 前端集成指南

本文档提供了如何将前端应用与智能合约集成的详细指南。

## 前端与智能合约交互点

本前端应用与智能合约交互的主要点如下：

1. **钱包连接** - 用户需要连接其Web3钱包才能与合约交互
2. **创建游戏** - 调用`createGameWithEth`或`createGameWithToken`函数
3. **加入游戏** - 调用`joinGameWithEth`或`joinGameWithToken`函数
4. **提交移动** - 调用`commitMove`函数
5. **揭示移动** - 调用`revealMove`函数
6. **提取奖励** - 调用`withdrawPrize`函数

## 实现说明

### 钱包连接

本项目使用RainbowKit和Wagmi实现钱包连接功能。配置在`_app.js`中：

```javascript
// 在_app.js中配置Wagmi客户端和RainbowKit
const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

function MyApp({ Component, pageProps }) {
  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <Component {...pageProps} />
      </RainbowKitProvider>
    </WagmiConfig>
  );
}
```

### 创建游戏

创建游戏功能在`create-game.js`中实现，主要调用智能合约的`createGameWithEth`或`createGameWithToken`函数：

```javascript
// 使用ETH创建游戏
const tx = await contract.createGameWithEth(totalTurns, timeoutInterval, {
  value: ethers.utils.parseEther(betAmount)
});

// 使用代币创建游戏
const approveTx = await tokenContract.approve(ROCK_PAPER_SCISSORS_ADDRESS, 1);
await approveTx.wait();
const tx = await contract.createGameWithToken(totalTurns, timeoutInterval);
```

### 提交和揭示移动

提交和揭示移动在`game/[id].js`中实现：

```javascript
// 提交移动
const saltBytes = ethers.utils.randomBytes(32);
const salt = ethers.utils.hexlify(saltBytes);
const moveHash = ethers.utils.solidityKeccak256(
  ['uint8', 'bytes32', 'address'],
  [selectedMove, salt, address]
);
localStorage.setItem(`salt_${gameId}_${address}`, salt);
const tx = await contract.commitMove(gameId, moveHash);

// 揭示移动
const salt = localStorage.getItem(`salt_${gameId}_${address}`);
const tx = await contract.revealMove(gameId, selectedMove, salt);
```

## 重要注意事项

1. **盐值存储** - 当玩家提交移动时，必须安全地存储他们的盐值，以便在揭示阶段使用。当前实现使用`localStorage`，但在生产环境中可能需要更安全的存储机制。

2. **钱包链检测** - 确保用户在正确的区块链上（MagnetChain）。如果不是，应提示用户切换网络。

3. **交易状态跟踪** - 对于所有合约调用，应实现适当的状态跟踪和错误处理。

4. **事件监听** - 考虑添加对合约事件的监听，以便实时更新UI状态。

## 进一步实现的功能

1. **实时游戏状态更新** - 通过WebSocket或轮询事件实现实时游戏状态更新
2. **后端服务端点** - 开发一个轻量级后端服务，管理游戏状态和通知
3. **消息通知系统** - 当对手采取行动或游戏状态变化时发送通知
4. **更丰富的统计数据** - 提供更详细的玩家统计信息和游戏分析
5. **异常处理增强** - 改进玩家网络异常、钱包断开连接等情况的处理

## 测试指南

在实际测试和部署前，请确保：

1. 在使用真实钱包和资金前，先在测试网络上完成完整测试
2. 始终与网络连接并监听事件
3. 确保选择了正确的网络和合约地址
4. 所有UI状态都反映了合约的真实状态

## 自定义主题

当前实现采用了西幻古老风格的设计。如果需要自定义样式，请编辑`tailwind.config.js`和`styles/globals.css`文件。
