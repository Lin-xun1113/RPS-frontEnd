/**
 * 缩短区块链地址的工具函数
 */

/**
 * 缩短以太坊地址，显示前几位和后几位
 * @param {string} address - 完整的以太坊地址
 * @param {number} chars - 前后各显示的字符数，默认为4
 * @returns {string} 缩短后的地址
 */
export const shortenAddress = (address, chars = 4) => {
  if (!address) return '';
  
  // 地址长度必须足够长，才能进行缩短
  if (address.length < chars * 2) {
    return address;
  }
  
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
};

/**
 * 检查两个地址是否相等（大小写不敏感）
 * @param {string} address1 - 第一个地址
 * @param {string} address2 - 第二个地址
 * @returns {boolean} 地址是否相等
 */
export const areAddressesEqual = (address1, address2) => {
  if (!address1 || !address2) return false;
  
  return address1.toLowerCase() === address2.toLowerCase();
};

/**
 * 验证地址格式是否正确
 * @param {string} address - 要验证的以太坊地址
 * @returns {boolean} 地址格式是否正确
 */
export const isValidAddress = (address) => {
  if (!address) return false;
  
  // 基本验证，以太坊地址应该是以0x开头的2位+40位的十六进制字符串
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};
