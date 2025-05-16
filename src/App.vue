<script lang="ts" setup>
console.log('LLog: App.vue setup loaded')
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import Sidebar from './components/Sidebar.vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import MarkdownItContainer from 'markdown-it-container'
import mermaid from 'mermaid'
import TabBar from './components/TabBar.vue'

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

// 处理文件路径
const processPath = (path: string, currentDir: string) => {
  // 如果是绝对路径或 HTTP 链接，直接返回
  if (path.startsWith('http')) {
    return path
  }

  const basePath = '/online-typora'
  
  // 标准化路径分隔符
  const normalizedPath = path.replace(/\\/g, '/')
  const normalizedCurrentDir = currentDir.replace(/\\/g, '/')
  
  // 如果路径以 ./ 开头，移除它
  const cleanPath = normalizedPath.replace(/^\.\//, '')
  
  console.log('路径处理详情:', {
    原始路径: path,
    标准化路径: normalizedPath,
    清理后路径: cleanPath,
    当前目录: normalizedCurrentDir
  })
  
  // 如果当前目录为空，说明路径解析有问题，尝试从文件路径中提取目录
  if (!normalizedCurrentDir) {
    console.error('当前目录为空，这不应该发生。请检查文件路径解析逻辑。')
    return `${basePath}/docs/${cleanPath}` // 降级处理
  }
  
  // 处理 ../ 开头的路径
  if (cleanPath.startsWith('../')) {
    const parentDir = normalizedCurrentDir.split('/').slice(0, -1).join('/')
    const finalPath = `${basePath}/docs/${parentDir}/${cleanPath.substring(3)}`
    console.log('../路径处理结果:', finalPath)
    return finalPath
  }
  
  // 处理相对路径，确保不会重复添加docs
  const finalPath = `${basePath}/docs/${normalizedCurrentDir.replace(/^docs\//, '')}/${cleanPath}`
  console.log('相对路径处理结果:', finalPath)
  return finalPath
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
    
    // 处理代码行数和展开/收起
    const lines = str.split('\n')
    const totalLines = lines.length
    const isLongCode = totalLines > 30
    const displayLines = isLongCode ? lines.slice(0, 30).join('\n') : str
    const hiddenLines = isLongCode ? lines.slice(30).join('\n') : ''
    
    console.log('初始化代码块:', {
      总行数: totalLines,
      是否长代码: isLongCode,
      显示行数: isLongCode ? 30 : totalLines,
      隐藏行数: isLongCode ? totalLines - 30 : 0
    })
    
    // 生成行号
    const lineNumbers = Array.from({ length: isLongCode ? 30 : totalLines }, (_, i) => i + 1).join('\n')
    const hiddenLineNumbers = isLongCode ? Array.from({ length: totalLines - 30 }, (_, i) => i + 31).join('\n') : ''
    
    console.log('生成行号:', {
      主要行号范围: `1-${isLongCode ? 30 : totalLines}`,
      隐藏行号范围: isLongCode ? `31-${totalLines}` : '无'
    })
    
    // 处理 URL 类型
    if (lang === 'url') {
      return `<pre class="code-block" data-lang="${lang}">
        <div class="lang-tag">${lang}</div>
        <code data-line-numbers="${lineNumbers}">${displayLines}</code>
        ${isLongCode ? `
          <div class="code-expand-tip">展开显示剩余 ${totalLines - 30} 行代码 ...</div>
          <div class="hidden-code" style="display: none;">
            <code data-line-numbers="${hiddenLineNumbers}">${hiddenLines}</code>
          </div>
          <button class="expand-button" title="展开/收起代码">
            <img src="/online-typora/expand.svg" alt="expand" style="width: 14px; height: 14px;" />
          </button>
        ` : ''}
        <button class="copy-button" title="复制代码">
          <img src="/online-typora/copy.svg" alt="copy" style="width: 14px; height: 14px;" />
        </button>
        <button class="wrap-button" title="切换换行">
          <img src="/online-typora/return.svg" alt="wrap" style="width: 14px; height: 14px;" />
        </button>
      </pre>`
    }
    
    // 处理其他语言
    if (lang && hljs.getLanguage(lang)) {
      try {
        const highlighted = hljs.highlight(str, { language: lang }).value
        const displayHighlighted = isLongCode ? hljs.highlight(displayLines, { language: lang }).value : highlighted
        const hiddenHighlighted = isLongCode ? hljs.highlight(hiddenLines, { language: lang }).value : ''
        
        return `<pre class="code-block" data-lang="${lang}" data-total-lines="${totalLines}" data-display-lines="${isLongCode ? 30 : totalLines}" data-hidden-lines="${isLongCode ? totalLines - 30 : 0}">
          <div class="lang-tag">${lang}</div>
          <div class="code-content-wrapper">
            <code data-line-numbers="${lineNumbers}">${displayHighlighted || ' '}</code>
            ${isLongCode ? `
              <div class="hidden-code" style="display: none;">
                <code data-line-numbers="${hiddenLineNumbers}">${hiddenHighlighted}</code>
              </div>
            ` : ''}
          </div>
          ${isLongCode ? `
            <div class="code-expand-tip">展开显示剩余 ${totalLines - 30} 行代码 ...</div>
            <button class="expand-button" title="展开/收起代码">
              <img src="/online-typora/expand.svg" alt="expand" style="width: 14px; height: 14px;" />
            </button>
          ` : ''}
          <button class="copy-button" title="复制代码">
            <img src="/online-typora/copy.svg" alt="copy" style="width: 14px; height: 14px;" />
          </button>
          <button class="wrap-button" title="切换换行">
            <img src="/online-typora/return.svg" alt="wrap" style="width: 14px; height: 14px;" />
          </button>
        </pre>`
      } catch (err) {
        console.error('代码高亮失败:', err)
      }
    }
    
    // 对于不支持的语言，使用相同的结构
    return `<pre class="code-block" data-lang="${lang || 'text'}" data-total-lines="${totalLines}" data-display-lines="${isLongCode ? 30 : totalLines}" data-hidden-lines="${isLongCode ? totalLines - 30 : 0}">
      <div class="lang-tag">${lang || 'text'}</div>
      <div class="code-content-wrapper">
        <code data-line-numbers="${lineNumbers}">${displayLines}</code>
        ${isLongCode ? `
          <div class="hidden-code" style="display: none;">
            <code data-line-numbers="${hiddenLineNumbers}">${hiddenLines}</code>
          </div>
        ` : ''}
      </div>
      ${isLongCode ? `
        <div class="code-expand-tip">展开显示剩余 ${totalLines - 30} 行代码 ...</div>
        <button class="expand-button" title="展开/收起代码">
          <img src="/online-typora/expand.svg" alt="expand" style="width: 14px; height: 14px;" />
        </button>
      ` : ''}
      <button class="copy-button" title="复制代码">
        <img src="/online-typora/copy.svg" alt="copy" style="width: 14px; height: 14px;" />
      </button>
      <button class="wrap-button" title="切换换行">
        <img src="/online-typora/return.svg" alt="wrap" style="width: 14px; height: 14px;" />
      </button>
    </pre>`
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
const isUserClick = ref(false)
const currentFileName = ref('')
const openTabs = ref<{ name: string; path: string; content: string; outline?: { id: string; text: string; level: number; children?: any[] }[] }[]>([])
const activeTab = ref('')
const sidebarRef = ref()
const showBackToTop = ref(false)
const isRestoringScroll = ref(false)
let lastScrollTop = 0
let scrollTimeout: number | null = null
let isResetting = false

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

// 监听activeTab和markdownContent，内容渲染后恢复滚动
watch([activeTab, markdownContent], async ([newTab, newContent], [oldTab, oldContent]) => {
  if (newTab && newTab !== oldTab) {
    await nextTick()
    if (sidebarRef.value && typeof sidebarRef.value.restoreScrollForSelectedFile === 'function') {
      sidebarRef.value.restoreScrollForSelectedFile()
    }
  }
})

// 添加一个计算实际显示行数的辅助函数
const calculateVisibleLines = (element: HTMLElement): number => {
  const rect = element.getBoundingClientRect()
  const lineHeight = parseFloat(getComputedStyle(element).lineHeight)
  return Math.ceil(rect.height / lineHeight)
}

// 初始化代码块功能
const initCodeBlocks = () => {
  const codeBlocks = document.querySelectorAll('.code-block')
  codeBlocks.forEach(block => {
    // 添加复制功能
    const copyButton = block.querySelector('.copy-button')
    if (copyButton) {
      copyButton.innerHTML = `
        <img src="/online-typora/copy.svg" alt="copy" style="width: 14px; height: 14px;" />
      `
      copyButton.addEventListener('click', async () => {
        const code = block.querySelector('code')?.textContent || ''
        const hiddenCode = block.querySelector('.hidden-code code')?.textContent || ''
        try {
          await navigator.clipboard.writeText(code + hiddenCode)
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
              <img src="/online-typora/copy.svg" alt="copy" style="width: 14px; height: 14px;" />
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
      wrapButton.innerHTML = `
        <img src="/online-typora/return.svg" alt="wrap" style="width: 14px; height: 14px;" />
      `
      wrapButton.addEventListener('click', () => {
        const pre = block.closest('pre') as HTMLElement
        const code = block.querySelector('code') as HTMLElement
        const hiddenCode = block.querySelector('.hidden-code code') as HTMLElement | null
        const codeWrapper = block.querySelector('.code-content-wrapper') as HTMLElement
        
        const isWrapped = code.style.whiteSpace === 'pre-wrap'
        
        // 设置换行模式
        code.style.whiteSpace = isWrapped ? 'pre' : 'pre-wrap'
        if (hiddenCode) {
          hiddenCode.style.whiteSpace = isWrapped ? 'pre' : 'pre-wrap'
        }
        
        if (!isWrapped) {
          // 换行模式
          code.style.wordBreak = 'break-all'
          if (hiddenCode) {
            hiddenCode.style.wordBreak = 'break-all'
          }
          // 重置滚动容器的宽度
          if (codeWrapper) {
            codeWrapper.style.minWidth = 'auto'
            codeWrapper.style.width = '100%'
          }
        } else {
          // 不换行模式
          code.style.wordBreak = 'normal'
          if (hiddenCode) {
            hiddenCode.style.wordBreak = 'normal'
          }
          // 确保滚动容器可以容纳完整的代码
          if (codeWrapper) {
            codeWrapper.style.minWidth = '0'
            codeWrapper.style.width = '100%'
          }
        }
        
        // 等待DOM更新完成后重新计算行号
        requestAnimationFrame(() => {
          // 强制重新计算布局
          if (codeWrapper) {
            void codeWrapper.offsetWidth
          }
          
          // 计算实际显示的行数
          const mainVisibleLines = calculateVisibleLines(code)
          const hiddenVisibleLines = hiddenCode ? calculateVisibleLines(hiddenCode) : 0
          
          console.log('换行后实际显示行数:', {
            主代码实际显示行数: mainVisibleLines,
            隐藏代码实际显示行数: hiddenVisibleLines,
            换行模式: !isWrapped
          })
          
          // 重新生成行号
          const mainLineNumbers = Array.from(
            { length: mainVisibleLines }, 
            (_, i) => i + 1
          ).join('\n')
          
          const hiddenLineNumbers = hiddenVisibleLines > 0 ? Array.from(
            { length: hiddenVisibleLines }, 
            (_, i) => i + mainVisibleLines + 1
          ).join('\n') : ''
          
          // 更新行号
          code.setAttribute('data-line-numbers', mainLineNumbers)
          if (hiddenCode && hiddenVisibleLines > 0) {
            hiddenCode.setAttribute('data-line-numbers', hiddenLineNumbers)
          }
          
          // 更新展开提示的行数
          const tipElement = block.querySelector('.code-expand-tip') as HTMLElement
          if (tipElement && hiddenVisibleLines > 0) {
            tipElement.textContent = `展开显示剩余 ${hiddenVisibleLines} 行代码 ...`
          }
          
          // 更新数据属性
          pre.setAttribute('data-total-lines', String(mainVisibleLines + hiddenVisibleLines))
          pre.setAttribute('data-display-lines', String(mainVisibleLines))
          pre.setAttribute('data-hidden-lines', String(hiddenVisibleLines))
          
          console.log('换行操作完成:', {
            主代码显示行数: mainVisibleLines,
            隐藏代码显示行数: hiddenVisibleLines,
            主代码行号: mainLineNumbers,
            隐藏代码行号: hiddenLineNumbers,
            换行模式: !isWrapped
          })
        })
      })
    }

    // 添加展开/收起功能
    const expandButton = block.querySelector('.expand-button')
    const expandTip = block.querySelector('.code-expand-tip')
    
    const toggleExpand = () => {
      const pre = block.closest('pre') as HTMLElement
      const hiddenCode = block.querySelector('.hidden-code') as HTMLElement
      const mainCode = block.querySelector('code') as HTMLElement
      const hiddenCodeElement = hiddenCode?.querySelector('code') as HTMLElement
      const isExpanded = hiddenCode?.style.display !== 'none'
      
      if (hiddenCode && hiddenCodeElement) {
        hiddenCode.style.display = isExpanded ? 'none' : 'block'
        
        // 等待DOM更新完成后重新计算行号
        requestAnimationFrame(() => {
          // 计算实际显示的行数
          const mainVisibleLines = calculateVisibleLines(mainCode)
          const hiddenVisibleLines = isExpanded ? 0 : calculateVisibleLines(hiddenCodeElement)
          
          console.log('展开/收起后实际显示行数:', {
            主代码显示行数: mainVisibleLines,
            隐藏代码显示行数: hiddenVisibleLines,
            是否展开: !isExpanded
          })
          
          // 重新生成行号
          const mainLineNumbers = Array.from(
            { length: mainVisibleLines }, 
            (_, i) => i + 1
          ).join('\n')
          
          const hiddenLineNumbers = hiddenVisibleLines > 0 ? Array.from(
            { length: hiddenVisibleLines }, 
            (_, i) => i + mainVisibleLines + 1
          ).join('\n') : ''
          
          // 更新行号
          mainCode.setAttribute('data-line-numbers', mainLineNumbers)
          if (hiddenVisibleLines > 0) {
            hiddenCodeElement.setAttribute('data-line-numbers', hiddenLineNumbers)
          }
          
          // 更新展开提示
          const tipElement = block.querySelector('.code-expand-tip') as HTMLElement
          if (tipElement) {
            tipElement.style.display = isExpanded ? 'flex' : 'none'
            if (isExpanded && hiddenVisibleLines > 0) {
              tipElement.textContent = `展开显示剩余 ${hiddenVisibleLines} 行代码 ...`
            }
          }
          
          // 更新按钮状态
          const img = expandButton?.querySelector('img') as HTMLElement
          if (img) {
            img.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)'
          }
          
          // 更新数据属性
          pre.setAttribute('data-total-lines', String(mainVisibleLines + hiddenVisibleLines))
          pre.setAttribute('data-display-lines', String(mainVisibleLines))
          pre.setAttribute('data-hidden-lines', String(hiddenVisibleLines))
        })
      }
    }

    if (expandButton) {
      expandButton.addEventListener('click', toggleExpand)
    }

    if (expandTip) {
      expandTip.addEventListener('click', toggleExpand)
    }
  })
}

const handleFileSelect = async (filePath: string) => {
  console.log('LLog: App handleFileSelect', filePath)
  const normalizedPath = filePath.replace(/\\/g, '/')
  const fileName = normalizedPath.split('/').pop() || ''
  let tab = openTabs.value.find(tab => tab.path === filePath)
  if (!tab) {
    tab = { name: fileName, path: filePath, content: '', outline: [] }
    openTabs.value.push(tab)
    console.log('添加新标签:', {
      文件名: fileName,
      完整路径: filePath,
      当前标签数: openTabs.value.length
    })
  }
  activeTab.value = filePath
  if (!tab.content) {
    tab.content = await loadMarkdownContent(filePath)
  }
}

const handleSwitchTab = async (path: string) => {
  console.log('DG2: Switching tab to:', path)
  const oldTab = activeTab.value
  activeTab.value = path
  const tab = openTabs.value.find(t => t.path === path)
  if (tab) {
    console.log('DG2: Found tab, loading content')
    if (!tab.content) {
      await loadMarkdownContent(tab.path)
    } else {
      // 切换标签时更新当前大纲和内容
      console.log('DG2: Updating outline for tab:', tab.name)
      markdownContent.value = tab.content
      
      // 创建一个临时的内容容器来重新解析大纲
      const tempContainer = document.createElement('div')
      tempContainer.innerHTML = tab.content
      const headings = tempContainer.querySelectorAll('.markdown-heading')
      console.log('DG2: Found headings:', headings.length)
      
      // 构建新的大纲数据
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
        
        while (parentStack.length > 0 && level <= parentStack[parentStack.length - 1].level) {
          parentStack.pop()
        }
        
        if (parentStack.length > 0) {
          parentStack[parentStack.length - 1].children.push(item)
        } else {
          outline.push(item)
        }
        
        if (level < 6) {
          parentStack.push(item)
        }
      })
      
      // 更新大纲数据
      tab.outline = outline
      currentOutline.value = outline
      
      // 清理临时容器
      tempContainer.remove()
    }
    
    // 确保大纲更新
    nextTick(() => {
      if (sidebarRef.value) {
        sidebarRef.value.restoreScrollForSelectedFile()
        // 重置选中状态
        selectedHeading.value = ''
        // 触发一次滚动检查
        checkScroll()
      }
    })
  }
}

const handleCloseTab = (path: string) => {
  const index = openTabs.value.findIndex(tab => tab.path === path)
  if (index !== -1) {
    openTabs.value.splice(index, 1)
    
    // 如果关闭的是当前活动标签，切换到最后一个标签
    if (path === activeTab.value) {
      const lastTab = openTabs.value[openTabs.value.length - 1]
      if (lastTab) {
        activeTab.value = lastTab.path
        loadMarkdownContent(lastTab.path)
      } else {
        // 如果没有标签了，清空内容
        markdownContent.value = ''
        activeTab.value = ''
      }
    }
  }
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

const loadMarkdownContent = async (filePath: string) => {
  try {
    console.log('DG2: 开始加载文件:', filePath)
    currentFileName.value = filePath.split('/').pop() || ''
    const response = await fetch(filePath)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const content = await response.text()
    const cleanPath = filePath.replace(/^\/?(online-typora\/)?docs\//, '').replace(/\\/g, '/')
    currentDir.value = cleanPath.substring(0, cleanPath.lastIndexOf('/'))
    console.log('DG2: 当前文件目录路径处理:', {
      原始路径: filePath,
      清理后路径: cleanPath,
      最终目录: currentDir.value
    })
    const renderedContent = md.render(content)
    markdownContent.value = renderedContent

    // 更新标签页内容
    const tabIndex = openTabs.value.findIndex(tab => tab.path === filePath)
    if (tabIndex !== -1) {
      openTabs.value[tabIndex].content = renderedContent
    }

    // 等待DOM更新后处理大纲
    await nextTick()
    
    // 创建一个临时的内容容器
    const tempContainer = document.createElement('div')
    tempContainer.innerHTML = renderedContent
    
    console.log('DG2: 开始处理大纲数据')
    const headings = tempContainer.querySelectorAll('.markdown-heading')
    headingRefs.value.clear()
    
    console.log('DG2: 找到标题数量:', headings.length)
    
    // 构建层级结构的大纲
    const outline: any[] = []
    const parentStack: any[] = []
    
    // 找到最小的标题级别
    let minLevel = 6
    headings.forEach(heading => {
      const level = parseInt(heading.tagName[1])
      if (level < minLevel) {
        minLevel = level
      }
    })
    
    // 处理标题，限制最多显示三级
    headings.forEach(heading => {
      const id = heading.id
      const text = heading.textContent || ''
      const originalLevel = parseInt(heading.tagName[1])
      
      // 计算相对层级（从1开始）
      const relativeLevel = originalLevel - minLevel + 1
      
      // 如果相对层级超过3，则跳过
      if (relativeLevel > 3) {
        return
      }
      
      console.log('DG2: 处理标题:', { id, text, originalLevel, relativeLevel })
      
      const item = {
        id,
        text,
        level: relativeLevel,
        children: [],
        isExpanded: true
      }
      
      // 重置到正确的层级
      while (parentStack.length > 0 && relativeLevel <= parentStack[parentStack.length - 1].level) {
        parentStack.pop()
      }
      
      if (parentStack.length > 0) {
        // 添加到当前父级的子级
        parentStack[parentStack.length - 1].children.push(item)
      } else {
        // 顶级标题
        outline.push(item)
      }
      
      if (relativeLevel < 3) { // 只有前两级可以作为父级
        parentStack.push(item)
      }
    })
    
    console.log('DG2: 生成大纲数据:', outline)

    // 保存大纲数据到对应的标签页
    if (tabIndex !== -1) {
      openTabs.value[tabIndex].outline = outline
      // 只有当前活动标签才更新 currentOutline
      if (activeTab.value === filePath) {
        currentOutline.value = outline
      }
    }
    
    // 清理临时容器
    tempContainer.remove()
    
    return renderedContent
  } catch (error) {
    console.error('DG2: Error loading markdown file:', error)
    markdownContent.value = '加载文件失败'
    currentFileName.value = ''
    // 清空当前标签页的大纲
    const tabIndex = openTabs.value.findIndex(tab => tab.path === filePath)
    if (tabIndex !== -1) {
      openTabs.value[tabIndex].outline = []
    }
    if (activeTab.value === filePath) {
      currentOutline.value = []
    }
    return '加载文件失败'
  }
}

// 添加滚动检查函数
const checkScroll = () => {
  const mainContent = document.querySelector('.main-content')
  if (!mainContent) return
  
  const scrollTop = mainContent.scrollTop
  showBackToTop.value = scrollTop < lastScrollTop && scrollTop > 100
  lastScrollTop = scrollTop
  
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  
  if (isRestoringScroll.value) {
    console.log('CP001: 正在恢复滚动位置，跳过更新选中标题')
    isRestoringScroll.value = false
    return
  }

  // 如果是用户点击导致的滚动，不更新选中标题
  if (isUserClick.value) {
    console.log('CP001: 用户点击导致的滚动，跳过更新选中标题')
    return
  }
  
  // 添加滚动时更新选中标题的逻辑
  const headings = document.querySelectorAll('.markdown-heading')
  let currentHeading: HTMLElement | null = null
  let minDistance = Infinity
  const viewportTop = mainContent.scrollTop
  const viewportBottom = viewportTop + mainContent.clientHeight
  const scrollOffset = 20 // 减小偏移量，使选中更精确

  console.log('CP001: 开始检查滚动位置', {
    viewportTop,
    viewportBottom,
    scrollOffset,
    headingsCount: headings.length,
    currentSelectedHeading: selectedHeading.value
  })

  // 首先检查当前选中的标题是否还在视口内
  if (selectedHeading.value) {
    const currentSelectedElement = document.getElementById(selectedHeading.value)
    if (currentSelectedElement) {
      const rect = currentSelectedElement.getBoundingClientRect()
      const headingTop = rect.top + mainContent.scrollTop
      const headingBottom = headingTop + rect.height
      
      // 如果当前选中的标题还在视口内，保持选中状态
      if (headingTop <= viewportBottom && headingBottom >= viewportTop) {
        console.log('CP001: 当前选中标题仍在视口内，保持选中状态', {
          id: selectedHeading.value,
          headingTop,
          headingBottom,
          viewportTop,
          viewportBottom
        })
        return
      }
    }
  }

  // 遍历所有标题，找到当前视口中最接近顶部的标题
  headings.forEach((heading: Element) => {
    if (!(heading instanceof HTMLElement)) return
    
    const rect = heading.getBoundingClientRect()
    const headingTop = rect.top + mainContent.scrollTop
    const headingBottom = headingTop + rect.height
    const distance = Math.abs(headingTop - (viewportTop + scrollOffset))
    const headingId = heading.getAttribute('id') || ''
    
    console.log('CP001: 检查标题', {
      id: headingId,
      headingTop,
      headingBottom,
      distance,
      minDistance,
      isInViewport: headingTop <= viewportBottom && headingBottom >= viewportTop,
      rectTop: rect.top,
      scrollTop: mainContent.scrollTop
    })
    
    // 如果标题在视口内或接近视口顶部，且距离更近，则更新当前标题
    if (headingTop <= viewportBottom && headingBottom >= viewportTop && distance < minDistance) {
      minDistance = distance
      currentHeading = heading
      console.log('CP001: 更新当前选中标题', {
        id: headingId,
        distance,
        rectTop: rect.top,
        scrollTop: mainContent.scrollTop
      })
    }
  })

  // 更新选中的标题
  if (currentHeading) {
    const newHeadingId = currentHeading.getAttribute('id') || ''
    if (selectedHeading.value !== newHeadingId) {
      console.log('CP001: 设置新的选中标题', {
        oldId: selectedHeading.value,
        newId: newHeadingId,
        rectTop: currentHeading.getBoundingClientRect().top,
        scrollTop: mainContent.scrollTop
      })
      selectedHeading.value = newHeadingId
      
      // 确保 Sidebar 组件收到更新
      nextTick(() => {
        if (sidebarRef.value) {
          console.log('CP001: 通知 Sidebar 更新选中标题', newHeadingId)
          sidebarRef.value.updateSelectedHeading(newHeadingId)
        }
      })
    }
  }
  
  scrollTimeout = window.setTimeout(() => {
    if (activeTab.value) {
      const storedPositions = localStorage.getItem('documentScrollPositions')
      let positions: Record<string, number> = {}
      if (storedPositions) {
        positions = JSON.parse(storedPositions)
      }
      positions[activeTab.value] = scrollTop
      localStorage.setItem('documentScrollPositions', JSON.stringify(positions))
    }
  }, 500)
}

// 添加节流函数
const throttle = (fn: Function, delay: number) => {
  let lastCall = 0
  return function (...args: any[]) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      return fn(...args)
    }
  }
}

// 在组件挂载时添加滚动监听
onMounted(() => {
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    // 使用节流函数包装 checkScroll
    const throttledCheckScroll = throttle(checkScroll, 100)
    mainContent.addEventListener('scroll', throttledCheckScroll)
    
    // 初始检查一次
    nextTick(() => {
      checkScroll()
    })
  }
})

// 在组件卸载时移除滚动监听
onUnmounted(() => {
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.removeEventListener('scroll', checkScroll)
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
})
</script>

<template>
  <div class="app-container">
    <div class="main-layout">
      <div class="sidebar-container" :style="{ width: (sidebarWidth + 48) + 'px' }">
        <Sidebar 
          ref="sidebarRef"
          @file-select="handleFileSelect" 
          :outline="currentOutline"
          @scroll-to-heading="scrollToHeading"
          :sidebar-width="sidebarWidth"
          :selected-file="activeTab"
        />
      </div>
      <div 
        class="resize-handle" 
        @mousedown="startResize"
      ></div>
      <div class="content-container">
        <TabBar 
          :tabs="openTabs"
          :activeTab="activeTab"
          @switch-tab="handleSwitchTab"
          @close-tab="handleCloseTab"
        />
        <div class="main-content">
          <keep-alive>
            <div 
              v-for="tab in openTabs" 
              :key="tab.path"
              class="content"
              :class="{ 'active': activeTab === tab.path }"
              v-show="activeTab === tab.path"
            >
              <div class="markdown-content" v-html="tab.content" :key="tab.path"></div>
            </div>
          </keep-alive>
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
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 允许输入框和文本区域选中 */
input, textarea {
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
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

.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
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
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.2s;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  position: relative;
  z-index: 10;
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
  position: relative;
}

.markdown-content {
  padding: 0 20px;
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
  padding-right: 8px;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f3f4f6;
  border-radius: 6px;
  margin: 4px 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  min-height: 0;
  height: auto !important;
  min-width: 0;
}

.markdown-content pre .code-content-wrapper {
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  min-width: 0;
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
  line-height: 1.45;
  font-family: "SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;
  padding-left: 32px;
  padding-right: 8px;
  z-index: 1;
  flex-shrink: 0;
  background-color: transparent;
  min-width: fit-content;
  max-width: none;
}

.markdown-content pre code::before {
  content: attr(data-line-numbers);
  position: absolute;
  left: 0;
  top: 0;
  width: 30px;
  height: 100%;
  padding: 0 6px 0 2px;
  color: #999;
  font-size: 100%;
  line-height: 1.45;
  text-align: right;
  white-space: pre !important;
  overflow: visible;
  user-select: none;
  pointer-events: none;
  font-family: "SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;
  box-sizing: border-box;
  background-color: #f0f0f0;
  border-right: 1px solid #eee;
  display: block;
}

/* 隐藏代码样式 */
.markdown-content pre .hidden-code {
  margin: 0;
  padding: 0;
  border-top: none;
  display: none;
  flex-shrink: 0;
  min-height: 0;
  position: relative;
  background-color: #f3f4f6;
  line-height: 0;
  width: 100%;
}

.markdown-content pre .hidden-code code {
  margin: 0;
  padding: 0 8px 0 32px;
  border: none;
  flex-shrink: 0;
  background-color: transparent;
  position: relative;
  line-height: 1.45;
  display: block;
  white-space: pre;
  font-family: "SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;
  min-width: fit-content;
}

.markdown-content pre .hidden-code code::before {
  content: attr(data-line-numbers);
  position: absolute;
  left: 0;
  top: 0;
  width: 30px;
  height: 100%;
  padding: 0 6px 0 2px;
  color: #999;
  font-size: 100%;
  line-height: 1.45;
  text-align: right;
  white-space: pre !important;
  overflow: visible;
  user-select: none;
  pointer-events: none;
  font-family: "SFMono-Regular",Consolas,"Liberation Mono",Menlo,monospace;
  box-sizing: border-box;
  background-color: #f0f0f0;
  border-right: 1px solid #eee;
  display: block;
}

/* 确保换行模式下行号正确显示 */
.markdown-content pre code[style*="white-space: pre-wrap"]::before,
.markdown-content pre .hidden-code code[style*="white-space: pre-wrap"]::before {
  white-space: pre !important;
  height: auto;
  min-height: 100%;
}

/* 修改代码块容器样式 */
.code-block {
  width: 100% !important;
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: visible;
  min-width: 0;
}

/* 自定义横向滚动条样式 */
.markdown-content pre .code-content-wrapper::-webkit-scrollbar {
  height: 6px;
  background-color: transparent;
  display: block !important;
}

.markdown-content pre .code-content-wrapper::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 0;
  display: block !important;
}

.markdown-content pre .code-content-wrapper::-webkit-scrollbar-track {
  background-color: transparent;
  display: block !important;
}

/* 主内容区域滚动条样式 */
.main-content::-webkit-scrollbar {
  width: 6px;
  background-color: transparent;
}

.main-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 0;
}

.main-content::-webkit-scrollbar-track {
  background-color: transparent;
}

/* 确保在不换行模式下也显示滚动条 */
.markdown-content pre .code-content-wrapper {
  overflow-x: auto !important;
  -webkit-overflow-scrolling: touch;
}

/* 确保代码内容不会被截断 */
.markdown-content pre code[style*="white-space: pre"] {
  overflow: visible;
  text-overflow: initial;
}

/* 只在鼠标悬浮时显示横向滚动条 */
.markdown-content pre:hover .code-content-wrapper::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
}

.markdown-content pre:not(:hover) .code-content-wrapper::-webkit-scrollbar-thumb {
  background-color: transparent;
}

.markdown-content pre .lang-tag {
  position: absolute;
  top: 0;
  right: 0;
  padding: 2px 8px;
  font-size: 12px;
  color: #4b5563;
  background-color: #ffffff;
  border-bottom-left-radius: 3px;
  border-left: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  opacity: 1;
  transition: opacity 0.2s ease;
  z-index: 9999;
  box-shadow: -2px 2px 4px rgba(0, 0, 0, 0.05);
}

.markdown-content pre:hover .lang-tag {
  opacity: 0;
  pointer-events: none;
}

/* 复制、换行和展开按钮样式 */
.markdown-content pre .copy-button,
.markdown-content pre .wrap-button,
.markdown-content pre .expand-button {
  position: absolute;
  top: 8px;
  width: 24px;
  height: 24px;
  padding: 0;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s, background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  z-index: 3;
  border-radius: 3px;
}

.markdown-content pre .copy-button:hover,
.markdown-content pre .wrap-button:hover,
.markdown-content pre .expand-button:hover {
  background-color: #f9fafb;
}

.markdown-content pre .copy-button {
  right: 8px;
}

.markdown-content pre .wrap-button {
  right: 40px;
}

.markdown-content pre .expand-button {
  right: 72px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.markdown-content pre .expand-button img {
  transition: transform 0.3s ease;
}

.markdown-content pre:hover .copy-button,
.markdown-content pre:hover .wrap-button,
.markdown-content pre:hover .expand-button {
  opacity: 1;
}

/* 展开提示样式 */
.markdown-content pre .code-expand-tip {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, rgba(243, 244, 246, 0) 0%, rgba(243, 244, 246, 0.9) 40%, rgba(243, 244, 246, 1) 100%);
  padding: 30px 0 8px 32px;
  margin: 0;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: flex-end;
  z-index: 2;
}

.markdown-content pre .code-expand-tip:hover {
  color: #1890ff;
}

/* 语言标签位置调整 */
.markdown-content pre::before {
  right: 0;
  z-index: 1;
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

/* 文件名显示样式 */
.file-name-display {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1000;
  backdrop-filter: blur(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: opacity 0.3s ease;
  opacity: 0.8;
}

.file-name-display:hover {
  opacity: 1;
}

/* 确保文件名显示在滚动条之上 */
.main-content {
  position: relative;
}
</style>
