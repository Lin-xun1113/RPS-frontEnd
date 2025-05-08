# 石头剪刀布游戏 - 区块链版

这是一个基于区块链的石头剪刀布游戏前端应用，采用西幻古老风格设计。玩家可以使用ETH或特定代币进行游戏，通过多回合对战决出胜负。

## 特性

- 连接钱包参与Web3游戏
- 支持ETH和代币两种游戏模式
- 多回合对战机制
- 使用提交-揭示机制确保游戏公平性
- 精美的西幻古老风格UI设计
- 完整的游戏历史记录

## 技术栈

- **前端框架**：React、Next.js
- **样式**：Tailwind CSS
- **动画**：Framer Motion
- **区块链交互**：ethers.js
- **钱包连接**：RainbowKit

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

## 合约信息

- **网络**：MagnetChain
- **RockPaperScissors合约**：`0xE4B7CBa976294eDeb12C61e659423C0D843e0afE`
- **WinningToken合约**：`0xd724606bb64456969c0848489dd1316627e0d0e3`

## 游戏流程

1. 连接钱包
2. 创建游戏或加入现有游戏
3. 设置游戏参数（回合数、超时时间、投注金额）
4. 在每个回合中进行提交和揭示操作
5. 完成所有回合后查看结果
6. 胜利者提取奖励

## 项目结构

```
/
├── components/      # React组件
├── constants/       # 合约信息和常量
├── hooks/           # 自定义钩子
├── pages/           # 页面组件
├── public/          # 静态资源
│   └── images/      # 图像资源
└── styles/          # 全局样式
```

## 截图

[游戏截图将放在这里]

## 许可证

MIT
