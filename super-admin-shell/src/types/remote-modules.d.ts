declare module 'mini_portal_mf/Widget' {
  import type { ComponentType } from 'react'
  interface Props {
    title?: string
    appName?: string
    defaultScopes?: string[]
    onRequestToken?: (scopes: string[]) => Promise<string>
    onGetProfile?: () => Promise<unknown> | unknown
    onGetApps?: () => Promise<unknown[]> | unknown[]
    onLogout?: () => Promise<void> | void
  }
  const Widget: ComponentType<Props>
  export default Widget
}
