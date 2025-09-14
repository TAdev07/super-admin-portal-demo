/**
 * ShellBridge SDK for Module Federation remotes
 * The host (super-admin-shell) passes a set of handler props to the remote.
 * This SDK provides a small, typed wrapper over those handlers.
 */

export type HostHandlers = {
  onRequestToken?: (scopes: string[]) => Promise<string>
  onGetProfile?: () => Promise<unknown> | unknown
  onGetApps?: () => Promise<unknown[]> | unknown[]
  onLogout?: () => Promise<void> | void
}

export class ShellBridge {
  constructor(private handlers: HostHandlers) {}

  async getToken(scopes: string[]): Promise<string> {
    if (!this.handlers.onRequestToken) throw new Error('Host handler onRequestToken not provided')
    return this.handlers.onRequestToken(scopes)
  }

  async getProfile<T = unknown>(): Promise<T | null> {
    const fn = this.handlers.onGetProfile
    if (!fn) return null
    const v = await Promise.resolve(fn())
    return v as T
  }

  async getApps<T = unknown>(): Promise<T[]> {
    const fn = this.handlers.onGetApps
    if (!fn) return []
    const v = await Promise.resolve(fn())
    return v as T[]
  }

  async logout(): Promise<void> {
    const fn = this.handlers.onLogout
    if (!fn) return
    await Promise.resolve(fn())
  }
}

export function createShellBridge(h: HostHandlers) {
  return new ShellBridge(h)
}
