<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PageTitle from './components/PageTitle.vue'
import ApiPicker from './components/ApiPicker.vue'
import FormPanel from './components/FormPanel.vue'
import { buildApiCatalog } from './api-catalog'
import type { ApiMeta } from './types'
import { getRainbow } from './types'

const FALLBACK_API: ApiMeta = { name: 'ping', chineseName: 'Ping 调通', params: {} }
const apis = ref<ApiMeta[]>(buildApiCatalog())
const current = ref<ApiMeta>(apis.value[0] ?? FALLBACK_API)
const status = ref('')

const panelOpen = computed(() => Boolean(current.value?.name))

onMounted(() => {
  const rainbow = getRainbow()
  apis.value = buildApiCatalog(rainbow)
  current.value =
    apis.value.find((a) => a.name === 'ping') ?? apis.value[0] ?? FALLBACK_API
  const host = (window as unknown as { webViewHost?: { platform?: string; webViewEnv?: string } })
    .webViewHost
  status.value = [
    rainbow ? `Rainbow ${rainbow.version || '?'}` : 'Rainbow 未加载',
    host
      ? `host ${host.webViewEnv || '?'}/${host.platform || '?'}`
      : 'webViewHost 未加载',
  ].join(' · ')
  if (rainbow && typeof rainbow.error === 'function') {
    rainbow.error((err) => {
      console.error('[Rainbow.error]', err)
    })
  }
})
</script>

<template>
  <div class="shell">
    <PageTitle />
    <p class="status">{{ status }}</p>
    <ApiPicker v-model="current" :apis="apis" />

    <div class="bottom" :class="{ open: panelOpen }">
      <div class="bottom__main">
        <FormPanel :current="current" />
      </div>
    </div>

    <p class="hint">
      多页面：
      <a href="./index.html">Three Demo</a>
      · 本页
      <code>/test.html</code>
    </p>
  </div>
</template>

<style scoped>
.shell {
  box-sizing: border-box;
  min-height: 100%;
  padding-bottom: 440px;
  background: #343951;
  color: #fff;
}

.status {
  margin: 0 24px 16px;
  font-size: 12px;
  color: #b8c0d9;
  word-break: break-all;
}

.bottom {
  position: fixed;
  left: 0;
  bottom: -424px;
  width: 100%;
  height: 424px;
  box-sizing: border-box;
  padding: 20px 0 0 10px;
  border-radius: 24px 24px 0 0;
  background: #f2f3f8;
  transition: bottom 0.3s;
  z-index: 20;
}

.bottom.open {
  bottom: 0;
}

.bottom__main {
  width: 100%;
  height: 100%;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}

.hint {
  position: relative;
  z-index: 1;
  margin: 24px;
  font-size: 12px;
  color: #9aa3c2;
}

.hint a {
  color: #fd9f01;
}

.hint code {
  font-size: 11px;
}
</style>
