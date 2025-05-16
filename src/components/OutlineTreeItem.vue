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
  padding-left: 8px;
  user-select: none;
  margin-left: -2px;
  margin-right: -2px;
}

.outline-item:hover {
  background-color: rgba(24, 144, 255, 0.05);
}

.outline-item.is-selected {
  background-color: rgba(24, 144, 255, 0.1);
  color: #1890ff;
}

.outline-name {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 22px;
  position: relative;
  padding: 0 8px;
  transition: color 0.2s ease;
}

.outline-item:hover .outline-name,
.outline-item.is-selected .outline-name {
  color: #1890ff;
}

.arrow-icon {
  position: relative;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.7;
  transition: transform 0.2s;
  margin-right: 4px;
  flex-shrink: 0;
}

.arrow-icon.expanded {
  transform: rotate(90deg);
}

.arrow-icon img {
  width: 12px;
  height: 12px;
}

.children {
  position: relative;
  margin-left: 8px;
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

.outline-text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: normal;
}

/* 第一级标题加粗 */
.outline-tree > .outline-item > .outline-name > .outline-text {
  font-weight: 500;
}
</style> 