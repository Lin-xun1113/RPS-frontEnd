#!/bin/bash

# 项目初始化和启动脚本

echo "========================================"
echo "  石头剪刀布游戏 - 安装与启动脚本"
echo "========================================"

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js, 请先安装 Node.js"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: 未找到 npm, 请先安装 npm"
    exit 1
fi

echo "正在安装依赖项..."
npm install

if [ $? -ne 0 ]; then
    echo "依赖项安装失败, 请检查错误信息"
    exit 1
fi

echo "依赖项安装成功!"

# 检查是否有图像资源
if [ ! "$(ls -A ./public/images/* 2>/dev/null)" ]; then
    echo "警告: 公共图像目录为空, UI可能无法正常显示"
    echo "请确保以下图像资源存在于 public/images/ 目录中:"
    cat ./public/images/placeholder.txt
fi

echo ""
echo "启动选项:"
echo "1. 启动开发服务器"
echo "2. 构建生产版本"
echo "3. 启动生产服务器"
echo "4. 退出"
echo ""
read -p "请选择一个选项 (1-4): " choice

case $choice in
    1)
        echo "正在启动开发服务器..."
        npm run dev
        ;;
    2)
        echo "正在构建生产版本..."
        npm run build
        ;;
    3)
        echo "正在启动生产服务器..."
        npm run build && npm run start
        ;;
    4)
        echo "退出脚本"
        exit 0
        ;;
    *)
        echo "无效选项, 退出脚本"
        exit 1
        ;;
esac
