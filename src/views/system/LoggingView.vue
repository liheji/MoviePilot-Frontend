<script lang="ts" setup>
// 日志列表
const logs = ref<string[]>([])

// 已解析的日志列表
const parsedLogs = ref<{ level: string; time: string; program: string; content: string }[]>([])

// 表头
const headers = [
  { title: '级别', value: 'level' },
  { title: '时间', value: 'time' },
  { title: '程序', value: 'program' },
  { title: '内容', value: 'content' },
]

// SSE消息对象
let eventSource: EventSource | null = null

// 日志颜色映射表
const logColorMap: Record<string, string> = {
  DEBUG: 'primary',
  INFO: 'secondary',
  WARNING: 'warning',
  ERROR: 'error',
}

// 获取日志颜色
function getLogColor(level: string): string {
  return logColorMap[level] || 'secondary'
}

// SSE持续获取日志
function startSSELogging() {
  eventSource = new EventSource(`${import.meta.env.VITE_API_BASE_URL}system/logging`)
  const buffer: string[] = []
  let timeoutId: number | null = null

  eventSource.addEventListener('message', event => {
    const message = event.data
    if (message) {
      buffer.push(message)
      if (!timeoutId) {
        timeoutId = window.setTimeout(() => {
          logs.value.push(...buffer)
          buffer.length = 0
          timeoutId = null
        }, 100) // 批量处理间隔，视需求调整
      }
    }
  })
}

// 解析日志
watch(
  logs,
  newLogs => {
    const newParsedLogs = newLogs
      .slice(parsedLogs.value.length)
      .map(log => {
        const logPattern = /^【(.*?)】[0-9\-:]*\s(.*?)\s-\s(.*?)\s-\s(.*)$/
        const matches = log.match(logPattern)
        if (matches) {
          const [, level, time, program, content] = matches
          return { level, time, program, content }
        }
        return null
      })
      .filter(Boolean)
    parsedLogs.value.push(...(newParsedLogs as any[]))
  },
  { deep: true },
) // 添加 deep 监听，确保 Vue 响应式正确触发

onMounted(() => {
  startSSELogging()
})

onBeforeUnmount(() => {
  if (eventSource) eventSource.close()
})
</script>

<template>
  <LoadingBanner v-if="logs.length === 0" class="mt-12" text="正在刷新 ..." />
  <div v-else>
    <VTable class="table-rounded" hide-default-footer disable-sort>
      <tbody>
        <VDataTableVirtual
          :headers="headers"
          :items="parsedLogs"
          height="100%"
          density="compact"
          hover
          hide-default-header
        >
          <template #item.level="{ item }">
            <VChip size="small" :color="getLogColor(item.level)" variant="elevated" v-text="item.level" />
          </template>
          <template #item.time="{ item }">
            <span class="text-sm">{{ item.time }}</span>
          </template>
          <template #item.program="{ item }">
            <h6 class="text-sm font-weight-medium">{{ item.program }}</h6>
          </template>
          <template #item.content="{ item }">
            <span class="text-sm">
              {{ item.content }}
            </span>
          </template>
        </VDataTableVirtual>
      </tbody>
    </VTable>
  </div>
</template>
