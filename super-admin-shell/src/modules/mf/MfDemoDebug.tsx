import React, { useState, useRef, useCallback } from 'react'
import { MfAdapter } from '../../shared/mf-adapter'

// Debug component để theo dõi API calls
function DebugLogger({ onClear }: { onClear: () => void }) {
  const [calls, setCalls] = useState<string[]>([])
  const logRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const originalLog = console.log
    const originalError = console.error

    console.log = (...args) => {
      const message = args.join(' ')
      if (message.includes('MF Token') || message.includes('cache')) {
        setCalls(prev => [...prev, `[LOG] ${new Date().toLocaleTimeString()}: ${message}`])
      }
      originalLog(...args)
    }

    console.error = (...args) => {
      const message = args.join(' ')
      if (message.includes('MF Token') || message.includes('Failed')) {
        setCalls(prev => [...prev, `[ERROR] ${new Date().toLocaleTimeString()}: ${message}`])
      }
      originalError(...args)
    }

    return () => {
      console.log = originalLog
      console.error = originalError
    }
  }, [])

  React.useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [calls])

  const clearLogs = () => {
    setCalls([])
    onClear()
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: 10, margin: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h4>Debug Log - MF Token Calls</h4>
        <button onClick={clearLogs}>Clear Logs</button>
      </div>
      <div
        ref={logRef}
        style={{
          height: 150,
          overflow: 'auto',
          backgroundColor: '#f5f5f5',
          padding: 8,
          fontSize: '12px',
          fontFamily: 'monospace'
        }}
      >
        {calls.length === 0 ? (
          <div style={{ color: '#666' }}>No MF token calls yet...</div>
        ) : (
          calls.map((call, i) => (
            <div key={i} style={{
              color: call.includes('[ERROR]') ? 'red' : 'black',
              marginBottom: 2
            }}>
              {call}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Type provided by src/types/remote-modules.d.ts via Module Federation runtime
const Widget = React.lazy(() => import('mini_portal_mf/Widget'))

export default function MfDemo() {
  // Track renders to detect infinite re-renders
  const renderCountRef = useRef(0)
  renderCountRef.current++

  // Stable props để tránh re-render liên tục
  const widgetProps = React.useMemo(() => {
    console.log('MfDemo: Creating widget props, render count:', renderCountRef.current)
    return MfAdapter.createRemoteProps({
      title: "MF Remote Widget"
    })
  }, [])

  const clearCache = useCallback(() => {
    MfAdapter.clearCache()
    console.log('MF Token cache cleared')
  }, [])

  return (
    <div style={{ padding: 16 }}>
      <h2>Module Federation Demo</h2>

      <div style={{
        padding: 10,
        backgroundColor: '#e6f3ff',
        border: '1px solid #b3d9ff',
        marginBottom: 15,
        borderRadius: 4
      }}>
        <strong>Debug Info:</strong>
        <div>Component renders: {renderCountRef.current}</div>
        <button onClick={clearCache} style={{ marginTop: 5 }}>Clear Token Cache</button>
      </div>

      <DebugLogger onClear={clearCache} />

      <p>Remote widget below is loaded from mini-portal-mf via Module Federation.</p>
      <p>The remote app can request tokens with specific scopes through the Shell adapter.</p>

      <React.Suspense fallback={<div>Loading remote widget...</div>}>
        <Widget {...widgetProps} />
      </React.Suspense>

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
