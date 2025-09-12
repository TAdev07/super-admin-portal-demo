export type BusSource = 'shell' | 'miniportal'

export interface MessageEnvelope<T = unknown> {
  version: 'v1'
  type: 'request' | 'response' | 'event'
  topic: string
  cid: string
  source: BusSource
  target: string
  ts: number
  payload?: T
  status?: 'ok' | 'error'
  error?: { code: string; message: string }
}

type Handler = (msg: MessageEnvelope<unknown>) => void

export interface PostMessageBusOptions {
  selfWindow: Window
  targetWindow: Window
  targetOrigin: string
  allowedOrigin: string
  source: BusSource
  targetLabel: string
}

export function createCid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function createPostMessageBus(opts: PostMessageBusOptions) {
  const { selfWindow, targetWindow, targetOrigin, allowedOrigin, source, targetLabel } = opts

  const handlers = new Map<string, Set<Handler>>()
  type Pending = { resolve: (v: unknown) => void; reject: (e: unknown) => void; timer: ReturnType<typeof setTimeout> }
  const pending = new Map<string, Pending>()

  function on(topic: string, handler: Handler) {
    if (!handlers.has(topic)) handlers.set(topic, new Set())
    handlers.get(topic)!.add(handler)
    return () => off(topic, handler)
  }

  function off(topic: string, handler: Handler) {
    handlers.get(topic)?.delete(handler)
  }

  function emitLocal(msg: MessageEnvelope<unknown>) {
    const set = handlers.get(msg.topic)
    if (set) set.forEach((h) => h(msg))
  }

  function post(msg: MessageEnvelope<unknown>) {
    targetWindow.postMessage(msg, targetOrigin)
  }

  function sendEvent<T = unknown>(topic: string, payload?: T) {
    const envelope: MessageEnvelope<T> = {
      version: 'v1',
      type: 'event',
      topic,
      cid: createCid(),
      source,
      target: targetLabel,
      ts: Date.now(),
      payload,
    }
    post(envelope)
  }

  function request<TReq = unknown, TRes = unknown>(topic: string, payload?: TReq, timeoutMs = 5000): Promise<TRes> {
    const cid = createCid()
    const envelope: MessageEnvelope<TReq> = {
      version: 'v1',
      type: 'request',
      topic,
      cid,
      source,
      target: targetLabel,
      ts: Date.now(),
      payload,
    }
    return new Promise<TRes>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(cid)
        reject(new Error(`Request timeout for ${topic} (${cid})`))
      }, timeoutMs)
      pending.set(cid, { resolve: (v) => resolve(v as TRes), reject: (e) => reject(e), timer })
      post(envelope)
    })
  }

  function respond<T = unknown>(request: MessageEnvelope<unknown>, payload?: T, status: 'ok' | 'error' = 'ok', error?: { code: string; message: string }) {
    const response: MessageEnvelope<T> = {
      version: 'v1',
      type: 'response',
      topic: request.topic,
      cid: request.cid,
      source,
      target: request.source,
      ts: Date.now(),
      payload,
      status,
      error,
    }
    post(response)
  }

  function listener(ev: MessageEvent) {
    if (ev.origin !== allowedOrigin) return
    const data = ev.data as MessageEnvelope<unknown>
    if (!data || data.version !== 'v1' || !data.type || !data.topic) return

    if (data.type === 'response' && pending.has(data.cid)) {
      const p = pending.get(data.cid)!
      clearTimeout(p.timer)
      pending.delete(data.cid)
      if (data.status === 'ok') p.resolve(data.payload)
      else p.reject(data.error ?? { code: 'error', message: 'Unknown error' })
      return
    }

    emitLocal(data)
  }

  selfWindow.addEventListener('message', listener)

  function dispose() {
    selfWindow.removeEventListener('message', listener)
    handlers.clear()
    pending.forEach((p) => clearTimeout(p.timer))
    pending.clear()
  }

  return { on, off, sendEvent, request, respond, dispose }
}
