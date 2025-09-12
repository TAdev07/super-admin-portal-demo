## Copilot Instructions for Super Admin Portal

Big picture
- Monorepo apps:
  - `super-admin-api` (NestJS): auth, users, apps, audit; issues access tokens and manages refresh cookies.
  - `super-admin-shell` (Vite React): shell portal UI, silent SSO bootstrap, iframe token bridge; optional MF host.
  - `mini-portal-demo` (Vite React TS): sample embedded mini-app receiving tokens via postMessage.
  - `mini-portal-mf` (Vite React TS): sample remote app for Module Federation.
- Auth model: access token in localStorage; refresh token is HttpOnly cookie. Shell boots via `GET /api/auth/silent` then `GET /api/users/me` to cache enriched profile.

Dev quick start (local defaults)
- API on `http://localhost:3001`.
- Shell on `http://localhost:3000` (see `super-admin-shell/vite.config.ts`).
- Mini-portal (iframe) on `http://localhost:5173`; MF remote on `http://localhost:5174`.
- Run from each app dir:
  - API: `npm run start:dev` (NestJS hot-reload; tests: `npm run test:e2e`).
  - Shell: `npm run dev`.
  - Mini-portal (iframe): `npm run dev`.
  - Mini-portal (MF): `npm run dev`.

Key contracts and where to look
- Silent SSO: `GET /api/auth/silent` then `GET /api/users/me` (docs: `docs/silent-sso-contract.md`).
- Iframe token bridge: postMessage topics `app:ready`, `auth:init`, `auth:token`, `auth:error`.
  - Shell side: `super-admin-shell/src/shared/sso.ts` and `src/shared/IframeHost.tsx` (uses `src/shared/eventBus.ts`).
  - Backend issuance: `POST /api/auth/app/login` (body: `{ appName, origin, requestedScopes }`).
- Mini-portal SDK: `mini-portal-demo/src/sdk/shell-bridge.ts` and `src/sdk/api-client.ts`.

Shell patterns (Vite React)
- Auth client: `super-admin-shell/src/shared/auth.ts`
  - `apiClient` with `withCredentials=true`; 401 interceptor clears storage and redirects to `/login`.
  - Storage keys: `access_token`, `user_profile`, `user` (compat). Keep these stable.
- SSO bootstrap: call `silentAuthenticate()` on app mount; cache `user_profile`; fallback to legacy `user` if profile missing; do not clear session if silent fails.
- Iframe host: `src/shared/IframeHost.tsx` wires event bus + SSO to child iframes.
- Event bus: `src/shared/eventBus.ts` implements versioned envelope and request/response pattern.

Backend patterns (NestJS)
- Main modules: `src/auth`, `src/users`, `src/apps`, `src/audit`.
- Silent SSO endpoint: `src/auth/auth.controller.ts` (`GET /api/auth/silent`), app-scoped token: `POST /api/auth/app/login`.
- Enriched profile: `src/users/users.controller.ts` (`GET /api/users/me`).
- User enrichment via roles → permissions; see `AuthService` and `PermissionMappingService`.
- Security: Helmet CSP configured in `src/main.ts` with dynamic `frame-src` from Apps table; simple in-memory rate limiting.
- Tests: `super-admin-api/test/*.e2e-spec.ts` (uses supertest).

Conventions and gotchas
- Cookies: for local dev, keep host consistent (`localhost` vs `127.0.0.1`).
- API base URL is centralized in `super-admin-shell/src/shared/auth.ts` as `API_BASE_URL`.
- When extending iframe scopes, update both bridge request in `IframeHost` and server validation.
- Vite servers/ports: shell 3000, demo 5173, mf 5174 (see vite configs).

Useful docs
- `docs/silent-sso-contract.md` (SSO + iframe bridge details).
- `docs/hybrid-contract.md` (topics/scopes + samples).
- `docs/module-federation.md` (MF option).
- `docs/system-overview.md` (diagrams) and `docs/tasks-progress.md` (backlog/progress).

If anything here looks off (e.g., ports, scripts, or endpoint names), tell me and I’ll sync these instructions with the current code and package.json.