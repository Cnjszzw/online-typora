<template>
  <div class="outline-tree" ref="outlineRef">
    <template v-for="item in outline" :key="item.id">
      <div 
        class="outline-item" 
        :class="{ 'is-selected': selectedHeading === item.id }"
      >
        <span 
          v-if="item.children && item.children.length > 0" 
          class="arrow-icon" 
          :class="{ expanded: item.isExpanded }" 
          @click.stop="toggleOutlineItem(item)"
        >
          <img src="/arrow-next-small-svgrepo-com.svg" alt="arrow" />
        </span>
        <div 
          class="outline-name" 
          @click="handleHeadingClick(item.id)"
        >
          <span class="outline-text">{{ item.text }}</span>
        </div>
      </div>
      <div 
        v-if="item.children && item.isExpanded" 
        class="children"
      >
        <div class="outline-tree">
          <template v-for="child in item.children" :key="child.id">
            <div 
              class="outline-item" 
              :class="{ 'is-selected': selectedHeading === child.id }"
            >
              <span 
                v-if="child.children && child.children.length > 0" 
                class="arrow-icon" 
                :class="{ expanded: child.isExpanded }" 
                @click.stop="toggleOutlineItem(child)"
              >
                <img src="/arrow-next-small-svgrepo-com.svg" alt="arrow" />
              </span>
              <div 
                class="outline-name" 
                @click="handleHeadingClick(child.id)"
              >
                <span class="outline-text">{{ child.text }}</span>
              </div>
            </div>
            <div 
              v-if="child.children && child.isExpanded" 
              class="children"
            >
              <div class="outline-tree">
                <template v-for="grandChild in child.children" :key="grandChild.id">
                  <div 
                    class="outline-item" 
                    :class="{ 'is-selected': selectedHeading === grandChild.id }"
                  >
                    <div 
                      class="outline-name" 
                      @click="handleHeadingClick(grandChild.id)"
                    >
                      <span class="outline-text">{{ grandChild.text }}</span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, defineOptions, ref, watch, nextTick } from 'vue'

defineOptions({
  name: 'OutlineTreeItem'
})

interface OutlineItem {
  id: string
  text: string
  level: number
  children?: OutlineItem[]
  isExpanded?: boolean
}

const props = defineProps<{
  outline: OutlineItem[]
  selectedHeading: string
}>()

const emit = defineEmits<{
  (e: 'heading-click', id: string): void
  (e: 'toggle-item', item: OutlineItem): void
}>()

const scrollPosition = ref(0)
const outlineRef = ref<HTMLElement | null>(null)

const handleHeadingClick = (id: string) => {
  console.log('CP003 OutlineTreeItem heading click:', {
    id,
    selectedHeading: props.selectedHeading,
    timestamp: new Date().toISOString()
  })
  emit('heading-click', id)
}

const toggleOutlineItem = (item: OutlineItem) => {
  console.log('CP003 OutlineTreeItem toggle:', {
    id: item.id,
    text: item.text,
    wasExpanded: item.isExpanded,
    timestamp: new Date().toISOString()
  })
  emit('toggle-item', item)
}

const handleScroll = () => {
  const outlineElement = outlineRef.value?.closest('.outline')
  if (outlineElement) {
    scrollPosition.value = outlineElement.scrollTop
  }
}

watch(() => props.outline, () => {
  // 当大纲内容变化时，恢复滚动位置
  nextTick(() => {
    const outlineElement = outlineRef.value?.closest('.outline')
    if (outlineElement) {
      outlineElement.scrollTop = scrollPosition.value
    }
  })
}, { deep: true })

onMounted(() => {
  console.log('CP003 OutlineTreeItem mounted:', {
    outlineLength: props.outline.length,
    selectedHeading: props.selectedHeading,
    timestamp: new Date().toISOString()
  })
  
  const outlineElement = outlineRef.value?.closest('.outline')
  if (outlineElement) {
    outlineElement.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  const outlineElement = outlineRef.value?.closest('.outline')
  if (outlineElement) {
    outlineElement.removeEventListener('scroll', handleScroll)
  }
})
</script>

<style scoped>
.outline-tree {
  width: 100%;
  position: relative;
}

.outline-item {
  padding: 5px 0;
  cursor: pointer;
  position: relative;
  text-align: left;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  padding-left: 12px;
}

/* 修改滚动条样式 */
.outline-tree::-webkit-scrollbar {
  width: 6px;
  position: absolute;
  right: 0;
  background-color: transparent;
}

.outline-tree::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 0;
}

.outline-tree::-webkit-scrollbar-track {
  background-color: transparent;
}

.outline-name {
  display: flex;
  align-items: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 22px;
  position: relative;
  padding: 0 8px;
  min-width: 0;
}

/* 层级连接线 */
.children {
  position: relative;
  margin-left: 12px;
  padding-left: 4px;
}

.children::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 1px;
  height: 100%;
  background-color: var(--border-color, #363636);
  opacity: 0.4;
}

/* 展开/折叠箭头 */
.arrow-icon {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 0;
  opacity: 0.7;
  transition: transform 0.2s;
  z-index: 1;
}

.arrow-icon.expanded {
  transform: rotate(90deg);
}

.arrow-icon img {
  width: 12px;
  height: 12px;
}

/* 悬停和选中状态 */
.outline-item:hover {
  background-color: var(--hover-background, rgba(24, 144, 255, 0.05));
}

.outline-item.is-selected {
  background-color: var(--selected-background, rgba(24, 144, 255, 0.1));
}

.outline-item.is-selected .outline-name {
  color: var(--selected-color, #1890ff);
}

/* 顶层样式 */
.outline-tree > .outline-item > .outline-name > .outline-text {
  font-weight: 500;
}

.outline-text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: normal;
}
</style> 