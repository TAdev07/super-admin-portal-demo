# Event Bus Contract (v1)

This extends `hybrid-contract.md` with detailed topics, request/response rules, correlation IDs, and error codes.

## Envelope
- See base in `docs/hybrid-contract.md`.
- All messages MUST include `version:'v1'`, `cid` (UUID), and `ts` (ms).

## Correlation ID
- For request/response, the response MUST carry the same `cid`.
- For event chains (e.g., user action → API call), reuse/extract the originating `cid` when possible.
- When calling API Core, set `X-Request-Id: <cid>` on outbound HTTP.

## Topics

Auth
- auth:init (req): { appId: string; scopes?: string[] }
- auth:token (event): { token: string; exp: number }
- auth:logout (event)

App Lifecycle & UI
- app:ready (event)
- app:resize (event): { width?: number; height?: number }
- ui:toast (event): { level: 'info'|'warn'|'error'; message: string }

Navigation
- nav:go (event): { path: string; params?: Record<string,string> }

Event Bus Pub/Sub
- bus:subscribe (req): { topics: string[] }
- bus:publish (event): { topic: string; data: unknown }

Errors (response)
- status: 'error'; error: { code: string; message: string }
- Common codes: 'timeout', 'forbidden', 'invalid_origin', 'app_mismatch', 'invalid_scope', 'token_issue_failed', 'unknown'

## Security Guards on Shell
- Origin allowlist: ignore messages from unexpected origins.
- App registry: validate appId, allowedScopes.
- nav:go: require 'nav:write' scope when initiated by MiniPortal.
- bus:subscribe/publish: require proper scopes.

## Back-pressure & Timeouts
- Default request timeout: 5s. Clients should implement retry with backoff when safe.
- Shell may rate limit per appId.

## Versioning
- Messages include version='v1'. Breaking changes will bump version; Shell may support multiple versions concurrently.
