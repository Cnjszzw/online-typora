import { Plugin } from 'vite'
import path from 'path'
import fs from 'fs'

export function docsScanner(): Plugin {
  return {
    name: 'vite-plugin-docs-scanner',
    configureServer(server) {
      // 开发服务器中间件
      server.middlewares.use('/online-typora/api/docs/list', (_req, res) => {
        const docsPath = path.resolve(__dirname, 'public/docs')
        try {
          const files = scanDirectory(docsPath)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(files))
        } catch (error) {
          console.error('Error scanning docs directory:', error)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Failed to scan docs directory' }))
        }
      })
    },
    // 添加构建钩子
    buildStart() {
      // 在构建开始时扫描文档目录
      const docsPath = path.resolve(__dirname, 'public/docs')
      try {
        const files = scanDirectory(docsPath)
        // 将文件列表写入 public 目录
        fs.writeFileSync(
          path.resolve(__dirname, 'public/docs-list.json'),
          JSON.stringify(files, null, 2)
        )
      } catch (error) {
        console.error('Error scanning docs directory during build:', error)
      }
    }
  }
}

// 递归扫描目录
function scanDirectory(dir: string): any[] {
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
        children: scanDirectory(fullPath)
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