import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, useContract, useProvider } from 'wagmi';
import { ROCK_PAPER_SCISSORS_ADDRESS, ABI } from '../constants/contractInfo';

const AdminNavLink = () => {
  const { address, isConnected } = useAccount();
  const provider = useProvider();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const contract = useContract({
    address: ROCK_PAPER_SCISSORS_ADDRESS,
    abi: ABI,
    signerOrProvider: provider,
  });

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!isConnected || !address || !contract) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const adminAddress = await contract.adminAddress();
        setIsAdmin(address.toLowerCase() === adminAddress.toLowerCase());
      } catch (error) {
        console.error('获取管理员状态失败:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [isConnected, address, contract]);

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
