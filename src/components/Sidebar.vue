<template>
  <div class="sidebar">
    <div class="tabs" v-if="!showSearch">
      <div class="tab-container">
        <div class="left-section">
<!--          <div class="icon-wrapper" -->
<!--            @mouseenter="showTooltip($event, activeTab === 'files' ? '切换到大纲视图' : '切换到文件树视图')" -->
<!--            @mouseleave="hideTooltip"-->
<!--            @click="handleIconClick"-->
<!--          >-->
          <div class="icon-wrapper"
               @click="handleIconClick"
          >
            <img 
              :src="activeTab === 'files' ? folderIcon : hierarchyIcon" 
              alt="icon"
              class="tab-icon"
              @click="activeTab = activeTab === 'files' ? 'outline' : 'files'"
            />
            <div class="custom-tooltip" v-show="tooltipVisible && currentTooltip === 'left'" :style="tooltipStyle">
              {{ tooltipText }}
            </div>
          </div>
        </div>
        <div class="center-section">
          <span class="tab-text">{{ activeTab === 'files' ? '文件' : '大纲' }}</span>
        </div>
        <div class="right-section">
<!--          <div class="icon-wrapper" -->
<!--            @mouseenter="showTooltip($event, '查找/搜索')" -->
<!--            @mouseleave="hideTooltip"-->
<!--            @click="handleSearchClick"-->
<!--          >-->
          <div class="icon-wrapper"
               @click="handleSearchClick"
          >
            <img 
              :src="searchIcon" 
              alt="search"
              class="tab-icon search-icon"
            />
            <div class="custom-tooltip" v-show="tooltipVisible && currentTooltip === 'right'" :style="tooltipStyle">
              {{ tooltipText }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <Search v-if="showSearch" @exit-search="showSearch = false" :sidebar-width="props.sidebarWidth" />
    
    <div v-else-if="activeTab === 'files'" class="file-tree">
      <template v-for="file in fileTree" :key="file.path">
        <div :class="['file-item', { 'is-selected': selectedFile === file.path }]">
          <div class="file-name" @click="handleFileSelect(file)">
            {{ file.name }}
            <span v-if="file.children" class="arrow-icon" :class="{ expanded: file.isExpanded }" @click.stop="toggleFolder(file)">
              <img src="/arrow-next-small-svgrepo-com.svg" alt="arrow" style="width: 12px; height: 12px;" />
            </span>
          </div>
        </div>
        <div v-if="file.children && file.isExpanded" class="children">
          <template v-for="child in file.children" :key="child.path">
            <div :class="['file-item', { 'is-selected': selectedFile === child.path }]">
              <div class="file-name" @click="handleFileSelect(child)">
                {{ child.name }}
                <span v-if="child.children" class="arrow-icon" :class="{ expanded: child.isExpanded }" @click.stop="toggleFolder(child)">
                  <img src="/arrow-next-small-svgrepo-com.svg" alt="arrow" style="width: 12px; height: 12px;" />
                </span>
              </div>
            </div>
            <div v-if="child.children && child.isExpanded" class="children">
              <template v-for="grandChild in child.children" :key="grandChild.path">
                <div :class="['file-item', { 'is-selected': selectedFile === grandChild.path }]">
                  <div class="file-name" @click="handleFileSelect(grandChild)">
                    {{ grandChild.name }}
                    <span v-if="grandChild.children" class="arrow-icon" :class="{ expanded: grandChild.isExpanded }" @click.stop="toggleFolder(grandChild)">
                      <img src="/arrow-next-small-svgrepo-com.svg" alt="arrow" style="width: 12px; height: 12px;" />
                    </span>
                  </div>
                </div>
                <div v-if="grandChild.children && grandChild.isExpanded" class="children">
                  <template v-for="greatGrandChild in grandChild.children" :key="greatGrandChild.path">
                    <div :class="['file-item', { 'is-selected': selectedFile === greatGrandChild.path }]">
                      <div class="file-name" @click="handleFileSelect(greatGrandChild)">
                        {{ greatGrandChild.name }}
                      </div>
                    </div>
                  </template>
                </div>
              </template>
            </div>
          </template>
        </div>
      </template>
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
import { ref, onMounted, watch, onUnmounted } from 'vue'
import searchIcon from '/search.svg'
import folderIcon from '/folder.svg'
import hierarchyIcon from '/hierarchy.svg'
import Search from './Search.vue'

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
}>()

const emit = defineEmits<{
  (e: 'file-select', path: string): void
  (e: 'scroll-to-heading', id: string): void
}>()

const activeTab = ref('files')
const fileTree = ref<FileNode[]>([])
const selectedFile = ref<string>('')
const selectedHeading = ref<string>('')
const isUserClick = ref(false)
const showBackToTop = ref(false)
let observer: IntersectionObserver | null = null
let lastScrollTop = 0
let scrollTimeout: number | null = null
const tooltipVisible = ref(false)
const tooltipText = ref('')
const currentTooltip = ref<'left' | 'right' | null>(null)
const tooltipStyle = ref<{
  display: string,
  position: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky',
  left: string,
  top: string
}>({
  display: 'none',
  position: 'absolute',
  left: '0',
  top: '0'
})
const showSearch = ref(false)

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

const toggleFolder = (file: FileNode) => {
  if (file.children) {
    file.isExpanded = !file.isExpanded
  }
}

const handleFileSelect = (file: FileNode) => {
  if (file.children) {
    toggleFolder(file)
  } else {
    // 保存当前文档的位置
    if (selectedFile.value) {
      const mainContent = document.querySelector('.main-content')
      if (mainContent) {
        saveScrollPosition(selectedFile.value, mainContent.scrollTop)
      }
    }
    
    selectedFile.value = file.path
    emit('file-select', file.path)
    
    // 等待文档加载完成后再恢复位置
    const checkContentLoaded = () => {
      const mainContent = document.querySelector('.main-content')
      if (mainContent && mainContent.scrollHeight > 0) {
        const storedPosition = getStoredScrollPosition(file.path)
        mainContent.scrollTop = storedPosition
      } else {
        setTimeout(checkContentLoaded, 100)
      }
    }
    checkContentLoaded()
  }
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
  const mainContent = document.querySelector('.main-content')
  if (!mainContent) return
  
  const scrollTop = mainContent.scrollTop
  // 当向上滚动且滚动距离大于100px时显示按钮
  showBackToTop.value = scrollTop < lastScrollTop && scrollTop > 100
  lastScrollTop = scrollTop
  
  // 使用防抖保存滚动位置
  if (scrollTimeout) {
    clearTimeout(scrollTimeout)
  }
  scrollTimeout = window.setTimeout(() => {
    if (selectedFile.value) {
      saveScrollPosition(selectedFile.value, scrollTop)
    }
  }, 500) // 500ms 的防抖时间
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

const handleIconClick = () => {
  hideTooltip()
}

const handleSearchClick = () => {
  showSearch.value = true
  hideTooltip()
}

const showTooltip = (event: MouseEvent, text: string) => {
  tooltipText.value = text
  tooltipVisible.value = true
  currentTooltip.value = (event.currentTarget as HTMLElement).closest('.left-section') ? 'left' : 'right'
  
  // 计算 tooltip 的位置
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  
  if (currentTooltip.value === 'left') {
    tooltipStyle.value = {
      position: 'absolute',
      left: `${rect.right + 8}px`,
      top: `${rect.top + rect.height / 2 - 10}px`,
      display: 'block'
    }
  } else {
    tooltipStyle.value = {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.bottom + 2}px`,
      display: 'block'
    }
  }
}

const hideTooltip = () => {
  tooltipVisible.value = false
  currentTooltip.value = null
}

onMounted(() => {
  loadFileList()
  setTimeout(initObserver, 100)
  
  // 添加滚动监听
  const mainContent = document.querySelector('.main-content')
  if (mainContent) {
    mainContent.addEventListener('scroll', checkScroll)
  }
})

onUnmounted(() => {
  if (selectedFile.value) {
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      saveScrollPosition(selectedFile.value, mainContent.scrollTop)
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

.tabs {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  height: 48px;
}

.tab-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 100%;
  position: relative;
}

.left-section {
  display: flex;
  align-items: center;
  height: 100%;
  width: 26px;
  position: relative;
}

.center-section {
  position: absolute;
  left: calc(50% + 6px);
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  white-space: nowrap;
}

.right-section {
  display: flex;
  align-items: center;
  height: 100%;
  width: 26px;
  position: relative;
}

.tab-icon, .search-icon {
  &[title] {
    pointer-events: auto;
  }
  
  &:hover {
    cursor: pointer;
  }
}

.tab-icon {
  width: 24px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-icon {
  width: 24px;
  height: 24px;
  position: absolute;
  right: -10px;
  top: 12px;
  cursor: pointer;
}

[title] {
  transition-delay: 0s;
}

.tab-text {
  font-size: 14px;
  font-weight: bold;
  user-select: none;
  color: #000000;
  line-height: 18px;
  height: 18px;
  display: flex;
  align-items: center;
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
}

.file-item {
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 4px;
  position: relative;
  text-align: left;
  transition: background-color 0.2s;
  display: flex;
  align-items: flex-start;
  padding-right: 16px;
}

.file-item:hover {
  background-color: #f5f5f5;
}

.file-item.is-selected {
  background-color: #d9eaf4;
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
}

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
  transition: transform 0.2s ease;
}

.arrow-icon.expanded {
  transform: rotate(90deg);
}

.children {
  width: calc(100% - 12px);
  margin-left: 12px;
  border-left: 1px dashed #1890ff;
  padding-left: 8px;
}

.outline {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px;
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
  background-color: #f5f5f5;
}

.outline-item.is-selected {
  background-color: #e6f7ff;
  color: #1890ff;
  font-weight: 500;
}

.outline-name {
  display: flex;
  align-items: flex-start;
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

.outline-text {
  flex: 1;
  white-space: normal;
  word-break: break-all;
  margin-right: 8px;
}

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
}

.outline .children {
  width: calc(100% - 12px);
  margin-left: 12px;
  border-left: 1px dashed #1890ff;
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
</style> 