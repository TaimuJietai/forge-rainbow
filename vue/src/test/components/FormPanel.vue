<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { ApiMeta, RainbowLike } from '../types'
import { getRainbow } from '../types'

const props = defineProps<{
  current: ApiMeta
}>()

const paramsValue = ref('')
const resStr = ref('')
const errorText = ref('')
const anim = ref('')

watch(
  () => props.current.name,
  () => {
    paramsValue.value = JSON.stringify(props.current.params || {}, undefined, 2)
    resStr.value = ''
    errorText.value = ''
  },
  { immediate: true },
)

const sdk = computed(() => getRainbow())

function flash(key: string) {
  anim.value = key
  window.setTimeout(() => {
    if (anim.value === key) anim.value = ''
  }, 120)
}

function showError(msg: string) {
  errorText.value = msg
  window.setTimeout(() => {
    if (errorText.value === msg) errorText.value = ''
  }, 2200)
}

function setResult(res: unknown) {
  try {
    resStr.value = JSON.stringify(res, undefined, 2)
  } catch {
    resStr.value = String(res)
  }
}

function callApi(rainbow: RainbowLike, name: string, payload: Record<string, unknown>) {
  if (name === 'ready') {
    rainbow.ready((res) => setResult(res))
    return
  }
  if (name === 'config' && typeof rainbow.config === 'function') {
    // 不本地写死成功；走 invoke，等壳 __callback
    const currentResult: Record<string, unknown> = {}
    rainbow.config({
      ...payload,
      success: () => {
        currentResult.status = 'success'
      },
      fail: () => {
        currentResult.status = 'fail'
      },
      complete: (res: unknown) => {
        setResult(Object.assign({}, currentResult, res as object))
      },
    } as Record<string, unknown>)
    return
  }
  const fn = rainbow[name]
  if (typeof fn !== 'function') {
    showError(`接口不存在: ${name}`)
    return
  }
  const currentResult: Record<string, unknown> = {}
  ;(fn as (p: Record<string, unknown>) => void).call(rainbow, {
    ...payload,
    success: () => {
      currentResult.status = 'success'
    },
    fail: () => {
      currentResult.status = 'fail'
    },
    cancel: () => {
      currentResult.status = 'cancel'
    },
    complete: (res: unknown) => {
      setResult(Object.assign({}, currentResult, res as object))
    },
  })
}

function invokeOnce() {
  flash('invoke')
  const rainbow = sdk.value
  if (!rainbow) {
    showError('Rainbow 未加载')
    return
  }
  let payload: Record<string, unknown> = {}
  try {
    payload = paramsValue.value.trim() ? JSON.parse(paramsValue.value) : {}
  } catch (err) {
    showError(err instanceof Error ? err.message : String(err))
    paramsValue.value = JSON.stringify(props.current.params || {}, undefined, 2)
    return
  }
  // 防止异步桥无回包时页面「没反应」
  resStr.value = JSON.stringify({ status: 'pending', action: props.current.name }, null, 2)
  callApi(rainbow, props.current.name, payload)
}

function ready() {
  flash('ready')
  const rainbow = sdk.value
  if (!rainbow) {
    showError('Rainbow 未加载')
    return
  }
  rainbow.ready((res) => setResult(res))
}

function resetParams() {
  flash('reset')
  paramsValue.value = JSON.stringify(props.current.params || {}, undefined, 2)
  resStr.value = ''
}

function activeFive() {
  flash('five')
  for (let i = 0; i < 5; i++) {
    invokeOnce()
  }
}
</script>

<template>
  <div class="form">
    <div class="form__label">Params:</div>
    <textarea v-model="paramsValue" class="form__area" />

    <template v-if="resStr">
      <div class="form__label">callback:</div>
      <textarea :value="resStr" readonly class="form__area" />
    </template>

    <button
      type="button"
      class="form__btn"
      :class="{ pulse: anim === 'invoke' }"
      @click="invokeOnce"
    >
      执行指令
    </button>
    <button
      type="button"
      class="form__btn"
      :class="{ pulse: anim === 'reset' }"
      @click="resetParams"
    >
      重置 Params
    </button>
    <button
      type="button"
      class="form__btn"
      :class="{ pulse: anim === 'ready' }"
      @click="ready"
    >
      Ready 接口
    </button>
    <button
      type="button"
      class="form__btn"
      :class="{ pulse: anim === 'five' }"
      @click="activeFive"
    >
      当前配置并行 5 次
    </button>

    <p v-if="errorText" class="form__error">{{ errorText }}</p>
  </div>
</template>

<style scoped>
.form {
  padding: 0 10px 24px;
}

.form__label {
  width: 70px;
  font-size: 16px;
  color: #333;
  margin-bottom: 6px;
}

.form__area {
  display: block;
  width: calc(100% - 12px);
  height: 130px;
  box-sizing: border-box;
  margin-bottom: 16px;
  padding: 10px;
  border: 0;
  border-radius: 20px;
  font-size: 14px;
  resize: vertical;
}

.form__btn {
  display: inline-block;
  width: 150px;
  margin: 5px 10px;
  padding: 10px 0;
  border: 0;
  border-radius: 12px;
  font-size: 16px;
  color: #fff;
  background: #ffa000;
  cursor: pointer;
  transition: opacity 0.2s;
}

.form__btn.pulse {
  opacity: 0.6;
}

.form__error {
  margin: 12px 10px 0;
  color: #e53935;
  font-weight: 700;
  text-align: center;
}
</style>
