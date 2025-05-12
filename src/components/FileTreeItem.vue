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

.file-item:hover {
  background-color: rgba(24, 144, 255, 0.05);
  border-left: 2px solid rgba(24, 144, 255, 0.3);
}

.file-item.is-selected {
  background-color: rgba(24, 144, 255, 0.1);
  color: #1890ff;
  border-left: 2px solid #1890ff;
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

.file-item:hover .file-name,
.file-item.is-selected .file-name {
  color: #1890ff;
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
  transition: transform 0.2s ease, opacity 0.2s ease;
  opacity: 0.5;
  z-index: 1;
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

.file-name.top-level {
  font-weight: bold;
}
</style> 