<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ApiMeta } from '../types'

const props = defineProps<{
  apis: ApiMeta[]
  modelValue: ApiMeta
}>()

const emit = defineEmits<{
  'update:modelValue': [ApiMeta]
}>()

const open = ref(false)

const label = computed(() => props.modelValue.chineseName || props.modelValue.name)
const apiName = computed(() => props.modelValue.name)

function pick(api: ApiMeta) {
  emit('update:modelValue', api)
  open.value = false
}
</script>

<template>
  <div class="api-picker" @click="open = true">
    <div class="api-picker__zh">{{ label }}</div>
    <div class="api-picker__en">{{ apiName }}</div>
  </div>

  <div v-if="open" class="sheet-mask" @click.self="open = false">
    <div class="sheet">
      <div class="sheet__title">选择接口</div>
      <button
        v-for="api in apis"
        :key="api.name"
        type="button"
        class="sheet__item"
        @click="pick(api)"
      >
        <span>{{ api.chineseName }}</span>
        <small>{{ api.name }}</small>
      </button>
    </div>
  </div>
</template>

<style scoped>
.api-picker {
  width: 87.46666666666667%;
  height: 142px;
  margin: 0 auto 35px;
  border-radius: 24px;
  background: #fff;
  text-align: center;
  cursor: pointer;
}

.api-picker__zh {
  font-size: 24px;
  color: #333850;
  padding-top: 46px;
}

.api-picker__en {
  color: #586595;
  font-size: 18px;
  padding-top: 18px;
  text-transform: capitalize;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  max-height: 70vh;
  overflow: auto;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 12px 0 24px;
}

.sheet__title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  padding: 8px 0 12px;
  color: #333;
}

.sheet__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 12px 20px;
  border: 0;
  border-top: 1px solid #eee;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.sheet__item span {
  font-size: 15px;
  color: #333;
}

.sheet__item small {
  font-size: 12px;
  color: #888;
}
</style>
