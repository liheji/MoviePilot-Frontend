<script setup lang="ts">
import api from '@/api'
import { FileItem } from '@/api/types'

const props = defineProps({
  cron: {
    type: String,
    default: '* * * * *',
  },
})

const emit = defineEmits(['update:modelValue'])

const currentCron = ref(props.cron)

watch(currentCron, newVal => {
  emit('update:modelValue', currentCron.value)
})
</script>

<template>
  <div>
    <VMenu :close-on-content-click="false" content-class="cursor-default">
      <template v-slot:activator="{ props }">
        <slot name="activator" :menuprops="props" />
      </template>
      <VCronVuetify v-model="currentCron" locale="zh-CN" :chip-props="{ color: 'success' }" class="mt-1" />
    </VMenu>
  </div>
</template>
