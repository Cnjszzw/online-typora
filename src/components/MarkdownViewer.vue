<template>
  <div class="markdown-viewer">
    <div v-if="content" class="markdown-content" v-html="renderedContent"></div>
    <div v-else class="empty-state">
      请选择一个文件查看内容
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps<{
  content: string
}>()

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
})

const renderedContent = computed(() => {
  return props.content ? md.render(props.content) : ''
})
</script>

<style scoped>
.markdown-viewer {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  box-sizing: border-box;
}

.markdown-content {
  max-width: 800px;
  margin: 0 auto;
}

.empty-state {
  text-align: center;
  color: #999;
  padding: 20px;
}

:deep(.markdown-content) {
  h1, h2, h3, h4, h5, h6 {
    margin-top: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    line-height: 1.25;
  }

  p {
    margin-bottom: 16px;
    line-height: 1.6;
  }

  code {
    padding: 0.2em 0.4em;
    margin: 0;
    font-size: 85%;
    background-color: rgba(27,31,35,0.05);
    border-radius: 3px;
  }

  pre {
    padding: 16px;
    overflow: auto;
    font-size: 85%;
    line-height: 1.45;
    background-color: #f6f8fa;
    border-radius: 3px;
  }

  blockquote {
    padding: 0 1em;
    color: #6a737d;
    border-left: 0.25em solid #dfe2e5;
    margin: 0 0 16px 0;
  }
}
</style> 