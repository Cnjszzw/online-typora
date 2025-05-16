<template>
  <div :class="['file-item', { 'is-selected': selectedFile === file.path }]">
    <div 
      class="file-name" 
      :class="{ 
        'top-level': isTopLevel,
        'is-folder': !!file.children,
        'is-expanded': file.isExpanded 
      }" 
      :data-is-folder="!!file.children"
      :data-is-expanded="file.isExpanded"
      @click="handleFileSelect(file)"
    >
      {{ file.name }}
    </div>
    <span v-if="file.children" class="arrow-icon" :class="{ expanded: file.isExpanded }" @click.stop="toggleFolder(file)">
      <img src="/arrow-next-small-svgrepo-com.svg" alt="arrow" />
    </span>
  </div>
  <div v-if="file.children && file.isExpanded" class="children">
    <FileTreeItem
      v-for="child in file.children"
      :key="child.path"
      :file="child"
      :selected-file="selectedFile"
      :is-top-level="false"
      @file-select="$emit('file-select', $event)"
    />
  </div>
</template>

<script lang="ts" setup>
interface FileNode {
  name: string
  path: string
  children?: FileNode[]
  isExpanded?: boolean
}

const { file, selectedFile, isTopLevel } = defineProps<{
  file: FileNode
  selectedFile: string
  isTopLevel?: boolean
}>()

const emit = defineEmits<{
  (e: 'file-select', path: string): void
}>()

const toggleFolder = (file: FileNode) => {
  if (file.children) {
    file.isExpanded = !file.isExpanded
  }
}

const handleFileSelect = (file: FileNode) => {
  if (!file.children) {
    emit('file-select', file.path)
  } else {
    toggleFolder(file)
  }
}
</script>

<style scoped>
.file-item {
  padding: 5px 0;
  cursor: pointer;
  position: relative;
  text-align: left;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  padding-left: 12px;
}

.file-name {
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
.file-item:hover {
  background-color: var(--hover-background, rgba(24, 144, 255, 0.05));
}

.file-item.is-selected {
  background-color: var(--selected-background, rgba(24, 144, 255, 0.1));
}

.file-item.is-selected .file-name {
  color: var(--selected-color, #1890ff);
}

/* 顶层样式 */
.file-name.top-level {
  font-weight: 500;
}

/* 文件夹和文件图标 */
.file-name::before {
  content: '';
  width: 16px;
  height: 16px;
  margin-right: 6px;
  background-size: 16px;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.8;
  flex-shrink: 0;
}

.file-name.is-folder::before {
  background-image: url('/folder-open.svg');
}

.file-name.is-folder.is-expanded::before {
  background-image: url('/folder.svg');
}

.file-name:not(.is-folder)::before {
  background-image: url('/docs.svg');
}
</style> 