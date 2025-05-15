<script lang="ts" setup>
console.log('LLog: App.vue setup loaded')
import { ref, onMounted, watch, nextTick } from 'vue'
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
const currentFileName = ref('') // 添加当前文件名状态
const openTabs = ref<{ name: string; path: string }[]>([])
const activeTab = ref('')
const sidebarRef = ref()
const loading = ref(false)

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
    loading.value = true
    await nextTick()
    if (sidebarRef.value && typeof sidebarRef.value.restoreScrollForSelectedFile === 'function') {
      sidebarRef.value.restoreScrollForSelectedFile()
    }
    setTimeout(() => {
      loading.value = false
    }, 0)
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

const loadMarkdownContent = async (filePath: string) => {
  try {
    console.log('开始加载文件:', filePath)
    // 从文件路径中提取文件名
    currentFileName.value = filePath.split('/').pop() || ''
    
    const response = await fetch(filePath)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const content = await response.text()
    
    // 获取当前文件的目录路径
    // 1. 移除开头的 /online-typora/docs/ 或 /docs/
    const cleanPath = filePath.replace(/^\/?(online-typora\/)?docs\//, '')
                             .replace(/\\/g, '/') // 统一使用正斜杠
    // 2. 获取目录部分
    currentDir.value = cleanPath.substring(0, cleanPath.lastIndexOf('/'))
    
    console.log('当前文件目录路径处理:', {
      原始路径: filePath,
      清理后路径: cleanPath,
      最终目录: currentDir.value
    })
    
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
    currentFileName.value = '' // 加载失败时清空文件名
  }
}

// 移除大纲变化的监听
// watch(() => currentOutline.value, (newOutline) => {
//   console.log('大纲数据更新:', newOutline)
// }, { deep: true })

const handleFileSelect = (filePath: string) => {
  console.log('LLog: App handleFileSelect', filePath)
  // 统一路径分隔符并提取文件名
  const normalizedPath = filePath.replace(/\\/g, '/')
  const fileName = normalizedPath.split('/').pop() || ''
  
  console.log('文件选择:', {
    原始路径: filePath,
    标准化路径: normalizedPath,
    提取文件名: fileName
  })
  
  // 检查标签是否已经存在
  const existingTab = openTabs.value.find(tab => tab.path === filePath)
  if (!existingTab) {
    // 如果标签不存在，添加新标签
    openTabs.value.push({
      name: fileName,  // 只使用文件名
      path: filePath   // 保留完整路径用于加载文件
    })
    console.log('添加新标签:', {
      文件名: fileName,
      完整路径: filePath,
      当前标签数: openTabs.value.length
    })
  }
  
  // 设置当前活动标签
  activeTab.value = filePath
  
  // 加载文件内容
  loadMarkdownContent(filePath)
}

const handleSwitchTab = (path: string) => {
  console.log('LLog: App handleSwitchTab', path)
  activeTab.value = path
  loadMarkdownContent(path)
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
        <div class="main-content" :key="activeTab">
          <div v-if="!loading" class="markdown-content" v-html="markdownContent"></div>
          <div v-else class="loading-mask"></div>
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
  width: 12px;
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

.loading-mask {
  width: 100%;
  height: 100%;
  background: #fff;
}
</style>
