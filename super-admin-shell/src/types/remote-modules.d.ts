declare module 'mini_portal_mf/Widget' {
  import type { ComponentType } from 'react'
  interface Props {
    title?: string
    onRequestToken?: (scopes: string[]) => Promise<string>
  }
  const Widget: ComponentType<Props>
  export default Widget
}
