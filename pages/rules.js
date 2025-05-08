import React from 'react';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import Link from 'next/link';
import Image from 'next/image';

export default function Rules() {
  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-3xl font-medieval text-amber-900 mb-8">游戏规则</h1>
        
        <div className="bg-[url('/images/scroll-wide.png')] bg-contain bg-center bg-no-repeat py-16 px-12 mb-8">
          <div className="bg-amber-50/90 p-6 rounded-lg shadow-inner">
            <h2 className="text-2xl font-medieval text-amber-900 mb-6">游戏介绍</h2>
            <p className="text-amber-800 mb-4">
              石头剪刀布是一款基于区块链的多回合对战游戏，采用特殊的提交-揭示机制确保公平性。玩家可以使用MAG或代币进行游戏，胜利者将获得奖励。
            </p>
            
            <div className="flex justify-center gap-16 my-8">
              <div className="text-center">
                <div className="w-24 h-24 bg-amber-100 rounded-full p-2 border-2 border-amber-400 mx-auto">
                  <div className="relative w-full h-full">
                    <Image src="/images/rock.png" fill style={{objectFit: 'contain'}} alt="石头" />
                  </div>
                </div>
                <p className="mt-2 font-medieval text-amber-900">石头</p>
                <p className="text-sm text-amber-700">胜 剪刀</p>
              </div>
              
              <div className="text-center">
                <div className="w-24 h-24 bg-amber-100 rounded-full p-2 border-2 border-amber-400 mx-auto">
                  <div className="relative w-full h-full">
                    <Image src="/images/scissors.png" fill style={{objectFit: 'contain'}} alt="剪刀" />
                  </div>
                </div>
                <p className="mt-2 font-medieval text-amber-900">剪刀</p>
                <p className="text-sm text-amber-700">胜 布</p>
              </div>
              
              <div className="text-center">
                <div className="w-24 h-24 bg-amber-100 rounded-full p-2 border-2 border-amber-400 mx-auto">
                  <div className="relative w-full h-full">
                    <Image src="/images/paper.png" fill style={{objectFit: 'contain'}} alt="布" />
                  </div>
                </div>
                <p className="mt-2 font-medieval text-amber-900">布</p>
                <p className="text-sm text-amber-700">胜 石头</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 bg-amber-50/90 p-6 rounded-lg shadow-inner">
            <h2 className="text-2xl font-medieval text-amber-900 mb-4">游戏规则详解</h2>
            
            <div className="mb-6">
              <h3 className="text-xl font-medieval text-amber-800 mb-2">游戏模式</h3>
              <ul className="list-disc pl-5 space-y-1 text-amber-800">
                <li>游戏支持两种模式：MAG模式和代币模式。</li>
                <li>MAG模式：玩家使用MAG作为投注，赢家获得总投注额的90%（10%为平台费用）。</li>
                <li>代币模式：玩家使用WinningToken代币投注，赢家获得全部代币。</li>
              </ul>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-medieval text-amber-800 mb-2">游戏创建与加入</h3>
              <ul className="list-disc pl-5 space-y-1 text-amber-800">
                <li>玩家A创建游戏，设置回合数（必须是奇数）、超时时间和投注金额。</li>
                <li>玩家B加入游戏，投入相同金额的MAG或代币。</li>
                <li>如果没有玩家加入，创建者可在超时后取消游戏并取回投注。</li>
              </ul>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-medieval text-amber-800 mb-2">游戏进行流程</h3>
              <ol className="list-decimal pl-5 space-y-1 text-amber-800">
                <li>每个回合分为两个阶段：提交阶段和揭示阶段。</li>
                <li>提交阶段：玩家选择移动（石头、剪刀或布），并提交一个加密的哈希值。</li>
                <li>揭示阶段：双方都提交移动后，玩家揭示自己的移动和盐值。</li>
                <li>回合结果确定：石头胜剪刀、剪刀胜布、布胜石头，相同移动则平局。</li>
                <li>重复进行多回合，先达到胜利需要的回合数的玩家获胜。</li>
              </ol>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-medieval text-amber-800 mb-2">超时机制</h3>
              <ul className="list-disc pl-5 space-y-1 text-amber-800">
                <li>加入超时：如果创建游戏后无人在期限内加入，创建者可调用<code>timeoutJoin</code>并取回投注。</li>
                <li>揭示超时：如果对手在提交移动后未在期限内揭示，可调用<code>timeoutReveal</code>函数，该回合系统判定诚实玩家胜出。</li>
              </ul>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xl font-medieval text-amber-800 mb-2">游戏结束与奖励</h3>
              <ul className="list-disc pl-5 space-y-1 text-amber-800">
                <li>游戏在一方获得足够的胜利回合数后结束。</li>
                <li>胜利者需要手动调用<code>withdrawPrize</code>函数提取奖励。</li>
                <li>MAG游戏的胜利者将获得总投注额的90%，以及WinningToken代币。</li>
                <li>代币游戏的胜利者将获得双方的代币。</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 bg-amber-50/90 p-6 rounded-lg shadow-inner">
            <h2 className="text-2xl font-medieval text-amber-900 mb-4">游戏流程图</h2>
            <div className="border-2 border-amber-300 p-4 rounded-lg bg-amber-50">
              <pre className="font-medieval text-amber-800 whitespace-pre-wrap">
{
`创建(Created) 
    ↓
玩家B加入
    ↓
提交阶段(CommitPhase)
    ↓
双方提交后 → 已提交(Committed)
    ↓
双方揭示后 → 已揭示(Revealed)
    ↓
回合结束，游戏未完成 → 提交阶段(CommitPhase) [新回合]
    ↓
游戏完成 → 已结束(Finished)`
}
              </pre>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Link href="/games">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="py-3 px-8 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-medieval text-xl rounded-md border-2 border-amber-600 shadow-lg hover:shadow-amber-600/30 transition-all duration-300"
              >
                马上开始游戏
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
