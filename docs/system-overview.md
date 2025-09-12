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
flowchart LR
  subgraph Local Dev
  FE[Shell :3000]
    API[API :3001]
    MINI[Mini-portal :5173]
    DB[(DB)]
  end
  FE <-- withCredentials /api --> API
  API --- DB
  FE -. iframe postMessage .-> MINI
  %% Optional MF path
  FE -. MF import .-> MINI
```

Notes
- Keep cookie and origins consistent (localhost vs 127.0.0.1) to avoid refresh cookie issues.
- Update scopes in both the Shell bridge and server validation when extending permissions.
