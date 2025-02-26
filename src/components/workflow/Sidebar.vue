<script lang="ts" setup>
import useDragAndDrop from '@core/utils/workflow'

const { onDragStart } = useDragAndDrop()

// 组件列表
const actions = [
  {
    type: 'AddDownloadAction',
    label: '添加下载资源',
  },
  {
    type: 'AddSubscribeAction',
    label: '添加订阅',
  },
  {
    type: 'FetchDownloadsAction',
    label: '获取下载任务',
  },
  {
    type: 'FetchMediasAction',
    label: '获取媒体数据',
  },
  {
    type: 'FetchRssAction',
    label: '获取RSS数据',
  },
  {
    type: 'FetchTorrentsAction',
    label: '搜索站点资源',
  },
  {
    type: 'FilterMediasAction',
    label: '过滤媒体数据',
  },
  {
    type: 'FilterTorrentsAction',
    label: '过滤资源数据',
  },
  {
    type: 'ScrapeFileAction',
    label: '刮削文件',
  },
  {
    type: 'SendEventAction',
    label: '发送事件',
  },
  {
    type: 'SendMessageAction',
    label: '发送消息',
  },
  {
    type: 'TransferFileAction',
    label: '整理文件',
  },
]
</script>

<template>
  <aside>
    <div class="mb-3"><VLabel>可选动作组件：</VLabel></div>

    <div class="nodes">
      <div
        class="vue-flow__node-default"
        v-for="action in actions"
        :draggable="true"
        @dragstart="onDragStart($event, action)"
      >
        {{ action['label'] }}
      </div>
    </div>
  </aside>
</template>
