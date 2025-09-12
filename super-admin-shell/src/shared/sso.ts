import { createPostMessageBus } from './eventBus'
import type { MessageEnvelope } from './eventBus'
import { apiClient } from './auth'

export interface ShellSsoOptions {
  selfWindow: Window
  targetWindow: Window
  allowedOrigin: string
  targetOrigin: string
  appId: string
  defaultScopes?: string[]
}

interface CachedToken {
  token: string
  exp: number
  scopesKey: string
}

export function setupShellSso(opts: ShellSsoOptions) {
  const { selfWindow, targetWindow, allowedOrigin, targetOrigin, appId, defaultScopes = [] } = opts
  const bus = createPostMessageBus({
    selfWindow,
    targetWindow,
    targetOrigin,
    allowedOrigin,
    source: 'shell',
    targetLabel: `miniportal:${appId}`,
  })

  const cache: Map<string, CachedToken> = new Map()

  function base64UrlDecode(input: string): string {
    const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : ''
    if (typeof atob !== 'undefined') return atob(b64 + pad)
    return input
  }

  function parseJwtExp(token: string): number | null {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    try {
      const payloadStr = base64UrlDecode(parts[1])
      const payload = JSON.parse(typeof payloadStr === 'string' ? payloadStr : String(payloadStr)) as { exp?: number }
      return typeof payload.exp === 'number' ? payload.exp : null
    } catch {
      return null
    }
  }

  async function issueToken(scopes: string[]): Promise<{ token: string; exp: number }> {
    const scopesKey = scopes.slice().sort().join('|') || '__none__'
    const now = Date.now()
    const cached = cache.get(scopesKey)
    if (cached && cached.exp * 1000 - now > 30_000) {
      return { token: cached.token, exp: cached.exp }
    }
    try {
      const res = await apiClient.post('/auth/app/login', {
        appName: appId,
        origin: targetOrigin,
        requestedScopes: scopes,
      })
      const { access_token } = res.data as { access_token: string; scopes: string[] }
      const parsedExp = parseJwtExp(access_token)
      const exp = parsedExp ?? Math.floor(Date.now() / 1000) + 15 * 60
      cache.set(scopesKey, { token: access_token, exp, scopesKey })
      return { token: access_token, exp }
    } catch (e) {
      throw new Error('app_token_issue_failed: ' + (e instanceof Error ? e.message : 'Unknown error'))
    }
  }

  const unsubscribe = bus.on('auth:init', async (msg) => {
    const typed = msg as MessageEnvelope<{ appId: string; scopes?: string[] }>
    try {
      if (!typed.payload || typed.payload.appId !== appId) {
        return bus.respond(typed, undefined, 'error', { code: 'app_mismatch', message: 'Invalid appId' })
      }
      const scopes = typed.payload.scopes ?? defaultScopes
      const { token, exp } = await issueToken(scopes)
      bus.sendEvent('auth:token', { token, exp })
      bus.respond(typed, { ok: true }, 'ok')
    } catch (e) {
      bus.sendEvent('auth:error', { message: (e as Error).message })
      const message = e instanceof Error ? e.message : 'Unknown error'
      bus.respond(typed, undefined, 'error', { code: 'token_issue_failed', message })
    }
  })

  return { dispose: () => { unsubscribe(); bus.dispose() } }
}
