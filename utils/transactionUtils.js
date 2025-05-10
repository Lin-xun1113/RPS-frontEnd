import { ethers } from 'ethers';

/**
 * 生成统一的EIP-1559交易参数
 * @param {Object} additionalParams - 额外的交易参数，如value等
 * @returns {Object} 包含EIP-1559所需参数的交易选项对象
 */
export const createTransactionParams = (additionalParams = {}) => {
  return {
    maxFeePerGas: ethers.utils.parseUnits("50", "gwei"),
    maxPriorityFeePerGas: ethers.utils.parseUnits("2", "gwei"),
    ...additionalParams
  };
};

/**
 * 生成动态的EIP-1559交易参数（根据当前网络状况）
 * @param {Object} provider - ethers.js提供的provider对象
 * @param {Object} additionalParams - 额外的交易参数，如value等
 * @returns {Promise<Object>} 包含EIP-1559所需参数的交易选项对象
 */
export const createDynamicTransactionParams = async (provider, additionalParams = {}) => {
  try {
    // 获取当前网络的Gas价格建议
    const feeData = await provider.getFeeData();
    
    return {
      maxFeePerGas: feeData.maxFeePerGas || ethers.utils.parseUnits("50", "gwei"),
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.utils.parseUnits("2", "gwei"),
      ...additionalParams
    };
  } catch (error) {
    console.error('获取Gas费用数据失败，使用默认值', error);
    // 如果获取失败，回退到固定参数
    return createTransactionParams(additionalParams);
  }
};
