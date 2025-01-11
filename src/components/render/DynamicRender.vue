<script setup lang="ts">
import { h, resolveComponent, defineProps } from 'vue'

// 定义 props
const props = defineProps<{
  config: Record<string, any> // JSON 配置
  model: Record<string, any> // 数据模型
}>()

/**
 * 解析属性，支持 v-model 和动态绑定
 * @param rawProps 原始属性
 * @param model 数据模型
 * @returns 解析后的属性
 */
const parseProps = (rawProps: Record<string, any>, model: Record<string, any>) => {
  const parsedProps: Record<string, any> = {}

  for (const [key, value] of Object.entries(rawProps)) {
    if (key === 'modelvalue') {
      // 将 modelvalue 转换为 v-model:value 的形式
      parsedProps['value'] = model[value]
      parsedProps['onUpdate:value'] = (newValue: any) => {
        model[value] = newValue
      }
    } else if (key === 'model') {
      // 处理 v-model
      parsedProps['modelValue'] = model[value]
      parsedProps['onUpdate:modelValue'] = (newValue: any) => {
        model[value] = newValue
      }
    } else if (key.startsWith('model:')) {
      // 处理 v-model:<prop>
      const propName = key.replace('model:', '')
      parsedProps[propName] = model[value]
      parsedProps[`onUpdate:${propName}`] = (newValue: any) => {
        model[value] = newValue
      }
    } else {
      // 普通属性直接赋值
      parsedProps[key] = typeof value === 'string' && value in model ? model[value] : value
    }
  }

  return parsedProps
}

/**
 * 渲染插槽内容
 * @param slotContent 插槽配置
 * @param model 数据模型
 * @param slotScope 插槽作用域
 */
const renderSlotContent = (slotContent: any, model: any, slotScope: any) => {
  if (Array.isArray(slotContent)) {
    // 如果插槽内容是数组，递归渲染
    return slotContent.map(childConfig => renderComponent(childConfig, model, slotScope))
  }
  // 如果插槽内容是单个配置，递归渲染
  return renderComponent(slotContent, model, slotScope)
}

/**
 * 渲染组件函数（递归支持嵌套）
 * @param config JSON 配置
 * @param model 数据模型
 * @param slotScope 插槽作用域
 * @returns 渲染的组件 VNode
 */
const renderComponent = (config: any, model: any, slotScope: any = {}) => {
  const { component, props: componentProps = {}, content = [], slots = {} } = config

  // 动态解析组件
  const Component = resolveComponent(component)

  // 解析属性
  const parsedProps = parseProps(componentProps, model)

  // 动态插槽解析
  const slotNodes: Record<string, any> = {}
  for (const [slotName, slotContent] of Object.entries(slots)) {
    slotNodes[slotName] = (slotScopeData: any) => renderSlotContent(slotContent, model, slotScopeData)
  }

  // 渲染组件
  return h(Component, parsedProps, {
    ...slotNodes,
    default: () => content.map((childConfig: any) => renderComponent(childConfig, model)),
  })
}
</script>

<template>
  <!-- 调用递归渲染函数 -->
  <div>
    <Component v-if="config.html" :is="config.component" v-bind="config.props" v-html="config.html" />
    <Component v-else :is="renderComponent(config, model)" />
  </div>
</template>
