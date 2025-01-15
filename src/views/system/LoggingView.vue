<script lang="ts" setup>
import { parse } from 'path'

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
  DEBUG: 'secondary',
  INFO: 'info',
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
        }, 100)
      }
    }
  })
}

// 解析日志并倒序
watch(
  logs,
  newLogs => {
    // 解析新日志
    const newParsedLogs = newLogs
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

    // 倒序后插入parsedLogs顶部
    parsedLogs.value.unshift(...(newParsedLogs.reverse() as any[]))
    // 只保留最新的1000条日志
    parsedLogs.value = parsedLogs.value.slice(0, 1000)
  },
  { deep: true },
)

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
