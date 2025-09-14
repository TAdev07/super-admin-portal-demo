import React from 'react';
import { createShellBridge, type HostHandlers } from './sdk/shell-bridge';

type Props = HostHandlers & {
  title?: string;
  defaultScopes?: string[];
};

export default function Widget({ title = 'MF Widget', defaultScopes = [], ...handlers }: Props) {
  const bridge = React.useMemo(() => createShellBridge(handlers), [handlers]);
  const [output, setOutput] = React.useState<string>('');

  const run = async (fn: () => Promise<unknown>, label: string) => {
    try {
      setOutput(`${label} → running...`);
      const res = await fn();
      const text = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      setOutput(`${label} → success\n${text}`);
    } catch (e) {
      setOutput(`${label} → error: ${(e as Error).message}`);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8, maxWidth: 520 }}>
      <strong>{title}</strong>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button onClick={() => run(() => bridge.getToken(defaultScopes), 'Get Token')}>Get Token</button>
        <button onClick={() => run(() => bridge.getProfile(), 'Get Profile')}>Get Profile</button>
        <button onClick={() => run(() => bridge.getApps(), 'Get Apps')}>Get Apps</button>
        <button onClick={() => run(() => bridge.logout().then(() => 'OK'), 'Logout')}>Logout</button>
      </div>
      {output && (
        <pre style={{
          marginTop: 10,
          background: '#f7f7f7',
          padding: 8,
          borderRadius: 6,
          maxHeight: 220,
          overflow: 'auto',
          fontSize: 12
        }}>{output}</pre>
      )}
    </div>
  );
}
