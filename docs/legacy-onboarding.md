# Legacy App Onboarding (Iframe + Token Bridge)

Mục tiêu: Onboard ứng dụng legacy vào Super Admin Portal thông qua Iframe, bảo toàn tính bảo mật và trải nghiệm SSO.

## Checklist

1) Đăng ký ứng dụng (Apps)
- Tạo bản ghi App trong Admin: name, allowedOrigins (VD: https://legacy.local), allowedScopes.
- Xác nhận app hoạt động HTTPS nếu cần cookie Secure trong silent flows.

2) Nhúng Iframe
- Dùng `IframeHost` ở Shell: appId, src, allowedOrigin, requestedScopes.
- Ví dụ: `<IframeHost appId="legacy-erp" src="https://legacy.local" allowedOrigin="https://legacy.local" requestedScopes={['users:read']} />`

3) Cấu hình CSP
- Ở Shell (Next.js), thêm header:
  - `Content-Security-Policy: frame-src 'self' https://legacy.local; frame-ancestors 'none'; default-src 'self';`
  - Điều chỉnh `script-src`, `connect-src` cho API endpoints cần thiết.

4) Hợp đồng postMessage
- Legacy nhận `auth:init` và phát `app:ready` (hoặc sử dụng SDK provided nếu có thể chèn JS).
- Legacy dùng token Bearer khi gọi API: `Authorization: Bearer <token>`.

5) Kiểm thử
- Happy path: nhận `auth:token`, gọi `GET /users/me` thành công.
- Sai origin: Shell từ chối, log audit.
- Sai scopes: API từ chối 403.
- Token gần hết hạn: Shell cấp lại khi `exp` < 30s.

## Mẹo cấu hình cookie
- Dev: tránh trộn `localhost`/`127.0.0.1`. Nếu cần cross-site silent, dùng `SameSite=None; Secure`.
- Prod: luôn `Secure`, domain chuẩn; xem thêm docs/silent-sso-contract.md.

## Sự cố thường gặp
- Iframe bị chặn do CSP: kiểm tra `frame-src`.
- Cookie không gửi: do `Secure` trên HTTP, hoặc khác host.
- Lỗi clock skew: thời gian hệ thống lệch → JWT exp sai.
