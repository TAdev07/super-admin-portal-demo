# Silent SSO Contract

## Mục tiêu
Cho phép Shell (Vite React) tự động lấy access token và profile người dùng khi đã có refresh cookie HttpOnly mà không cần tương tác đăng nhập lại.

## Luồng tổng quát
1. Trình duyệt có cookie `refresh_token` (được set khi login / register trước đó, `SameSite=None; Secure` trong iframe scenario; mặc định hiện tại là lax cho login trực tiếp).
2. Frontend gọi `GET /api/auth/silent?trace=1` với `withCredentials=true`.
3. Backend:
   - Kiểm tra cookie → nếu không có: `{ authenticated: false, reason: 'no_refresh_cookie' }`.
   - Nếu có → rotate refresh + issue access token mới → set lại cookie (rotated) → trả `{ authenticated: true, access_token, durationMs }`.
4. Frontend nếu thành công → gọi `GET /api/users/me` để lấy profile enriched và cache local.

## Endpoint: `GET /api/auth/silent`
Query params:
- `trace=1` (tùy chọn) trả thêm `correlationId`, `origin` phục vụ debug.

Response (authenticated):
```json
{
  "authenticated": true,
  "access_token": "<jwt>",
  "durationMs": 42,
  "correlationId": "uuid-..." // nếu trace
}
```

Response (unauthenticated):
```json
{
  "authenticated": false,
  "reason": "no_refresh_cookie"
}
```
Hoặc:
```json
{
  "authenticated": false,
  "reason": "refresh_failed",
  "error": "Expired refresh token"
}
```

## Endpoint: `GET /api/users/me`
Trả về profile enriched:
```json
{
  "id": 1,
  "email": "user@example.com",
  "firstName": "First",
  "lastName": "Last",
  "legacyRole": "admin",
  "roles": [ { "id": 2, "name": "SUPER_ADMIN", "description": null } ],
  "permissions": ["users.read", "users.write"],
  "scopes": ["users.read", "users.write"],
  "createdAt": "2025-09-11T10:00:00.000Z",
  "updatedAt": "2025-09-11T10:00:00.000Z"
}
```

## Lưu trữ phía client
- `localStorage.access_token`: JWT hiện tại.
- `localStorage.user_profile`: JSON profile enriched.
- `localStorage.user`: bản sao để tương thích code cũ.

## Hàm tiện ích
`silentAuthenticate({ trace?: boolean })`:
- Thành công: `{ success: true, profile }`
- Thất bại: `{ success: false, reason? , error? }`

## Trạng thái UI đề xuất
| State | Điều kiện | UI |
|-------|----------|----|
| initializing | Chưa chạy xong silent | Loading spinner/text |
| authenticated | Có user_profile | Render portal |
| unauthenticated | silent trả false | Chuyển hướng hoặc CTA login |

## Bảo mật
- Refresh cookie nên chuyển `SameSite=None; Secure` khi chạy thật qua HTTPS và iframe cross-site.
- Access token chỉ nằm trong memory / localStorage (cân nhắc chuyển sang memory + BroadcastChannel để giảm nguy cơ XSS).
- Có thể thêm `X-Requested-With: XMLHttpRequest` để phân biệt request AJAX.

## Tương lai
| Mở rộng | Mô tả |
|---------|------|
| RS256 + JWKS | Thay HS256 trong Phase 3 |
| Refresh rotation reuse detect | Thêm audit log nếu reuse token cũ (Phase 3) |
| PostMessage bootstrap | Cấp token cho mini-portal child iframe sau khi silent thành công |
| ETag profile caching | Giảm tải `/users/me` (Phase tối ưu) |

## Test thủ công
1. Login thường → refresh trang → thấy dashboard không cần login lại.
2. Xóa `access_token` khỏi localStorage, giữ cookie → refresh → vẫn vào (silent chạy).
3. Xóa cả cookie (dùng DevTools) → refresh → hiển thị trạng thái chưa đăng nhập.
4. Quan sát Network: `/api/auth/silent` trước `/api/users/me`.

---
Phiên bản: 1.0 (khởi tạo)

### Sự cố: Đăng nhập rồi nhưng trang protected hiển thị "Chưa đăng nhập"
Nguyên nhân khả dĩ:
1. Trang đăng nhập chỉ lưu `user` (legacy) chưa có `user_profile` enriched. Trước bản vá, `AuthContext` chỉ ưu tiên `user_profile` nên `user` null. ĐÃ khắc phục bằng: (a) fallback đọc `user`, (b) login page sau khi nhận token gọi thêm `/users/me` và set `user_profile`.
2. Cookie refresh không gửi kèm do thiếu `withCredentials` (đã bật) hoặc cookie bị set `Secure` khi chạy HTTP local → trình duyệt bỏ qua. Giải pháp: dùng HTTPS dev hoặc tạm bỏ cờ Secure trong môi trường local.
3. Sai host: login dùng `127.0.0.1` nhưng silent dùng `localhost` (cookie domain mismatch). Đồng nhất host.
4. JWT hết hạn + refresh xoay vòng thất bại → backend trả `{ authenticated: false, reason: 'refresh_failed' }`.
5. Đồng hồ hệ thống lệch thời gian → token coi như không hợp lệ.

Chẩn đoán nhanh: DevTools Network → xem request `/auth/silent`. Nếu 200 nhưng body `authenticated:false` và `reason:no_refresh_cookie` → cookie không gửi được.

## Iframe Token Bridge (Mini-Portal)

### Mục tiêu
Cấp access token app-scoped cho mini-portal (iframe) dựa trên session shell mà không lộ refresh token.

### PostMessage Topics
| Topic | Direction | Request Payload | Response/Event Payload | Mô tả |
|-------|-----------|-----------------|------------------------|-------|
| `app:ready` | miniportal -> shell | none | (n/a) | Mini-portal báo đã khởi tạo SDK. |
| `auth:init` | shell <- miniportal (request) | `{ appId, scopes? }` | `{ ok: true }` | Yêu cầu token. Shell sẽ emit `auth:token`. |
| `auth:token` | shell -> miniportal (event) | n/a | `{ token, exp }` | Token app-scoped & thời điểm hết hạn (epoch s). |
| `auth:error` | shell -> miniportal (event) | n/a | `{ message }` | Thông báo lỗi nếu cấp token thất bại. |

### Backend Endpoint Sử Dụng
`POST /api/auth/app/login` body:
```json
{ "appName": "<appId>", "origin": "https://mini-portal.example", "requestedScopes": ["users.read"] }
```
Response (ví dụ):
```json
{ "access_token": "<jwt>", "scopes": ["users.read"] }
```

### Cache Token
- Shell cache token theo key scopes (sorted join). Làm mới khi còn <30s trước hết hạn.
- Exp tạm tính (15m). Tương lai parse JWT `exp` chuẩn.

### Bảo mật
- Chỉ chấp nhận `origin` khớp allowlist (`allowedOrigin`).
- Không chuyển refresh token vào iframe.
- Scoped token audience: `app:<name>` (theo Phase 2+).

### Trình tự
1. Iframe load → gửi `app:ready` (event).
2. Shell nhận → gửi request `auth:init` hoặc mini-portal tự gửi `auth:init` (tuỳ kiến trúc). (Hiện tại shell chủ động request trong `IframeHost`).
3. Shell gọi `/auth/app/login` → emit `auth:token`.
4. Mini-portal sử dụng token để gọi API (Authorization: Bearer ...).
5. Gần hết hạn: mini-portal gọi lại `auth:init`.

### Lỗi phổ biến
| Code | Nguyên nhân | Hướng xử lý |
|------|-------------|-------------|
| `app_mismatch` | appId sai | Kiểm tra cấu hình bridge. |
| `token_issue_failed` | Backend trả lỗi / network | Retry có backoff, hiển thị banner lỗi. |
| `auth:error` (event) | Exception chung tại shell | Log + fallback read-only mode. |

### Kịch bản thử nghiệm
1. Iframe load thấy `auth:token` trong < 1s.
2. Chặn endpoint `/auth/app/login` → nhận `auth:error`.
3. Thêm scope không hợp lệ → backend trả error → hiển thị phản hồi negative.

---
