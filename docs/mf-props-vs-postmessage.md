# Module Federation (props) vs postMessage (iframe)

Tài liệu này so sánh hai cách giao tiếp giữa host (super-admin-shell) và mini-app:
- Props/hàm handler (Module Federation – MF): host truyền các handler theo dạng props cho remote, ví dụ ShellBridge trong `mini-portal-mf`.
- postMessage (iframe bridge): host và iframe nói chuyện qua `window.postMessage` theo hợp đồng topic/reqId/origin.

Tài liệu áp dụng trực tiếp cho repo này, tham chiếu:
- Module Federation: xem `docs/module-federation.md`, `docs/dynamic-module-federation.md`, `docs/module-federation-implementation.md`.
- Iframe bridge + SSO: xem `docs/silent-sso-contract.md`, `docs/hybrid-contract.md`, `docs/event-bus-contract.md`.

## Bối cảnh trong repo

- Nhánh MF (cùng trang):
  - SDK: `mini-portal-mf/src/sdk/shell-bridge.ts` (các handler: `onRequestToken`, `onGetProfile`, `onGetApps`, `onLogout`).
  - Remote ví dụ: `mini-portal-mf/src/Widget.tsx` sử dụng ShellBridge qua props.
  - Host loader: `super-admin-shell/src/components/DynamicAppViewer.tsx` (có `ensureViteFederationShares()` để chia sẻ React/JSX runtime cho Vite Federation).
- Nhánh iframe (khác origin/cần sandbox):
  - Hợp đồng SSO + event bus: `docs/silent-sso-contract.md`, `docs/hybrid-contract.md`, `docs/event-bus-contract.md`.
  - Phía shell: `super-admin-shell/src/shared/sso.ts` và `super-admin-shell/src/shared/IframeHost.tsx` (bridge postMessage; phát các topic: `app:ready`, `auth:init`, `auth:token`, `auth:error`).

## So sánh nhanh

- Hiệu năng
  - Props (MF): gọi hàm trực tiếp trong cùng ngữ cảnh JS, không phải serialize. Độ trễ thấp, overhead nhỏ nhất.
  - postMessage (iframe): structured clone + hop event loop; overhead cao hơn, dễ thấy nếu gọi chatty/nhiều request.

- An toàn/biên giới
  - Props: không tách process; bug hoặc hành vi xấu từ remote có thể ảnh hưởng host nhiều hơn.
  - postMessage: tách qua iframe (origin, CSP `frame-src`), có thể validate `event.origin` và giới hạn quyền; giảm blast radius.

- Trải nghiệm dev và type-safety
  - Props: TypeScript end-to-end, API rõ ràng (Promise/throw), test/mocking đơn giản. DX tốt cho MF/React.
  - postMessage: cần envelope (topic, reqId, version), timeout/retry, mapping lỗi. Type-safety gián tiếp qua schema.

- Ghép nối/triển khai độc lập
  - Props: phụ thuộc runtime/React singletons/share scope. Repo đã xử lý chia sẻ qua `ensureViteFederationShares()` nên ổn.
  - postMessage: lỏng hơn, không phụ thuộc React/bundler; hợp nhất app đa công nghệ, khác domain dễ hơn.

- Lỗi và kiểm soát luồng
  - Props: lỗi đi thẳng call stack/Promise; quan sát dễ.
  - postMessage: phải chuyển lỗi qua message; cần timeout để tránh treo.

## Khi nào dùng props (MF)

Ưu tiên props nếu:
- Remote được nạp bằng Module Federation trên cùng trang (cùng origin hoặc có thể chia sẻ singleton React).
- Cần latency thấp, gọi hàm trực tiếp với type-safety.
- Có quyền kiểm soát share scope (đã làm trong `DynamicAppViewer`).

Trong repo này:
- `mini-portal-mf` dùng ShellBridge qua props là lựa chọn đúng, đơn giản, ít boilerplate và nhanh.

## Khi nào dùng postMessage (iframe)

Chọn postMessage nếu:
- Mini-app chạy trong iframe (khác origin hoặc cần sandbox/CSP nghiêm ngặt).
- Cần tách biệt an ninh và công nghệ (Angular/Vue/legacy app) hoặc không muốn phụ thuộc vào React/Module Federation.

Lưu ý bắt buộc:
- Luôn kiểm tra `event.origin` và `event.source` trước khi xử lý.
- Sử dụng envelope có `topic`, `reqId`, `version`, và trường `requestedScopes` rõ ràng.
- Thêm `timeout` (5–10s) + retry và mapping lỗi có `code`/`message`.

## Khuyến nghị cho repo này

- Tiếp tục dùng props cho nhánh Module Federation:
  - `mini-portal-mf` → ShellBridge qua props (`getToken`, `getProfile`, `getApps`, `logout`).
- Tiếp tục dùng postMessage cho nhánh iframe:
  - `mini-portal-demo` và các app nhúng → event bus theo các docs SSO/Hybrid.
- Đồng nhất API xuyên hai hướng bằng interface chung:
  - Dùng hai adapter:
    - MFAdapter: chuyển handler của host thành props cho remote (đã có `super-admin-shell/src/shared/mf-adapter`).
    - IframeBridge: thực thi cùng interface nhưng gọi qua event bus postMessage (tham chiếu `super-admin-shell/src/shared/IframeHost.tsx`).

## Lưu ý thực tế

- Token flow: giữ mô hình “pull-based” như `onRequestToken(scopes)` để hạn chế rò rỉ; không broadcast token.
- Scopes: host phải validate scopes, audit, và chỉ cấp đúng phạm vi; với postMessage phải lọc theo `origin` + scopes được cấp sẵn từ server.
- Timeouts: cho cầu postMessage, mặc định 5–10s, retry 1 lần, lỗi chuẩn hóa có mã và thông điệp.
- Versioning: kèm `version` trong envelope để nâng cấp hợp đồng mà không phá vỡ tương thích.

## Tài liệu liên quan

- [Module Federation – tổng quan](./module-federation.md)
- [Dynamic Module Federation](./dynamic-module-federation.md)
- [Triển khai Module Federation](./module-federation-implementation.md)
- [Silent SSO contract](./silent-sso-contract.md)
- [Hybrid contract (topics/scopes + samples)](./hybrid-contract.md)
- [Event bus contract](./event-bus-contract.md)
