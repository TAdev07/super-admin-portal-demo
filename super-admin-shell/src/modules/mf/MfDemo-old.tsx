// React 18: no default import needed
import { apiClient } from '../../shared/auth'
// Type provided by src/types/remote-modules.d.ts via Module Federation runtime
import Widget from 'mini_portal_mf/Widget'

export default function MfDemo() {
  const onRequestToken = async (scopes: string[]) => {
    const res = await apiClient.post('/auth/app/login', {
      appName: 'mini_portal_mf',
      origin: 'http://localhost:5174',
      requestedScopes: scopes,
    })
    return res.data.access_token as string
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Module Federation Demo</h2>
      <p>Remote below is loaded from mini-portal-mf via Module Federation.</p>
      <Widget title="MF Remote Widget" onRequestToken={onRequestToken} />
    </div>
  )
}
