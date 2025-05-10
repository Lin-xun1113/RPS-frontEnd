import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ethers } from 'ethers';
import { useAccount, useContract, useSigner, useProvider, useBalance } from 'wagmi';
import { Toaster, toast } from 'react-hot-toast';
import { createTransactionParams } from '../utils/transactionUtils';
import Head from 'next/head';
import Layout from '../components/Layout';
import { ROCK_PAPER_SCISSORS_ADDRESS, ABI } from '../constants/contractInfo';

export default function AdminPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const provider = useProvider();
  const { data: signer } = useSigner();
  const contract = useContract({
    address: ROCK_PAPER_SCISSORS_ADDRESS,
    abi: ABI,
    signerOrProvider: signer || provider,
  });

  // State variables
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminAddress, setAdminAddress] = useState('');
  const [newAdminAddress, setNewAdminAddress] = useState('');
  const [contractBalance, setContractBalance] = useState('0');
  const [accumulatedFees, setAccumulatedFees] = useState('0');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAllAmount, setWithdrawAllAmount] = useState('');

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (isConnected && contract) {
        try {
          const admin = await contract.adminAddress();
          setAdminAddress(admin);
          setIsAdmin(address && admin.toLowerCase() === address.toLowerCase());
          
          // Get contract balance
          const balance = await provider.getBalance(ROCK_PAPER_SCISSORS_ADDRESS);
          setContractBalance(ethers.utils.formatEther(balance));
          
          // Get accumulated fees
          const fees = await contract.accumulatedFees();
          setAccumulatedFees(ethers.utils.formatEther(fees));
        } catch (error) {
          console.error('Error checking admin status:', error);
          toast.error('无法获取管理员状态');
        }
      }
    };

    checkAdmin();
  }, [isConnected, contract, address, provider]);

  // Handle set new admin
  const handleSetAdmin = async (e) => {
    e.preventDefault();
    if (!ethers.utils.isAddress(newAdminAddress)) {
      toast.error('请输入有效的以太坊地址');
      return;
    }

    try {
      setLoading(true);
      toast.loading('更改管理员中...', { id: 'admin' });
      
      const tx = await contract.setAdmin(newAdminAddress, createTransactionParams());
      toast.loading('等待区块链确认...', { id: 'admin' });
      
      await tx.wait();
      setAdminAddress(newAdminAddress);
      setNewAdminAddress('');
      
      toast.success('管理员已成功更改!', { id: 'admin' });
    } catch (error) {
      console.error('更改管理员失败:', error);
      toast.error(`更改管理员失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'admin' });
    } finally {
      setLoading(false);
    }
  };

  // Handle withdraw fees
  const handleWithdrawFees = async (e) => {
    e.preventDefault();
    let amount = ethers.utils.parseEther('0'); // Default to 0, which means withdraw all
    
    if (withdrawAmount && withdrawAmount !== '0') {
      try {
        amount = ethers.utils.parseEther(withdrawAmount);
      } catch (error) {
        toast.error('请输入有效的提取金额');
        return;
      }
    }

    try {
      setLoading(true);
      toast.loading('提取协议费用中...', { id: 'withdraw' });
      
      const tx = await contract.withdrawFees(amount, createTransactionParams());
      toast.loading('等待区块链确认...', { id: 'withdraw' });
      
      await tx.wait();
      
      // Update accumulated fees and contract balance
      const fees = await contract.accumulatedFees();
      setAccumulatedFees(ethers.utils.formatEther(fees));
      
      const balance = await provider.getBalance(ROCK_PAPER_SCISSORS_ADDRESS);
      setContractBalance(ethers.utils.formatEther(balance));
      
      setWithdrawAmount('');
      toast.success('协议费用提取成功!', { id: 'withdraw' });
    } catch (error) {
      console.error('提取协议费用失败:', error);
      toast.error(`提取失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'withdraw' });
    } finally {
      setLoading(false);
    }
  };

  // Handle withdraw all funds (emergency)
  const handleWithdrawAllFunds = async (e) => {
    e.preventDefault();
    let amount = ethers.utils.parseEther('0'); // Default to 0, which means withdraw maximum available
    
    if (withdrawAllAmount && withdrawAllAmount !== '0') {
      try {
        amount = ethers.utils.parseEther(withdrawAllAmount);
      } catch (error) {
        toast.error('请输入有效的提取金额');
        return;
      }
    }

    if (!window.confirm('警告：这是一个紧急功能，将提取合约中的所有可用资金。确定要继续吗？')) {
      return;
    }

    try {
      setLoading(true);
      toast.loading('紧急提款中...', { id: 'emergency' });
      
      const tx = await contract.withdrawAllFunds(amount, createTransactionParams());
      toast.loading('等待区块链确认...', { id: 'emergency' });
      
      await tx.wait();
      
      // Update contract balance
      const balance = await provider.getBalance(ROCK_PAPER_SCISSORS_ADDRESS);
      setContractBalance(ethers.utils.formatEther(balance));
      
      setWithdrawAllAmount('');
      toast.success('资金提取成功!', { id: 'emergency' });
    } catch (error) {
      console.error('资金提取失败:', error);
      toast.error(`提取失败: ${error.message ? error.message.slice(0, 50) : '未知错误'}...`, { id: 'emergency' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>管理员面板 | 石头剪刀布游戏</title>
      </Head>
      <Toaster position="top-center" />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold text-blue-600 mb-8 text-center font-medieval">管理员控制面板</h1>
        
        {!isConnected ? (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative mb-6 text-center">
            <p className="font-bold">请先连接钱包</p>
            <p>您需要使用管理员地址连接钱包才能访问此功能</p>
          </div>
        ) : !isAdmin ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 text-center">
            <p className="font-bold">访问被拒绝</p>
            <p>当前连接的地址没有管理员权限</p>
            <p className="mt-2">当前管理员地址: 
              <span className="font-mono break-all">{adminAddress}</span>
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 状态概览卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-xl text-white p-6">
                <h3 className="text-xl font-bold mb-2">合约余额</h3>
                <p className="text-3xl font-bold">{parseFloat(contractBalance).toFixed(4)} MAG</p>
                <p className="text-xs opacity-80 mt-2">合约中的总资金</p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-xl text-white p-6">
                <h3 className="text-xl font-bold mb-2">累计协议费用</h3>
                <p className="text-3xl font-bold">{parseFloat(accumulatedFees).toFixed(4)} MAG</p>
                <p className="text-xs opacity-80 mt-2">可提取的协议费用</p>
              </div>
            </div>
            
            {/* 管理员功能卡片 */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 py-4 px-6">
                <h2 className="text-xl font-bold text-white">管理员功能</h2>
              </div>
              
              <div className="p-6 divide-y divide-gray-200">
                {/* 更改管理员 */}
                <div className="py-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">更改管理员</h3>
                  <form onSubmit={handleSetAdmin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">新管理员地址</label>
                      <input 
                        type="text" 
                        value={newAdminAddress}
                        onChange={(e) => setNewAdminAddress(e.target.value)}
                        placeholder="输入新管理员的以太坊地址"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                        required
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                      {loading ? '处理中...' : '更改管理员'}
                    </button>
                  </form>
                </div>
                
                {/* 提取协议费用 */}
                <div className="py-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">提取协议费用</h3>
                  <div className="mb-2 text-sm text-gray-600">
                    可提取费用: <span className="font-mono">{parseFloat(accumulatedFees).toFixed(6)} MAG</span>
                  </div>
                  <form onSubmit={handleWithdrawFees} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">提取金额 (MAG)</label>
                      <input 
                        type="text" 
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="输入金额，0表示全部提取"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                      {loading ? '处理中...' : '提取费用'}
                    </button>
                  </form>
                </div>
                
                {/* 紧急提取所有资金 */}
                <div className="py-4">
                  <h3 className="text-lg font-semibold text-red-600 mb-1">紧急提取资金</h3>
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                    <p className="font-bold">⚠️ 警告</p>
                    <p>此功能用于紧急情况，将提取合约中的所有可用资金。仅在必要时使用！</p>
                  </div>
                  <div className="mb-2 text-sm text-gray-600">
                    合约余额: <span className="font-mono">{parseFloat(contractBalance).toFixed(6)} MAG</span>
                  </div>
                  <form onSubmit={handleWithdrawAllFunds} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">提取金额 (MAG)</label>
                      <input 
                        type="text" 
                        value={withdrawAllAmount}
                        onChange={(e) => setWithdrawAllAmount(e.target.value)}
                        placeholder="输入金额，0表示提取最大可用金额"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        disabled={loading}
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                    >
                      {loading ? '处理中...' : '紧急提取'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
