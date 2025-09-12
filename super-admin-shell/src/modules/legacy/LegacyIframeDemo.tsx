// React 18: no default import needed
import { IframeHost } from '../../shared/IframeHost'

export default function LegacyIframeDemo() {
  const allowedOrigin = 'http://localhost:5173'
  return (
    <div style={{ padding: 16 }}>
      <h1>Legacy Iframe Demo</h1>
      <IframeHost
        appId="mini-portal-demo"
        src={`${allowedOrigin}`}
        allowedOrigin={allowedOrigin}
        requestedScopes={["read:demo"]}
        style={{ width: '100%', height: 520, border: '1px solid #ccc' }}
      />
    </div>
  )
}
