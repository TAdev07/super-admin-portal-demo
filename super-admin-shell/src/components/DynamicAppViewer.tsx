import React, { lazy, Suspense, useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactJSXRuntime from 'react/jsx-runtime';
import { useParams } from 'react-router-dom';
import { Spin, Alert } from 'antd';
import { apiClient } from '../shared/auth';
import type { App } from '../types/app'; // Assuming you have this type defined

// Helper to load an ESM script (Vite MF remote builds remoteEntry.js as ESM using import.meta)
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // Add tiny cache-busting to avoid stale remoteEntry after updates
    const sep = src.includes('?') ? '&' : '?';
    script.src = `${src}${sep}v=${Date.now()}`;
    // IMPORTANT: remoteEntry built by Vite is ESM and uses import.meta
    script.type = 'module';
    script.async = true;
    script.onload = () => {
      // The script is loaded, but the container might not be ready immediately.
      // We will resolve and let the component loading handle the container.
      resolve();
    };
    script.onerror = (err) => {
      console.error(`Failed to load script: ${src}`, err);
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
};

// This function creates a dynamic system for loading remote modules
// Ensure Vite Federation shared singletons for React/ReactDOM
type FederationGetFactory = () => unknown
type FederationGet = () => Promise<FederationGetFactory>
type FederationSharedEntry = {
  get: FederationGet
  loaded: boolean
  from: string
  version?: string
  eager?: boolean
}
type FederationSharedScope = Record<string, Record<string, FederationSharedEntry>>
type FederationSharedRoot = { default?: FederationSharedScope; [scope: string]: FederationSharedScope | undefined }

function ensureViteFederationShares() {
  const g = globalThis as unknown as { __federation_shared__?: FederationSharedRoot }
  if (!g.__federation_shared__) g.__federation_shared__ = {}
  if (!g.__federation_shared__.default) g.__federation_shared__.default = {}
  const scope = g.__federation_shared__.default as FederationSharedScope
  const provide = (name: string, mod: unknown, version?: string, wrapDefault = true) => {
    if (!scope[name]) scope[name] = {}
    // Use a stable provider key under the 'default' scope
    scope[name]['host'] = {
      get: () => Promise.resolve(() => {
        // Return an ESM-like namespace with default for better interop
        if (wrapDefault && mod && typeof mod === 'object' && !('default' in (mod as Record<string, unknown>))) {
          return Object.assign({ default: mod }, mod as Record<string, unknown>)
        }
        return mod
      }),
      loaded: true,
      from: 'host',
      version: version || (React as unknown as { version?: string }).version || '0.0.0',
      eager: true,
    }
  }
  provide('react', React)
  provide('react-dom', ReactDOM)
  // react/jsx-runtime is used by compiled JSX in Vite builds
  provide('react/jsx-runtime', ReactJSXRuntime, undefined, false)
}

type RemoteFactory = () => React.ComponentType<Record<string, unknown>>
type MfContainer = {
  init?: (shareScope: unknown) => Promise<void> | void
  get: (exposed: string) => Promise<RemoteFactory>
}

const loadRemoteComponent = (remoteName: string, remoteUrl: string, exposedModule: string) => {
  return lazy(async () => {
    // Provide React singletons to Vite Federation runtime before loading remote
    ensureViteFederationShares()

    // MF runtime may attach container on window under its name
    if (!((window as unknown as Record<string, unknown>)[remoteName])) {
      await loadScript(remoteUrl);
    }

    // Try Webpack-style container on window first
  let container = (window as unknown as Record<string, unknown>)[remoteName] as unknown as MfContainer | undefined;

    // Fallback for Vite Federation: dynamically import the remoteEntry as ESM module
    if (!container) {
      try {
        const mod = (await import(/* @vite-ignore */ `${remoteUrl}?import&t=${Date.now()}`)) as unknown as
          | { default?: MfContainer } & MfContainer
          | undefined;
        container = (mod?.default && 'get' in mod.default ? mod.default : (mod && 'get' in mod ? (mod as MfContainer) : undefined));
      } catch (e) {
        console.error('Failed dynamic import of remote entry:', e);
      }
    }

    if (!container) {
      throw new Error(`Remote container not found for ${remoteName}`);
    }
    // Initialize share scope if available (Webpack host). For Vite host, this may be undefined.
    // Initialize Webpack share scope when present
    // @ts-expect-error share scope is injected by Webpack when host is Webpack-based
    if (typeof __webpack_share_scopes__ !== 'undefined' && __webpack_share_scopes__?.default) {
      // @ts-expect-error share scope value
      await container.init(__webpack_share_scopes__.default);
    }
    const factory = await container.get(exposedModule);
    const mod = await factory();
    const Component = (mod && typeof mod === 'object' && 'default' in mod)
      ? (mod as { default: React.ComponentType<Record<string, unknown>> }).default
      : (mod as unknown as React.ComponentType<Record<string, unknown>>);
    return { default: Component };
  });
};

const DynamicAppViewer: React.FC = () => {
  const { appCode } = useParams<{ appCode: string }>();
  const [RemoteComponent, setRemoteComponent] = useState<React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppAndLoad = async () => {
      if (!appCode) return;

      try {
  const { data: apps } = await apiClient.get<App[]>('/apps');
  const targetApp = (apps as Array<App & { code?: string }>).find(app => app.code === appCode);

        if (targetApp && targetApp.remoteEntry) {
          // Remove /api prefix and construct correct static file URL
          const baseUrl = apiClient.defaults.baseURL?.replace('/api', '') || 'http://localhost:3001';
          const fullRemoteEntryUrl = `${baseUrl}${targetApp.remoteEntry}`;
          console.log('Loading remote entry from:', fullRemoteEntryUrl);
          const Component = loadRemoteComponent(targetApp.name, fullRemoteEntryUrl, './Widget');
          setRemoteComponent(Component);
        } else {
          setError(`App with code '${appCode}' is not configured for dynamic loading or does not exist.`);
        }
      } catch (err) {
        console.error('Failed to load app:', err);
        setError('Could not retrieve app configuration from the server.');
      }
    };

    fetchAppAndLoad();
  }, [appCode]);

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  if (!RemoteComponent) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>;
  }

  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><Spin size="large" /></div>}>
      <RemoteComponent />
    </Suspense>
  );
};

export default DynamicAppViewer;
