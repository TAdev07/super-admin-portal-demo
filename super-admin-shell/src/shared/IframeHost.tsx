import React, { useEffect, useRef } from 'react'
import { createPostMessageBus } from './eventBus'
import { setupShellSso } from './sso'

export interface IframeHostProps {
  appId: string
  src: string
  allowedOrigin: string
  requestedScopes?: string[]
  className?: string
  style?: React.CSSProperties
}

export function IframeHost({ appId, src, allowedOrigin, requestedScopes, className, style }: IframeHostProps) {
  const ref = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = ref.current
    if (!iframe || !iframe.contentWindow) return

    const targetWindow = iframe.contentWindow
    const targetOrigin = allowedOrigin
    const selfWindow = window

    const bus = createPostMessageBus({
      selfWindow,
      targetWindow,
      targetOrigin,
      allowedOrigin,
      source: 'shell',
      targetLabel: `miniportal:${appId}`,
    })

    const sso = setupShellSso({
      selfWindow,
      targetWindow,
      allowedOrigin,
      targetOrigin,
      appId,
      defaultScopes: requestedScopes,
    })

    const offReady = bus.on('app:ready', () => {
      bus.request('auth:init', { appId, scopes: requestedScopes })
    })

    return () => {
      offReady()
      sso.dispose()
      bus.dispose()
    }
  }, [appId, allowedOrigin, requestedScopes])

  return (
    <iframe
      ref={ref}
      src={src}
      className={className}
      style={style}
      sandbox="allow-scripts allow-same-origin"
      referrerPolicy="no-referrer"
    />
  )
}

export default IframeHost
