# Mini Portal MF (Module Federation)

A Vite + React TypeScript micro-frontend that exposes remote modules via Module Federation.

- Dev server: http://localhost:5174
- Remote name: `mini_portal_mf`
- Remote entry: `/assets/remoteEntry.js` (served by Vite in dev; `remoteEntry.js` in build root)
- Exposes:
  - `./Widget` – a small token-requesting widget
  - `./App` – the full app component

## Run locally

```sh
npm install
npm run dev
```

Build + preview:

```sh
npm run build
npm run preview
```

## Consume from a Vite host (example)

In a Vite host app using `@originjs/vite-plugin-federation`:

```ts
// vite.config.ts (host)
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    federation({
      remotes: {
        mini_portal_mf: 'http://localhost:5174/assets/remoteEntry.js'
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true }
      }
    })
  ]
});
```

Then import the remote in code:

```tsx
// Host component
import React from 'react';
// @ts-ignore - will be resolved at runtime by MF
import Widget from 'mini_portal_mf/Widget';

export default function RemoteWidgetHost() {
  const onRequestToken = async (scopes: string[]) => {
    // TODO: bridge to shell token service
    return 'demo-token-from-host';
  };

  return <Widget title="Remote Widget" onRequestToken={onRequestToken} />;
}
```

## Notes
- For Next.js host, consider `@module-federation/nextjs-mf` compatible with your Next version.
- Keep React and ReactDOM singletons to avoid hooks/context duplication.
- In production, serve `remoteEntry.js` with appropriate caching and SRI/CSP.
