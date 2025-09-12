import axios from 'axios'

export const API_BASE_URL = 'http://localhost:3001/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    const url: string | undefined = error.config?.url
    const isSilent = url?.includes('/auth/silent')
    if (status === 401 && !isSilent) {
      clearAuthData()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') return localStorage.getItem('access_token')
  return null
}

export const getUser = () => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }
  return null
}

export const setAuthData = (token: string, user: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', token)
    localStorage.setItem('user', JSON.stringify(user))
  }
}

export const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    localStorage.removeItem('user_profile')
  }
}

export const isAuthenticated = (): boolean => !!getAuthToken()

export async function silentAuthenticate(options?: { trace?: boolean }) {
  try {
    const trace = options?.trace ? '?trace=1' : ''
    const res = await apiClient.get(`/auth/silent${trace}`)
    if (res.data?.authenticated && res.data.access_token) {
      localStorage.setItem('access_token', res.data.access_token)
      const profile = await apiClient.get('/users/me')
      localStorage.setItem('user_profile', JSON.stringify(profile.data))
      localStorage.setItem('user', JSON.stringify(profile.data))
      return { success: true, profile: profile.data }
    }
    return { success: false, reason: res.data?.reason }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export function getUserProfile() {
  if (typeof window !== 'undefined') {
    const v = localStorage.getItem('user_profile')
    return v ? JSON.parse(v) : null
  }
  return null
}
