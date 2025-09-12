import { createShellBridgeForMiniportal } from './shell-bridge'

export function createApiClient(opts: { appId: string; shellOrigin: string; apiBaseUrl: string }) {
  const bridge = createShellBridgeForMiniportal({ appId: opts.appId, shellOrigin: opts.shellOrigin })

  async function fetchJson<T>(path: string, init?: RequestInit & { scopes?: string[] }) {
    const cid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Math.random().toString(36)
    if (init?.scopes) await bridge.initAuth(init.scopes)
    const token = await bridge.getAccessToken()
    const res = await fetch(`${opts.apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Id': cid,
        Authorization: token ? `Bearer ${token}` : '',
        ...(init?.headers || {}),
      },
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return (await res.json()) as T
  }

  return { fetchJson, bridge }
}
