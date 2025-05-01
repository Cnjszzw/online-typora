import { Plugin } from 'vite'
import fs from 'fs'
import path from 'path'

export function docsScanner(): Plugin {
  return {
    name: 'vite-plugin-docs-scanner',
    configureServer(server) {
      // 添加目录列表中间件
      server.middlewares.use('/api/docs', (req, res) => {
        if (req.url === '/list') {
          const docsPath = path.resolve(process.cwd(), 'public/docs')
          try {
            // 递归扫描目录
            const scanDir = (dir: string): any[] => {
              const items = fs.readdirSync(dir)
              return items.map(item => {
                // 排除assets文件夹
                if (item === 'assets') {
                  return null
                }
                
                const fullPath = path.join(dir, item)
                const stat = fs.statSync(fullPath)
                const relativePath = path.relative(path.resolve(process.cwd(), 'public'), fullPath)
                
                if (stat.isDirectory()) {
                  return {
                    name: item,
                    path: relativePath,
                    children: scanDir(fullPath)
                  }
                } else if (item.endsWith('.md')) {
                  return {
                    name: item,
                    path: relativePath
                  }
                }
                return null
              }).filter(Boolean)
            }

            const files = scanDir(docsPath)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(files))
          } catch (error) {
            console.error('Error scanning docs directory:', error)
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Failed to scan docs directory' }))
          }
        }
      })
    }
  }
} 