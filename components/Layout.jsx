import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import ClientOnlyWallet from './ClientOnlyWallet';
import AdminNavLink from './AdminNavLink';
import dynamic from 'next/dynamic';

const Layout = ({ children }) => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [currentYear, setCurrentYear] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
            
            {/* 桌面端导航菜单 */}
            <nav className="hidden md:flex gap-6 mr-6">
              <NavLink href="/games">游戏列表</NavLink>
              <NavLink href="/rules">游戏规则</NavLink>
              <NavLink href="/history">历史记录</NavLink>
              <NavLink href="/profile">个人账户</NavLink>
              <AdminNavLink />
            </nav>
            
            {/* 移动端汉堡菜单按钮 */}
            <button 
              className="md:hidden p-2 text-amber-900 z-50" 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            
            <ClientOnlyWallet />
          </div>
        </header>
        
        {/* 移动端弹出菜单 */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-amber-900/80 backdrop-blur-sm z-40"
              onClick={() => setMobileMenuOpen(false)}
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.3 }}
                className="fixed top-0 left-0 bottom-0 w-64 bg-amber-50 bg-[url('/images/parchment-bg.png')] bg-cover p-6 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-8">
                    <Link href="/" onClick={() => setMobileMenuOpen(false)}>
                      <div className="flex items-center">
                        <div className="relative w-10 h-10">
                          <Image src="/images/logo-scroll.png" fill style={{objectFit: 'contain'}} alt="RPS游戏" />
                        </div>
                        <h2 className="ml-2 text-xl font-medieval text-amber-900">主菜单</h2>
                      </div>
                    </Link>
                  </div>
                  
                  <nav className="flex flex-col gap-6">
                    <MobileNavLink href="/" onClick={() => setMobileMenuOpen(false)}>首页</MobileNavLink>
                    <MobileNavLink href="/games" onClick={() => setMobileMenuOpen(false)}>游戏列表</MobileNavLink>
                    <MobileNavLink href="/rules" onClick={() => setMobileMenuOpen(false)}>游戏规则</MobileNavLink>
                    <MobileNavLink href="/history" onClick={() => setMobileMenuOpen(false)}>历史记录</MobileNavLink>
                    <MobileNavLink href="/profile" onClick={() => setMobileMenuOpen(false)}>个人账户</MobileNavLink>
                    <div onClick={() => setMobileMenuOpen(false)}>
                      <AdminNavLink />
                    </div>
                  </nav>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
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

const MobileNavLink = ({ href, children, onClick }) => (
  <Link href={href} onClick={onClick}>
    <div className="text-amber-900 hover:text-amber-700 font-medieval text-lg py-2 border-b border-amber-200/50 transition-colors cursor-pointer flex items-center">
      {children}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </div>
  </Link>
);

export default Layout;
