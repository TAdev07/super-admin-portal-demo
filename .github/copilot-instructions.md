## Copilot Instructions for Super Admin Portal

Big picture
- Monorepo with 3 apps:
  - `super-admin-api` (NestJS): auth, users, apps, audit; issues access tokens and manages refresh cookies.
  - `super-admin-frontend` (Next.js App Router): shell portal UI, silent SSO bootstrap, iframe token bridge.
  - `mini-portal-demo` (Vite React TS): sample embedded mini-app receiving tokens via postMessage.
- Auth model: access token in localStorage; refresh token is HttpOnly cookie. Frontend boots via `GET /api/auth/silent` then `GET /api/users/me` to cache enriched profile.

Dev quick start (local defaults)
- API on `http://localhost:3001` (see `super-admin-frontend/src/lib/auth.ts: API_BASE_URL`).
- Frontend on `http://localhost:3000`, mini-portal on `http://localhost:5173`.
- Run from each app dir:
  - API: `npm run start:dev` (NestJS hot-reload; tests: `npm run test:e2e`).
  - Frontend: `npm run dev`.
  - Mini-portal: `npm run dev`.

Key contracts and where to look
- Silent SSO: `GET /api/auth/silent` then `GET /api/users/me` (docs: `docs/silent-sso-contract.md`).
- Iframe token bridge: postMessage topics `app:ready`, `auth:init`, `auth:token`, `auth:error`.
  - Shell side: `super-admin-frontend/src/lib/sso.ts` and `src/components/IframeHost.tsx`.
  - Backend issuance: `POST /api/auth/app/login` (body: `{ appName, origin, requestedScopes }`).

Frontend patterns (Next.js)
- Auth state: `src/context/AuthContext.tsx`
  - On mount: read `user_profile` then call `silentAuthenticate()`.
  - Fallback to legacy `localStorage.user` if `user_profile` missing.
  - Do not clear user when silent fails (preserve current session).
- HTTP client: `src/lib/auth.ts`
  - `apiClient` with `withCredentials=true`; 401 interceptor clears storage and redirects to `/login`.
  - Storage keys: `access_token`, `user_profile`, `user` (compat). Keep these stable.
- Routing guard: `(protected)/layout.tsx` uses `useAuth()` to gate and redirect to `/login`.
- Dashboard example: `(protected)/page.tsx` reads `user` (enriched: roles/permissions/scopes).

Backend patterns (NestJS)
- Main modules: `src/auth`, `src/users`, `src/apps`, `src/audit`.
- Silent SSO endpoint lives in `src/auth/auth.controller.ts`; enriched profile in `src/users/users.controller.ts`.
- User enrichment uses relations (roles → permissions) via `UsersService.findOneWithRoles`.
- Tests: `super-admin-api/test/*.e2e-spec.ts` (uses supertest); keep types strict or cast responses where needed.

Conventions and gotchas
- Cookies: for local dev, Secure/SameSite may block refresh cookie. Use same host (avoid mixing `localhost` and `127.0.0.1`).
- Base URL is centralized in `src/lib/auth.ts`; update API host there only.
- When adding protected pages, put under `(protected)/` and consume `useAuth()`.
- When extending iframe scopes, update both bridge request in `IframeHost` and server validation.

Useful docs
- `docs/silent-sso-contract.md` (SSO + iframe bridge details).
- `docs/tasks-progress.md` (current backlog/progress).

If anything here looks off (e.g., ports, scripts, or endpoint names), tell me and I’ll sync the instructions with the current code and package.json.