# Dynamic Module Federation Architecture

This document outlines the architecture for dynamically loading and serving micro-frontend (MFE) bundles within the Super Admin Portal. This approach replaces the static, build-time configuration of remotes with a dynamic, run-time loading mechanism.

## 1. Core Concepts

The goal is to allow new or updated MFEs to be deployed and integrated into the `super-admin-shell` without requiring the shell application to be rebuilt and redeployed.

The dynamic flow consists of three main parts:
1.  **MFE Bundling**: The MFE (e.g., `mini-portal-mf`) is built into a self-contained bundle.
2.  **API for Bundle Management**: The `super-admin-api` provides endpoints to upload, store, and serve these MFE bundles.
3.  **Shell's Dynamic Loader**: The `super-admin-shell` fetches the list of available applications from the API at runtime and uses a utility to load the remote entry script (`remoteEntry.js`) on demand.

---

## 2. Detailed Workflow

### Step 1: MFE Build Process

- The `mini-portal-mf` (or any other MFE) will be configured to build into a standard output directory (e.g., `dist`).
- The build output will contain all necessary assets, including the `remoteEntry.js` file.
- After a successful build, these output files will be compressed into a single `bundle.zip` file, ready for upload.

### Step 2: API - Upload and Serving

A new module, `BundlesModule`, will be created in the `super-admin-api`.

#### **Database Schema (`App` Entity)**

The `apps` table will be extended to support dynamic modules. A new column `remoteEntry` will be added:

- `remoteEntry` (string, nullable): Stores the server-relative URL to the `remoteEntry.js` file for the MFE. If this field is populated, the shell will treat it as a dynamic MFE. If it's `null`, it might be a legacy iframe app.

#### **API Endpoints**

1.  **`POST /api/bundles/upload/:appName`**
    -   **Purpose**: Uploads a new MFE bundle.
    -   **Request**: `multipart/form-data` containing the `bundle.zip` file.
    -   **Authorization**: Requires admin privileges.
    -   **Process**:
        1.  Authenticates the user and checks for required permissions.
        2.  Validates the `appName` parameter against the existing `apps` table.
        3.  Receives the `.zip` file.
        4.  Deletes the old bundle directory for this app, if it exists.
        5.  Creates a new directory under a designated public path, e.g., `public/bundles/:appName`.
        6.  Unzips the bundle into this directory.
        7.  Verifies that `remoteEntry.js` exists within the unzipped files.
        8.  Updates the `remoteEntry` column for the corresponding app in the database with the path: `/bundles/:appName/remoteEntry.js`.
    -   **Response**: Success or error message.

2.  **Static File Serving**
    -   The NestJS application will be configured to serve static files from the `public/bundles` directory. This allows the shell to fetch the `remoteEntry.js` and other chunks.

### Step 3: Shell - Dynamic Remote Loading

The static `remotes` configuration in `super-admin-shell/vite.config.ts` will be removed.

#### **Dynamic Federation Utility**

A new utility or component (e.g., `DynamicRemoteLoader.tsx`) will be created to handle the loading logic.

- **`loadRemoteComponent(remoteName, exposedModule)` function**:
    1.  Fetches the list of apps from `GET /api/apps`.
    2.  Finds the app matching `remoteName` and retrieves its `remoteEntry` URL.
    3.  Dynamically creates a `<script>` tag in the document's head to load the `remoteEntry.js`.
    4.  Once the script is loaded, it uses the Module Federation runtime API to get the specified `exposedModule` from the remote container.
    5.  Returns the loaded component.

#### **Integration**

- The `AppViewer` or a similar component will be modified. Instead of a static import, it will use `React.lazy` combined with the `loadRemoteComponent` utility to render the MFE.
- This provides a seamless user experience with code-splitting and loading indicators.

---

## 3. Security Considerations

- **CORS**: The API must have CORS correctly configured to allow the shell (`http://localhost:3000`) to fetch scripts from the API server (`http://localhost:3001`).
- **CSP**: The `Content-Security-Policy` in `super-admin-api/src/main.ts` must be updated. The `script-src` directive will need to include `'self'` to allow loading scripts from its own origin (where the bundles are now served from).
- **Authentication**: The upload endpoint must be strictly protected to prevent unauthorized code from being deployed.

---

## 4. Development and Deployment Flow

1.  **Develop MFE**: An MFE team develops their application.
2.  **Build & Package**: They run a build script that creates the `bundle.zip`.
3.  **Upload**: An admin or a CI/CD pipeline uploads this `bundle.zip` to the API.
4.  **Live**: The application is immediately available in the `super-admin-shell` for users with the correct permissions, without any downtime or restarts.
