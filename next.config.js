/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['magnetchain.xyz', 'node2.magnetchain.xyz'],
    // 启用未优化的图片，确保在静态导出时图片能正常显示
    unoptimized: true,
  },
  // 改善静态资源在Netlify上的处理
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
  // 确保Next.js输出能在Netlify上正常运行
  output: 'standalone',
}

module.exports = nextConfig
