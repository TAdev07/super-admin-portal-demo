# Super Admin Portal (Monorepo)

Monorepo gồm các app:
- super-admin-api (NestJS) — Auth, Users, Apps, Bundles, Audit
- super-admin-shell (Vite React) — Shell UI, silent SSO, iframe host, optional MF host
- mini-portal-demo (Vite React TS) — Mini app mẫu nhận token qua postMessage
- mini-portal-mf (Vite React TS) — Remote demo cho Module Federation, có cơ chế đóng gói (bundle) để được host động bởi Shell.

## Quick Start (Dev)

1) Cài đặt dependencies trong từng thư mục app
2) Cấu hình env (tham khảo `.env.example` trong mỗi app nếu có)
3) Chạy:
- API: `npm run start:dev` tại `super-admin-api` (http://localhost:3001)
- Shell: `npm run dev` tại `super-admin-shell` (http://localhost:3000)
- Mini-portal (iframe): `npm run dev` tại `mini-portal-demo` (http://localhost:5173)
- Mini-portal (MF remote): `npm run dev` tại `mini-portal-mf` (http://localhost:5174)

Lưu ý: Dùng cùng host (localhost hoặc 127.0.0.1) nhất quán để cookie refresh hoạt động ổn định. API hiện bật CORS cho `http://localhost:3000` và prefix `api` (ví dụ: `http://localhost:3001/api/auth/silent`).

## Hybrid Strategy
- Legacy-first (Iframe + Token Bridge): cách mặc định cho app bên thứ ba, isolation tốt, cấp token app-scoped qua postMessage.
- Greenfield (Module Federation): cho app mới/được tin cậy, tích hợp UI chặt chẽ. Shell có thể host remote qua vite-plugin-federation.

## Đóng gói & Tải lên Micro-frontend (MF)

Dự án `mini-portal-mf` là một ví dụ về cách một micro-frontend (remote) có thể được đóng gói và tích hợp vào `super-admin-shell`.

1.  **Đóng gói:** Chạy lệnh `npm run bundle` trong thư mục `mini-portal-mf`. Lệnh này sẽ:
    - Xóa thư mục `dist` và file `bundle.zip` cũ.
    - Build project bằng Vite.
    - Nén toàn bộ nội dung của thư mục `dist` thành file `bundle.zip`.

2.  **Tải lên:** File `bundle.zip` này sau đó có thể được tải lên thông qua `super-admin-api` tại endpoint `POST /api/apps/with-bundle` hoặc `PATCH /api/apps/:id/with-bundle`. API sẽ giải nén và lưu trữ các file tĩnh này, cho phép `super-admin-shell` có thể tải và hiển thị remote component một cách động.

Cơ chế này cho phép các micro-frontend được phát triển và triển khai độc lập mà không cần build lại Shell chính.

## Tài liệu
- System Overview: `docs/system-overview.md`
- Hybrid Contract (topics/scopes): `docs/hybrid-contract.md`
- Silent SSO Contract: `docs/silent-sso-contract.md`
- Legacy Onboarding (Iframe): `docs/legacy-onboarding.md`
- Module Federation Variant: `docs/module-federation.md`

## Troubleshooting (nhanh)
- Silent SSO fail do cookie:
  - Tránh trộn `localhost` và `127.0.0.1` giữa login và silent.
  - Dev HTTP: COOKIE_SAMESITE=lax, COOKIE_SECURE=false (đang áp dụng cho login/refresh interactive).
  - HTTPS/cross-site iframe: COOKIE_SAMESITE=none, COOKIE_SECURE=true (đang áp dụng cho silent/iframe).
- Iframe bị chặn: kiểm tra CSP `frame-src`/`frame-ancestors` (Helmet) và origin của app trong DB.
- Token sắp hết hạn: Shell/SDK sẽ cấp lại; bridge cache theo scopes và làm mới khi <30s trước `exp`.

## E2E/Tests
- API e2e: `npm run test:e2e` trong `super-admin-api`
- Kịch bản chính: register → silent → /users/me, app login (iframe)

## Góp ý & cải tiến
- PRs luôn được chào đón. Vui lòng cập nhật docs khi thay đổi contracts hoặc flows.
