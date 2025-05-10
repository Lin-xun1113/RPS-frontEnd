import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultWallets, RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { configureChains, createClient, WagmiConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';
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
    public: { http: [NETWORK.rpcUrl] },
    default: { http: [NETWORK.rpcUrl] },
  },
};

// 配置链和提供者 - 增加超时时间
const { chains, provider } = configureChains(
  [magnetChain],
  [
    jsonRpcProvider({
      rpc: (chain) => ({
        http: NETWORK.rpcUrl,
      }),
      stallTimeout: 5000, // 增加超时时间到 5 秒
    }),
    publicProvider({ stallTimeout: 5000 }), // 增加超时时间到 5 秒
  ]
);

// 配置钱包
const { connectors } = getDefaultWallets({
  appName: '石头剪刀布',
  projectId: '2481db9bcd46fb56e57b933e35d00420',
  chains,
});

// 创建React Query客户端
const queryClient = new QueryClient();

// 创建Wagmi客户端
const wagmiClient = createClient({
  autoConnect: true, 
  connectors,
  provider,
  logger: { warn: null, error: null }, // 完全禁用日志
});

// 在客户端禁用控制台错误
if (typeof window !== 'undefined') {
  // 增强处理WalletConnect错误
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // 过滤WalletConnect相关错误
    if (
      (args[0] && 
       typeof args[0] === 'object' && 
       args[0].context && 
       (args[0].context === 'core' || args[0].context === 'core/relayer')) ||
      (typeof args[0] === 'string' && 
       (args[0].includes('transportOpen') || 
        args[0].includes('Attempt to connect to relay')))
    ) {
      // 静默处理连接错误
      return;
    }
    originalConsoleError(...args);
  };

  // 添加错误处理函数
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason && 
      typeof event.reason.message === 'string' && 
      (event.reason.message.includes('transportOpen') || 
       event.reason.message.includes('Attempt to connect to relay'))
    ) {
      // 防止不必要的错误显示
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

// 创建客户端专用的Web3Provider组件
const ClientWeb3Provider = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 将hydration内容转为客户端渲染以避免不匹配
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider 
        chains={chains}
        theme={lightTheme({
          accentColor: '#b45309', // amber-800
          accentColorForeground: 'white',
          borderRadius: 'medium',
          fontStack: 'system',
        })}
        coolMode
      >
        {children}
      </RainbowKitProvider>
    </WagmiConfig>
  );
};

// 使用动态导入来延迟加载客户端组件
const ClientOnlyWeb3Provider = dynamic(() => Promise.resolve(ClientWeb3Provider), {
  ssr: false
});

// 确保QueryClient在应用级别创建一次
const globalQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function MyApp({ Component, pageProps }) {
  return (
    <QueryClientProvider client={globalQueryClient}>
      <ClientOnlyWeb3Provider>
        <Component {...pageProps} />
      </ClientOnlyWeb3Provider>
    </QueryClientProvider>
  );
}

export default MyApp;
