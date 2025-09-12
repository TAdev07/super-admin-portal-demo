# Hybrid Contract: Envelope, Topics, Scopes (v1)

This document defines the standard message contract between SuperPortal (Shell) and MiniPortals (Apps) for the Hybrid Iframe/Microfrontend model. It also lists core API scopes and includes TypeScript samples.

## Envelope (v1)

All messages use a versioned envelope and are sent via `postMessage` when using iframes. For Module/Props integration, the same shapes apply but no `postMessage` is needed.

Fields:
- version: "v1"
- type: "request" | "response" | "event"
- topic: string (see Topics)
- cid: string (correlation id, UUID)
- source: "shell" | "miniportal"
- target: "shell" | `miniportal:{appId}`
- ts: number (epoch ms)
- payload?: any
- status?: "ok" | "error" (response only)
- error?: { code: string; message: string } (response only)

Example (auth:init request):
```
{
  "version": "v1",
  "type": "request",
  "topic": "auth:init",
  "cid": "c1d3e8...",
  "source": "miniportal",
  "target": "shell",
  "ts": 1731326400000,
  "payload": { "appId": "mini-portal-demo", "scopes": ["users:read"] }
}
```

Example (auth:token event from shell):
```
{
  "version": "v1",
  "type": "event",
  "topic": "auth:token",
  "cid": "c1d3e8...",
  "source": "shell",
  "target": "miniportal:mini-portal-demo",
  "ts": 1731326400050,
  "payload": { "token": "<jwt>", "exp": 1731327300 }
}
```

## Topics

Auth
- auth:init (miniportal→shell, request): Request a scoped access token for the app.
- auth:token (shell→miniportal, event): Deliver access token and expiry.
- auth:logout (shell→miniportal, event): Invalidate local session.

App Lifecycle & UI
- app:ready (miniportal→shell, event)
- app:resize (miniportal→shell, event)
- ui:toast (miniportal→shell, event): { level: 'info'|'warn'|'error', message: string }

Navigation
- nav:go (shell↔miniportal, event): { path: string, params?: Record<string,string> }

Event Bus (pub/sub)
- bus:subscribe (miniportal→shell, request): { topics: string[] }
- bus:publish (miniportal↔shell, event): { topic: string, data: any }

Request/Response Pattern
- Any request topic can have a paired response with identical `cid`, `type: 'response'`, and `status`.
- Default timeout: 5s. Clients should surface timeout errors.

## Scopes (API Core)

Scopes are attached to access tokens per app. Suggested base set:
- users:read, users:write
- roles:read, roles:write
- permissions:read
- audit:read, audit:write
- nav:write (allow app to request shell navigation)
- bus:publish, bus:subscribe

Scope rules are enforced in the API Core (NestJS) and also by the Shell for shell-only actions (e.g., nav:go broadcast).

## Security
- Origin allowlist per app. Shell only responds to messages from registered origins.
- CSP: restrict `frame-src` (child-src) to registered app origins. Use sandbox attributes for iframes.
- Token: short-lived JWT (e.g., 5–15 min), refresh only at Shell. RS256 + JWKS recommended.
- Versioning: `version: 'v1'` in every message. Breaking changes bump version.

## Minimal Code Samples

See:
- `super-admin-frontend/src/lib/eventBus.ts` – Event bus (shell-side helpers)
- `super-admin-frontend/src/lib/sso.ts` – SSO handshake (shell-side)
- `mini-portal-demo/src/sdk/shell-bridge.ts` – MiniPortal SDK bridge

Usage (MiniPortal → request token):
```ts
const bridge = createShellBridgeForMiniportal({ appId: 'mini-portal-demo' });
await bridge.initAuth(['users:read']);
const token = await bridge.getAccessToken();
```

Usage (Shell → host iframe):
```tsx
<IframeHost appId="mini-portal-demo" src="https://mini.local" allowedOrigin="https://mini.local" />
```
