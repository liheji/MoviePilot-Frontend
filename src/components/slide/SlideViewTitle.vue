<script lang="ts" setup>
// 输入参数
const props: any = inject('rankingPropsKey')
</script>

<template>
  <div class="title-wrapper">
    <div class="title-section">
      <div class="title-badge"></div>
      <h3 class="title-text">{{ props?.title }}</h3>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.title-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.title-section {
  display: flex;
  align-items: center;
  position: relative;
}

.title-badge {
  width: 3px;
  height: 16px;
  background-color: rgb(var(--v-theme-primary));
  margin-right: 8px;
  border-radius: 2px;
}

.title-text {
  font-size: 1.1rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-background), 0.95);
  margin: 0;
  padding: 0;
}
</style>
