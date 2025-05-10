import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';
import Image from 'next/image';
import dynamic from 'next/dynamic';

// 创建一个单一的客户端专用包装组件
const ClientOnlyWallet = dynamic(
  () => Promise.resolve((props) => {
    // 如果是按钮类型，显示不同的样式
    if (props.type === 'button') {
      return (
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
          }) => {
            const ready = mounted && authenticationStatus !== 'loading';
            const connected =
              ready &&
              account &&
              chain &&
              (!authenticationStatus ||
                authenticationStatus === 'authenticated');

            // 利用useEffect确保只在客户端渲染
            const [isClient, setIsClient] = React.useState(false);
            React.useEffect(() => {
              setIsClient(true);
            }, []);

            if (!isClient) {
              return <div className="py-3 px-8 opacity-0">连接钱包</div>;
            }

            return (
              <div
                className="relative"
                {...(!ready && {
                  'aria-hidden': true,
                  'style': {
                    opacity: 0,
                    pointerEvents: 'none',
                    userSelect: 'none',
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        className="py-3 px-8 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-medieval text-xl rounded-md border-2 border-amber-600 shadow-lg hover:shadow-amber-600/30 transition-all duration-300"
                      >
                        连接钱包
                      </button>
                    );
                  }

                  if (props.gameButton) {
                    return (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={props.onGameEnter}
                        className="py-3 px-8 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-medieval text-xl rounded-md border-2 border-amber-600 shadow-lg hover:shadow-amber-600/30 transition-all duration-300"
                      >
                        进入游戏
                      </motion.button>
                    );
                  }

                  return (
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={openChainModal}
                        className="flex items-center space-x-2 py-2 px-4 bg-amber-100 text-amber-800 font-medieval rounded-md border border-amber-300 hover:bg-amber-200 transition-all duration-300"
                      >
                        {chain.hasIcon && (
                          <div className="w-5 h-5 relative">
                            {chain.iconUrl && (
                              <img
                                alt={chain.name ?? '链图标'}
                                src={chain.iconUrl}
                                className="w-full h-full"
                              />
                            )}
                          </div>
                        )}
                        <span>{chain.name}</span>
                      </button>

                      <button
                        onClick={openAccountModal}
                        className="flex items-center justify-center py-2 px-4 bg-amber-100 text-amber-800 font-medieval rounded-md border border-amber-300 hover:bg-amber-200 transition-all duration-300"
                      >
                        {account.displayName}
                        {account.displayBalance
                          ? ` (${account.displayBalance})`
                          : ''}
                      </button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      );
    }
    
    // 导航栏版本的钱包连接按钮
    return (
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
          const connected = mounted && account && chain;
          
          // 利用useEffect确保只在客户端渲染
          const [isClient, setIsClient] = React.useState(false);
          React.useEffect(() => {
            setIsClient(true);
          }, []);

          if (!isClient) {
            return <div className="px-2 py-1 opacity-0">连接钱包</div>;
          }
          
          return (
            <div className="relative">
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      className="py-2 px-4 bg-gradient-to-r from-amber-700 to-amber-900 text-amber-100 font-medieval rounded border-2 border-amber-800 shadow-md hover:shadow-amber-700/20 transition-all duration-300"
                    >
                      连接钱包
                    </button>
                  );
                }
                
                return (
                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3">
                    <button
                      onClick={openChainModal}
                      className="flex items-center bg-amber-800/20 rounded-full px-2 sm:px-3 py-1 border border-amber-800 text-nowrap overflow-hidden w-full sm:w-auto"
                    >
                      {chain.hasIcon && (
                        <div className="mr-1 relative w-4 h-4 flex-shrink-0">
                          {chain.iconUrl && (
                            <Image
                              alt={chain.name ?? '链图标'}
                              src={chain.iconUrl}
                              fill
                              style={{objectFit: 'contain'}}
                            />
                          )}
                        </div>
                      )}
                      <span className="text-amber-900 font-medieval text-xs sm:text-sm truncate max-w-16 sm:max-w-none">
                        {chain.name}
                      </span>
                    </button>
                    
                    <button
                      onClick={openAccountModal}
                      className="flex items-center bg-amber-800/20 rounded-full px-2 sm:px-3 py-1 border border-amber-800 text-nowrap overflow-hidden w-full sm:w-auto"
                    >
                      <span className="text-amber-900 font-medieval text-xs sm:text-sm truncate max-w-20 sm:max-w-none">
                        {account.displayName}
                      </span>
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    );
  }),
  { ssr: false } // 完全禁用服务器端渲染
);

export default ClientOnlyWallet;
