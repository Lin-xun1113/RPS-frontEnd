import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import Layout from '../components/Layout';
import Image from 'next/image';
import ClientOnlyWallet from '../components/ClientOnlyWallet';
import dynamic from 'next/dynamic';
import AOS from 'aos';
import 'aos/dist/aos.css';
import gsap from 'gsap';
// 动态导入Lottie Player以避免服务器端渲染问题
const Player = dynamic(() => import('@lottiefiles/react-lottie-player').then(mod => mod.Player), { ssr: false });

// u52a8u6001u5bfcu5165u7687u51a0u96eau82b1u7279u6548u7ec4u4ef6(u5ba2u6237u7aefu6e32u67d3)
const CrownSnowfall = dynamic(() => import('../components/CrownSnowfall'), { ssr: false });

function Home() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [showParticles, setShowParticles] = useState(false);
  
  // 记录滚动位置的状态
  const [scrollY, setScrollY] = useState(0);
  
  // 创建各种动画元素的引用
  const titleRef = useRef(null);
  const scrollRef = useRef(null);
  const featureRef = useRef(null);
  const walletRef = useRef(null);
  
  // 使用GSAP和Framer Motion的动画控制器
  const controls = useAnimation();
  const textControls = useAnimation();
  
  // 初始化AOS库和其他动画设置
  useEffect(() => {
    // 初始化AOS
    AOS.init({
      duration: 800,
      easing: 'ease-out',
      once: false,
      mirror: true,
      offset: 50
    });
    
    setMounted(true);
    
    // 1.5秒后显示粒子效果
    const particlesTimer = setTimeout(() => {
      setShowParticles(true);
    }, 1500);
    
    // 监听滚动事件，实现视差效果
    const handleScroll = () => {
      setScrollY(window.scrollY);
      AOS.refresh();
    };
    
    window.addEventListener('scroll', handleScroll);
    
    // 使用GSAP对标题进行额外的动画
    if (titleRef.current) {
      gsap.fromTo(titleRef.current, 
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, delay: 0.8, ease: 'power3.out' }
      );
    }

    // 清理函数
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(particlesTimer);
    };
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
      {/* 皇冠雪花特效 */}
      <CrownSnowfall />
      
      {/* 背景粒子效果 - 只在初始化动画完成后显示 */}
      {showParticles && (
        <div className="fixed inset-0 pointer-events-none z-0 opacity-30">
          <div className="absolute inset-0" id="particles-bg">
            {/* 使用CSS微粒子实现悬浮粒子效果 */}
            {Array.from({ length: 15 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-amber-600/20"
                style={{
                  width: `${Math.random() * 8 + 2}px`,
                  height: `${Math.random() * 8 + 2}px`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `floatParticle ${Math.random() * 10 + 10}s linear infinite`,
                  animationDelay: `${Math.random() * 5}s`
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* 主要内容容器 - 支持视差效果 */}
      <div 
        className="flex flex-col items-center justify-center min-h-[70vh] relative w-full overflow-hidden"
        style={{ 
          transform: `translateY(${scrollY * 0.1}px)`, // 轻微的视差效果
          maxWidth: "100vw"
        }}
      >
        {/* 标题区域 */}
        <div className="relative">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, type: 'spring' }}
            className="text-center mb-12 relative"
          >
            {/* 装饰性天花板 */}
            <svg className="absolute -top-16 left-1/2 transform -translate-x-1/2 w-20 h-20 opacity-10 text-amber-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 0 L55 40 L95 50 L55 60 L50 100 L45 60 L5 50 L45 40 Z" />
            </svg>
            
            <div 
              className="relative w-[600px] h-[180px] mx-auto mb-6 group"
              ref={titleRef}
            >
              {/* 光晕效果层 */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-200/0 via-amber-200/20 to-amber-200/0 opacity-0 group-hover:opacity-100 blur-lg transition-opacity duration-1000 ease-in-out"></div>
              
              {/* 标题图片 */}
              <Image 
                src="/images/game-title.png" 
                fill
                style={{objectFit: 'contain'}}
                alt="石头剪刀布游戏" 
                className="drop-shadow-[0_5px_15px_rgba(180,120,30,0.25)] transition-transform duration-700 group-hover:scale-105"
              />
              
              {/* 下方背景光晕 */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-64 h-4 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent blur-md"></div>
            </div>
            
            {/* 标题文字区域 */}
            <div className="space-y-4">
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.5 }}
                >
                  <h2 className="text-2xl text-amber-800 font-medieval relative inline-block">
                    <span className="text-amber-900 drop-shadow-sm">古老的智慧</span>，区块链上的<span className="text-amber-900 drop-shadow-sm">对决</span>
                    
                    {/* 装饰性下划线 */}
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.7, delay: 0.7, ease: 'easeOut' }}
                      className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-700/60 to-transparent absolute -bottom-3 left-0"
                    />
                  </h2>
                  
                  {/* 添加额外的空间，避免被卷轴遮挡 */}
                  <div className="h-12 md:h-16 lg:h-20"></div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
        
        {/* 卷轴主体区域 */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative w-full max-w-4xl mx-auto my-8" 
          style={{ minHeight: '500px' }}
          ref={scrollRef}
        >
          {/* 羊皮纸背景 - 简化版本 */}
          <div 
            className="absolute inset-0 bg-[url('/images/scroll-center.png')] bg-contain bg-center bg-no-repeat" 
            style={{
              transform: 'scale(2)',
              margin: '0 auto'
            }}
          >
          </div>
          
          {/* 内容区域 */}
          <div className="relative z-10 w-full h-full flex flex-col justify-center items-center" style={{ padding: '0 15%', paddingTop: '3%' }}>
            <div className="text-center" style={{ maxWidth: '100%' }}>
              {/* 卷轴标题区 */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="relative mb-4"
              >
                <h3 className="text-lg md:text-xl text-amber-900 font-medieval relative inline-block">契约卷轴</h3>
                
                {/* 装饰性分隔线 */}
                <div className="relative h-4 mt-1">
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.6, delay: 1.1 }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 border-b border-amber-700"
                  />
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: 1.3 }}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-amber-800 rounded-full"
                  />
                </div>
              </motion.div>
              
              {/* 文字内容区 */}
              <div className="space-y-3">
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.5 }}
                  className="text-amber-900 font-medieval text-base md:text-lg mb-3"
                >尊敬的旅行者，</motion.p>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.7 }}
                  className="text-amber-800 text-sm md:text-base mb-4 leading-relaxed mx-auto"
                  style={{ maxWidth: '70%' }}
                >
                  欢迎来到石头剪刀布的奇幻世界。在这里，古老的对决与现代区块链技术相结合，为您带来前所未有的游戏体验。
                </motion.p>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.9 }}
                  className="text-amber-800 text-sm md:text-base mb-4 leading-relaxed mx-auto"
                  style={{ maxWidth: '70%' }}
                >
                  每一局对决都将被永久记录在链上，公平透明，不可篡改。使用您的MAG或代币参与游戏，挑战其他玩家，赢取丰厚奖励。
                </motion.p>
                
                {/* 石头剪刀布图标动画 - 放大并增强效果 */}
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 2.1 }}
                  className="flex justify-center space-x-8 my-6"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 relative group cursor-pointer">
                    <motion.div 
                      whileHover={{ rotate: 15, scale: 1.15, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className="drop-shadow-md hover:drop-shadow-xl"
                    >
                      <Image src="/images/rock.png" fill style={{objectFit: 'contain'}} alt="石头" />
                      {/* 悬停时的光晕效果 */}
                      <div className="absolute inset-0 bg-amber-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
                    </motion.div>
                  </div>
                  
                  <div className="w-16 h-16 md:w-20 md:h-20 relative group cursor-pointer">
                    <motion.div 
                      whileHover={{ rotate: -10, scale: 1.15, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className="drop-shadow-md hover:drop-shadow-xl"
                    >
                      <Image src="/images/scissors.png" fill style={{objectFit: 'contain'}} alt="剪刀" />
                      <div className="absolute inset-0 bg-amber-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
                    </motion.div>
                  </div>
                  
                  <div className="w-16 h-16 md:w-20 md:h-20 relative group cursor-pointer">
                    <motion.div 
                      whileHover={{ rotate: 10, scale: 1.15, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                      className="drop-shadow-md hover:drop-shadow-xl"
                    >
                      <Image src="/images/paper.png" fill style={{objectFit: 'contain'}} alt="布" />
                      <div className="absolute inset-0 bg-amber-500/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
            
            {/* 底部签名区 - 升级设计 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 2.3 }}
              className="text-center mt-8 mb-4"
            >
              {/* 装饰性印章和分隔线 */}
              <div className="relative h-5 mb-3">
                <div className="border-t border-amber-800/40 w-48 mx-auto"></div>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8">
                  <div className="w-2 h-2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-amber-800/30 rounded-full"></div>
                  <div className="w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border border-amber-800/30 rounded-full"></div>
                </div>
              </div>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5, duration: 0.5 }}
                className="text-amber-800 italic text-[15px] mb-5 flex items-center justify-center"
              >
                <span className="inline-block w-1 h-1 bg-amber-700/60 rounded-full mr-1"></span>
                请在下方签署契约以继续
                <span className="inline-block w-1 h-1 bg-amber-700/60 rounded-full ml-1"></span>
              </motion.p>
              
              {/* 钱包连接按钮 - 缩小尺寸 */}
              <motion.div
                ref={walletRef}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 2.7 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="relative scale-90"
                style={{ transform: 'scale(0.9)' }}
              >
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
                
                {/* 特效光晕 */}
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-amber-300/20 to-transparent blur-sm"></div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
        
        {/* 特性卡片区域 */}
        <div className="mt-28 w-full" ref={featureRef}>
          {/* 标题 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
            data-aos="fade-up"
            data-aos-anchor="#feature-section"
          >
            <h2 className="text-2xl font-medieval text-amber-900">游戏特性</h2>
            <div className="w-48 h-[1px] mx-auto mt-3 bg-gradient-to-r from-transparent via-amber-700/60 to-transparent"></div>
          </motion.div>
          
          <div 
            id="feature-section"
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            <FeatureCard 
              icon="/images/eth-icon.png"
              title="MAG对战"
              description="使用Magnet POW链原生代币MAG进行游戏，赢取对手的投注"
              delay={0}
            />
            <FeatureCard 
              icon="/images/token-icon.png"
              title="代币对战"
              description="使用获胜代币进行游戏，收集更多代币"
              delay={150}
            />
            <FeatureCard 
              icon="/images/secure-icon.png"
              title="安全可靠"
              description="区块链技术保证游戏的公平性和透明度"
              delay={300}
            />
          </div>
          
          {/* 页脚签名 */}
          <motion.div 
            className="flex justify-center mt-20 mb-10"
            data-aos="fade-up"
            data-aos-delay="400"
            data-aos-offset="0"
          >
            <div className="text-center">
              <div className="w-48 h-[1px] mx-auto mb-4 bg-gradient-to-r from-amber-700/0 via-amber-700/30 to-amber-700/0"></div>
              <p className="text-amber-700/70 text-xs italic">MAG-CHAIN POWERING</p>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}

const FeatureCard = ({ icon, title, description, delay = 0 }) => {
  return (
    <motion.div
      data-aos="fade-up"
      data-aos-delay={delay}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className="bg-gradient-to-b from-amber-50 to-amber-100/90 border border-amber-300 rounded-lg p-6 overflow-hidden relative shadow-md hover:shadow-xl group"
    >
      {/* 装饰性角落 */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-amber-700/20 rounded-tl-lg"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-amber-700/20 rounded-br-lg"></div>
      
      {/* 图标区域 */}
      <div className="relative mb-5">
        {/* 图标底部光晕 */}
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1.5 bg-gradient-to-r from-transparent via-amber-300/30 to-transparent blur-sm group-hover:opacity-100 opacity-0 transition-opacity"></div>
        
        <div className="w-16 h-16 mx-auto relative">
          <motion.div 
            className="w-full h-full rounded-full bg-amber-100/80 absolute inset-0 -z-10"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
          />
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <Image 
              src={icon} 
              fill 
              style={{objectFit: 'contain'}} 
              className="p-2 drop-shadow-sm" 
              alt={title} 
            />
          </motion.div>
        </div>
      </div>
      
      {/* 文字内容 */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + delay/1000, duration: 0.5 }}
        className="flex flex-col items-center"
      >
        <h3 className="text-xl font-medieval text-amber-900 mb-3">{title}</h3>
        
        {/* 分隔线 */}
        <div className="w-12 h-[1px] bg-amber-600/30 mb-3 group-hover:w-16 transition-all duration-300"></div>
        
        <p className="text-amber-700 text-sm">{description}</p>
      </motion.div>
      
      {/* 点击效果 - 波纹扩散 */}
      <motion.div 
        initial={{ scale: 0, opacity: 0.7 }}
        whileTap={{ scale: 1.5, opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute inset-0 rounded-lg pointer-events-none bg-amber-200/40"
      />
    </motion.div>
  );
};

// 使用动态导入确保组件只在客户端渲染
export default dynamic(() => Promise.resolve(Home), { ssr: false });
