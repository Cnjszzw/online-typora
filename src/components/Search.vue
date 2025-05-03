<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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

const emit = defineEmits<{
  (e: 'exit-search'): void
}>()

const searchQuery = ref('')
const searchResults = ref<SearchResult[]>([])
const isSearchMode = ref(false)
const isLoading = ref(false)
const index = ref<any>(null)
const documents = ref<Map<string, DocumentData>>(new Map())

// 创建搜索索引
onMounted(async () => {
  console.log('初始化搜索索引...')
  // 创建索引实例
  index.value = new Document({
    document: {
      id: 'id',
      index: ['content', 'fileName']
    }
  })
  
  await buildIndex()
})

// 构建索引
const buildIndex = async () => {
  try {
    isLoading.value = true
    const isDev = import.meta.env.DEV
    const url = isDev ? '/online-typora/api/docs/list' : '/online-typora/docs-list.json'
    console.log('开始获取文件列表:', url)
    
    const response = await fetch(url)
    const files = await response.json()
    console.log('获取到文件列表:', files.length, '个文件')
    
    // 清空现有数据
    documents.value.clear()
    
    // 遍历所有文件构建索引
    for (const file of files) {
      if (!file.children) { // 只索引文件，不索引文件夹
        console.log('正在索引文件:', file.path)
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
    console.log('获取文件内容:', file.path)
    const response = await fetch(file.path)
    const content = await response.text()
    
    const doc = {
      id: file.path,
      fileName: file.name,
      content: content
    }
    
    console.log('添加文件到索引:', file.name)
    index.value?.add(doc)
    documents.value.set(file.path, doc)
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
  
  isSearchMode.value = true
  isLoading.value = true
  
  try {
    console.log('开始搜索:', searchQuery.value)
    const results = await index.value.search(searchQuery.value)
    console.log('搜索结果:', results)
    
    // 处理搜索结果
    const processedResults: SearchResult[] = []
    
    for (const result of results) {
      const field = result.field
      const matches = result.result
      
      for (const id of matches) {
        const doc = documents.value.get(id)
        if (doc) {
          console.log('处理文档:', doc.fileName)
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
    
    searchResults.value = processedResults
    console.log('处理后的搜索结果:', processedResults)
  } catch (error) {
    console.error('搜索时发生错误:', error)
  } finally {
    isLoading.value = false
  }
}

// 在文本中查找匹配项并获取上下文
const findMatches = (content: string, query: string) => {
  if (!content || !query) {
    console.log('findMatches: 内容或查询为空')
    return []
  }
  
  console.log('查找匹配项, 内容长度:', content.length, '查询:', query)
  const matches = []
  const lines = content.split('\n')
  const queryRegex = new RegExp(query, 'gi')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (queryRegex.test(line)) {
      // 获取匹配位置
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
  
  console.log('找到匹配项数量:', matches.length)
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
  return parts.join('/')
}
</script>

<template>
  <div class="search-container">
    <div class="search-header">
      <button class="back-button" @click="exitSearch">
        <img src="/back.svg" alt="返回" />
      </button>
      <div class="search-input-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="查找/搜索"
          @keyup.enter="handleSearch"
        />
      </div>
    </div>
    
    <div v-if="isLoading" class="loading">
      正在加载...
    </div>
    
    <div v-else class="search-results">
      <div v-for="result in visibleMatches" :key="result.filePath" class="result-item">
        <div class="result-header">
          <div class="result-info">
            <strong>{{ result.fileName }}</strong>
            <span class="result-path">{{ getParentPath(result.filePath) }}</span>
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
          <div v-for="(match, index) in result.matches" :key="index" class="match-item">
            <div class="match-content" v-html="highlightMatch(match.content, searchQuery)"></div>
          </div>
          <div v-if="!result.isExpanded && result.matches.length > 3" class="show-more">
            <button @click="toggleExpand(result)">展示更多结果</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--background-color);
  font-size: 14px;
}

.search-header {
  display: flex;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid var(--border-color);
}

.back-button {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  margin-right: 8px;
}

.back-button img {
  width: 20px;
  height: 20px;
}

.search-input-container {
  flex: 1;
}

.search-input-container input {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--background-color);
  color: var(--text-color);
  font-size: 14px;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.result-item {
  margin-bottom: 16px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--background-color-light);
  border-bottom: 1px solid var(--border-color);
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-path {
  color: var(--text-color-light);
}

.match-count {
  background: var(--background-color-dark);
  color: var(--text-color-light);
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 20px;
  text-align: center;
}

.toggle-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  height: 20px;
}

.toggle-button img {
  width: 16px;
  height: 16px;
  transition: transform 0.2s;
}

.toggle-button img.expanded {
  transform: rotate(90deg);
}

.matches {
  padding: 8px 12px;
}

.match-item {
  padding: 4px 0;
}

.match-content {
  font-family: inherit;
  overflow-wrap: break-word;
  word-break: break-all;
  line-height: 1.5;
}

.match-content :deep(.highlight) {
  background: var(--highlight-color);
  padding: 2px;
  border-radius: 2px;
}

.show-more {
  text-align: left;
  margin-top: 8px;
}

.show-more button {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  text-decoration: underline;
  font-size: 14px;
  padding: 0;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: var(--text-color-light);
}
</style> 