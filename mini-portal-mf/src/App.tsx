import React from 'react';
import Widget from './Widget';

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Mini Portal MF</h1>
      <p>This app is a Module Federation remote exposing a Widget and the App component.</p>
      <p>Try consuming <code>mini_portal_mf/Widget</code> from the shell host.</p>
      <hr />
      <h3>Local Widget Demo</h3>
      <Widget
        title="MF Widget (Local Demo)"
        onRequestToken={async (scopes) => {
          console.log('Host received token request for scopes:', scopes);
          // Simulate a host-provided token
          return 'demo-token-from-local-host-1234567890';
        }}
      />
    </div>
  );
}
