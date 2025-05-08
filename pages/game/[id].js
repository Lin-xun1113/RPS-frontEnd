import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import Image from 'next/image';

// 使用dynamic导入以避免SSR，解决hydration错误
// noSSR选项确保组件只在客户端渲染
const GameComponent = dynamic(() => import('../../components/GameComponent'), { ssr: false });

// 自定义战斗布局组件
// 使用深色调主题和战斗背景图
const BattleLayout = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // 添加深色背景类到body
    document.body.classList.add('battle-mode');
    
    // 清理函数
    return () => {
      document.body.classList.remove('battle-mode');
    };
  }, []);
  
  if (!mounted) {
    return <div className="min-h-screen bg-gray-900"></div>;
  }
  
  return (
    <div className="battle-page min-h-screen relative flex flex-col">
      {/* 战斗背景图 */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-blue-900/70 z-10"></div>
        <Image 
          src="/images/battle-bg.png" 
          alt="Battle Background" 
          fill 
          priority
          className="object-cover"
        />
      </div>
      
      {/* 顶部导航 */}
      <header className="relative z-20 p-4 flex justify-between items-center">
        <a href="/" className="text-blue-200 hover:text-white transition-colors">
          <div className="flex items-center space-x-2">
            <Image src="/images/logo-scroll.png" width={40} height={40} alt="Logo" />
            <span className="font-medieval text-xl">石头剪刀布</span>
          </div>
        </a>
        <a href="/games" className="text-blue-200 hover:text-white transition-colors font-medieval">
          返回游戏列表
        </a>
      </header>
      
      {/* 主体内容 */}
      <main className="relative z-20 flex-grow flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          {children}
        </div>
      </main>
      
      {/* 脚部 */}
      <footer className="relative z-20 p-4 text-center text-blue-200/70 font-medieval">
        <p>© {new Date().getFullYear()} 石头剪刀布游戏 - 基于MagnetChain</p>
      </footer>
      
      {/* 点缀特效 */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(29,78,216,0.15)_0%,transparent_70%)]"></div>
      </div>
    </div>
  );
};

// 游戏页面组件
// 使用自定义战斗布局替代原来的Layout
export default function GamePage() {
  return (
    <BattleLayout>
      <GameComponent />
    </BattleLayout>
  );
}
