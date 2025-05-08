import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import Layout from '../components/Layout';
import Image from 'next/image';
import ClientOnlyWallet from '../components/ClientOnlyWallet';
import dynamic from 'next/dynamic';

function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  
  // 确保只在客户端渲染后进行交互和状态检查
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const handleExploreGames = () => {
    if (isConnected) {
      router.push('/games');
    }
  };
  
  // 如果客户端尚未挂载，返回最小化占位内容
  if (!mounted) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <div className="text-center mb-12"></div>
          <div className="relative w-full max-w-2xl mx-auto my-8" style={{ minHeight: '400px' }}></div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, type: 'spring' }}
          className="text-center mb-12"
        >
          <div className="relative w-[600px] h-[180px] mx-auto mb-6">
            <Image 
              src="/images/game-title.png" 
              fill
              style={{objectFit: 'contain'}}
              alt="石头剪刀布游戏" 
            />
          </div>
          <h2 className="text-2xl text-amber-800 font-medieval mt-6">
            古老的智慧，区块链上的对决
          </h2>
        </motion.div>
        
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative w-full max-w-2xl mx-auto my-8" 
          style={{ minHeight: '400px' }}
        >
          {/* 羊皮纸背景 */}
          <div 
            className="absolute inset-0 bg-[url('/images/scroll-center.png')] bg-contain bg-center bg-no-repeat" 
            style={{transform: 'scale(1.25)', top: '-15%', left: '-15%', right: '-15%', bottom: '-15%', width: '130%', height: '130%'}}
          ></div>
          
          {/* 内容区域 */}
          <div className="relative z-10 py-16 px-20 w-full h-full flex flex-col justify-between items-center">
            <div className="text-center mt-2">
              <h3 className="text-xl text-amber-900 font-medieval mb-8">契约卷轴</h3>
              <div className="border-b border-amber-700 w-32 mx-auto mb-6"></div>
              
              <p className="text-amber-900 font-medieval mb-6">尊敬的旅行者，</p>
              <p className="text-amber-800 text-sm mb-4 leading-relaxed max-w-sm mx-auto px-2">
                欢迎来到石头剪刀布的奇幻世界。在这里，古老的对决与现代区块链技术相结合，为您带来前所未有的游戏体验。
              </p>
              
              <p className="text-amber-800 text-sm mb-4 leading-relaxed max-w-md mx-auto px-2">
                每一局对决都将被永久记录在链上，公平透明，不可篡改。使用您的ETH或代币参与游戏，挑战其他玩家，赢取丰厚奖励。
              </p>
            </div>
            
            <div className="text-center mb-4">
              <div className="border-t border-amber-700 w-40 mx-auto mb-6 mt-10"></div>
              <p className="text-amber-800 italic text-xs mb-6">
                * 请在下方签署契约以继续 *
              </p>
              
              {/* 使用客户端专用的连接按钮组件 */}
              <div>
                {!isConnected ? (
                  <div>
                    <ClientOnlyWallet type="button" />
                  </div>
                ) : (
                  <ClientOnlyWallet 
                    type="button"
                    gameButton
                    onGameEnter={handleExploreGames}
                  />
                )}
              </div>
          </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-28 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl"
        >
          <FeatureCard 
            icon="/images/eth-icon.png"
            title="ETH对战"
            description="使用以太币进行游戏，赢取对手的投注"
          />
          <FeatureCard 
            icon="/images/token-icon.png"
            title="代币对战"
            description="使用获胜代币进行游戏，收集更多代币"
          />
          <FeatureCard 
            icon="/images/secure-icon.png"
            title="安全可靠"
            description="区块链技术保证游戏的公平性和透明度"
          />
        </motion.div>
      </div>
    </Layout>
  );
}

const FeatureCard = ({ icon, title, description }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 flex flex-col items-center text-center shadow-md hover:shadow-lg transition-shadow">
    <div className="w-16 h-16 mb-4 relative">
      <Image src={icon} fill style={{objectFit: 'contain'}} alt={title} />
    </div>
    <h3 className="text-xl font-medieval text-amber-900 mb-2">{title}</h3>
    <p className="text-amber-700">{description}</p>
  </div>
);

// 使用动态导入确保组件只在客户端渲染
export default dynamic(() => Promise.resolve(Home), { ssr: false });
