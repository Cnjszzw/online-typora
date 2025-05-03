<script lang="ts" setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import Sidebar from './components/Sidebar.vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import MarkdownItContainer from 'markdown-it-container'
import mermaid from 'mermaid'

// 初始化mermaid
onMounted(() => {
  mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose',
    flowchart: {
      htmlLabels: true,
      useMaxWidth: true,
      curve: 'basis',
      defaultRenderer: 'dagre-wrapper'
    },
    logLevel: 5, // 设置为"error"级别
  })
})

// 存储标题元素的引用
const headingRefs = ref<Map<string, HTMLElement>>(new Map())

// 定义 currentDir 变量
const currentDir = ref('')

// 获取基础路径
const getBasePath = () => {
  const isDev = import.meta.env.DEV
  return isDev ? '/online-typora' : '/online-typora'
}

// 处理文件路径
const processPath = (path: string, currentDir: string) => {
  // 如果是绝对路径或 HTTP 链接，直接返回
  if (path.startsWith('http') || path.startsWith('/')) {
    return path
  }

  const basePath = getBasePath()
  
  // 标准化路径分隔符
  const normalizedPath = path.replace(/\\/g, '/')
  const normalizedCurrentDir = currentDir ? currentDir.replace(/\\/g, '/') : ''
  
  // 确保路径之间有且仅有一个斜杠
  const joinPaths = (...parts: string[]) => {
    return parts
      .map(part => part.replace(/^\/+|\/+$/g, '')) // 移除开头和结尾的斜杠
      .filter(Boolean) // 移除空字符串
      .join('/')
  }

  // 如果没有当前目录，使用默认路径
  if (!normalizedCurrentDir) {
    return '/' + joinPaths(basePath.replace(/^\/+|\/+$/g, ''), 'docs', normalizedPath.replace(/^\.\//, ''))
  }

  // 处理 ../ 开头的路径
  if (normalizedPath.startsWith('../')) {
    const parentDir = normalizedCurrentDir.split('/').slice(0, -2).join('/')
    return '/' + joinPaths(basePath.replace(/^\/+|\/+$/g, ''), parentDir, normalizedPath.substring(3))
  }

  // 处理 ./ 开头的路径
  if (normalizedPath.startsWith('./')) {
    return '/' + joinPaths(basePath.replace(/^\/+|\/+$/g, ''), normalizedCurrentDir, normalizedPath.substring(2))
  }

  // 处理其他相对路径
  return '/' + joinPaths(basePath.replace(/^\/+|\/+$/g, ''), normalizedCurrentDir, normalizedPath)
}

// 配置 markdown-it
const md = new MarkdownIt({
  html: true,        // 启用 HTML 标签
  linkify: true,     // 自动转换 URL 为链接
  typographer: true, // 启用一些语言中性的替换 + 引号美化
  breaks: true,      // 启用换行符
  highlight: function (str: string, lang: string) {
    if (lang === 'mermaid') {
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      return `<pre class="mermaid" id="${id}">${str}</pre>`
    }
    
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang }).value
        const lines = str.split('\n')
        const lineNumbers = lines.length === 1 && lines[0].trim() === '' ? '1' : lines.map((_, i) => i + 1).join('\n')
        
        return `<pre class="code-block" data-lang="${lang}"><code data-line-numbers="${lineNumbers}">${highlighted || ' '}</code><button class="copy-button" title="复制代码"><svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M14 12V2H4V0h12v12h-2zM0 4h12v12H0V4zm2 2v8h8V6H2z" fill-rule="evenodd"/></svg></button><button class="wrap-button" title="切换换行"><svg width="14" height="14" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg"><path d="M808.969,133.929v257.06H942.94v267.899H417.981V508.763L0,787.417l417.982,278.654V915.946h524.959H1200V658.888V390.988v-257.06H942.941H808.969L808.969,133.929z"/></svg></button></pre>`
      } catch (err) {
        console.error('代码高亮失败:', err)
      }
    }
    return '' // 使用默认的转义
  }
})

// 使用 container 插件
md.use(MarkdownItContainer, 'figure', {
  validate: function(params: string) {
    return params.trim().match(/^figure\s+(.*)$/)
  },
  render: function (tokens: any[], idx: number) {
    if (tokens[idx].nesting === 1) {
      return `<figure class="md-figure">\n`
    } else {
      return '</figure>\n'
    }
  }
})

// 添加标题锚点
md.renderer.rules.heading_open = function (tokens: any[], idx: number, _options: any, _env: any, self: any) {
  const token = tokens[idx]
  const level = token.tag.slice(1)
  const nextToken = tokens[idx + 1]
  const text = nextToken.content
  
  // 生成唯一标识符
  const id = `heading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  token.attrSet('id', id)
  token.attrSet('data-heading-text', text)
  token.attrSet('data-heading-level', level)
  token.attrSet('class', 'markdown-heading')
  
  return self.renderToken(tokens, idx, _options)
}

// 添加图片处理
md.renderer.rules.image = function (tokens: any[], idx: number, _options: any, _env: any, _self: any) {
  const token = tokens[idx]
  if (!token.attrs) return ''
  
  const src = token.attrs[token.attrIndex('src')][1]
  const alt = token.attrs[token.attrIndex('alt')][1]
  
  console.log('处理图片:', { src, alt, currentDir: currentDir.value })
  
  // 处理相对路径
  const finalSrc = processPath(src, currentDir.value)
  console.log('处理后的图片路径:', { 原始路径: src, 当前目录: currentDir.value, 最终路径: finalSrc })
  
  // 处理 zoom 样式
  let style = ''
  const styleIndex = token.attrIndex('style')
  if (styleIndex >= 0 && token.attrs) {
    const originalStyle = token.attrs[styleIndex][1]
    const zoomMatch = originalStyle.match(/zoom:\s*(\d+)%/)
    if (zoomMatch) {
      const zoom = parseInt(zoomMatch[1]) / 100
      style = `transform: scale(${zoom}); transform-origin: center; display: inline-block;`
    }
  }

  // 添加错误处理
  return `<img src="${finalSrc}" alt="${alt}" style="${style}" loading="lazy" decoding="async" onerror="console.error('图片加载失败:', { 原始路径: '${src}', 最终路径: '${finalSrc}', 错误信息: this }); this.onerror=null; this.parentElement.innerHTML='<div class=\\'image-error\\'>图片加载失败: ${alt || finalSrc}</div>';" />`
}

// 处理 HTML 标签中的图片
md.renderer.rules.html_block = function (tokens: any[], idx: number, _options: any, _env: any, _self: any) {
  const token = tokens[idx]
  const content = token.content
  
  // 处理 HTML 图片标签
  if (content.includes('<img')) {
    return content.replace(/<img([^>]*)>/g, function(_match: string, attributes: string) {
      // 提取 src 属性
      const srcMatch = attributes.match(/src=['"]([^'"]+)['"]/)
      if (srcMatch) {
        const src = srcMatch[1]
        console.log('处理HTML中的图片:', { src, currentDir: currentDir.value })
        
        // 处理相对路径
        const finalSrc = processPath(src, currentDir.value)
        console.log('处理后的HTML图片路径:', { 原始路径: src, 最终路径: finalSrc })
        
        // 替换 src 属性
        return _match.replace(/src=['"]([^'"]+)['"]/, `src="${finalSrc}"`)
      }
      return _match
    })
  }
  
  return token.content
}

const markdownContent = ref('')
const currentOutline = ref<{ id: string; text: string; level: number; children?: any[] }[]>([])
const selectedHeading = ref('')
const isUserClick = ref(false) // 添加用户点击标记

// 监听markdownContent变化，初始化mermaid图表和代码块功能
watch(markdownContent, async () => {
  // 使用nextTick确保DOM已更新
  await nextTick()
  try {
    await mermaid.run()
    initCodeBlocks()
  } catch (error) {
    console.error('Failed to initialize mermaid charts:', error)
  }
})

// 初始化代码块功能
const initCodeBlocks = () => {
  const codeBlocks = document.querySelectorAll('.code-block')
  codeBlocks.forEach(block => {
    // 添加复制功能
    const copyButton = block.querySelector('.copy-button')
    if (copyButton) {
      copyButton.addEventListener('click', async () => {
        const code = block.querySelector('code')?.textContent || ''
        try {
          await navigator.clipboard.writeText(code)
          copyButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 -1.5 11 11" xmlns="http://www.w3.org/2000/svg">
              <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g transform="translate(-304.000000, -366.000000)" fill="currentColor">
                  <g transform="translate(56.000000, 160.000000)">
                    <polygon points="259 207.6 252.2317 214 252.2306 213.999 252.2306 214 248 210 249.6918 208.4 252.2306 210.8 257.3082 206"></polygon>
                  </g>
                </g>
              </g>
            </svg>
          `
          setTimeout(() => {
            copyButton.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 12V2H4V0h12v12h-2zM0 4h12v12H0V4zm2 2v8h8V6H2z" fill-rule="evenodd"/>
              </svg>
            `
          }, 1000)
        } catch (err) {
          console.error('复制失败:', err)
        }
      })
    }

    // 添加换行功能
    const wrapButton = block.querySelector('.wrap-button')
    if (wrapButton) {
      wrapButton.addEventListener('click', () => {
        const code = block.querySelector('code')
        if (code) {
          code.style.whiteSpace = code.style.whiteSpace === 'pre-wrap' ? 'pre' : 'pre-wrap'
        }
      })
    }
  })
}

const loadMarkdownContent = async (filePath: string) => {
  try {
    console.log('开始加载文件:', filePath)
    const response = await fetch(filePath)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const content = await response.text()
    
    // 获取当前文件的目录路径
    currentDir.value = filePath.substring(0, filePath.lastIndexOf('/') + 1)
    console.log('当前文件目录:', currentDir.value)
    
    const renderedContent = md.render(content)
    markdownContent.value = renderedContent
    
    // 等待DOM更新后获取标题元素
    setTimeout(() => {
      const headings = document.querySelectorAll('.markdown-heading')
      headingRefs.value.clear()
      
      const mainContent = document.querySelector('.main-content')
      if (!mainContent) {
        console.error('找不到 main-content 元素')
        return
      }
      
      // 存储所有标题的位置信息
      const headingPositions = Array.from(headings).map(heading => ({
        element: heading as HTMLElement,
        id: heading.id,
        top: (heading as HTMLElement).offsetTop
      })).sort((a, b) => a.top - b.top)
      
      // 构建层级结构的大纲
      const outline: any[] = []
      const parentStack: any[] = []
      
      headings.forEach(heading => {
        const id = heading.id
        const text = heading.textContent || ''
        const level = parseInt(heading.tagName[1])
        
        const item = {
          id,
          text,
          level,
          children: [],
          isExpanded: true
        }
        
        // 重置到正确的层级
        while (parentStack.length > 0 && level <= parentStack[parentStack.length - 1].level) {
          parentStack.pop()
        }
        
        if (parentStack.length > 0) {
          // 添加到当前父级的子级
          parentStack[parentStack.length - 1].children.push(item)
        } else {
          // 顶级标题
          outline.push(item)
        }
        
        if (level < 6) { // 只处理到 h5
          parentStack.push(item)
        }
      })
      
      currentOutline.value = outline
      
      // 添加滚动监听
      mainContent.addEventListener('scroll', () => {
        // 如果是用户点击触发的滚动，不更新选中状态
        if (isUserClick.value) return
        
        const scrollTop = mainContent.scrollTop
        const viewportHeight = mainContent.clientHeight
        const scrollBottom = scrollTop + viewportHeight
        
        // 计算视口中心位置
        const viewportCenter = scrollTop + viewportHeight / 2
        
        // 找到最接近视口中心的标题
        let closestHeading = null
        let minDistance = Infinity
        
        headingPositions.forEach(heading => {
          // 计算标题到视口中心的距离
          const distance = Math.abs(heading.top - viewportCenter)
          
          // 如果标题在视口内或接近视口
          if (heading.top <= scrollBottom && heading.top + 50 >= scrollTop) {
            if (distance < minDistance) {
              minDistance = distance
              closestHeading = heading
            }
          }
        })
        
        // 处理边界情况
        if (!closestHeading && headingPositions.length > 0) {
          if (scrollTop <= 0) {
            // 滚动到顶部时选中第一个标题
            closestHeading = headingPositions[0]
          } else if (scrollBottom >= mainContent.scrollHeight) {
            // 滚动到底部时选中最后一个标题
            closestHeading = headingPositions[headingPositions.length - 1]
          } else {
            // 在中间区域时，找到最接近视口中心的标题
            headingPositions.forEach(heading => {
              const distance = Math.abs(heading.top - viewportCenter)
              if (distance < minDistance) {
                minDistance = distance
                closestHeading = heading
              }
            })
          }
        }
        
        if (closestHeading && closestHeading.id) {
          selectedHeading.value = closestHeading.id
        }
      })
      
      // 初始检查
      mainContent.dispatchEvent(new Event('scroll'))
      
    }, 0)
  } catch (error) {
    console.error('Error loading markdown file:', error)
    markdownContent.value = '加载文件失败'
  }
}

// 移除大纲变化的监听
// watch(() => currentOutline.value, (newOutline) => {
//   console.log('大纲数据更新:', newOutline)
// }, { deep: true })

const handleFileSelect = (filePath: string) => {
  loadMarkdownContent(filePath)
}

// 暴露给子组件的方法
const scrollToHeading = (id: string) => {
  isUserClick.value = true // 标记为用户点击
  const heading = document.getElementById(id)
  if (heading) {
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      // 添加一个小的偏移量，使标题位置稍微偏下一点
      const offset = 10
      mainContent.scrollTop = heading.offsetTop - offset
      selectedHeading.value = id
    }
  }
  // 1秒后重置用户点击标记
  setTimeout(() => {
    isUserClick.value = false
  }, 1000)
}

// 添加侧边栏宽度控制
const sidebarWidth = ref(300)
let isResizing = false
let startX = 0
let startWidth = 0

const startResize = (e: MouseEvent) => {
  isResizing = true
  startX = e.clientX
  startWidth = sidebarWidth.value
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing) return
  const delta = e.clientX - startX
  const newWidth = Math.max(150, Math.min(600, startWidth + delta))
  sidebarWidth.value = newWidth
}

const stopResize = () => {
  isResizing = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}

defineExpose({
  scrollToHeading
})
</script>

<template>
  <div class="app-container">
    <div class="navbar">
      <div class="navbar-brand">INFO.CENTER</div>
      <div class="navbar-menu">
        <a-button type="text" class="nav-btn">文件</a-button>
        <a-button type="text" class="nav-btn">编辑</a-button>
        <a-button type="text" class="nav-btn">视图</a-button>
        <a-button type="text" class="nav-btn">帮助</a-button>
      </div>
    </div>
    <div class="main-layout">
      <div class="sidebar-container" :style="{ width: sidebarWidth + 'px' }">
        <Sidebar 
          @file-select="handleFileSelect" 
          :outline="currentOutline"
          @scroll-to-heading="scrollToHeading"
          :sidebar-width="sidebarWidth"
        />
      </div>
      <div 
        class="resize-handle" 
        @mousedown="startResize"
      ></div>
      <div class="content-container">
        <div class="main-content">
          <div class="markdown-content" v-html="markdownContent"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
  width: 100%;
}

#app {
  height: 100%;
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.navbar {
  height: 48px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
  width: 100%;
}

.navbar-brand {
  font-size: 18px;
  font-weight: 600;
  color: #1890ff;
  margin-right: 32px;
}

.nav-btn {
  height: 48px;
  padding: 0 12px;
  font-size: 16px;
}

.navbar-menu {
  display: flex;
  gap: 8px;
}

.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: calc(100% - 48px);
}

.sidebar-container {
  height: 100%;
  overflow: hidden;
  background-color: #fff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #e0e0e0;
}

.resize-handle {
  width: 4px;
  background-color: #e0e0e0;
  cursor: col-resize;
  transition: background-color 0.2s;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.resize-handle:hover {
  background-color: #1890ff;
}

.content-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  width: 100%;
  height: 100%;
}

.markdown-content {
  padding: 20px;
  text-align: left;
  max-width: 100%;
  height: 100%;
}

/* Markdown 样式 */
.markdown-content {
  line-height: 1.6;
  color: #24292e;
  text-align: left;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
  text-align: left;
  scroll-margin-top: 20px; /* 添加滚动边距 */
}

.markdown-content h1 { font-size: 2em; }
.markdown-content h2 { font-size: 1.5em; }
.markdown-content h3 { font-size: 1.25em; }
.markdown-content h4 { font-size: 1em; }
.markdown-content h5 { font-size: 0.875em; }
.markdown-content h6 { font-size: 0.85em; }

.markdown-content p {
  margin-top: 0;
  margin-bottom: 16px;
  text-align: left;
}

.markdown-content code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27,31,35,0.05);
  border-radius: 3px;
  font-family: "SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;
}

.markdown-content pre {
  position: relative;
  padding: 8px 4px;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 3px;
  margin: 4px 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.markdown-content pre code {
  padding: 0;
  margin: 0;
  font-size: 100%;
  word-break: normal;
  white-space: pre;
  background: transparent;
  border: 0;
  display: block;
  position: relative;
  overflow: hidden;
  line-height: 1.45;
  font-family: "SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;
  padding-left: 32px;
}

/* 代码语言标签 */
.markdown-content pre::before {
  content: attr(data-lang);
  position: absolute;
  top: 0;
  right: 0;
  padding: 2px 8px;
  font-size: 12px;
  color: #666;
  background-color: #fff;
  border-bottom-left-radius: 3px;
  opacity: 1;
  transition: opacity 0.3s;
  z-index: 2;
}

.markdown-content pre:hover::before {
  opacity: 0;
}

/* 行号 */
.markdown-content pre code::before {
  content: attr(data-line-numbers);
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  padding: 0 6px 0 2px;
  color: #999;
  font-size: 100%;
  line-height: 1.45;
  text-align: right;
  user-select: none;
  pointer-events: none;
  font-family: "SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;
  width: 30px;
  box-sizing: border-box;
  background-color: #f0f0f0;
  border-right: 1px solid #eee;
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
}

/* 复制按钮 */
.markdown-content pre .copy-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  padding: 0;
  background-color: #fff;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  z-index: 2;
}

.markdown-content pre .copy-button:focus {
  outline: none;
}

/* 换行按钮 */
.markdown-content pre .wrap-button {
  position: absolute;
  top: 8px;
  right: 40px;
  width: 24px;
  height: 24px;
  padding: 0;
  background-color: #fff;
  border: none;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  z-index: 2;
}

.markdown-content pre .wrap-button:focus {
  outline: none;
}

.markdown-content pre:hover .copy-button,
.markdown-content pre:hover .wrap-button {
  opacity: 1;
}

.markdown-content pre .copy-button svg,
.markdown-content pre .wrap-button svg {
  fill: #666;
}

/* 复制成功动画 */
@keyframes copySuccess {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.markdown-content pre .copy-success {
  animation: copySuccess 0.3s ease-in-out;
}

.markdown-content pre .copy-button svg,
.markdown-content pre .wrap-button svg {
  fill: #666;
}

.markdown-content pre .copy-button:hover svg,
.markdown-content pre .wrap-button:hover svg {
  fill: #666;
}

.markdown-content img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

.markdown-content blockquote {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin: 0 0 16px 0;
}

.markdown-content ul,
.markdown-content ol {
  padding-left: 2em;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-content table {
  display: block;
  width: 100%;
  overflow: auto;
  margin-top: 0;
  margin-bottom: 16px;
  border-spacing: 0;
  border-collapse: collapse;
}

.markdown-content table th {
  font-weight: 600;
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-content table td {
  padding: 6px 13px;
  border: 1px solid #dfe2e5;
}

.markdown-content table tr {
  background-color: #fff;
  border-top: 1px solid #c6cbd1;
}

.markdown-content table tr:nth-child(2n) {
  background-color: #f6f8fa;
}

/* 支持 HTML 标签样式 */
.markdown-content center {
  display: block;
  text-align: left;
  margin: 1em 0;
}

.markdown-content img[style*="transform"] {
  display: inline-block;
  margin: 1em auto;
}

/* 图片错误样式 */
.image-error {
  padding: 10px;
  background-color: #ffebee;
  color: #c62828;
  border: 1px solid #ef9a9a;
  border-radius: 4px;
  margin: 10px 0;
  text-align: center;
}
</style>
