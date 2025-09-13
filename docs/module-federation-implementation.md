# Module Federation Implementation Guide

Tài liệu này mô tả việc triển khai Module Federation trong Super Admin Portal, cho phép tích hợp chặt chẽ các ứng dụng frontend thông qua runtime module loading.

## Tổng quan

Module Federation cho phép:
- **Host Application (Shell)**: Load remote modules dynamically
- **Remote Applications**: Expose components/modules để host sử dụng
- **Shared Dependencies**: React, React-DOM được share giữa host và remotes
- **Security**: Token-based authentication với scoped permissions

## Kiến trúc

```
Shell (Host) - Port 3000
├── Load Remote Modules
├── Manage Authentication
├── Provide Token via Props
└── Cache Token by Scopes

Remote App (mini-portal-mf) - Port 5174
├── Expose Widget Component
├── Request Token via Props
├── Call APIs with Token
└── No Direct Token Management
```

## Cấu hình

### Shell (Host Application)

**vite.config.ts**:
```typescript
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'super_admin_shell',
      remotes: {
        'mini_portal_mf': 'http://localhost:5174/assets/remoteEntry.js',
      },
      shared: ['react', 'react-dom']
    })
  ],
  // ... other config
});
```

**TypeScript Declarations** (`src/types/remote-modules.d.ts`):
```typescript
declare module 'mini_portal_mf/Widget' {
  import type { ComponentType } from 'react'
  interface Props {
    title?: string
    onRequestToken?: (scopes: string[]) => Promise<string>
  }
  const Widget: ComponentType<Props>
  export default Widget
}
```

**MF Adapter** (`src/shared/mf-adapter.ts`):
- Manages token caching by scopes
- Provides `onRequestToken` function to remotes
- Handles token refresh before expiration (30s buffer)
- Makes backend calls to `/auth/app/login`

### Remote Application (mini-portal-mf)

**vite.config.ts**:
```typescript
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mini_portal_mf',
      filename: 'remoteEntry.js',
      exposes: {
        './Widget': './src/Widget.tsx',
        './App': './src/App.tsx'
      },
      shared: ['react', 'react-dom']
    })
  ],
  server: {
    port: 5174,
    strictPort: true
  },
  // ... other config
});
```

**Widget Component** (`src/Widget.tsx`):
```typescript
type Props = {
  title?: string;
  onRequestToken?: (scopes: string[]) => Promise<string>;
};

export default function Widget({ title = 'MF Widget', onRequestToken }: Props) {
  const [message, setMessage] = React.useState('');

  const request = async () => {
    try {
      const token = await onRequestToken?.(['read:demo']) ?? 'no host handler';
      setMessage(`token: ${token.slice(0, 12)}...`);
    } catch (err) {
      setMessage('failed to get token');
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
      <strong>{title}</strong>
      <div>
        <button onClick={request}>Request Token</button>
      </div>
      {message && <small>{message}</small>}
    </div>
  );
}
```

### Backend Configuration

**App Registration** (seed-apps.ts):
```typescript
// Module Federation apps
{
  name: 'shell-mf-host',
  url: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  icon: 'desktop',
  allowedScopes: ['read:demo', 'read:users', 'read:apps'],
},
{
  name: 'mini_portal_mf',
  url: 'http://localhost:5174',
  origin: 'http://localhost:5174',
  icon: 'appstore',
  allowedScopes: ['read:demo'],
}
```

## Usage trong Shell

```typescript
import React, { Suspense } from 'react'
import { MfAdapter } from '../../shared/mf-adapter'

const Widget = React.lazy(() => import('mini_portal_mf/Widget'))

export default function MfDemo() {
  return (
    <div style={{ padding: 16 }}>
      <h2>Module Federation Demo</h2>

      <Suspense fallback={<div>Loading remote widget...</div>}>
        <Widget
          title="MF Remote Widget"
          {...MfAdapter.createRemoteProps()}
        />
      </Suspense>
    </div>
  )
}
```

## Security Model

### 1. Token Flow
1. Shell authenticates user và có user JWT token
2. Remote component cần token → gọi `onRequestToken(scopes)`
3. Shell sử dụng user token để gọi `/auth/app/login` với `appName: 'shell-mf-host'`
4. Backend trả app-specific token với scopes được phép
5. Shell cache token và trả về cho remote
6. Remote sử dụng token để gọi APIs

### 2. Scopes & Permissions
- **Backend validation**: Kiểm tra app `allowedScopes` vs `requestedScopes`
- **Origin validation**: Kiểm tra origin của app request
- **Token scoping**: App token chỉ có quyền theo scopes được phép

### 3. Best Practices
- **No token storage in remotes**: Remote apps không lưu token
- **Scoped access**: Chỉ request scopes cần thiết
- **Shared dependencies**: React/ReactDOM shared để tránh conflicts
- **Error handling**: Graceful fallback khi token request fails

## Development Setup

1. **Start Backend**:
   ```bash
   cd super-admin-api
   npm run start:dev
   ```

2. **Start Remote App**:
   ```bash
   cd mini-portal-mf
   npm run dev  # Port 5174
   ```

3. **Start Shell**:
   ```bash
   cd super-admin-shell
   npm run dev  # Port 3000
   ```

4. **Test Flow**:
   - Navigate to `http://localhost:3000`
   - Login với user account
   - Go to Module Federation Demo page
   - Click "Request Token" button trong remote widget
   - Verify token được hiển thị (first 12 chars)

## Troubleshooting

### Common Issues

1. **Remote not loading**:
   - Check remote app đang chạy trên port 5174
   - Verify `remoteEntry.js` accessible via `http://localhost:5174/assets/remoteEntry.js`
   - Check browser console for Federation errors

2. **Token request fails**:
   - Verify user đã login vào Shell
   - Check app registration trong database (scopes, origin)
   - Monitor network requests tới `/auth/app/login`

3. **CORS errors**:
   - Ensure backend CORS config cho phép localhost:3000 và localhost:5174
   - Check browser developer tools network tab

4. **Shared dependency conflicts**:
   - Verify React versions match giữa host và remote
   - Check Vite build output cho shared modules

### Network Debugging

Monitor các requests sau:
- `GET /auth/silent` - Shell SSO check
- `GET /users/me` - User profile
- `POST /auth/app/login` - Token request for MF
- API calls từ remote với app token

## Next Steps

- [ ] Add production build support (static remoteEntry URLs)
- [ ] Implement CSP headers cho Module Federation
- [ ] Add runtime remote discovery
- [ ] Performance monitoring cho remote loading
- [ ] Error boundaries cho remote failures
