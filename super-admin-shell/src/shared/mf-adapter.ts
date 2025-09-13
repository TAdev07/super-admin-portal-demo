import { apiClient } from './auth'

/**
 * Adapter để cung cấp token cho Module Federation remotes
 * Không refresh token ở remote apps - chỉ Shell quản lý lifecycle
 */
export class MfAdapter {
  private static cache: Map<string, { token: string; exp: number; scopesKey: string }> = new Map()

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
  private static async requestTokenFromBackend(scopes: string[]): Promise<{ token: string; exp: number }> {
    try {
      const res = await apiClient.post('/auth/app/login', {
        appName: 'shell-mf-host',
        origin: window.location.origin,
        requestedScopes: scopes,
      })
      const { access_token } = res.data as { access_token: string; scopes: string[] }
      const parsedExp = this.parseJwtExp(access_token)
      const exp = parsedExp ?? Math.floor(Date.now() / 1000) + 15 * 60
      return { token: access_token, exp }
    } catch (error) {
      throw new Error('Failed to get token from backend: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  /**
   * Handler để remote apps request token với scopes (với caching)
   */
  static async onRequestToken(scopes: string[]): Promise<string> {
    try {
      const scopesKey = scopes.slice().sort().join('|') || '__none__'
      const now = Date.now()
      const cached = this.cache.get(scopesKey)

      // Kiểm tra cache, refresh nếu gần hết hạn (< 30s)
      if (cached && cached.exp * 1000 - now > 30_000) {
        console.log('MF Token cache hit for scopes:', scopes)
        return cached.token
      }

      console.log('MF Token cache miss, requesting new token for scopes:', scopes)
      // Request token mới từ backend
      const { token, exp } = await this.requestTokenFromBackend(scopes)
      this.cache.set(scopesKey, { token, exp, scopesKey })
      return token
    } catch (error) {
      console.error('MF Token request failed:', error)
      throw new Error('Failed to get token for remote app')
    }
  }

  /**
   * Props adapter cho remote components - STATIC method để tránh re-render
   */
  static createRemoteProps(baseProps: Record<string, unknown> = {}) {
    return {
      ...baseProps,
      onRequestToken: this.onRequestToken, // Sử dụng static method reference
    }
  }

  /**
   * Clear cache (for testing or logout)
   */
  static clearCache() {
    this.cache.clear()
  }
}
