<script lang="ts" setup>
import { RenderProps } from '@/api/types'
import { type PropType, ref } from 'vue'

// 输入参数
defineProps({
  config: Object as PropType<RenderProps>,
  form: Object as PropType<any>,
})
</script>

<template>
  <!-- 使用modelvalue -->
  <Component
    :is="config.component"
    v-if="!config.html && !!config.props?.modelvalue"
    v-bind="config.props"
    v-model:value="form[config.props?.modelvalue]"
  >
    {{ config.text }}
    <!-- slots -->
    <template v-for="(slotContents, name) in config.slots || {}" :key="name" v-slot:[name]="{ _props }">
      <slot :name="name" v-bind="_props">
        <template v-for="(slotItem, slotIndex) in slotContents || []" :key="slotIndex">
          <FormRender
            v-if="!!slotItem.props?.modelvalue"
            v-model:value="form[slotItem.props?.modelvalue]"
            :config="slotItem"
            :form="form"
          />
          <FormRender v-else v-model="form[slotItem.props?.model]" :config="slotItem" :form="form" />
        </template>
      </slot>
    </template>
    <!-- content -->
    <template v-for="(innerItem, innerIndex) in config.content || []" :key="innerIndex">
      <FormRender
        v-if="!!innerItem.props?.modelvalue"
        v-model:value="form[innerItem.props?.modelvalue]"
        :config="innerItem"
        :form="form"
      />
      <FormRender v-else v-model="form[innerItem.props?.model]" :config="innerItem" :form="form" />
    </template>
  </Component>
  <!-- 使用html -->
  <Component :is="config.component" v-else-if="config.html" v-bind="config.props" v-html="config.html" />
  <!-- 使用model -->
  <Component :is="config.component" v-else v-bind="config.props" v-model="form[config.props?.model]">
    {{ config.text }}
    <!-- slots -->
    <template v-for="(slotContents, name) in config.slots || {}" :key="name" v-slot:[name]="{ _props }">
      <slot :name="name" v-bind="_props">
        <template v-for="(slotItem, slotIndex) in slotContents || []" :key="slotIndex">
          <FormRender
            v-if="!!slotItem.props?.modelvalue"
            v-model:value="form[slotItem.props?.modelvalue]"
            :config="slotItem"
            :form="form"
          />
          <FormRender v-else v-model="form[slotItem.props?.model]" :config="slotItem" :form="form" />
        </template>
      </slot>
    </template>
    <!-- content -->
    <template v-for="(innerItem, innerIndex) in config.content || []" :key="innerIndex">
      <FormRender
        v-if="!!innerItem.props?.modelvalue"
        v-model:value="form[innerItem.props?.modelvalue]"
        :config="innerItem"
        :form="form"
      />
      <FormRender v-else v-model="form[innerItem.props?.model]" :config="innerItem" :form="form" />
    </template>
  </Component>
</template>
