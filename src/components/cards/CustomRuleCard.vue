<script lang="ts" setup>
import { CustomRule } from '@/api/types'
import { useToast } from 'vue-toast-notification'
import filter_svg from '@images/svg/filter.svg'
import { cloneDeep } from 'lodash'

// 输入参数
const props = defineProps({
  // 单条规则
  rule: {
    type: Object as PropType<CustomRule>,
    required: true,
  },
  // 所有规则
  rules: {
    type: Array as PropType<CustomRule[]>,
    required: true,
  },
})

// 提示框
const $toast = useToast()

// 定义触发的自定义事件
const emit = defineEmits(['close', 'change', 'done'])

// 规则详情弹窗
const ruleInfoDialog = ref(false)

// 规则详情
const ruleInfo = ref<CustomRule>({
  id: '',
  name: '',
  include: '',
  exclude: '',
  size_range: '',
  seeders: '',
  publish_time: '',
})

// 内置的规则
const selectFilterOptions = ref<{ [key: string]: string }[]>([
  { title: '特效字幕', value: ' SPECSUB ' },
  { title: '中文字幕', value: ' CNSUB ' },
  { title: '国语配音', value: ' CNVOI ' },
  { title: '官种', value: ' GZ ' },
  { title: '排除: 国语配音', value: ' !CNVOI ' },
  { title: '粤语配音', value: ' HKVOI ' },
  { title: '排除: 粤语配音', value: ' !HKVOI ' },
  { title: '促销: 免费', value: ' FREE ' },
  { title: '分辨率: 4K', value: ' 4K ' },
  { title: '分辨率: 1080P', value: ' 1080P ' },
  { title: '分辨率: 720P', value: ' 720P ' },
  { title: '排除: 720P', value: ' !720P ' },
  { title: '质量: 蓝光原盘', value: ' BLU ' },
  { title: '排除: 蓝光原盘', value: ' !BLU ' },
  { title: '质量: BLURAY', value: ' BLURAY ' },
  { title: '排除: BLURAY', value: ' !BLURAY ' },
  { title: '质量: UHD', value: ' UHD ' },
  { title: '排除: UHD', value: ' !UHD ' },
  { title: '质量: REMUX', value: ' REMUX ' },
  { title: '排除: REMUX', value: ' !REMUX ' },
  { title: '质量: WEB-DL', value: ' WEBDL ' },
  { title: '排除: WEB-DL', value: ' !WEBDL ' },
  { title: '质量: 60fps', value: ' 60FPS ' },
  { title: '排除: 60fps', value: ' !60FPS ' },
  { title: '编码: H265', value: ' H265 ' },
  { title: '排除: H265', value: ' !H265 ' },
  { title: '编码: H264', value: ' H264 ' },
  { title: '排除: H264', value: ' !H264 ' },
  { title: '效果: 杜比视界', value: ' DOLBY ' },
  { title: '排除: 杜比视界', value: ' !DOLBY ' },
  { title: '效果: 杜比全景声', value: ' ATMOS ' },
  { title: '排除: 杜比全景声', value: ' !ATMOS ' },
  { title: '效果: HDR', value: ' HDR ' },
  { title: '排除: HDR', value: ' !HDR ' },
  { title: '效果: SDR', value: ' SDR ' },
  { title: '排除: SDR', value: ' !SDR ' },
  { title: '效果: 3D', value: ' 3D ' },
  { title: '排除: 3D', value: ' !3D ' },
])

// 打开详情弹窗
function openRuleInfoDialog() {
  // 深复制
  ruleInfo.value = cloneDeep(props.rule)
  ruleInfoDialog.value = true
}

// 保存详情数据
function saveRuleInfo() {
  // 有空值
  if (!ruleInfo.value.id || !ruleInfo.value.name) {
    if (!ruleInfo.value.id && ruleInfo.value.name) {
      $toast.error('规则ID不能为空')
    }
    if (ruleInfo.value.id && !ruleInfo.value.name) {
      $toast.error('规则名称不能为空')
    }
    if (!ruleInfo.value.id && !ruleInfo.value.name) {
      $toast.error('规则ID和规则名称不能为空')
    }
    return
  }
  // 检查ID是否在内置的规则中
  if (selectFilterOptions.value.find(option => option.value === ruleInfo.value.id)) {
    $toast.error('当前规则ID已被内置规则占用，请替换')
    return
  }
  // 检查规则名称是否在内置的规则中
  if (selectFilterOptions.value.find(option => option.title === ruleInfo.value.name)) {
    $toast.error('当前规则名称已被内置规则占用，请替换')
    return
  }
  // ID已存在
  if (ruleInfo.value.id !== props.rule.id && props.rules.find(rule => rule.id === ruleInfo.value.id)) {
    $toast.error(`规则ID【${ruleInfo.value.id}】已存在，请替换`)
    return
  }
  // 规则名称已存在
  if (ruleInfo.value.name !== props.rule.name && props.rules.find(rule => rule.name === ruleInfo.value.name)) {
    $toast.error(`规则名称【${ruleInfo.value.name}】已存在，请替换`)
    return
  }
  // 保存数据
  ruleInfoDialog.value = false
  emit('change', ruleInfo.value, props.rule.id)
  emit('done')
}

// 按钮点击
function onClose() {
  emit('close')
}
</script>

<template>
  <div>
    <VCard variant="tonal" @click="openRuleInfoDialog">
      <span class="absolute top-3 right-12">
        <IconBtn>
          <VIcon class="cursor-move" icon="mdi-drag" />
        </IconBtn>
      </span>
      <DialogCloseBtn @click="onClose" />
      <VCardText class="flex justify-space-between align-center gap-3">
        <div class="align-self-start">
          <h5 class="text-h6 mb-1">{{ props.rule.id }}</h5>
          <div class="text-body-1 mb-3">{{ props.rule.name }}</div>
        </div>
        <VImg :src="filter_svg" cover class="mt-7" max-width="3rem" />
      </VCardText>
    </VCard>
    <VDialog v-model="ruleInfoDialog" scrollable max-width="40rem" persistent>
      <VCard :title="`${props.rule.id} - 配置`" class="rounded-t">
        <DialogCloseBtn v-model="ruleInfoDialog" />
        <VDivider />
        <VCardText>
          <VForm>
            <VRow>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="ruleInfo.id"
                  label="规则ID"
                  placeholder="必填；不可与其他规则ID重名"
                  hint="字符与数字组合，不能含空格"
                  persistent-hint
                  active
                />
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model="ruleInfo.name"
                  label="规则名称"
                  placeholder="必填；不可与其他规则名称重名"
                  hint="使用别名便于区分规则"
                  persistent-hint
                  active
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="ruleInfo.include"
                  placeholder="关键字/正则表达式"
                  label="包含"
                  hint="必须包含的关键字或正则表达式，多个值使用｜分隔"
                  persistent-hint
                  active
                />
              </VCol>
              <VCol cols="12">
                <VTextField
                  v-model="ruleInfo.exclude"
                  placeholder="关键字/正则表达式"
                  label="排除"
                  hint="不能包含的关键字或正则表达式，多个值使用｜分隔"
                  persistent-hint
                  active
                />
              </VCol>
              <VCol cols="6">
                <VTextField
                  v-model="ruleInfo.size_range"
                  placeholder="0/1-10"
                  label="资源体积（MB）"
                  hint="最小资源文件体积或文件体积范围"
                  persistent-hint
                  active
                />
              </VCol>
              <VCol cols="6">
                <VTextField
                  v-model="ruleInfo.seeders"
                  placeholder="0/1-10"
                  label="做种人数"
                  hint="最小做种人数或做种人数范围"
                  persistent-hint
                  active
                />
              </VCol>
              <VCol cols="6">
                <VTextField
                  v-model="ruleInfo.publish_time"
                  placeholder="0"
                  label="发布时间（分钟）"
                  hint="距离资源发布的最小时间间隔"
                  persistent-hint
                  active
                />
              </VCol>
            </VRow>
          </VForm>
        </VCardText>
        <VCardActions class="pt-3">
          <VBtn @click="saveRuleInfo" variant="elevated" prepend-icon="mdi-content-save" class="px-5"> 确定 </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
