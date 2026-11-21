import type { ApiMeta, RainbowLike } from './types'

/** 内置 + api-names 扁平方法；首期以调通为主 */
const BUILTIN: ApiMeta[] = [
  {
    name: 'ready',
    chineseName: 'Ready',
    params: {},
  },
  {
    name: 'config',
    chineseName: '设置 config',
    params: {
      debug: true,
      appId: 'demo',
      timestamp: String(Date.now()),
      nonceStr: 'demo',
      signature: 'demo',
    },
  },
  {
    name: 'ping',
    chineseName: 'Ping 调通',
    params: {},
  },
]

export function buildApiCatalog(sdk?: RainbowLike): ApiMeta[] {
  const map = new Map<string, ApiMeta>()
  for (const item of BUILTIN) {
    map.set(item.name, item)
  }
  const list = (sdk && sdk.apis) || []
  for (const row of list) {
    const name = row && row.apiName ? String(row.apiName) : ''
    if (!name || map.has(name)) continue
    map.set(name, {
      name,
      chineseName: name,
      params: {},
    })
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}
