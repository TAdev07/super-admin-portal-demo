# Target Architecture: SuperPortal Hybrid (Iframe/Microfrontend)

This document describes the system architecture for the Hybrid approach where SuperPortal (Shell) hosts MiniPortals via Iframe and, optionally, Module Federation/Props for trusted apps. The Shell is the SSO provider and event bus; the API Core (NestJS) is the authoritative data source.

## Components

- SuperPortal (Vite React)
  - SSO Provider: login/session, refresh tokens (httpOnly cookie), issue short-lived JWT per app scope.
  - Event Bus: postMessage-based bridge (Iframe) and props bridge (module MF) with versioned contracts.
  - App Host: renders Iframe(s), manages origin allowlist, CSP, sandbox, app registry.
  - UI Integrations: global nav, toasts, notifications, broadcast events.

- MiniPortals (React/Vite etc.)
  - Shell Bridge SDK: handshake auth, request/response, event publish/subscribe, token refresh.
  - App Views: business logic, call API Core with Bearer token.

- API Core (NestJS)
  - Modules: Auth, Users, Roles/Permissions, Audit, Apps Registry.
  - JWT RS256 with JWKS endpoint; scope enforcement, rate limiting, audit logging.

## Data Flows

1) Login & Session
- User logs in at Shell → session stored (refresh cookie). No third-party cookies.
- MiniPortal does silent SSO via handshake (auth:init) to obtain access token.

2) Token Issuance
- Shell verifies message origin & app registry, issues JWT with scopes (aud: app:{appId}).
- Token is short-lived (5–15 min). Shell manages refresh and pushes new token when needed.

3) App Communication
- Iframe Mode: postMessage envelope v1 (see hybrid-contract.md). Request/response via cid; events are fire-and-forget.
- Props Mode (optional): for trusted apps, pass props (user, permissions) and publish/subscribe callbacks; skip postMessage.

4) API Calls
- MiniPortal calls API Core using Bearer token with app-specific scopes. API validates via JWKS.

5) Audit & Observability
- Correlation ID (X-Request-Id) from Shell → MiniPortal → API. Audit logs include actorId, appId, action, cid.

## Integration Modes

- Iframe (default)
  - Pros: strong isolation, origin boundaries, gradual onboarding.
  - Cons: messaging complexity, cross-origin constraints.

- Module Federation / Props (optional)
  - Pros: tighter UX integration, props-based communication, no postMessage overhead.
  - Cons: lower isolation, bundle integration complexity.

## App Registry & Governance

- App(id, name, origin, allowedScopes, status)
- Shell only responds to registered origins; CSP `frame-src` restricted to registry.
- Scopes are granted per app; Shell enforces shell-only actions (nav, bus) in addition to API enforcement.

## Success Criteria (Phase 1)

- MiniPortal receives token via auth:init/auth:token and calls API Core successfully.
- Event bus working both directions with correlation IDs and timeouts.
- Logout broadcast clears sessions across iframes.

Refer to `docs/hybrid-contract.md` for the message and scope contract, and to the TS helpers in `super-admin-shell/src/shared` and `mini-portal-demo/src/sdk` for code samples.
