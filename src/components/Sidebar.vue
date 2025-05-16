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
            <template v-for="item in outline" :key="item.id">
              <div class="outline-item" :class="{ 'is-selected': selectedHeading === item.id }">
                <div class="outline-name" @click="handleHeadingClick(item.id)">
                  <span class="outline-text">{{ item.text }}</span>
                  <span class="arrow-icon" :class="{ expanded: item.isExpanded }" @click.stop="toggleOutlineItem(item)">
                    <template v-if="item.children && item.children.length > 0">
                      <img src="/arrow-next-small-svgrepo-com.svg" alt="arrow" style="width: 12px; height: 12px;" />
                    </template>
                  </span>
                </div>
              </div>
              <template v-if="item.children && item.isExpanded">
                <div class="children">
                  <template v-for="child in item.children" :key="child.id">
                    <div class="outline-item" :class="{ 'is-selected': selectedHeading === child.id }">
                      <div class="outline-name" @click="handleHeadingClick(child.id)">
                        <span class="outline-text">{{ child.text }}</span>
                        <span class="arrow-icon" :class="{ expanded: child.isExpanded }" @click.stop="toggleOutlineItem(child)">
                          <template v-if="child.children && child.children.length > 0">
                            <img src="/arrow-next-small-svgrepo-com.svg" alt="arrow" style="width: 12px; height: 12px;" />
                          </template>
                        </span>
                      </div>
                    </div>
                    <template v-if="child.children && child.isExpanded">
                      <div class="children">
                        <template v-for="grandChild in child.children" :key="grandChild.id">
                          <div class="outline-item" :class="{ 'is-selected': selectedHeading === grandChild.id }">
                            <div class="outline-name" @click="handleHeadingClick(grandChild.id)">
                              <span class="outline-text">{{ grandChild.text }}</span>
                            </div>
                          </div>
                        </template>
                      </div>
                    </template>
                  </template>
                </div>
              </template>
            </template>
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
import { ref, onMounted, watch, onUnmounted, nextTick, defineExpose } from 'vue'
import Search from './Search.vue'
import FileTreeItem from './FileTreeItem.vue'
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
const isUserClick = ref(false)
const showBackToTop = ref(false)
const isRestoringScroll = ref(false)
let observer: IntersectionObserver | null = null
let lastScrollTop = 0
let scrollTimeout: number | null = null

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
  console.log('LLog: saveScrollPosition', filePath, position)
  const storedPositions = localStorage.getItem('documentScrollPositions')
  let positions: Record<string, number> = {}
  if (storedPositions) {
    positions = JSON.parse(storedPositions)
  }
  positions[filePath] = position
  localStorage.setItem('documentScrollPositions', JSON.stringify(positions))
}

// @ts-ignore - Used in template
const toggleFolder = (file: FileNode) => {
  if (file.children) {
    file.isExpanded = !file.isExpanded
  }
}

const handleFileSelect = (path: string) => {
  console.log('LLog: handleFileSelect', path)
  // 保存当前文档的位置
  if (props.selectedFile) {
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      saveScrollPosition(props.selectedFile, mainContent.scrollTop)
      // 立即将当前内容区域滚动到顶部，避免闪烁
      mainContent.scrollTop = 0
    }
  }
  emit('file-select', path)
}

const toggleOutlineItem = (item: OutlineItem) => {
  if (item.children) {
    item.isExpanded = !item.isExpanded
  }
}

const handleHeadingClick = (id: string) => {
  isUserClick.value = true
  selectedHeading.value = id
  emit('scroll-to-heading', id)
  
  setTimeout(() => {
    isUserClick.value = false
  }, 1000)
}

const findOutlineItem = (id: string): OutlineItem | null => {
  const find = (items: OutlineItem[]): OutlineItem | null => {
    for (const item of items) {
      if (item.id === id) return item
      if (item.children) {
        const found = find(item.children)
        if (found) return found
      }
    }
    return null
  }
  return find(props.outline)
}

const findParentOutlineItem = (id: string): OutlineItem | null => {
  const find = (items: OutlineItem[], targetId: string): OutlineItem | null => {
    for (const item of items) {
      if (item.children) {
        for (const child of item.children) {
          if (child.id === targetId) {
            return item
          }
          if (child.children) {
            const found = find([child], targetId)
            if (found) return found
          }
        }
      }
    }
    return null
  }
  return find(props.outline, id)
}

const initObserver = () => {
  if (observer) observer.disconnect()
  
  const mainContent = document.querySelector('.main-content')
  if (!mainContent) return
  
  mainContent.removeEventListener('scroll', handleScroll)
  
  mainContent.addEventListener('scroll', handleScroll)
  
  handleScroll()
}

const handleScroll = () => {
  if (isUserClick.value) return
  
  const mainContent = document.querySelector('.main-content')
  if (!mainContent) return
  
  const viewportTop = mainContent.scrollTop
  const viewportHeight = mainContent.clientHeight
  const viewportCenter = viewportTop + viewportHeight / 2
  
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map(heading => ({
      element: heading as HTMLElement,
      level: parseInt(heading.tagName[1]),
      top: (heading as HTMLElement).getBoundingClientRect().top + viewportTop
    }))
    .sort((a, b) => a.top - b.top)
  
  if (headings.length === 0) return
  
  if (viewportTop <= 0) {
    const firstHeading = headings[0]
    if (firstHeading.element.id) {
      selectedHeading.value = firstHeading.element.id
      return
    }
  }
  
  if (viewportTop + viewportHeight >= mainContent.scrollHeight) {
    const lastHeading = headings[headings.length - 1]
    if (lastHeading.element.id) {
      selectedHeading.value = lastHeading.element.id
      return
    }
  }
  
  let closestHeading = null
  let minDistance = Infinity
  
  for (const heading of headings) {
    const distance = Math.abs(heading.top - viewportCenter)
    if (distance < minDistance) {
      minDistance = distance
      closestHeading = heading
    }
  }
  
  if (closestHeading && closestHeading.element.id) {
    selectedHeading.value = closestHeading.element.id
    
    const item = findOutlineItem(closestHeading.element.id)
    if (item) {
      let parent = findParentOutlineItem(closestHeading.element.id)
      while (parent) {
        parent.isExpanded = true
        parent = findParentOutlineItem(parent.id)
      }
    }
  }
}

const loadFileList = async () => {
  try {
    // 在开发环境中使用 API，在生产环境中使用静态文件
    const isDev = import.meta.env.DEV
    const url = isDev ? '/online-typora/api/docs/list' : '/online-typora/docs-list.json'
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const files = await response.json()
    // 设置第一级默认展开
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

watch(() => props.outline, (newOutline) => {
  if (newOutline.length > 0) {
    newOutline.forEach(item => {
      item.isExpanded = true
    })
    setTimeout(initObserver, 0)
  }
}, { immediate: true })

const checkScroll = () => {
  console.log('LLog: checkScroll called')
  const mainContent = document.querySelector('.main-content')
  if (!mainContent) {
    console.log('LLog: checkScroll no mainContent')
    return
  }
  const scrollTop = mainContent.scrollTop
  console.log('LLog: checkScroll', 'selectedFile:', props.selectedFile, 'scrollTop:', scrollTop)
  showBackToTop.value = scrollTop < lastScrollTop && scrollTop > 100
  lastScrollTop = scrollTop
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  if (isRestoringScroll.value) {
    // 本次是恢复滚动，不保存，并且重置标志
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
  activeTab.value = tab
}

const handleExitSearch = () => {
  activeTab.value = 'files'
}

function restoreScrollForSelectedFile() {
  if (props.selectedFile) {
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      // 等待内容完全加载后再恢复滚动位置
      const checkContentLoaded = () => {
        if (mainContent.scrollHeight > 0) {
          const storedPosition = getStoredScrollPosition(props.selectedFile)
          isRestoringScroll.value = true
          mainContent.scrollTop = storedPosition
          console.log('LLog: restore scrollTop for', props.selectedFile, storedPosition)
        } else {
          setTimeout(checkContentLoaded, 50)
        }
      }
      checkContentLoaded()
    }
  }
}

defineExpose({ restoreScrollForSelectedFile })

onMounted(() => {
  console.log('LLog: Sidebar onMounted')
  window.addEventListener('scroll', () => {
    console.log('LLog: window scroll')
  })
  loadFileList()
  setTimeout(initObserver, 100)
  // 添加滚动监听
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.addEventListener('scroll', checkScroll)
    console.log('LLog: mainContent scroll listener added')
  } else {
    console.log('LLog: mainContent not found in onMounted')
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
  if (observer) {
    observer.disconnect()
    observer = null
  }
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.removeEventListener('scroll', handleScroll)
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

.file-item,
.outline-item {
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 0;
  position: relative;
  text-align: left;
  transition: background-color 0.2s;
  display: flex;
  align-items: flex-start;
  padding-right: 16px;
  user-select: none;
  margin-left: -2px;
  margin-right: -2px;
}

.file-item:hover,
.outline-item:hover {
  background-color: rgba(24, 144, 255, 0.05);
  border-left: 2px solid rgba(24, 144, 255, 0.3);
}

.file-item.is-selected,
.outline-item.is-selected {
  background-color: rgba(24, 144, 255, 0.1);
  color: #1890ff;
  border-left: 2px solid #1890ff;
}

.file-name,
.outline-name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  white-space: normal;
  word-break: break-all;
  line-height: 1.4;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  transition: color 0.2s ease;
}

.file-item:hover .file-name,
.file-item.is-selected .file-name,
.outline-item:hover .outline-name,
.outline-item.is-selected .outline-name {
  color: #1890ff;
}

.file-name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  white-space: normal;
  word-break: break-all;
  line-height: 1.4;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  transition: color 0.2s ease;
}

.file-name:hover {
  color: #1890ff;
}

/* 添加第一级文件加粗样式 */
.file-tree > .file-item > .file-name {
  font-weight: bold;
}

/* 修改滚动条样式 */
.file-tree::-webkit-scrollbar {
  width: 6px;
  position: absolute;
  right: 0;
  background-color: transparent;
}

.file-tree::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 0;
}

.file-tree::-webkit-scrollbar-track {
  background-color: transparent;
}

/* 确保箭头位置固定 */
.arrow-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  position: absolute;
  right: -16px;
  transition: transform 0.2s ease, opacity 0.2s ease;
  z-index: 1;
  opacity: 0.5;
}

.arrow-icon:hover {
  opacity: 0.8;
}

.arrow-icon.expanded {
  transform: rotate(90deg);
  opacity: 0.8;
}

.children {
  width: calc(100% - 12px);
  margin-left: 12px;
  padding-left: 8px;
}

.outline {
  flex: 1;
  overflow-y: scroll;
  overflow-x: hidden;
  padding: 10px 16px 10px 5px;
  position: relative;
  width: 100%;
}

/* 修改大纲滚动条样式 */
.outline::-webkit-scrollbar {
  width: 6px;
  position: absolute;
  right: 0;
  background-color: transparent;
}

.outline::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 0;
}

.outline::-webkit-scrollbar-track {
  background-color: transparent;
}

/* 确保大纲箭头位置固定 */
.outline .arrow-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  position: absolute;
  right: -16px;
  transition: transform 0.2s ease;
  z-index: 1;
}

.outline-item {
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 4px;
  text-align: left;
  transition: background-color 0.2s;
  display: flex;
  align-items: flex-start;
  padding-right: 16px;
}

.outline-item:hover {
  background-color: rgba(24, 144, 255, 0.05);
  border-left: 2px solid rgba(24, 144, 255, 0.3);
  border-radius: 0;
}

.outline-item.is-selected {
  background-color: rgba(24, 144, 255, 0.1);
  color: #1890ff;
  border-left: 2px solid #1890ff;
  border-radius: 0;
}

.outline-name {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-left: 5px;
  cursor: pointer;
  min-height: 24px;
  white-space: normal;
  word-break: break-all;
  line-height: 1.4;
  position: relative;
}

/* 添加大纲第一级加粗样式 */
.outline > .outline-item > .outline-name > .outline-text {
  font-weight: bold;
}

.outline-text {
  flex: 1;
  white-space: normal;
  word-break: break-all;
  margin-right: 8px;
  font-weight: 500;
  transition: color 0.2s ease;
}

.outline-text:hover {
  color: #1890ff;
}

.outline .children {
  width: calc(100% - 12px);
  margin-left: 12px;
  padding-left: 8px;
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

.icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 24px;
}

.left-section .icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.right-section .icon-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-tooltip {
  position: fixed;
  z-index: 9999;
  background-color: #616161;
  color: white;
  padding: 5px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: opacity 0.2s;
}

/* 添加resize-handle样式 */
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

/* 禁止所有可拖动元素的文字选中 */
.file-name, .outline-name, .tab-text {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 添加全局禁止选中样式 */
:deep(*) {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 允许输入框和文本区域选中 */
:deep(input), :deep(textarea) {
  user-select: text;
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
}

/* 确保内容区域也被禁止选中 */
.content-container {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 确保主内容区域也被禁止选中 */
.main-content {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 修改工具栏样式 */
:deep(.toolbar-item) {
  transition: background-color 0.2s;
}

:deep(.toolbar-item:hover) {
  background-color: rgba(24, 144, 255, 0.05);
  border-left: 2px solid rgba(24, 144, 255, 0.3);
  border-radius: 0;
}

:deep(.toolbar-item.active) {
  background-color: rgba(24, 144, 255, 0.1);
  border-left: 2px solid #1890ff;
  border-radius: 0;
}

:deep(.toolbar-item img) {
  opacity: 1;
}
</style> 