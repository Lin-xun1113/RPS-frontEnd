# 区块链石头剪刀布游戏 (Blockchain RPS Game)

[![Next.js](https://img.shields.io/badge/Next.js-13.4.19-black)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3.3-38b2ac)](https://tailwindcss.com/)
[![Ethers.js](https://img.shields.io/badge/Ethers.js-5.7.2-blue)](https://docs.ethers.org/v5/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-10.16.4-purple)](https://www.framer.com/motion/)
[![Matter.js](https://img.shields.io/badge/Matter.js-0.20.0-orange)](https://brm.io/matter-js/)

## 项目概述

这是一个基于区块链技术的石头剪刀布游戏前端应用。游戏将古老的石头剪刀布游戏与现代区块链技术相结合，创造了一个去中心化、安全且公平的游戏体验。玩家可以使用加密货币进行游戏，通过智能合约确保游戏规则的执行和资金的安全转移。

![游戏预览](./public/images/game-preview.png)

## 功能特性

- **区块链集成**：通过以太坊网络进行游戏交互和资金管理
- **钱包连接**：支持多种加密钱包连接方式
- **游戏创建与加入**：创建新游戏或加入现有游戏
- **实时状态更新**：基于区块链事件更新游戏状态
- **游戏历史记录**：查看历史游戏和统计数据
- **可视化动画**：精美的游戏界面和交互动画
- **响应式设计**：适配各种设备屏幕尺寸

## 技术栈

- **前端框架**：Next.js
- **样式**：Tailwind CSS
- **区块链交互**：Ethers.js、Wagmi、RainbowKit
- **动画**：Framer Motion、GSAP、Lottie
- **物理引擎**：Matter.js（用于皇冠雪花效果）
- **状态管理**：React Query
- **通知**：React Hot Toast

## 安装与运行

### 前提条件

- Node.js 14.x 或更高版本
- Yarn 或 npm 包管理器
- 支持以太坊的Web3浏览器或钱包扩展

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/yourusername/RPS-frontEnd.git
cd RPS-frontEnd
```

2. 安装依赖
```bash
npm install
# 或使用 yarn
yarn install
```

3. 启动开发服务器
```bash
npm run dev
# 或使用 yarn
yarn dev
```

4. 在浏览器中访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
npm run start
# 或使用 yarn
yarn build
yarn start
```

## 项目结构

```
/
├── components/         # React组件
├── constants/          # 常量定义
├── hooks/              # 自定义React Hooks
├── pages/              # Next.js页面
├── public/             # 静态资源
│   └── images/         # 图片资源
├── styles/             # 全局样式
├── utils/              # 工具函数
│   └── contract/       # 合约交互函数
└── README.md          # 项目文档
```

## 使用指南

1. **连接钱包**：点击页面右上角的"连接钱包"按钮，选择您的钱包提供商
2. **创建游戏**：
   - 访问游戏页面
   - 点击"创建新游戏"
   - 设置游戏参数（游戏类型、回合数、下注等）
   - 点击"创建"按钮
3. **加入游戏**：
   - 输入游戏ID或从列表中选择
   - 点击"加入游戏"
   - 支付相应的赌注
4. **游戏玩法**：
   - 选择石头、剪刀或布
   - 等待对手选择
   - 进入揭示阶段
   - 查看回合结果并进入下一回合
5. **查看历史**：访问历史页面查看您的游戏记录和统计数据

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请查看 LICENSE 文件

---

## 联系方式

如有任何问题或建议，请联系项目维护者。
