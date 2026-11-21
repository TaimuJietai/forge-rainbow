/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

interface WebViewHost {
  platform?: string
  webViewEnv?: string
  version?: string
  invoke?: (action: string, param?: unknown, callback?: (res: unknown) => void) => void
  on?: (action: string, callback: (data: unknown) => void) => void
}

interface RainbowApiRow {
  apiName: string
  isAsync?: string
  eventType?: string
}

interface RainbowSDK {
  version?: string
  apis?: RainbowApiRow[]
  ready: (cb?: (res: unknown) => void) => void
  config?: (params: Record<string, unknown>) => void
  error?: (cb: (err: unknown) => void) => void
  ping?: (params?: Record<string, unknown>) => void
  [key: string]: unknown
}

interface Window {
  webViewHost?: WebViewHost
  Rainbow?: RainbowSDK
  sdkReadyCallback?: (sdk: RainbowSDK) => void
}
