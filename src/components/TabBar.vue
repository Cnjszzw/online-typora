<template>
  <div class="tab-bar">
    <div class="tab-list">
      <div
        v-for="tab in tabs"
        :key="tab.path"
        :class="['tab', { active: tab.path === activeTab }]"
        @click="switchTab(tab.path)"
      >
        <span class="tab-text">{{ tab.name }}</span>
        <span class="close-icon" @click.stop="closeTab(tab.path)">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
            <path fill="currentColor" d="M6.4 19L5 17.6l5.6-5.6L5 6.4L6.4 5l5.6 5.6L17.6 5L19 6.4L13.4 12l5.6 5.6l-1.4 1.4l-5.6-5.6z"/>
          </svg>
        </span>
        <span class="tab-line" v-if="tab.path === activeTab"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

interface Tab {
  name: string
  path: string
}

defineProps<{
  tabs: Tab[]
  activeTab: string
}>()

const emit = defineEmits<{
  (e: 'switch-tab', path: string): void
  (e: 'close-tab', path: string): void
}>()

const switchTab = (path: string) => {
  console.log('切换标签:', path)
  emit('switch-tab', path)
}

const closeTab = (path: string) => {
  console.log('关闭标签:', path)
  emit('close-tab', path)
}
</script>

<style scoped>
.tab-bar {
  height: 32px;
  display: flex;
  align-items: flex-end;
  overflow-x: auto;
  overflow-y: hidden;
}

.tab-list {
  display: flex;
  align-items: flex-end;
  height: 100%;
}

.tab {
  display: flex;
  align-items: center;
  padding: 0 4px;
  height: 32px;
  cursor: pointer;
  user-select: none;
  max-width: 160px;
  min-width: 80px;
  position: relative;
  transition: all 0.2s ease;
  margin-right: 1px;
  background-color: #f5f5f5;
}

.tab:hover {
  color: #1890ff;
  background-color: rgba(24, 144, 255, 0.05);
}

.tab.active {
  color: #1890ff;
  background-color: rgba(24, 144, 255, 0.1);
}

.tab-line {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 2px;
  background-color: #1890ff;
  transition: all 0.2s ease;
}

.tab-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  padding: 0 4px;
}

.close-icon {
  margin-left: 6px;
  color: #000;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  opacity: 0.5;
}

.tab:hover .close-icon {
  opacity: 0.8;
}

.tab.active .close-icon {
  opacity: 0.8;
}

.close-icon:hover {
  opacity: 1;
}

.close-icon svg {
  width: 14px;
  height: 14px;
}

/* 隐藏滚动条但保持功能 */
.tab-bar::-webkit-scrollbar {
  height: 0;
  width: 0;
}
</style> 