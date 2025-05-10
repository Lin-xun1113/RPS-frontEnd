import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultWallets, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc';
import { NETWORK } from '../constants/contractInfo';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 定义自定义链（MagnetChain）
const magnetChain = {
  id: NETWORK.chainId,
  name: NETWORK.name,
  network: 'magnetchain',
  nativeCurrency: {
    decimals: 18,
    name: 'Magnet',
    symbol: 'MAG',
  },
  rpcUrls: {
    default: { http: [NETWORK.rpcUrl] },
    public: { http: [NETWORK.rpcUrl] },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://etherscan.io' },
  },
  testnet: true
};

// 创建React Query客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

// 配置链和提供者
const { chains, publicClient } = configureChains(
  [mainnet, magnetChain], // 必须包含mainnet使用ENS功能
  [
    jsonRpcProvider({
      rpc: (chain) => {
        if (chain.id === magnetChain.id) {
          return { http: NETWORK.rpcUrl, webSocket: undefined };
        }
        return { http: 'https://eth.llamarpc.com', webSocket: undefined };
      },
      stallTimeout: 5000,
      pollingInterval: 8000,
    }),
  ]
);

// 配置钱包连接器
const { connectors } = getDefaultWallets({
  appName: '石头剪刀布',
  projectId: '2481db9bcd46fb56e57b933e35d00420', // WalletConnect v2 projectId
  chains,
});

// 创建Wagmi配置 (使用v1版本格式)
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
});

// 设置Lit为生产模式
const litConfigScript = `
  window.litConfig = {
    devMode: false,
    shady: true,
  };
`;

// 在客户端优化钱包连接体验
if (typeof window !== 'undefined') {
  // 添加Lit配置
  if (!document.getElementById('lit-config')) {
    const script = document.createElement('script');
    script.id = 'lit-config';
    script.textContent = litConfigScript;
    document.head.appendChild(script);
  }
  // 防止移动端 MetaMask 错误消息弹出
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason && 
      typeof event.reason.message === 'string' && 
      (event.reason.message.includes('transportOpen') || 
       event.reason.message.includes('Attempt to connect to relay') ||
       event.reason.message.includes('MetaMask') ||
       event.reason.message.includes('Timeout') ||
       event.reason.message.includes('Network Error'))
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  
  // 重连机制
  window._walletConnectRetryCount = 0;
  const MAX_RETRY_COUNT = 2;
  
  // 网络恢复查询连接状态
  window.addEventListener('online', () => {
    console.log('网络已恢复，尝试重新连接钱包');
    window._walletConnectRetryCount = 0;
  });

  // 移动端优化
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    // 移动端增加MetaMask的性能优化
    localStorage.setItem('WALLETCONNECT_DEEPLINK_CHOICE', '');

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('页面可见，检查钱包连接状态');
      }
    });
  }
}

// 创建客户端专用的Web3Provider组件
const ClientWeb3Provider = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 移动设备检测
  const isMobile = typeof window !== 'undefined' && 
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
  // 已挂载检查 (解决hydration不匹配)
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          chains={chains}
          theme={lightTheme({
            accentColor: '#b45309', // amber-800
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small', // 移动端性能优化
          })}
          modalSize={isMobile ? 'compact' : 'wide'} // 移动端使用紧凑模式
          coolMode
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
};

function MyApp({ Component, pageProps }) {
  // 检测客户端渲染
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 移动设备检测
  const isMobile = typeof window !== 'undefined' && 
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // 返回全局包裹器 - 在服务器端和客户端都会渲染
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          chains={chains}
          theme={lightTheme({
            accentColor: '#b45309', // amber-800
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small', // 移动端性能优化
          })}
          modalSize={isMobile ? 'compact' : 'wide'} // 移动端使用紧凑模式
          coolMode
        >
          {/* 仅在客户端挂载完成后渲染实际内容 */}
          {mounted ? <Component {...pageProps} /> : 
            // 不挂载时显示空白占位符 - 避免服务端渲染不匹配
            <div style={{visibility: 'hidden'}}>
              <Component {...pageProps} />
            </div>
          }
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  );
}

export default MyApp;
