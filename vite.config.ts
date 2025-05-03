import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'
import { docsScanner } from './vite-plugin-docs-scanner'
import type { ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'

// https://vite.dev/config/
export default defineConfig({
  base: '/online-typora/',
  plugins: [
    vue(),
    docsScanner()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 确保资源文件使用相对路径
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // 保持 docs 目录下的文件结构
          if (assetInfo.name && assetInfo.name.startsWith('public/docs/')) {
            return assetInfo.name.replace('public/', '')
          }
          return 'assets/[name].[hash][extname]'
        },
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      }
    }
  },
  server: {
    fs: {
      // 允许为工作区依赖提供服务
      allow: ['..']
    },
    // 自定义中间件
    middlewareMode: false,
  },
  publicDir: 'public',
})

// 配置开发服务器
export const configureServer = (server: ViteDevServer) => {
  // 添加目录列表中间件
  server.middlewares.use('/online-typora/docs', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    // 如果是目录请求
    if (req.url === '/' || req.url === '') {
      const docsPath = path.resolve(__dirname, 'public/docs')
      try {
        // 读取目录内容
        const files = fs.readdirSync(docsPath)
        // 过滤出.md文件
        const mdFiles = files.filter(file => file.endsWith('.md') && !file.includes('assets'))
        // 生成HTML
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Directory Listing</title>
            </head>
            <body>
              <ul>
                ${mdFiles.map(file => `<li><a href="${file}">${file}</a></li>`).join('')}
              </ul>
            </body>
          </html>
        `
        res.setHeader('Content-Type', 'text/html')
        res.end(html)
      } catch (error) {
        console.error('Error reading directory:', error)
        next()
      }
    } else {
      next()
    }
  })
}
