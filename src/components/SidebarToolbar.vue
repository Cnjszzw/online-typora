<template>
  <div class="sidebar-toolbar">
    <div 
      class="toolbar-item" 
      :class="{ active: activeTab === 'files' }"
      @click="handleTabClick('files')"
      @mouseenter="hoveredItem = 'files'"
      @mouseleave="hoveredItem = ''"
    >
      <img 
        :src="(activeTab === 'files' || hoveredItem === 'files') ? folderSelectedIcon : folderIcon" 
        alt="files"
        class="toolbar-icon"
      />
    </div>
    <div 
      class="toolbar-item" 
      :class="{ active: activeTab === 'outline' }"
      @click="handleTabClick('outline')"
      @mouseenter="hoveredItem = 'outline'"
      @mouseleave="hoveredItem = ''"
    >
      <img 
        :src="(activeTab === 'outline' || hoveredItem === 'outline') ? hierarchySelectedIcon : hierarchyIcon" 
        alt="outline"
        class="toolbar-icon"
      />
    </div>
    <div 
      class="toolbar-item" 
      :class="{ active: activeTab === 'search' }"
      @click="handleTabClick('search')"
      @mouseenter="hoveredItem = 'search'"
      @mouseleave="hoveredItem = ''"
    >
      <img 
        :src="(activeTab === 'search' || hoveredItem === 'search') ? searchSelectedIcon : searchIcon" 
        alt="search"
        class="toolbar-icon"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import folderIcon from '/folder.svg'
import folderSelectedIcon from '/folder-selected.svg'
import hierarchyIcon from '/hierarchy.svg'
import hierarchySelectedIcon from '/hierarchy-selected.svg'
import searchIcon from '/search.svg'
import searchSelectedIcon from '/search-selected.svg'

const props = defineProps<{
  initialTab?: string
}>()

const emit = defineEmits<{
  (e: 'tab-change', tab: string): void
}>()

const activeTab = ref(props.initialTab || 'files')
const hoveredItem = ref('')

const handleTabClick = (tab: string) => {
  activeTab.value = tab
  emit('tab-change', tab)
}
</script>

<style scoped>
.sidebar-toolbar {
  width: 48px;
  height: 100%;
  background-color: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
}

.toolbar-item {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toolbar-item:hover {
  background-color: rgba(24, 144, 255, 0.05);
}

.toolbar-item.active {
  background-color: rgba(24, 144, 255, 0.1);
}

.toolbar-icon {
  width: 20px;
  height: 20px;
}
</style> 