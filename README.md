# Super Admin Portal (Monorepo)

Monorepo gồm 3 app:
- super-admin-api (NestJS) — Auth, Users, Apps, Audit
- super-admin-frontend (Next.js App Router) — Shell UI, silent SSO, iframe host
- mini-portal-demo (Vite React TS) — Mini app mẫu dùng token từ Shell

## Quick Start (Dev)

1) Cài đặt dependencies trong từng thư mục app
2) Cấu hình env (tham khảo `.env.example` trong mỗi app)
3) Chạy:
- API: `npm run start:dev` tại `super-admin-api` (http://localhost:3001)
- Frontend: `npm run dev` tại `super-admin-frontend` (http://localhost:3000)
- Mini-portal: `npm run dev` tại `mini-portal-demo` (http://localhost:5173)

Lưu ý: Dùng cùng host (localhost vs 127.0.0.1) để cookie refresh hoạt động ổn định.

## Hybrid Strategy
- Legacy-first (Iframe + Token Bridge): cách mặc định cho app bên thứ ba, isolation tốt.
- Greenfield (Module Federation): cho app mới/được tin cậy, tích hợp UI chặt chẽ.

## Tài liệu
- System Overview: `docs/system-overview.md`
- Hybrid Contract (topics/scopes): `docs/hybrid-contract.md`
- Silent SSO Contract: `docs/silent-sso-contract.md`
- Legacy Onboarding (Iframe): `docs/legacy-onboarding.md`
- Module Federation Variant: `docs/module-federation.md`

## Troubleshooting (nhanh)
- Silent SSO fail do cookie:
  - Tránh trộn `localhost` và `127.0.0.1`
  - Dev HTTP: COOKIE_SAMESITE=lax, COOKIE_SECURE=false
  - HTTPS/cross-site iframe: COOKIE_SAMESITE=none, COOKIE_SECURE=true
- Iframe bị chặn: kiểm tra CSP `frame-src` và origin của app.
- Token gần hết hạn: Shell/SDK sẽ cấp lại trước ~20s.

## E2E/Tests
- API e2e: `npm run test:e2e` trong `super-admin-api`
- Kịch bản chính: register → silent → /users/me, app login (iframe)

## Góp ý & cải tiến
- PRs luôn được chào đón. Vui lòng cập nhật docs khi thay đổi contracts hoặc flows.
