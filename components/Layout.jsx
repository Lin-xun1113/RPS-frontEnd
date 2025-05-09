import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import ClientOnlyWallet from './ClientOnlyWallet';
import AdminNavLink from './AdminNavLink';
import dynamic from 'next/dynamic';

const Layout = ({ children }) => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentYear, setCurrentYear] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  
  // 确保只在客户端使用Date API
  useEffect(() => {
    setCurrentYear(new Date().getFullYear().toString());
    setIsMounted(true);
  }, []);
  
  // 防止服务器端渲染不匹配
  if (!isMounted) {
    return <div className="min-h-screen bg-amber-50"></div>;
  }
  
  return (
    <div className="min-h-screen bg-amber-50 bg-[url('/images/parchment-bg.png')] bg-cover">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="container mx-auto px-4 py-8"
      >
        <header className="flex justify-between items-center mb-8">
          <Link href="/">
            <div className="flex items-center">
              <div className="relative w-14 h-14">
                <Image src="/images/logo-scroll.png" fill style={{objectFit: 'contain'}} alt="RPS游戏" />
              </div>
              <h1 className="ml-3 text-3xl font-medieval text-amber-900">石头剪刀布游戏</h1>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMusicPlaying(!isMusicPlaying)}
              className="p-2 rounded-full bg-amber-800 text-amber-100"
            >
              <div className="relative w-6 h-6">
                {isMusicPlaying ? (
                  <Image src="/images/music-on.png" fill style={{objectFit: 'contain'}} alt="开启音乐" />
                ) : (
                  <Image src="/images/music-off.png" fill style={{objectFit: 'contain'}} alt="关闭音乐" />
                )}
              </div>
            </button>
            
            <nav className="hidden md:flex gap-6 mr-6">
              <NavLink href="/games">游戏列表</NavLink>
              <NavLink href="/rules">游戏规则</NavLink>
              <NavLink href="/history">历史记录</NavLink>
              <NavLink href="/profile">个人账户</NavLink>
              <AdminNavLink />
            </nav>
            
            <ClientOnlyWallet />
          </div>
        </header>
        
        <main className="relative">
          {children}
        </main>
        
        <footer className="mt-16 text-center text-amber-800 font-medieval">
          <p>© {currentYear} 石头剪刀布游戏 - 基于MagnetChain</p>
        </footer>
      </motion.div>
    </div>
  );
};

const NavLink = ({ href, children }) => (
  <Link href={href}>
    <div className="text-amber-900 hover:text-amber-700 font-medieval text-lg transition-colors cursor-pointer">
      {children}
    </div>
  </Link>
);

export default Layout;
