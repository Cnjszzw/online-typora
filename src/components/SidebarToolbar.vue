<template>
  <div class="sidebar-toolbar">
    <div 
      class="toolbar-item" 
      :class="{ active: activeTab === 'files' }"
      @click="handleTabClick('files')"
    >
      <img 
        :src="activeTab === 'files' ? folderIcon : folderIcon" 
        alt="files"
        class="toolbar-icon"
      />
    </div>
    <div 
      class="toolbar-item" 
      :class="{ active: activeTab === 'outline' }"
      @click="handleTabClick('outline')"
    >
      <img 
        :src="activeTab === 'outline' ? hierarchyIcon : hierarchyIcon" 
        alt="outline"
        class="toolbar-icon"
      />
    </div>
    <div 
      class="toolbar-item" 
      :class="{ active: activeTab === 'search' }"
      @click="handleTabClick('search')"
    >
      <img 
        :src="searchIcon" 
        alt="search"
        class="toolbar-icon"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import folderIcon from '/folder.svg'
import hierarchyIcon from '/hierarchy.svg'
import searchIcon from '/search.svg'

const props = defineProps<{
  initialTab?: string
}>()

const emit = defineEmits<{
  (e: 'tab-change', tab: string): void
}>()

const activeTab = ref(props.initialTab || 'files')

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
  background-color: #e6e6e6;
}

.toolbar-item.active {
  background-color: #1890ff;
}

.toolbar-item.active .toolbar-icon {
  filter: brightness(0) invert(1);
}

.toolbar-icon {
  width: 20px;
  height: 20px;
}
</style> 