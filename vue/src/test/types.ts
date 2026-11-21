export type ApiMeta = {
  name: string
  chineseName: string
  params: Record<string, unknown>
}

export type RainbowLike = {
  version?: string
  apis?: Array<{ apiName: string; isAsync?: string; eventType?: string }>
  ready: (cb?: (res: unknown) => void) => void
  config?: (params: Record<string, unknown>) => void
  error?: (cb: (err: unknown) => void) => void
  [key: string]: unknown
}

export function getRainbow(): RainbowLike | undefined {
  return (window as unknown as { Rainbow?: RainbowLike }).Rainbow
}
