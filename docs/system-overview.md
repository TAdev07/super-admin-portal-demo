# Super Admin Portal — System Overview

This page provides an at-a-glance architecture map and core flows for the monorepo. For a Microfrontend alternative using Module Federation, see module-federation.md.

## 1) System Context

```mermaid
C4Context
title Super Admin Portal - System Context

Person(admin, "Super Admin", "Manages users, apps, and permissions")
System_Boundary(sap, "Super Admin Portal") {
  System(frontend, "Super Admin Shell (Vite React)", "Shell UI, Auth bootstrap, Iframe host")
  System(api, "Super Admin API (NestJS)", "Auth, Users, Apps, Audit")
  System(mini, "Mini-Portal App (Vite)", "Embedded iframe app")
}
SystemDb(db, "Database", "Users, Roles, Permissions, Apps, Audit logs")

Rel(admin, frontend, "Uses via browser")
Rel(frontend, api, "HTTP(S) /api/* with access token & refresh cookie")
Rel(mini, frontend, "postMessage: auth:init/token/error (iframe)")
Rel(api, db, "TypeORM")
```

## 2) Silent SSO Sequence

```mermaid
sequenceDiagram
  autonumber
  participant FE as Shell (Vite React)
  participant API as Backend API
  participant DB as Database

  FE->>API: GET /api/auth/silent (withCredentials)
  API->>DB: Validate refresh session
  DB-->>API: Session OK => issue access token
  API-->>FE: 200 { authenticated: true, access_token }
  FE->>API: GET /api/users/me (Bearer access_token)
  API->>DB: Load user + roles + permissions
  API-->>FE: 200 { profile }
  FE->>FE: cache access_token + user_profile
```

## 3) Iframe Token Bridge Sequence

```mermaid
sequenceDiagram
  autonumber
  participant Mini as Mini-Portal (iframe)
  participant FE as Shell (Vite React)
  participant API as Backend API
  participant DB as Database

  Mini->>FE: postMessage app:ready
  FE->>Mini: postMessage auth:init { appId, scopes }
  FE->>API: POST /api/auth/app/login { appName, origin, requestedScopes }
  API->>DB: Validate app + origin + scopes
  DB-->>API: OK => issue app access token
  API-->>FE: 200 { token, exp }
  FE->>Mini: postMessage auth:token { token, exp }
  Mini->>API: Authorized API calls with Bearer token
```

## 3b) Module Federation (MF) Architecture & Sequence

MF is an alternative to iframe embedding for trusted remotes, enabling tighter UX and shared runtime while the Shell remains the system of record for auth and token issuance.

```mermaid
graph LR
  Shell[Super Admin Shell (Host)] -->|dynamic import| Remote[mini-portal-mf (Remote)]
  Shell -->|axios Bearer| API[NestJS API]
  Remote -->|props/context| AuthSDK[Shell Auth SDK]
  API --- DB[(DB)]
```

### MF Sequence (Loading a Remote and Token Flow)

```mermaid
sequenceDiagram
  autonumber
  participant Shell as Vite React Shell (Host)
  participant Remote as Remote Module (Vite)
  participant API as Backend API

  Shell->>Shell: silentAuthenticate() if needed
  Shell->>Remote: loadRemoteComponent("mini_portal_mf/Widget")
  Shell->>Remote: render Widget(onRequestToken)
  Remote->>Shell: onRequestToken([scopes])
  Shell->>API: POST /api/auth/app/login { appName, origin, requestedScopes }
  API-->>Shell: 200 { token, exp }
  Shell-->>Remote: resolve onRequestToken() => token
  Remote->>API: call API with Bearer token
```

## 4) Data Model (ER Overview)

```mermaid
erDiagram
  USER ||--o{ USER_ROLE : has
  ROLE ||--o{ USER_ROLE : receives
  ROLE ||--o{ ROLE_PERMISSION : grants
  PERMISSION ||--o{ ROLE_PERMISSION : partOf
  USER {
    uuid id
    string email
    string name
    datetime createdAt
  }
  ROLE {
    uuid id
    string name
    string description
  }
  PERMISSION {
    uuid id
    string key
    string description
  }
  USER_ROLE {
    uuid id
    uuid userId
    uuid roleId
  }
  ROLE_PERMISSION {
    uuid id
    uuid roleId
    uuid permissionId
  }
  APP ||--o{ APP_ORIGIN : allows
  APP ||--o{ APP_SCOPE : provides
  APP {
    uuid id
    string name
    string clientId
    string status
  }
  APP_ORIGIN {
    uuid id
    uuid appId
    string origin
  }
  APP_SCOPE {
    uuid id
    uuid appId
    string scope
  }
  AUDIT_LOG {
    uuid id
    string actor
    string action
    string target
    json metadata
    datetime timestamp
  }
```

## 5) Deployment (Dev setup)

```mermaid
graph LR
  subgraph Local_Dev
    FE[Shell :3000]
    API[API :3001]
    MINI[Mini-portal (iframe) :5173]
    MF[Mini-portal MF :5174]
    DB[(DB)]
  end
  FE -->|withCredentials /api| API
  API --- DB
  FE -.->|iframe postMessage| MINI
  %% Optional MF path
  FE -.->|MF dynamic import| MF
```

Notes
- Keep cookie and origins consistent (localhost vs 127.0.0.1) to avoid refresh cookie issues.
- Update scopes in both the Shell bridge and server validation when extending permissions.
- MF remotes receive tokens via props/callback (e.g., onRequestToken); only the Shell refreshes tokens.
- Enforce server-side validation for app origins and requested scopes for both iframe and MF flows.
