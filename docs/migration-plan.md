# Kế hoạch Migration & Milestones

## Mục tiêu tổng thể
- Xây dựng super-admin shell đa tenant an toàn, host các mini-portal tách biệt.
- Tập trung hoá xác thực (authN) & phân quyền (authZ) với JWT + refresh rotation + silent SSO.
- Kiến trúc mở rộng dựa trên sự kiện (navigation, UI signals, audit trail).
- Governance & Observability: rate limiting, metrics, dashboards, bảo mật.
- Giảm thời gian tích hợp micro-portal mới & đảm bảo tính toàn vẹn bảo mật.

## Chỉ số thành công (Success Metrics)
- p95 vòng đời request auth < 250ms.
- Tỷ lệ silent SSO thành công > 98%.
- < 1% lượt từ chối authZ sai (qua audit sample).
- Thời gian trung bình tích hợp portal mới < 2 ngày.
- Không còn lỗ hổng nghiêm trọng (CVSS ≥ 9) tại các cổng release.

## Phase 0 – Foundation (Hoàn thành / Retro)
**Scope đã làm:**
- NestJS API skeleton, entities cơ bản (apps, users).
- Audit log entity + interceptor.
- Event bus contract bản nháp.
- Correlation-ID middleware.

**Thiếu / Cần bổ sung:**
- Chuẩn hoá schema audit (versioning).
- Taxonomy lỗi & chuẩn mã lỗi.
- Structured logging (trace/span IDs).
- Seed script idempotent.

**Retro Action Items:**
- Thêm logging formatter (JSON + fields chuẩn: request_id, user_id, app_id).
- Baseline migration thay vì rely vào sync.
- Document phiên bản payload event & quy tắc tăng version.

## Phase 1 – Silent SSO + `/users/me` PoC
**Mục tiêu:** Shell nhúng (iframe) lấy context người dùng không cần tương tác.

**Deliverables:**
- Endpoint silent token (phục vụ iframe; cookie `SameSite=None; Secure`).
- `/auth/refresh` & `/users/me` trả roles + effective scopes.
- Frontend shell: iframe ẩn hoặc cơ chế postMessage bootstrap.
- Chiến lược Anti-CSRF (double-submit token hoặc kiểm tra Origin + SameSite).

**Nhiệm vụ chính:**
- Thêm route `/auth/silent` thiết lập refresh cookie httpOnly.
- Hoàn thiện handshake bridge trong `sdk/shell-bridge.ts` (message types: `INIT`, `AUTH_RESULT`, `ERROR`).
- Thêm caching ngắn hạn (ETag hoặc TTL 30s) cho user context.
- Integration test: shell load → lấy access token → gọi `/users/me`.

**Exit Criteria:**
- Thời gian lấy user context cold < 400ms.
- Silent refresh thành công 5 lần liên tiếp qua reload.
- Observability: metric `silent_login_success_rate` & `refresh_token_latency` hiển thị.

**Rủi ro & Giảm thiểu:**
- Trình duyệt chặn third-party cookie → fallback truyền token từ parent qua postMessage.
- Race condition refresh song song → lock theo user/session.

## Phase 2 – Roles / Permissions / Scopes Guard
**Mục tiêu:** Thực thi chính sách tập trung.

**Data Model:**
- `roles(id, name, description)`
- `permissions(id, action, resource, scope_expression?)`
- `role_permissions (role_id, permission_id)`
- `user_roles (user_id, role_id)`

**Guard:** Decorator `@Scopes('resource:action')` ánh xạ sang set permission.

**Nhiệm vụ:**
- Hoàn thiện `permission-mapping.service.ts` (precompute effective scope list).
- Cache (Redis / in-memory + version stamp) + bust khi mutate.
- Migration script: seed SUPER_ADMIN, AUDITOR, DEV_PORTAL.
- E2E tests: allow/deny, revoke → cache bust.

**Exit Criteria:**
- 100% controller method: có guard hoặc đánh dấu `@Public()` rõ.
- p95 quyết định policy < 5ms (sau warm cache).
- Cache invalidation ≤ 2s sau mutation.

**Metrics:** `authz_decision_latency`, `cache_hit_ratio`, `unauthorized_attempts`.

**Rủi ro:** Nở rộng scope không kiểm soát → quy ước wildcard `resource:*` có hạn chế.

## Phase 3 – RS256 + JWKS + Refresh Rotation
**Mục tiêu:** Ký bất đối xứng & an toàn xoay vòng.

**Nhiệm vụ:**
- Sinh cặp key (KMS hoặc filesystem) gắn `kid` version.
- JWKS endpoint: `/.well-known/jwks.json` (Cache-Control: max-age=300).
- Access token TTL ngắn (5–10 phút). Refresh sliding (7 ngày).
- Lịch rotation: active + next (overlap window) → promote tự động.
- Refresh rotation: lưu hash token; reuse detection → revoke chain.
- Audit replay detection.

**Exit Criteria:**
- Mô phỏng rotation: 2 keys, key cũ verify hợp lệ trong TTL.
- Replay test tạo revoke + audit log.

**Rủi ro:** Clock skew → cho phép ±60s leeway.

**Metrics:** `token_issuance_rate`, `refresh_reuse_detected`, `jwks_cache_hit`.

## Phase 4 – Mở rộng Event Bus + UI Integration
**Mục tiêu:** Giao tiếp shell ↔ micro-frontend phong phú.

**Channels:**
- Navigation: `portal.nav.change { target }`
- Toast/UI: `ui.toast { level, message }`
- Pub/Sub generic: `custom.*` có namespace.

**Deliverables:**
- Topic registry typed trong `topics.ts` + tài liệu tự sinh.
- Bảo vệ flood/backpressure (max messages/giây mỗi iframe).
- Kiểm soát sandbox: validate origin + allowlist topic.
- Dev debug panel: hiển thị 50 sự kiện gần nhất.

**Exit Criteria:**
- 5 micro-portal ví dụ subscribe & publish toast + nhận nav.
- Negative test: topic không hợp lệ bị từ chối.

**Rủi ro:** Event storm → bộ lọc token bucket.

**Metrics:** `events_per_minute`, `dropped_events`, `invalid_event_attempts`.

## Phase 5 – Governance + Module Federation PoC
**Mục tiêu:** Vận hành & thử nghiệm build-time composition.

**Governance:**
- Rate limiting (global + per user/token) – sliding window Redis.
- Metrics exporter (Prometheus): auth requests, latency histogram.
- Dashboard (Grafana): Auth success, 4xx/5xx, latency, rate limit triggers.
- Tối ưu truy vấn audit (index phù hợp).

**Module Federation PoC:**
- 1 remote micro-portal load động so với iframe baseline.
- Đo Time-To-Interactive & bundle diff.

**Exit Criteria:**
- >= 7 KPI core có dashboard.
- TTI giảm ≥ 15% so với iframe (hoặc ghi nhận quyết định hoãn).

**Rủi ro:** Complexity creep → cô lập branch thử nghiệm.

## Phase 6 – Hardening
**Mục tiêu:** Sẵn sàng production & bảo mật nâng cao.

**Nhiệm vụ:**
- CSP strict: `default-src 'none'`; allow explicit cho script/img/font/connect; nonce inline.
- Audit dependencies weekly + fail build nếu high severity.
- Threat model (STRIDE) + mapping mitigation.
- Pentest prep: seed data giả, audit read-only channel.
- Security headers: HSTS, Referrer-Policy, Permissions-Policy, X-Frame-Options (kiểm soát embedding an toàn).
- Chaos test: JWT invalid floods, expired refresh storms.

**Exit Criteria:**
- 0 critical + high unresolved.
- CSP violation rate < 0.1% (report-only → enforce).
- Threat model được phê duyệt.

## Milestones Liên-Phase
| Mốc | Mô tả | Điều kiện Go/No-Go |
|-----|-------|---------------------|
| M0 | Foundation ổn định | Audit schema freeze + logging chuẩn |
| M1 | Silent SSO chạy | ≥98% silent_success, test pass |
| M2 | Policy enforcement | 100% protected endpoints |
| M3 | RS256 + rotation | Dual key test pass |
| M4 | Event platform | 5 portal tích hợp |
| M5 | Governance + MF quyết định | KPI dashboards live |
| M6 | Hardening sign-off | Pentest & CSP đạt yêu cầu |

## Timeline Gợi Ý (tuần)
- 1–2: Phase 1
- 3–4: Phase 2 (song song scaffold Phase 3 keys)
- 5–6: Phase 3
- 7–8: Phase 4
- 9–10: Phase 5
- 11–12: Phase 6

**Parallel hóa:** Exporter metrics bắt đầu cuối tuần 4. Thiết kế CSP tuần 8.

## Risk Matrix (Tóm tắt)
| Rủi ro | Pha | Ảnh hưởng | Giảm thiểu |
|--------|-----|-----------|------------|
| Silent SSO bị chặn cookie | 1 | Giảm UX / fallback login | Token relay parent postMessage |
| Outage rotation key | 3 | Từ chối auth diện rộng | Dry-run staging hàng tuần |
| Nở rộng permission phức tạp | 2 | Chậm release | Workshop ma trận role sớm |
| Event storm | 4 | Tắc nghẽn UI | Rate limit + bucket |
| Federation quá phức tạp | 5 | Trễ tiến độ | Tiêu chí go/no-go rõ |

## KPIs Theo Pha
- P1: `silent_login_success_rate`
- P2: `authz_decision_latency`
- P3: `key_rotation_time`, `refresh_reuse_detected`
- P4: `event_bus_error_ratio`
- P5: `rate_limit_throttle_events`, `dashboard_data_latency`
- P6: `open_vuln_count`, `csp_violation_rate`

## Chiến Lược Rollback
- Dùng feature flag cho guard, RS256, event bus mở rộng.
- Duy trì đồng thời HS256 đến khi RS256 chứng minh parity (dual-issue window).
- Canary evaluate guard rule ở chế độ “shadow” trước enforce.

## Acceptance Summary
- Mỗi pha chỉ đóng khi: test pass, monitoring cập nhật, runbook bổ sung, audit schema không phá vỡ (hoặc version mới chuẩn hoá).

## Next Steps Ngay Lập Tức
1. Thêm endpoint silent SSO + logging handshake.
2. Mở rộng `/users/me` trả enriched context.
3. Viết integration test flow silent (happy + blocked-cookie fallback).

---
Nếu cần bản tiếng Anh song song hoặc tách thành nhiều file chi tiết hơn, vui lòng yêu cầu thêm.
