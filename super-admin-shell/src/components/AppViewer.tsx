// React 18: no default import needed
import { useParams } from 'react-router-dom'
import IframeHost from '../modules/legacy/IframeHost'
import { useAppStore } from '../context/AppContext'

export default function AppViewer() {
  const { name } = useParams()
  const { getAppByName } = useAppStore()
  const app = name ? getAppByName(name) : undefined
  if (!app) return <div style={{ padding: 16 }}>App not found</div>
  const origin = new URL(app.url).origin
  return (
    <div style={{ padding: 16 }}>
      <h2>{app.name}</h2>
      <IframeHost
        appId={app.name}
        src={app.url}
        allowedOrigin={origin}
        requestedScopes={["read:demo"]}
        style={{ width: '100%', height: 600, border: '1px solid #ddd', borderRadius: 8 }}
      />
    </div>
  )
}
