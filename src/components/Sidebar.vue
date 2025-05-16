<template>
  <div class="sidebar">
    <div class="sidebar-content">
      <SidebarToolbar 
        :initial-tab="activeTab"
        @tab-change="handleTabChange"
      />
      <div class="sidebar-main">
        <Search v-if="activeTab === 'search'" @exit-search="handleExitSearch" :sidebar-width="props.sidebarWidth" />
        
        <div v-else-if="activeTab === 'files'" class="file-tree">
          <FileTreeItem
            v-for="file in fileTree"
            :key="file.path"
            :file="file"
            :selected-file="selectedFile"
            :is-top-level="true"
            @file-select="handleFileSelect"
          />
        </div>
        
        <div v-else class="outline">
          <template v-if="outline.length > 0">
            <OutlineTreeItem
              :outline="outline"
              :selected-heading="selectedHeading"
              @heading-click="handleHeadingClick"
              @toggle-item="toggleOutlineItem"
            />
          </template>
          <div v-else class="empty-outline">
            当前文件没有大纲
          </div>
        </div>
      </div>
    </div>

    <!-- 添加返回顶部按钮 -->
    <div 
      class="back-to-top" 
      :class="{ 'show': showBackToTop }"
      @click="scrollToTop"
    >
      <img src="/back-to-top.svg" alt="back to top" />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue'
import Search from './Search.vue'
import FileTreeItem from './FileTreeItem.vue'
import OutlineTreeItem from './OutlineTreeItem.vue'
import SidebarToolbar from './SidebarToolbar.vue'

interface FileNode {
  name: string
  path: string
  children?: FileNode[]
  isExpanded?: boolean
}

interface OutlineItem {
  id: string
  text: string
  level: number
  children?: OutlineItem[]
  isExpanded?: boolean
}

const props = defineProps<{
  outline: OutlineItem[]
  sidebarWidth?: number
  selectedFile: string
}>()

const emit = defineEmits<{
  (e: 'file-select', path: string): void
  (e: 'scroll-to-heading', id: string): void
}>()

const activeTab = ref('files')
const fileTree = ref<FileNode[]>([])
const selectedHeading = ref<string>('')
const showBackToTop = ref(false)
const isRestoringScroll = ref(false)
let lastScrollTop = 0
let scrollTimeout: number | null = null
let isResetting = false

// 获取存储的文档位置
const getStoredScrollPosition = (filePath: string): number => {
  const storedPositions = localStorage.getItem('documentScrollPositions')
  if (storedPositions) {
    const positions = JSON.parse(storedPositions)
    return positions[filePath] || 0
  }
  return 0
}

// 保存文档位置
const saveScrollPosition = (filePath: string, position: number) => {
  const storedPositions = localStorage.getItem('documentScrollPositions')
  let positions: Record<string, number> = {}
  if (storedPositions) {
    positions = JSON.parse(storedPositions)
  }
  positions[filePath] = position
  localStorage.setItem('documentScrollPositions', JSON.stringify(positions))
}

const handleFileSelect = (path: string) => {
  if (props.selectedFile) {
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      saveScrollPosition(props.selectedFile, mainContent.scrollTop)
      mainContent.scrollTop = 0
    }
  }
  emit('file-select', path)
}

const handleHeadingClick = (id: string) => {
  console.log('DG2: Heading clicked:', id)
  selectedHeading.value = id
  emit('scroll-to-heading', id)
}

const toggleOutlineItem = (item: OutlineItem) => {
  console.log('DG2: Toggle outline item:', {
    id: item.id,
    text: item.text,
    wasExpanded: item.isExpanded
  })
  if (item.children) {
    item.isExpanded = !item.isExpanded
  }
}

const loadFileList = async () => {
  try {
    const isDev = import.meta.env.DEV
    const url = isDev ? '/online-typora/api/docs/list' : '/online-typora/docs-list.json'
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const files = await response.json()
    files.forEach((file: FileNode) => {
      file.isExpanded = true
      if (file.children) {
        file.children.forEach((child: FileNode) => {
          child.isExpanded = false
          if (child.children) {
            child.children.forEach((grandChild: FileNode) => {
              grandChild.isExpanded = false
            })
          }
        })
      }
    })
    fileTree.value = files
  } catch (error) {
    console.error('Error loading file list:', error)
  }
}

watch(
  [() => props.outline, () => activeTab.value],
  ([newOutline, newTab], [oldOutline, oldTab]) => {
    console.log('DG2: Combined watch triggered:', {
      newOutlineLength: newOutline?.length || 0,
      oldOutlineLength: oldOutline?.length || 0,
      newTab,
      oldTab
    })

    // 只在切换到大纲标签时重置状态
    if (newTab === 'outline') {
      console.log('DG2: Tab switched to outline, updating state')
      nextTick(() => {
        resetOutlineState()
      })
    } else if (newTab === 'files') {
      // 切换到文件树时清空大纲
      selectedHeading.value = ''
    }
  }
)

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
    isRestoringScroll.value = false
    return
  }
  
  scrollTimeout = window.setTimeout(() => {
    if (props.selectedFile) {
      saveScrollPosition(props.selectedFile, scrollTop)
    }
  }, 500)
}

const scrollToTop = () => {
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
}

const handleTabChange = (tab: string) => {
  console.log('DG2: Tab change requested:', tab)
  activeTab.value = tab
}

const handleExitSearch = () => {
  activeTab.value = 'files'
}

function restoreScrollForSelectedFile() {
  if (props.selectedFile) {
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      const checkContentLoaded = () => {
        if (mainContent.scrollHeight > 0) {
          const storedPosition = getStoredScrollPosition(props.selectedFile)
          isRestoringScroll.value = true
          mainContent.scrollTop = storedPosition
        } else {
          setTimeout(checkContentLoaded, 50)
        }
      }
      checkContentLoaded()
    }
  }
}

// 修改重置状态的方法
const resetOutlineState = () => {
  if (isResetting) {
    console.log('DG2: Reset already in progress, skipping')
    return
  }

  console.log('DG2: Resetting outline state, current outline length:', props.outline?.length || 0)
  if (props.outline?.length > 0 && activeTab.value === 'outline') {
    try {
      isResetting = true
      console.log('DG2: Starting outline reset')
      selectedHeading.value = ''
      
      // 递归设置展开状态
      const setExpandState = (items: any[], level: number) => {
        items.forEach((item, index) => {
          // 三级以内的标题默认展开
          item.isExpanded = level <= 3
          
          // 选中第一个标题
          if (level === 1 && index === 0) {
            selectedHeading.value = item.id
            console.log('DG2: Selected first heading:', item.id)
          }
          
          // 递归处理子项
          if (item.children) {
            setExpandState(item.children, level + 1)
          }
        })
      }
      
      // 处理所有大纲项
      setExpandState(props.outline, 1)
      
      console.log('DG2: Outline reset completed')
    } finally {
      isResetting = false
    }
  } else {
    console.log('DG2: Skip outline reset - conditions not met:', {
      outlineLength: props.outline?.length || 0,
      activeTab: activeTab.value
    })
  }
}

// 添加更新选中标题的方法
const updateSelectedHeading = (id: string) => {
  console.log('CP001: Sidebar 收到更新选中标题请求', id)
  selectedHeading.value = id
}

defineExpose({ 
  restoreScrollForSelectedFile,
  updateSelectedHeading
})

onMounted(() => {
  console.log('DG2: Component mounted, activeTab:', activeTab.value)
  loadFileList()
  if (activeTab.value === 'outline') {
    resetOutlineState()
  }
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.addEventListener('scroll', checkScroll)
  }
})

onUnmounted(() => {
  if (props.selectedFile) {
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      saveScrollPosition(props.selectedFile, mainContent.scrollTop)
    }
  }
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.removeEventListener('scroll', checkScroll)
  }
})
</script>

<style scoped>
.sidebar {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.sidebar-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 300px;
}

.file-tree {
  flex: 1;
  overflow-y: scroll;
  overflow-x: hidden;
  padding: 10px 16px 10px 5px;
  position: relative;
  width: 100%;
}

.outline {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 16px 10px 5px;
  position: relative;
  width: 100%;
}

.empty-outline {
  padding: 20px;
  text-align: center;
  color: #999;
}

.back-to-top {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 40px;
  height: 40px;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  z-index: 1000;
}

.back-to-top.show {
  opacity: 1;
  visibility: visible;
}

.back-to-top img {
  width: 24px;
  height: 24px;
  transform: rotate(0deg);
}

.back-to-top:hover {
  background-color: #f5f5f5;
}

/* 修改滚动条样式 */
.file-tree::-webkit-scrollbar,
.outline::-webkit-scrollbar {
  width: 6px;
  position: absolute;
  right: 0;
  background-color: transparent;
}

.file-tree::-webkit-scrollbar-thumb,
.outline::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 0;
}

.file-tree::-webkit-scrollbar-track,
.outline::-webkit-scrollbar-track {
  background-color: transparent;
}
</style> 