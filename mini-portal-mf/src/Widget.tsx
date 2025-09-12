import React from 'react';

type Props = {
  title?: string;
  onRequestToken?: (scopes: string[]) => Promise<string>;
};

export default function Widget({ title = 'MF Widget', onRequestToken }: Props) {
  const [message, setMessage] = React.useState('');
  const request = async () => {
    try {
      const token = await onRequestToken?.(['read:demo'])
        ?? 'no host handler';
      setMessage(`token: ${token.slice(0, 12)}...`);
    } catch (err) {
      setMessage('failed to get token');
    }
  };
  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
      <strong>{title}</strong>
      <div>
        <button onClick={request}>Request Token</button>
      </div>
      {message && <small style={{ display: 'block', marginTop: 8 }}>{message}</small>}
    </div>
  );
}
