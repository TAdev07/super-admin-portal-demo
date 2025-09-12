import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { silentAuthenticate, getUserProfile, clearAuthData, apiClient, getUser } from '../../shared/auth'

export interface EnrichedUserProfile {
  id: number
  email: string
  firstName: string
  lastName: string
  legacyRole?: string
  roles?: { id: number; name: string; description?: string | null }[]
  permissions?: string[]
  scopes?: string[]
}

interface AuthContextValue {
  user: EnrichedUserProfile | null
  loading: boolean
  initializing: boolean
  error?: string
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<EnrichedUserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | undefined>()

  const runSilent = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    const result = await silentAuthenticate({ trace: true })
    if (result.success) {
      setUser(result.profile as EnrichedUserProfile)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const enriched = getUserProfile()
    if (enriched) {
      setUser(enriched)
    } else {
      const legacy = getUser()
      if (legacy) setUser(legacy as unknown as EnrichedUserProfile)
    }
    runSilent().finally(() => setInitializing(false))
  }, [runSilent])

  const refresh = useCallback(async () => {
    await runSilent()
  }, [runSilent])

  const logout = useCallback(async () => {
    try { await apiClient.post('/auth/logout') } catch {}
    clearAuthData()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, initializing, error, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
