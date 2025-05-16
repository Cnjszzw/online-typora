<template>
  <div class="outline-tree">
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
        <OutlineTreeItem
          :outline="item.children"
          :selected-heading="selectedHeading"
          @heading-click="handleHeadingClick"
          @toggle-item="toggleOutlineItem"
        />
      </div>
    </template>
  </div>
</template>

<script lang="ts" setup>
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

const handleHeadingClick = (id: string) => {
  emit('heading-click', id)
}

const toggleOutlineItem = (item: OutlineItem) => {
  emit('toggle-item', item)
}
</script>

<style scoped>
.outline-tree {
  width: 100%;
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