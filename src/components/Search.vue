<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { Document } from 'flexsearch'

interface SearchResult {
  fileName: string;
  filePath: string;
  matches: {
    content: string;
    lineNumber: number;
  }[];
  totalMatches: number;
  isExpanded: boolean;
}

interface DocumentData {
  fileName: string;
  filePath: string;
  content: string;
}

interface IndexDocument {
  id: string;
  content: string;
  fileName: string;
}

const props = defineProps<{
  sidebarWidth?: number
}>()

const emit = defineEmits<{
  (e: 'exit-search'): void
}>()

const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const isSearchMode = ref(false)
const isLoading = ref(false)
const index = ref<any>(null)
const documents = ref<Map<string, DocumentData>>(new Map())
const searchInput = ref<HTMLInputElement | null>(null)

// 创建搜索索引
onMounted(async () => {
  console.log('初始化搜索索引...')
  // 创建索引实例，优化索引配置
  index.value = new Document({
    document: {
      id: 'id',
      index: ['content', 'fileName'],
      store: true
    },
    tokenize: 'forward',
    optimize: true,
    resolution: 9,
    minlength: 2,
    context: true
  })
  
  await buildIndex()
  
  // 自动聚焦搜索框
  nextTick(() => {
    if (searchInput.value) {
      searchInput.value.focus()
    }
  })
})

// 构建索引
const buildIndex = async () => {
  try {
    isLoading.value = true
    const isDev = import.meta.env.DEV
    
    // 修复API路径
    const listUrl = isDev 
      ? '/api/docs/list'  // 开发环境API
      : '/online-typora/docs-list.json' // 生产环境路径
    
    console.log('开始获取文件列表:', listUrl)
    const response = await fetch(listUrl)
    if (!response.ok) {
      throw new Error(`获取文件列表失败: ${response.status} ${response.statusText}`)
    }
    const files = await response.json()
    console.log('获取到文件列表:', files)
    
    // 清空现有数据
    documents.value.clear()
    
    // 遍历所有文件构建索引
    const processFile = async (file: any) => {
      if (file.children) {
        console.log('处理文件夹:', file.name)
        for (const child of file.children) {
          await processFile(child)
        }
      } else {
        console.log('准备索引文件:', file)
        // 根据环境构造正确的文件路径
        const filePath = isDev
          ? `/api/docs/content?path=${encodeURIComponent(file.path)}`  // 开发环境API
          : `/online-typora${file.path}`  // 生产环境路径
        
        try {
          await indexFile({...file, path: filePath})
        } catch (error) {
          // 如果开发环境API失败，尝试直接读取文件
          if (isDev) {
            console.log('开发环境API失败，尝试直接读取文件:', file.path)
            await indexFile({...file, path: `/docs/${file.path}`})
          } else {
            throw error
          }
        }
      }
    }

    // 开始处理所有文件
    console.log('开始处理所有文件...')
    for (const file of files) {
      await processFile(file)
    }
    console.log('索引构建完成，总文档数:', documents.value.size)
    
  } catch (error) {
    console.error('构建索引时发生错误:', error)
  } finally {
    isLoading.value = false
  }
}

// 为单个文件建立索引
const indexFile = async (file: any) => {
  try {
    console.log(`开始获取文件内容: ${file.path}`)
    const response = await fetch(file.path)
    if (!response.ok) {
      throw new Error(`获取文件内容失败: ${response.status} ${response.statusText}`)
    }
    const content = await response.text()
    
    // 检查内容是否为 HTML 或空
    if (!content.trim()) {
      console.error(`文件 ${file.name} 内容为空`)
      return
    }
    if (content.trim().toLowerCase().startsWith('<!doctype html')) {
      throw new Error('返回了HTML而不是Markdown内容')
    }
    
    console.log(`正在索引文件: ${file.name}, 内容长度: ${content.length}`)
    console.log(`文件内容预览: ${content.substring(0, 200)}...`) // 增加预览长度
    
    // 预处理内容，保留更多有意义的字符
    const processedContent = content
      .replace(/[^\w\s\u4e00-\u9fa5\-\[\]]/g, ' ')  // 保留中文字符、字母、数字、空格、连字符和方括号
      .replace(/\s+/g, ' ')
      .trim()
    
    // 如果处理后的内容为空，跳过索引
    if (!processedContent.trim()) {
      console.error(`文件 ${file.name} 处理后的内容为空`)
      return
    }
    
    const docData: DocumentData = {
      fileName: file.name,
      filePath: file.path,
      content: content  // 保存原始内容用于展示
    }
    
    const indexDoc: IndexDocument = {
      id: file.path,
      fileName: file.name,
      content: processedContent  // 使用处理后的内容用于索引
    }
    
    console.log(`添加文档到索引: ${file.name}, 处理后内容预览: ${processedContent.substring(0, 200)}...`)
    index.value?.add(indexDoc)
    documents.value.set(file.path, docData)
    console.log(`成功索引文件: ${file.name}`)
  } catch (error) {
    console.error(`索引文件 ${file.path} 时发生错误:`, error)
    throw error  // 重新抛出错误以便上层处理
  }
}

const visibleMatches = computed(() => {
  return searchResults.value.map(result => ({
    ...result,
    matches: result.isExpanded ? result.matches : result.matches.slice(0, 3)
  }))
})

// 处理搜索
const handleSearch = async () => {
  if (!searchQuery.value.trim() || !index.value) return
  
  isLoading.value = true
  console.log(`开始搜索关键词: "${searchQuery.value}"`)
  
  try {
    const searchStart = performance.now()
    // 修改搜索选项
    const results = await index.value.search(searchQuery.value, {
      enrich: true,
      suggest: true,
      prefix: true,
      fuzzy: 0.2,
      boost: {
        content: 2,
        fileName: 1
      }
    })
    const searchEnd = performance.now()
    console.log(`搜索耗时: ${(searchEnd - searchStart).toFixed(2)}ms`)
    console.log('原始搜索结果:', results)
    
    // 处理搜索结果
    const processedResults: SearchResult[] = []
    
    if (results.length > 0) {
      console.log('处理搜索结果:', results)
      for (const result of results) {
        console.log('处理单个结果:', result)
        // 获取所有匹配的文档
        const matchedDocs = result.result
        console.log('匹配的文档:', matchedDocs)
        
        for (const matchedDoc of matchedDocs) {
          // 从匹配结果中获取文档ID和内容
          const id = matchedDoc.id
          const doc = documents.value.get(id)
          
          if (doc) {
            console.log('处理文档:', doc.fileName)
            const textMatches = findMatches(doc.content, searchQuery.value)
            console.log(`文档 ${doc.fileName} 找到 ${textMatches.length} 处匹配:`, textMatches)
            
            if (textMatches.length > 0) {
              // 检查是否已经添加过这个文档
              const existingResult = processedResults.find(r => r.filePath === id)
              if (existingResult) {
                // 合并匹配结果
                existingResult.matches = [...existingResult.matches, ...textMatches]
                existingResult.totalMatches = existingResult.matches.length
              } else {
                // 添加新的搜索结果
                processedResults.push({
                  fileName: doc.fileName,
                  filePath: id,
                  matches: textMatches,
                  totalMatches: textMatches.length,
                  isExpanded: false
                })
              }
            }
          }
        }
      }
    }
    
    // 按匹配数量排序
    searchResults.value = processedResults.sort((a, b) => b.totalMatches - a.totalMatches)
    console.log(`最终处理完成，共找到 ${searchResults.value.length} 个文档匹配，结果:`, searchResults.value)
  } catch (error) {
    console.error('搜索时发生错误:', error)
  } finally {
    isLoading.value = false
  }
}

// 在文本中查找匹配项并获取上下文
const findMatches = (content: string, query: string) => {
  if (!content || !query) return []
  
  const matches = []
  const lines = content.split('\n')
  // 优化正则表达式，支持中文搜索
  const queryRegex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line && queryRegex.test(line)) {
      queryRegex.lastIndex = 0 // 重置 lastIndex
      let match
      while ((match = queryRegex.exec(line)) !== null) {
        const start = Math.max(match.index - 30, 0)
        const end = Math.min(match.index + query.length + 30, line.length)
        let snippet = line.substring(start, end).trim()
        
        // 添加省略号
        if (start > 0) snippet = '...' + snippet
        if (end < line.length) snippet = snippet + '...'
        
        // 只有当片段中确实包含搜索词时才添加匹配
        if (snippet.toLowerCase().includes(query.toLowerCase())) {
          matches.push({
            content: snippet,
            lineNumber: i + 1
          })
        }
      }
    }
  }
  
  console.log(`findMatches 找到 ${matches.length} 处匹配:`, matches)
  return matches
}

const toggleExpand = (result: SearchResult) => {
  result.isExpanded = !result.isExpanded
}

const exitSearch = () => {
  isSearchMode.value = false
  searchQuery.value = ''
  searchResults.value = []
  emit('exit-search')
}

// 高亮匹配文本
const highlightMatch = (text: string, query: string) => {
  if (!query) return text
  const regex = new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<span class="highlight">$1</span>')
}

// 获取父路径（不包含文件名）
const getParentPath = (filePath: string) => {
  const parts = filePath.split('/')
  parts.pop() // 移除文件名
  const parentPath = parts.join('/')
  // 确保路径末尾始终有一个 '/'
  return parentPath.endsWith('/') ? parentPath : `${parentPath}/`
}

// 获取文件名（不含扩展名）
const getFileNameWithoutExt = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf('.')
  return lastDotIndex > -1 ? fileName.slice(0, lastDotIndex) : fileName
}

// 获取文件扩展名（包含点号）
const getFileExt = (fileName: string) => {
  const lastDotIndex = fileName.lastIndexOf('.')
  return lastDotIndex > -1 ? fileName.slice(lastDotIndex) : ''
}
</script>

<template>
  <div class="search-container" :style="{ width: (props.sidebarWidth || 300) + 'px' }">
    <div class="search-header">
      <button class="back-button" @click="exitSearch" title="返回文件列表">
        <img src="/back.svg" alt="返回" />
      </button>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索文档..."
        @keyup.enter="handleSearch"
        class="search-input"
        ref="searchInput"
        autofocus
      />
    </div>
    
    <div v-if="isLoading" class="loading">
      正在搜索...
    </div>
    
    <div v-else-if="searchResults.length === 0 && searchQuery" class="loading">
      未找到匹配的结果
    </div>
    
    <div v-else class="search-results">
      <div v-for="result in visibleMatches" :key="result.filePath" class="result-item">
        <div class="result-header">
          <div class="result-info">
            <div class="file-name">
              <strong>{{ getFileNameWithoutExt(result.fileName) }}</strong>{{ getFileExt(result.fileName) }}
            </div>
            <div class="result-path">{{ getParentPath(result.filePath) }}</div>
          </div>
          <div class="result-actions">
            <span class="match-count">{{ result.totalMatches }}</span>
            <button class="toggle-button" @click="toggleExpand(result)">
              <img
                src="/arrow-next-small-svgrepo-com.svg"
                :class="{ expanded: result.isExpanded }"
                alt="展开/收起"
              />
            </button>
          </div>
        </div>
        
        <div class="matches">
          <div v-for="(match, index) in (result.isExpanded ? result.matches : result.matches.slice(0, 3))" 
               :key="index" 
               class="match-item">
            <div class="match-content" v-html="highlightMatch(match.content, searchQuery)"></div>
          </div>
          <div v-if="!result.isExpanded && result.matches.length > 3" class="show-more">
            <button @click="toggleExpand(result)">显示全部 {{ result.matches.length }} 处匹配</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  position: relative;
  top: 0;
  left: 0;
  height: 100%;
  background: var(--background-color);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  will-change: width;
  transform: translateZ(0);
}

.search-header {
  flex: 0 0 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: var(--background-color);
  position: relative;
  z-index: 2;
  border-bottom: 1px solid #ccc !important;
  will-change: transform;
  transform: translateZ(0);
}

.back-button {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  cursor: pointer;
  outline: none !important;
}

.back-button:focus {
  outline: none !important;
  box-shadow: none !important;
}

.back-button img {
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.search-input {
  flex: 1;
  height: 32px;
  margin-left: 8px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-color);
  color: var(--text-color);
  font-size: 16px;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

.search-input:focus {
  outline: none;
  border-color: var(--border-color);
}

.search-input::placeholder {
  color: var(--text-color-light);
  opacity: 0.7;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  border-top: 1px solid var(--border-color);
  will-change: transform;
  transform: translateZ(0);
}

.result-item {
  border-bottom: 1px solid #ccc !important;
  will-change: transform;
  transform: translateZ(0);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  position: relative;
  will-change: transform;
  transform: translateZ(0);
}

.result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  will-change: transform;
  transform: translateZ(0);
}

.file-name {
  font-size: 16px;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  will-change: transform;
  transform: translateZ(0);
}

.file-name strong {
  font-weight: 900;
}

.result-path {
  font-size: 12px;
  color: var(--text-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  will-change: transform;
  transform: translateZ(0);
}

.result-actions {
  position: absolute; /* 修改为绝对定位 */
  top: 5px; /* 固定在顶部 */
  right: 12px; /* 右对齐 */
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  will-change: transform;
  transform: translateZ(0);
}

.match-count {
  font-size: 12px;
  color: var(--text-color-light);
  padding: 2px 6px;
  background: var(--background-color-dark);
  border-radius: 4px;
  min-width: 24px;
  text-align: center;
  box-sizing: border-box;
  background-color: #f0f0f0;
  border-right: 1px solid #eee;
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
}

.toggle-button {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.toggle-button img {
  width: 12px;
  height: 12px;
  transition: transform 0.2s;
}

.toggle-button img.expanded {
  transform: rotate(90deg);
}

.matches {
  padding: 0 12px;
  will-change: transform;
  transform: translateZ(0);
}

.match-item {
  padding: 4px 0;
  will-change: transform;
  transform: translateZ(0);
}

.match-content {
  font-size: 14px;
  color: var(--text-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  will-change: transform;
  transform: translateZ(0);
}

.match-content :deep(.highlight) {
  background: var(--highlight-color);
  color: var(--text-color);
  padding: 0px 0px;
  border-radius: 2px;
  font-weight: 500;
}

.show-more {
  padding: 4px 0 0 0;
}

.show-more button {
  font-size: 12px;
  color: var(--primary-color);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color-light);
  font-size: 14px;
}

/* 修改过渡动画 */
.search-container {
  transition: width 0s linear;
}

/* 修改滚动条样式 */
.search-results::-webkit-scrollbar {
  width: 6px;
}

.search-results::-webkit-scrollbar-track {
  background: transparent;
}

.search-results::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.search-results::-webkit-scrollbar-thumb:hover {
  background: #999;
}

/* 添加性能优化相关的样式 */
* {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
}
</style> 