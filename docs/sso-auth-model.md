# SSO & Auth Model (Shell as Provider)

This document details the SSO design, token formats, flows, and security considerations. Shell (SuperPortal) acts as the SSO provider; API Core validates tokens; MiniPortals receive scoped access tokens via postMessage (auth:init/auth:token).

## Tokens

- Access Token (JWT, RS256 recommended)
  - lifetime: 5–15 minutes
  - audience (aud): `app:{appId}`
  - issuer (iss): Shell origin (e.g., https://superportal.local)
  - subject (sub): userId
  - scopes: string[] (see hybrid-contract.md)
  - appId: string
  - iat/exp/nbf standard claims
  - optional: tenantId, roles (flattened for convenience)

- Refresh Token
  - httpOnly cookie scoped to Shell origin; not exposed to MiniPortal.
  - rotation enabled; tied to session id.

- JWKS
  - Expose `/.well-known/jwks.json` from API Core (or Shell auth service) for RS256 validation.

## Flows

1) Login (Shell)
- User submits credentials at Shell → issues refresh cookie and initial session.

2) Token Exchange for MiniPortal (silent SSO)
- MiniPortal sends `auth:init` (request) with { appId, scopes }
- Shell verifies origin + app registry (origin allowlist, allowedScopes)
- Shell issues access token (aud=app:{appId}, scopes subset) → sends `auth:token` (event)

3) Refresh
- Shell monitors token expiry; proactively pushes new token (optional) or MiniPortal re-requests via `auth:init`.
- Refresh performed by Shell using refresh cookie; MiniPortal never sees refresh token.

4) Logout
- Shell clears session (refresh cookie) and broadcasts `auth:logout` to all iframes.

## Security Controls

- Origin allowlist per app; reject messages from unknown origins.
- CSP: restrict frame-src to registered origins, sandbox iframes with `allow-scripts allow-same-origin`.
- Short-lived access tokens; refresh only at Shell. RS256 signing + JWKS rotation.
- Scope enforcement both at Shell (for shell-only actions) and API Core (for data access).
- Correlation ID propagation via `X-Request-Id` for audit and tracing.

## API Endpoints (Core/NestJS)

- POST /auth/login → { accessToken?, set-cookie refresh }
- POST /auth/refresh → { accessToken }
- GET /.well-known/jwks.json → JWKS keys
- GET /users/me (scope: users:read)

## JWT Claims (example)

```
{
  "iss": "https://superportal.local",
  "sub": "user_123",
  "aud": "app:mini-portal-demo",
  "scp": ["users:read", "bus:publish"],
  "appId": "mini-portal-demo",
  "roles": ["admin"],
  "tenantId": "t1",
  "iat": 1731326400,
  "exp": 1731327300
}
```

## Error Handling

- On `auth:init` failure, Shell responds with `type:'response'`, `status:'error'`, `error:{code,message}`.
- MiniPortal should surface error and optionally retry with backoff.

## Implementation Notes

- See `super-admin-shell/src/shared/sso.ts` for a shell-side sample that handles `auth:init` and emits `auth:token`.
- Replace the demo `issueToken` with real session-backed issuance and RS256 signing.
- Align scopes with `docs/hybrid-contract.md` and enforce in NestJS guards.
