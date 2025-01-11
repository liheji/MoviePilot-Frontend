<script lang="ts" setup>
import { RenderProps } from '@/api/types'
import { type PropType, ref } from 'vue'

// 输入参数
const elementProps = defineProps({
  config: Object as PropType<RenderProps>,
  form: Object as PropType<any>,
})

// 配置元素
const formItem = ref<RenderProps>(
  elementProps.config ?? {
    component: 'div',
    text: '',
    html: '',
    props: {},
    slots: [],
    content: [],
  },
)

// 配置数据
const formData = ref<any>(elementProps.form || {})
</script>

<template>
  <!-- 使用modelvalue -->
  <Component
    :is="formItem.component"
    v-if="!formItem.html && !!formItem.props?.modelvalue"
    v-bind="formItem.props"
    v-model:value="formData[formItem.props?.modelvalue]"
  >
    {{ formItem.text }}
    <!-- slots -->
    <template v-for="(content, name) in formItem.slots || []" :key="name" v-slot:[name]="{ _props }">
      <slot :name="name" v-bind="_props">
        <PageRender
          v-for="(slotItem, slotIndex) in content || []"
          :key="slotIndex"
          :config="slotItem"
          @action="emit('action')"
        />
      </slot>
    </template>
    <!-- content -->
    <template v-for="(innerItem, innerIndex) in formItem.content || []" :key="innerIndex">
      <FormRender
        v-if="!!innerItem.props?.modelvalue"
        v-model:value="formData[innerItem.props?.modelvalue]"
        :config="innerItem"
        :form="formData"
      />
      <FormRender v-else v-model="formData[innerItem.props?.model]" :config="innerItem" :form="formData" />
    </template>
  </Component>
  <!-- 使用html -->
  <Component :is="formItem.component" v-else-if="formItem.html" v-bind="formItem.props" v-html="formItem.html" />
  <!-- 使用model -->
  <Component :is="formItem.component" v-else v-bind="formItem.props" v-model="formData[formItem.props?.model]">
    {{ formItem.text }}
    <!-- slots -->
    <template v-for="(content, name) in formItem.slots || []" :key="name" v-slot:[name]="{ _props }">
      <slot :name="name" v-bind="_props">
        <PageRender
          v-for="(slotItem, slotIndex) in content || []"
          :key="slotIndex"
          :config="slotItem"
          @action="emit('action')"
        />
      </slot>
    </template>
    <!-- content -->
    <template v-for="(innerItem, innerIndex) in formItem.content || []" :key="innerIndex">
      <FormRender
        v-if="!!innerItem.props?.modelvalue"
        v-model:value="formData[innerItem.props?.modelvalue]"
        :config="innerItem"
        :form="formData"
      />
      <FormRender v-else v-model="formData[innerItem.props?.model]" :config="innerItem" :form="formData" />
    </template>
  </Component>
</template>
