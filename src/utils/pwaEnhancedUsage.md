# PWA轻量级状态管理使用指南

## 概述

轻量级PWA状态管理器提供了以下功能：
- 🔄 **智能滚动位置管理**：退到后台时收集和保存滚动位置
- 📝 **表单数据保存**：退到后台时保存用户输入的表单数据
- 🎛️ **弹窗状态管理**：退到后台时保存打开的弹窗状态

## 工作原理

**轻量级设计**：不使用实时监听，只在页面隐藏时收集状态，避免影响性能。

### 状态收集时机
- 页面隐藏（`visibilitychange`）
- 页面卸载（`beforeunload`）
- 手动调用保存方法

### 收集的状态
1. **滚动位置**：主窗口和常见容器的滚动位置
2. **表单数据**：所有有值的表单字段（跳过密码字段）
3. **弹窗状态**：当前打开的弹窗及其内容

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

### 手动触发状态保存

```javascript
// 手动保存当前状态
if (window.pwaStateController) {
  window.pwaStateController.saveCurrentState()
    .then(() => console.log('状态保存成功'))
    .catch(err => console.error('状态保存失败:', err))
}
```

### 监控PWA状态

```javascript
// 监听状态恢复事件
window.addEventListener('pwaStateRestored', (event) => {
  console.log('PWA状态恢复:', event.detail.state)
})

// 检查PWA控制器状态
if (window.pwaStateController) {
  console.log('PWA控制器已可用')
  console.log('正在恢复状态:', window.pwaStateController.isRestoringState)
}
```

### 测试状态收集

```javascript
// 测试状态收集功能
const { LightweightStateCollector } = await import('@/utils/pwaStateManager')

console.log('滚动位置:', LightweightStateCollector.collectScrollPositions())
console.log('弹窗状态:', LightweightStateCollector.collectModalStates())
console.log('表单字段:', LightweightStateCollector.collectFormFields())
```

## 性能优势

### 轻量级设计
- **零实时监听**：不添加事件监听器，不影响页面性能
- **按需收集**：只在页面隐藏时收集状态
- **无防抖需要**：不需要防抖和节流

### 存储策略
- **localStorage**：持久状态（应用设置、用户数据）
- **IndexedDB**：复杂状态数据（大量数据）
- **Service Worker**：离线状态同步

### 内存效率
- **无常驻对象**：不维护状态缓存
- **静态方法**：使用静态方法，减少内存占用
- **按需加载**：状态收集时才执行DOM查询

## 故障排除

### 常见问题

1. **状态没有保存**
   - 检查是否在PWA环境中运行
   - 确认页面隐藏事件是否触发
   - 手动调用 `saveCurrentState()` 测试

2. **滚动位置没有恢复**
   - 确保滚动容器有支持的CSS类名
   - 检查URL是否完全匹配

3. **表单数据没有恢复**
   - 确保表单字段有 `name` 或 `id` 属性
   - 检查字段在保存时是否有值

4. **弹窗状态没有恢复**
   - 确保弹窗在页面隐藏时是打开状态
   - 检查弹窗是否使用了支持的CSS选择器

### 调试方法

```javascript
// 在页面隐藏前手动测试状态收集
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('页面隐藏，开始收集状态...')
    // 在这里添加断点或日志
  }
})
```

## 注意事项

- **仅在PWA环境有效**：状态管理只在PWA模式下工作
- **密码字段跳过**：密码和隐藏字段不会被保存
- **URL匹配限制**：只有URL完全匹配才恢复滚动位置和表单数据
- **轻量级设计**：不监听实时事件，性能友好但精度相对较低