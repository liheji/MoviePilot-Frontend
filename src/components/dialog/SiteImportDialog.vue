<script lang="ts" setup>
import { useToast } from 'vue-toastification'
import type { Site } from '@/api/types'
import { doneNProgress, startNProgress } from '@/api/nprogress'
import api from '@/api'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'

// 国际化
const { t } = useI18n()

// 显示器宽度
const display = useDisplay()

// 提示框
const $toast = useToast()

// 输入参数
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

// 注册事件
const emit = defineEmits(['update:modelValue', 'import-success'])



// 是否拖拽中
const isDragging = ref(false)

// 导入的文件数据
const importData = ref<Site[]>([])

// 导入进度
const importProgress = ref(0)

// 是否正在导入
const isImporting = ref(false)

// 预览数据
const previewData = ref<Site[]>([])

// 是否显示预览
const showPreview = ref(false)

// 选中的文件
const selectedFile = ref<File | null>(null)



// 处理拖拽事件
function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragging.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
}

async function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragging.value = false
  
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      selectedFile.value = file
      await processFile(file)
    } else {
      $toast.error(t('site.messages.invalidFileType'))
    }
  }
}

// 处理文件
async function processFile(file: File) {
  try {
    const text = await file.text()
    const data = JSON.parse(text)
    
    if (Array.isArray(data)) {
      importData.value = data
      previewData.value = data.slice(0, 5) // 只显示前5个站点作为预览
      showPreview.value = true
    } else {
      $toast.error(t('site.messages.invalidFileFormat'))
    }
  } catch (error) {
    console.error('Parse file error:', error)
    $toast.error(t('site.messages.parseFileError'))
  }
}

// 验证站点数据
function validateSiteData(site: any): boolean {
  const requiredFields = ['name', 'domain', 'url']
  return requiredFields.every(field => site[field])
}

// 批量导入站点
async function importSites() {
  if (importData.value.length === 0) {
    $toast.error(t('site.messages.noDataToImport'))
    return
  }

  // 验证数据
  const validSites = importData.value.filter(validateSiteData)
  if (validSites.length === 0) {
    $toast.error(t('site.messages.noValidData'))
    return
  }

  if (validSites.length !== importData.value.length) {
    $toast.warning(t('site.messages.someInvalidData', { valid: validSites.length, total: importData.value.length }))
  }

  startNProgress()
  isImporting.value = true
  importProgress.value = 0

  try {
    let successCount = 0
    let failCount = 0

    for (let i = 0; i < validSites.length; i++) {
      const site = validSites[i]
      try {
        // 移除id字段，避免冲突
        const { id, ...siteData } = site
        const result = await api.post('site/', siteData)
        if (result.success) {
          successCount++
        } else {
          failCount++
        }
      } catch (error) {
        console.error(`Import site ${site.name} failed:`, error)
        failCount++
      }
      
      importProgress.value = Math.round(((i + 1) / validSites.length) * 100)
    }

    // 显示导入结果
    if (successCount > 0) {
      $toast.success(t('site.messages.importSuccess', { count: successCount }))
      emit('import-success')
      closeDialog()
    }
    
    if (failCount > 0) {
      $toast.error(t('site.messages.importPartialFailed', { success: successCount, failed: failCount }))
    }
  } catch (error) {
    console.error('Import sites failed:', error)
    $toast.error(t('site.messages.importFailed'))
  } finally {
    isImporting.value = false
    doneNProgress()
  }
}

// 关闭对话框
function closeDialog() {
  emit('update:modelValue', false)
  // 重置状态
  importData.value = []
  previewData.value = []
  showPreview.value = false
  importProgress.value = 0
  isImporting.value = false
  isDragging.value = false
  selectedFile.value = null
}

// 监听对话框状态
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    closeDialog()
  }
})

// 监听文件选择
watch(selectedFile, async (newFile) => {
  if (newFile) {
    await processFile(newFile)
  }
})
</script>

<template>
  <DialogWrapper scrollable :close-on-back="false" eager max-width="50rem" :fullscreen="!display.mdAndUp.value">
    <VCard>
      <VCardItem class="py-3">
        <template #prepend>
          <VIcon icon="mdi-upload" class="me-2" />
        </template>
        <VCardTitle>{{ t('site.actions.import') }}</VCardTitle>
        <VCardSubtitle>{{ t('site.hints.import') }}</VCardSubtitle>
      </VCardItem>
      <VDialogCloseBtn @click="closeDialog" />
      <VDivider />
      <VCardText>
        <!-- 文件上传区域 -->
        <div
          v-if="!showPreview"
          class="upload-area"
          :class="{ 'dragging': isDragging }"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
        >
          <VFileInput
            v-model="selectedFile"
            accept=".json"
            :label="t('site.fields.selectFile')"
            :hint="t('site.hints.selectFile')"
            persistent-hint
            prepend-icon="mdi-file-upload"
          />
          <div class="text-center mt-4">
            <VIcon icon="mdi-cloud-upload" size="48" color="primary" />
            <p class="text-body-1 mt-2">{{ t('site.hints.dragDropFile') }}</p>
            <p class="text-caption text-medium-emphasis">{{ t('site.hints.supportedFormat') }}</p>
          </div>
        </div>

        <!-- 预览区域 -->
        <div v-if="showPreview" class="preview-area">
          <VAlert
            type="info"
            variant="tonal"
            class="mb-4"
            :text="t('site.messages.previewData', { count: importData.length })"
          />
          
          <!-- 预览列表 -->
          <VCard variant="outlined" class="mb-4">
            <VCardTitle class="text-subtitle-1">
              {{ t('site.preview.title') }} ({{ t('site.preview.showing', { count: previewData.length, total: importData.length }) }})
            </VCardTitle>
            <VCardText>
              <VList>
                <VListItem
                  v-for="(site, index) in previewData"
                  :key="index"
                  :class="{ 'border-error': !validateSiteData(site) }"
                >
                  <template #prepend>
                    <VIcon
                      :icon="validateSiteData(site) ? 'mdi-check-circle' : 'mdi-alert-circle'"
                      :color="validateSiteData(site) ? 'success' : 'error'"
                    />
                  </template>
                  <VListItemTitle>{{ site.name || t('site.preview.unnamed') }}</VListItemTitle>
                  <VListItemSubtitle>{{ site.url || t('site.preview.noUrl') }}</VListItemSubtitle>
                  <template #append>
                    <VChip
                      v-if="!validateSiteData(site)"
                      size="small"
                      color="error"
                      variant="tonal"
                    >
                      {{ t('site.preview.invalid') }}
                    </VChip>
                  </template>
                </VListItem>
              </VList>
            </VCardText>
          </VCard>

          <!-- 导入进度 -->
          <div v-if="isImporting" class="import-progress">
            <VProgressLinear
              v-model="importProgress"
              color="primary"
              height="8"
              rounded
              class="mb-2"
            />
            <p class="text-caption text-center">{{ t('site.messages.importing', { progress: importProgress }) }}</p>
          </div>

          <!-- 操作按钮 -->
          <div class="d-flex justify-end gap-2">
            <VBtn
              variant="text"
              @click="showPreview = false"
              :disabled="isImporting"
            >
              {{ t('common.back') }}
            </VBtn>
            <VBtn
              color="primary"
              @click="importSites"
              :loading="isImporting"
              :disabled="importData.length === 0"
            >
              {{ t('site.actions.startImport') }}
            </VBtn>
          </div>
        </div>
      </VCardText>
    </VCard>
  </DialogWrapper>
</template>

<style scoped>
.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  transition: all 0.3s ease;
}

.upload-area.dragging {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.preview-area {
  max-height: 60vh;
  overflow-y: auto;
}

.import-progress {
  margin: 1rem 0;
}
</style>