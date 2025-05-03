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
  // 创建索引实例
  index.value = new Document({
    document: {
      id: 'id',
      index: ['content', 'fileName']
    },
    encode: (str: string) => str.split(/\s+/).filter(Boolean)
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
    const url = isDev ? '/online-typora/api/docs/list' : '/online-typora/docs-list.json'
    
    const response = await fetch(url)
    const files = await response.json()
    
    // 清空现有数据
    documents.value.clear()
    
    // 遍历所有文件构建索引
    for (const file of files) {
      if (!file.children) { // 只索引文件，不索引文件夹
        await indexFile(file)
      }
    }
  } catch (error) {
    console.error('构建索引时发生错误:', error)
  } finally {
    isLoading.value = false
  }
}

// 为单个文件建立索引
const indexFile = async (file: any) => {
  try {
    const response = await fetch(file.path)
    const content = await response.text()
    
    const docData: DocumentData = {
      fileName: file.name,
      filePath: file.path,
      content: content
    }
    
    const indexDoc: IndexDocument = {
      id: file.path,
      fileName: file.name,
      content: content
    }
    
    index.value?.add(indexDoc)
    documents.value.set(file.path, docData)
  } catch (error) {
    console.error(`索引文件 ${file.path} 时发生错误:`, error)
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
  
  try {
    const results = await index.value.search(searchQuery.value)
    
    // 处理搜索结果
    const processedResults: SearchResult[] = []
    
    for (const result of results) {
      const matches = result.result
      
      for (const id of matches) {
        const doc = documents.value.get(id)
        if (doc) {
          const textMatches = findMatches(doc.content, searchQuery.value)
          
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
    
    // 按匹配数量排序
    searchResults.value = processedResults.sort((a, b) => b.totalMatches - a.totalMatches)
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
  const queryRegex = new RegExp(query, 'gi')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (queryRegex.test(line)) {
      queryRegex.lastIndex = 0 // 重置 lastIndex
      const match = queryRegex.exec(line)
      if (match) {
        const start = Math.max(match.index - 30, 0)
        const end = Math.min(match.index + query.length + 30, line.length)
        let snippet = line.substring(start, end)
        
        // 添加省略号
        if (start > 0) snippet = '...' + snippet
        if (end < line.length) snippet = snippet + '...'
        
        matches.push({
          content: snippet,
          lineNumber: i + 1
        })
      }
    }
  }
  
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
  const regex = new RegExp(`(${query})`, 'gi')
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
  <div class="search-container">
    <div class="search-header">
      <button class="back-button" @click="exitSearch">
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
  position: absolute;
  top: 0;
  left: 0;
  width: 300px;
  height: 100vh;
  background: var(--background-color);
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
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
}

.search-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--border-color);
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
}

.back-button img {
  width: 24px;
  height: 24px;
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
  font-size: 14px;
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
  border-top: 1px solid var(--border-color);
}

.result-item {
  border-bottom: 1px solid var(--border-color);
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  position: relative; /* 添加相对定位 */
}

.result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 16px;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
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
}

.result-actions {
  position: absolute; /* 修改为绝对定位 */
  top: 5px; /* 固定在顶部 */
  right: 12px; /* 右对齐 */
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
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
  padding: 0 12px 8px 12px;
}

.match-item {
  padding: 0px 0px 6px 0px;
}

.match-content {
  font-size: 16px;
  color: var(--text-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
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
</style> 