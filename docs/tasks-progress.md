## Tiến độ dự án – Super Admin Portal

Cập nhật: 2025-09-12

Tài liệu này liệt kê các hạng mục (tasks) chính, trạng thái hiện tại và ưu tiên tiếp theo. Dùng để theo dõi nhanh tiến độ toàn bộ repo: API (NestJS), Frontend (Next.js), Mini-portal demo.

### Ký hiệu trạng thái
- [x] Hoàn thành
- [~] Một phần/Đang làm
- [ ] Chưa làm

---

## 1) Phase 1 – PoC SSO + Profile
- [x] Backend: Endpoint `GET /auth/silent` (trace, refresh rotation, set cookie) – đã hoạt động.
- [x] Backend: `GET /users/me` trả profile enriched (roles, permissions, scopes).
- [x] Frontend: Axios `withCredentials`, interceptor 401 → điều hướng login.
- [x] Frontend: AuthContext khởi tạo silent SSO, cache profile, fallback legacy `user` khi thiếu `user_profile`.
- [x] Frontend: Trang `login` gọi thêm `GET /users/me` sau khi nhận token và lưu `user_profile`.
- [x] Frontend: `(protected)/layout` dùng `useAuth()` để gate & redirect `/login` khi chưa auth.
- [x] Dashboard hiển thị thông tin user, fallback vai trò (`legacyRole` hoặc `roles[0]`).
- [~] E2E: Kịch bản register → silent → `/users/me` (đã có, còn dọn lint/strict) – TODO cleanup.
- [~] Docs: Silent SSO + troubleshooting cookie – đã thêm mục sự cố; cần bổ sung ví dụ network ảnh minh hoạ (tuỳ chọn).
- [ ] Backend: Soát cấu hình cookie dev/prod (SameSite, Secure, Domain) đảm bảo silent hoạt động cả HTTP local và HTTPS prod.

Kết quả hiện tại: Trải nghiệm đăng nhập, refresh trang, và hiển thị Dashboard đã chạy ổn; case silent phụ thuộc cookie được tài liệu hoá để debug nhanh.

---

## 2) Iframe Token Bridge (Phase 1.5 – Chuẩn bị Phase 4)
- [x] Shell bridge: postMessage topics `app:ready`, `auth:init`, `auth:token`, `auth:error`.
- [x] Caching token theo scopes; làm mới khi gần hết hạn (<30s trước exp tạm tính).
- [~] Backend: Endpoint `POST /auth/app/login` – cần xác nhận/hoàn thiện phía API (request: `{ appName, origin, requestedScopes }`).
- [ ] Mini-portal SDK: Đảm bảo gọi `auth:init` với scopes và dùng header `Authorization: Bearer ...` trong sample API call.
- [ ] Parse JWT `exp` thay vì ước lượng TTL 15 phút để cache chính xác.
- [ ] Thêm retry/backoff, hiển thị lỗi thân thiện khi cấp token thất bại.

---

## 3) Roles & Permissions Enforcement (Phase 2)
- [ ] Backend: Guards/Decorators kiểm soát quyền theo scopes/permissions.
- [ ] Seed data và mapping permissions ↔ roles (kiểm thử).
- [ ] Frontend: Ẩn/hiện menu và chặn route theo quyền (HOC/Hook guard).

---

## 4) Token Security & Hardening (Phase 3)
- [ ] Chuyển JWT sang RS256 + JWKS (rotation, key mgmt).
- [ ] Refresh rotation reuse detection + Audit log.
- [ ] Chiến lược TTL: access token ngắn, sliding session, interval làm mới.

---

## 5) Event Bus Mở Rộng (Phase 4)
- [ ] Chuẩn hoá thêm topics ngoài auth (navigation, theme, telemetry…).
- [ ] Tài liệu hoá contracts + tests liên thông.

---

## 6) QA, Tooling & Bảo mật cơ bản
- [ ] Lint/Typecheck PASS toàn repo (dọn cảnh báo test backend).
- [ ] E2E flows quan trọng: login → refresh (silent) → logout; iframe cross-site.
- [ ] Rate limiting cơ bản; cấu hình Helmet/CSP phù hợp.

---

## 7) Tài liệu
- [x] Kế hoạch migration (VI) – `docs/migration-plan.md`.
- [x] Silent SSO + Iframe Bridge – `docs/silent-sso-contract.md`.
- [ ] README (quick start + troubleshooting), bao gồm cookie dev tips.

---

## Rủi ro / Ghi chú nhanh
- Khác host `localhost` vs `127.0.0.1` → cookie không gửi, silent fail.
- Cookie `Secure` khi chạy HTTP local → trình duyệt bỏ qua.
- Lệch thời gian hệ thống → JWT coi như hết hạn.

---

## Ưu tiên tuần này
1) Hoàn thiện/kiểm thử `POST /auth/app/login` (API) và flow mini-portal tiêu thụ token.
2) Dọn lint/strict test backend cho kịch bản silent SSO.
3) Chuẩn hoá cấu hình cookie dev/prod (SameSite, Secure, Domain).
4) Parse JWT `exp` để cache token chính xác trong bridge.
5) README: Quick start + mục “Lỗi thường gặp khi silent”.
