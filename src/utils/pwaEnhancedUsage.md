# PWA增强状态管理使用指南

## 概述

增强的PWA状态管理器提供了以下功能：
- 🔄 **增强的滚动位置管理**：自动跟踪和恢复页面及容器的滚动位置
- 📝 **实时表单数据保存**：实时保存用户输入的表单数据
- 🎛️ **弹窗状态管理**：保存和恢复弹窗的打开状态和内容

## 自动功能

以下功能是**自动启用**的，无需额外配置：

### 1. 滚动位置自动保存和恢复
- 主窗口滚动位置
- 常见容器滚动位置：`.v-main__wrap`、`.v-card-text`、`.perfect-scrollbar` 等
- 自动防抖，避免过度保存

### 2. 表单数据实时保存
- 所有 `input`、`textarea`、`select` 元素的值
- 复选框和单选按钮的选中状态
- 下拉框的选中项
- 500ms防抖延迟

### 3. 弹窗状态跟踪
- Vuetify弹窗组件：`.v-dialog`、`.v-menu`、`.v-overlay` 等
- 自动检测弹窗的打开和关闭
- 保存弹窗内的表单数据和滚动位置

## 在Vue组件中使用

### 基本用法

```vue
<template>
  <v-container>
    <!-- 滚动位置会自动保存和恢复 -->
    <v-main class="overflow-auto">
      <div v-for="item in items" :key="item.id">
        {{ item.name }}
      </div>
    </v-main>

    <!-- 表单数据会自动保存和恢复 -->
    <v-form ref="formRef">
      <v-text-field
        v-model="formData.name"
        label="姓名"
        name="name"
      />
      <v-textarea
        v-model="formData.description"
        label="描述"
        name="description"
      />
      <v-select
        v-model="formData.type"
        :items="typeOptions"
        label="类型"
        name="type"
      />
    </v-form>

    <!-- 弹窗状态会自动保存和恢复 -->
    <v-dialog v-model="dialog" max-width="600">
      <v-card>
        <v-card-title>设置</v-card-title>
        <v-card-text class="overflow-auto">
          <v-form>
            <v-text-field
              v-model="dialogFormData.setting"
              label="设置项"
              name="setting"
            />
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const formData = ref({
  name: '',
  description: '',
  type: ''
})

const dialogFormData = ref({
  setting: ''
})

const dialog = ref(false)
const items = ref([])

// 监听PWA状态恢复事件
onMounted(() => {
  window.addEventListener('pwaStateRestored', (event) => {
    console.log('PWA状态已恢复:', event.detail.state)
    // 可以在这里执行额外的恢复逻辑
  })
})
</script>
```

### 手动保存状态

```vue
<script setup>
import { ref } from 'vue'

const saveState = async () => {
  const controller = window.pwaStateController
  if (controller) {
    await controller.saveCurrentState()
    console.log('状态已保存')
  }
}

const checkPWAController = () => {
  return !!window.pwaStateController
}
</script>

<template>
  <v-btn @click="saveState" :disabled="!checkPWAController()">
    手动保存状态
  </v-btn>
</template>
```

### 弹窗状态恢复监听

```vue
<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const dialog = ref(false)
const modalData = ref({})

const handleModalRestore = (event) => {
  const state = event.detail
  if (state.id === 'my-modal') {
    dialog.value = true
    modalData.value = state.data || {}
  }
}

onMounted(() => {
  window.addEventListener('restoreModalState', handleModalRestore)
})

onUnmounted(() => {
  window.removeEventListener('restoreModalState', handleModalRestore)
})
</script>

<template>
  <v-dialog v-model="dialog" id="my-modal">
    <v-card>
      <v-card-text>
        <v-form>
          <v-text-field
            v-model="modalData.value"
            label="值"
            name="modal-value"
          />
        </v-form>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
```

## 高级配置

### 自定义滚动容器

如果你有自定义的滚动容器，可以添加类名让系统自动跟踪：

```vue
<template>
  <div class="custom-scroll-container overflow-auto">
    <!-- 内容 -->
  </div>
</template>

<style>
.custom-scroll-container {
  height: 400px;
  overflow-y: auto;
}
</style>
```

### 表单字段命名

为了更好的状态恢复，建议为表单字段添加 `name` 属性：

```vue
<template>
  <v-form>
    <v-text-field
      v-model="data.username"
      label="用户名"
      name="username"
    />
    <v-password-field
      v-model="data.password"
      label="密码"
      name="password"
    />
  </v-form>
</template>
```

### 弹窗标识

为弹窗添加唯一标识，便于状态恢复：

```vue
<template>
  <v-dialog v-model="dialog" id="settings-dialog">
    <!-- 弹窗内容 -->
  </v-dialog>
</template>
```

## 调试和监控

### 检查状态保存

```javascript
// 在浏览器控制台中查看保存的状态
console.log('滚动位置:', sessionStorage.getItem('mp-scroll-positions'))
console.log('弹窗状态:', sessionStorage.getItem('mp-modal-states'))
console.log('表单字段:', sessionStorage.getItem('mp-form-fields'))
```

### 监控PWA状态

```javascript
// 监听所有PWA状态变化
window.addEventListener('pwaStateRestored', (event) => {
  console.log('PWA状态恢复:', event.detail.state)
})

// 检查PWA控制器状态
if (window.pwaStateController) {
  console.log('PWA控制器已可用')
  console.log('正在恢复状态:', window.pwaStateController.isRestoringState)
}
```

## 性能考虑

### 防抖和节流
- 滚动位置保存：100ms防抖
- 表单数据保存：500ms防抖
- 弹窗状态检测：实时响应DOM变化

### 存储策略
- **sessionStorage**：用于临时状态（滚动位置、表单数据）
- **localStorage**：用于持久状态（应用设置）
- **IndexedDB**：用于复杂状态数据
- **Service Worker**：用于离线状态同步

### 内存管理
- 自动清理过期状态（24小时）
- 组件卸载时自动移除事件监听器
- 限制缓存大小，避免内存泄漏

## 故障排除

### 常见问题

1. **滚动位置没有恢复**
   - 确保元素有正确的CSS类名
   - 检查元素是否在DOM渲染完成后才滚动

2. **表单数据没有保存**
   - 确保表单字段有 `name` 属性
   - 检查表单是否在PWA控制器初始化后才创建

3. **弹窗状态没有恢复**
   - 确保弹窗有唯一标识
   - 检查弹窗是否使用了支持的CSS类名

### 启用调试模式

```javascript
// 在开发环境中启用详细日志
if (import.meta.env.DEV) {
  window.pwaDebug = true
}
```

## 注意事项

- 状态恢复只在PWA环境中工作
- 某些敏感数据（如密码）不会被保存
- 跨域表单数据可能无法正常恢复
- 动态创建的元素可能需要手动处理