import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { ROCK_PAPER_SCISSORS_ADDRESS, ABI } from '../constants/contractInfo';

const AdminNavLink = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isConnected || !address || !publicClient) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // 使用Wagmi v1的readContract方式获取管理员地址
        // 对ABI进行结构化，避免字符串解析问题
        const adminAddress = await readContract({
          address: ROCK_PAPER_SCISSORS_ADDRESS,
          abi: [{
            name: 'adminAddress',
            type: 'function',
            stateMutability: 'view',
            inputs: [],
            outputs: [{type: 'address'}]
          }],
          functionName: 'adminAddress',
        });
        
        setIsAdmin(address.toLowerCase() === adminAddress.toLowerCase());
      } catch (error) {
        console.error('获取管理员状态失败:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [isConnected, address, publicClient]);

  if (loading || !isAdmin) return null;

  return (
    <Link href="/admin">
      <div className="text-amber-900 hover:text-amber-700 font-medieval text-lg transition-colors cursor-pointer relative group">
        管理面板
        <span className="absolute -top-2 -right-2 w-2 h-2 bg-red-500 rounded-full"></span>
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-amber-700 group-hover:w-full transition-all duration-300"></span>
      </div>
    </Link>
  );
};

export default AdminNavLink;
