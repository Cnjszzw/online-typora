<template>
  <div :class="['file-item', { 'is-selected': selectedFile === file.path }]">
    <div class="file-name" :class="{ 'top-level': isTopLevel }" @click="handleFileSelect(file)">
      {{ file.name }}
      <span v-if="file.children" class="arrow-icon" :class="{ expanded: file.isExpanded }" @click.stop="toggleFolder(file)">
        <img src="/arrow-next-small-svgrepo-com.svg" alt="arrow" style="width: 12px; height: 12px;" />
      </span>
    </div>
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
  padding: 5px 10px;
  cursor: pointer;
  border-radius: 4px;
  position: relative;
  text-align: left;
  transition: background-color 0.2s;
  display: flex;
  align-items: flex-start;
  padding-right: 16px;
  user-select: none;
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
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
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
  z-index: 1;
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

.file-name.top-level {
  font-weight: bold;
}
</style> 