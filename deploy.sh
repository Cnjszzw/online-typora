#!/usr/bin/env sh

# 确保脚本抛出遇到的错误
set -e

echo "开始构建..."

# 构建
npm run build

echo "构建完成，开始部署..."

# 进入构建文件夹
cd dist

# 创建 .nojekyll 文件，防止 GitHub Pages 忽略下划线开头的文件
touch .nojekyll

# 初始化 git 仓库
git init
git add -A
git commit -m 'deploy'

# 推送到 gh-pages 分支
git push -f git@github.com:Cnjszzw/online-typora.git main:gh-pages

echo "部署完成！"

# 返回上级目录
cd -

echo "清理临时文件..."
# 删除 dist 目录下的 .git 文件夹
rm -rf dist/.git 