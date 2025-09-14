import { apiClient, getUserProfile, clearAuthData } from './auth'

/**
 * Adapter để cung cấp token cho Module Federation remotes
 * Không refresh token ở remote apps - chỉ Shell quản lý lifecycle
 */
export class MfAdapter {
  // Per-app cache: key = `${appName}|${scopesKey}`
  private static cache: Map<string, { token: string; exp: number; scopesKey: string; appName: string }> = new Map()

  /**
   * Parse JWT expiration từ token
   */
  private static parseJwtExp(token: string): number | null {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    try {
      const base64UrlDecode = (input: string): string => {
        const b64 = input.replace(/-/g, '+').replace(/_/g, '/')
        const pad = b64.length % 4 === 2 ? '==' : b64.length % 4 === 3 ? '=' : ''
        return atob(b64 + pad)
      }

      const payloadStr = base64UrlDecode(parts[1])
      const payload = JSON.parse(payloadStr) as { exp?: number }
      return typeof payload.exp === 'number' ? payload.exp : null
    } catch {
      return null
    }
  }

  /**
   * Request token với scopes từ backend
   */
  private static async requestTokenFromBackend(appName: string, scopes: string[]): Promise<{ token: string; exp: number }> {
    try {
      console.debug('[MfAdapter] Requesting token', { appName, scopes })
      const res = await apiClient.post('/auth/app/login', {
        appName,
        origin: window.location.origin,
        requestedScopes: scopes,
      })
      const { access_token } = res.data as { access_token: string; scopes: string[] }
      const parsedExp = MfAdapter.parseJwtExp(access_token)
      const exp = parsedExp ?? Math.floor(Date.now() / 1000) + 15 * 60
      return { token: access_token, exp }
    } catch (error) {
      throw new Error('Failed to get token from backend: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  /**
   * Handler để remote apps request token với scopes (với caching)
   */
  static async onRequestToken(scopes: string[] = [], appName = 'shell-mf-host'): Promise<string> {
    try {
      console.debug('[MfAdapter] onRequestToken called', { appName, scopes })
      if (!scopes || scopes.length === 0) {
        throw new Error('No scopes provided for token request')
      }
      const scopesKey = scopes.slice().sort().join('|') || '__none__'
      const cacheKey = `${appName}|${scopesKey}`
      const now = Date.now()
      const cached = MfAdapter.cache.get(cacheKey)

      // Kiểm tra cache, refresh nếu gần hết hạn (< 30s)
      if (cached && cached.exp * 1000 - now > 30_000) {
        console.log('MF Token cache hit for scopes:', scopes)
        return cached.token
      }

      console.log('MF Token cache miss, requesting new token for scopes:', scopes)
      // Request token mới từ backend
      const { token, exp } = await MfAdapter.requestTokenFromBackend(appName, scopes)
      MfAdapter.cache.set(cacheKey, { token, exp, scopesKey, appName })
      return token
    } catch (error) {
      console.error('MF Token request failed:', error)
      throw new Error('Failed to get token for remote app')
    }
  }

  /**
   * Props adapter cho remote components - STATIC method để tránh re-render
   */
  static createRemoteProps(baseProps: Record<string, unknown> & { appName?: string; defaultScopes?: string[] } = {}) {
    const { appName = 'shell-mf-host', defaultScopes = [] } = baseProps
    console.debug('[MfAdapter] createRemoteProps', { appName, defaultScopes })
    return {
      ...baseProps,
      onRequestToken: (scopes: string[] = []) => MfAdapter.onRequestToken(scopes.length ? scopes : defaultScopes, appName),
      onGetProfile: () => MfAdapter.onGetProfile(),
      onGetApps: () => MfAdapter.onGetApps(),
      onLogout: () => MfAdapter.onLogout(),
    }
  }

  /**
   * Clear cache (for testing or logout)
   */
  static clearCache() {
    MfAdapter.cache.clear()
  }

  /**
   * Expose current enriched profile cached in Shell localStorage
   */
  static async onGetProfile() {
    return getUserProfile()
  }

  /**
   * Fetch list of apps (secured by current user token)
   */
  static async onGetApps() {
    const res = await apiClient.get('/apps')
    return res.data as unknown[]
  }

  /**
   * Logout current user and clear caches
   */
  static async onLogout() {
    try {
      await apiClient.post('/auth/logout')
    } catch (e) {
      console.warn('MF logout: backend call failed', e)
    }
    clearAuthData()
    MfAdapter.clearCache()
  }
}
