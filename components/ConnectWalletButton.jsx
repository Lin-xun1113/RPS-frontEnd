import React from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

/**
 * u5b9au5236u7684u94b1u5305u8fdeu63a5u6309u94aeu7ec4u4ef6uff0cu91c7u7528u897fu5e7bu53e4u8001u98ceu683c
 */
const ConnectWalletButton = ({ fullWidth = false, size = 'md' }) => {
  const { isConnected } = useAccount();
  
  const buttonClasses = `
    ${fullWidth ? 'w-full' : ''}
    ${size === 'sm' ? 'py-1 px-3 text-sm' : size === 'lg' ? 'py-3 px-6 text-xl' : 'py-2 px-4 text-base'}
    bg-gradient-to-r from-amber-700 to-amber-900 
    text-amber-100 font-medieval rounded 
    border-2 border-amber-800 shadow-md 
    hover:shadow-amber-700/20 transition-all duration-300
  `;
  
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        
        return (
          <div className="relative">
            {(() => {
              if (!connected) {
                return (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={openConnectModal}
                    className={buttonClasses}
                  >
                    u8fdeu63a5u94b1u5305
                  </motion.button>
                );
              }
              
              return (
                <div className="flex items-center gap-3">
                  <button
                    onClick={openChainModal}
                    className="flex items-center bg-amber-800/20 rounded-full px-3 py-1 border border-amber-800"
                  >
                    {chain.hasIcon && (
                      <div className="mr-1 relative w-4 h-4">
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'u94feu56feu6807'}
                            src={chain.iconUrl}
                            className="w-full h-full object-contain"
                          />
                        )}
                      </div>
                    )}
                    <span className="text-amber-900 font-medieval text-sm">
                      {chain.name}
                    </span>
                  </button>
                  
                  <button
                    onClick={openAccountModal}
                    className="flex items-center bg-amber-800/20 rounded-full px-3 py-1 border border-amber-800"
                  >
                    <span className="text-amber-900 font-medieval text-sm">
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
};

export default ConnectWalletButton;
