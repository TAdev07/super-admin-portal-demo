// MiniPortal-side shell bridge (v1)
export interface MessageEnvelope<T = unknown> {
  version: 'v1'
  type: 'request' | 'response' | 'event'
  topic: string
  cid: string
  source: 'shell' | 'miniportal'
  target: string
  ts: number
  payload?: T
  status?: 'ok' | 'error'
  error?: { code: string; message: string }
}

export interface ShellBridgeOptions {
  appId: string
  shellOrigin: string
}

export function createShellBridgeForMiniportal(opts: ShellBridgeOptions) {
  const { appId, shellOrigin } = opts
  const selfWindow = window
  const targetWindow = window.parent

  function createCid() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }

  const handlers = new Map<string, Set<(msg: MessageEnvelope<unknown>) => void>>()
  const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: unknown) => void; timer: ReturnType<typeof setTimeout> }>()

  function on(topic: string, handler: (msg: MessageEnvelope<unknown>) => void) {
    if (!handlers.has(topic)) handlers.set(topic, new Set())
    handlers.get(topic)!.add(handler)
    return () => handlers.get(topic)!.delete(handler)
  }

  function post(msg: MessageEnvelope<unknown>) {
    targetWindow.postMessage(msg, shellOrigin)
  }

  function sendEvent<T = unknown>(topic: string, payload?: T) {
    post({
      version: 'v1',
      type: 'event',
      topic,
      cid: createCid(),
      source: 'miniportal',
      target: 'shell',
      ts: Date.now(),
      payload,
    })
  }

  function request<TReq = unknown, TRes = unknown>(topic: string, payload?: TReq, timeoutMs = 5000): Promise<TRes> {
    const cid = createCid()
    post({
      version: 'v1',
      type: 'request',
      topic,
      cid,
      source: 'miniportal',
      target: 'shell',
      ts: Date.now(),
      payload,
    })
    return new Promise<TRes>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(cid)
        reject(new Error(`Request timeout for ${topic} (${cid})`))
      }, timeoutMs)
      pending.set(cid, {
        resolve: (v) => resolve(v as TRes),
        reject: (e) => reject(e),
        timer,
      })
    })
  }

  function listener(ev: MessageEvent) {
    if (ev.origin !== shellOrigin) return
    const data = ev.data as MessageEnvelope<unknown>
    if (!data || data.version !== 'v1') return
    if (data.type === 'response' && pending.has(data.cid)) {
      const p = pending.get(data.cid)!
      clearTimeout(p.timer)
      pending.delete(data.cid)
      if (data.status === 'ok') p.resolve(data.payload)
      else p.reject(data.error)
      return
    }
    const set = handlers.get(data.topic)
    set?.forEach((h) => h(data))
  }

  selfWindow.addEventListener('message', listener)

  // Auth state (simple)
  let accessToken: string | null = null
  let exp = 0

  on('auth:token', (msg) => {
    const payload = msg.payload as { token: string; exp: number }
    accessToken = payload.token
    exp = payload.exp
  })

  async function initAuth(scopes: string[] = []) {
    await request('auth:init', { appId, scopes })
  }

  async function getAccessToken() {
    if (accessToken && exp * 1000 - Date.now() > 10_000) return accessToken
    // Re-init if near expiry
    await initAuth()
    return accessToken
  }

  function dispose() {
    selfWindow.removeEventListener('message', listener)
    handlers.clear()
    pending.forEach((p) => clearTimeout(p.timer))
    pending.clear()
  }

  return { on, sendEvent, request, initAuth, getAccessToken, dispose }
}
