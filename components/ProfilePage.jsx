import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useSigner, useProvider } from 'wagmi';
import { ethers } from 'ethers';
import { toast, Toaster } from 'react-hot-toast';

// 导入合约信息
import { ROCK_PAPER_SCISSORS_ADDRESS, WINNING_TOKEN_ADDRESS, ABI } from '../constants/contractInfo';

const ProfilePage = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { data: signer } = useSigner();
  const provider = useProvider();
  const [pendingWithdrawals, setPendingWithdrawals] = useState('0');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isConnected && address && signer) {
      fetchPendingWithdrawals();
    } else {
      setPendingWithdrawals('0');
      setIsLoading(false);
    }
  }, [address, isConnected, signer]);

  const fetchPendingWithdrawals = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const contract = new ethers.Contract(
        ROCK_PAPER_SCISSORS_ADDRESS,
        ABI,
        signer
      );

      const withdrawals = await contract.getPendingWithdrawals(address);
      setPendingWithdrawals(withdrawals.toString());
      console.log('待提取余额:', ethers.utils.formatEther(withdrawals), 'MAG');

    } catch (error) {
      console.error('获取待提取余额失败:', error.message);
      setError(`获取待提取余额失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !signer) {
      toast.error('请先连接钱包');
      return;
    }

    if (ethers.BigNumber.from(pendingWithdrawals).lte(0)) {
      toast.error('没有可提取的余额');
      return;
    }

    try {
      setIsWithdrawing(true);
      setError(null);

      const contract = new ethers.Contract(
        ROCK_PAPER_SCISSORS_ADDRESS,
        ABI,
        signer
      );

      toast.loading('正在提取奖励...', { id: 'withdraw' });
      const tx = await contract.withdrawPrize();
      
      toast.loading('等待交易确认...', { id: 'withdraw' });
      await tx.wait();
      
      toast.success('成功提取奖励！', { id: 'withdraw' });
      
      // 刷新余额
      fetchPendingWithdrawals();

    } catch (error) {
      console.error('提取奖励失败:', error);
      toast.error(`提取奖励失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'withdraw' });
      setError(`提取奖励失败: ${error.message || '请重试'}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 shadow-md">
          <h2 className="text-2xl font-medieval text-amber-900 mb-4">我的账户</h2>
          <p className="text-amber-800">请连接钱包以查看您的个人信息和奖励。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster position="top-center" toastOptions={{ duration: 5000 }} />
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 shadow-md">
        <h2 className="text-2xl font-medieval text-amber-900 mb-6">我的账户</h2>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
          </div>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* 账户信息 */}
          <div className="bg-white rounded-lg p-5 border border-amber-100 shadow-sm">
            <h3 className="text-xl font-medieval text-amber-800 mb-4">账户信息</h3>
            <div className="space-y-3">
              <div>
                <p className="text-gray-600 text-sm mb-1">钱包地址</p>
                <p className="font-mono text-sm overflow-x-auto">{address}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">钱包余额</p>
                <p className="text-lg font-semibold">
                  {balance ? `${balance.formatted} ${balance.symbol}` : '加载中...'}
                </p>
              </div>
            </div>
          </div>
          
          {/* 奖励信息 */}
          <div className="bg-white rounded-lg p-5 border border-amber-100 shadow-sm">
            <h3 className="text-xl font-medieval text-amber-800 mb-4">游戏奖励</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 text-sm mb-1">待提取奖励</p>
                <p className="text-lg font-semibold">
                  {isLoading ? '加载中...' : `${ethers.utils.formatEther(pendingWithdrawals)} MAG`}
                </p>
              </div>
              
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing || isLoading || ethers.BigNumber.from(pendingWithdrawals).lte(0)}
                className={`w-full py-2 px-4 rounded-lg font-medieval text-white ${ethers.BigNumber.from(pendingWithdrawals).lte(0) || isWithdrawing ? 'bg-gray-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'}`}
              >
                {isWithdrawing ? '提取中...' : '提取奖励'}
              </button>
              
              {ethers.BigNumber.from(pendingWithdrawals).lte(0) && !isLoading && (
                <p className="text-sm text-gray-500 mt-2">您当前没有可提取的奖励。赢得游戏后，奖励将在此处显示。</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-6 bg-amber-50 p-4 rounded-lg border border-amber-100">
          <h4 className="text-amber-800 font-medieval mb-2">提示</h4>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• 赢得游戏后，您的奖励将自动添加到您的待提取余额中</li>
            <li>• 您可以随时提取您的奖励到您的钱包地址</li>
            <li>• 平局的情况下，双方的押注将被扣除手续费后退还</li>
            <li>• 取消的游戏将退还全部押注</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
