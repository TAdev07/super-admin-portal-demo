import React, { Suspense } from 'react'
import { MfAdapter } from '../../shared/mf-adapter'

// Type provided by src/types/remote-modules.d.ts via Module Federation runtime
const Widget = React.lazy(() => import('mini_portal_mf/Widget'))

export default function MfDemo() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Module Federation Demo</h2>
      <p>Remote widget below is loaded from mini-portal-mf via Module Federation.</p>
      <p>The remote app can request tokens with specific scopes through the Shell adapter.</p>

      <Suspense fallback={<div>Loading remote widget...</div>}>
        <Widget
          title="MF Remote Widget"
          {...MfAdapter.createRemoteProps()}
        />
      </Suspense>

      <div style={{ marginTop: 20, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
        <h4>Security Notes:</h4>
        <ul style={{ fontSize: '0.9em', margin: 0 }}>
          <li>Remote apps receive tokens via props - no direct access to Shell state</li>
          <li>Token requests are scoped and cached by Shell</li>
          <li>No refresh logic in remote apps - Shell manages token lifecycle</li>
        </ul>
      </div>
    </div>
  )
}
