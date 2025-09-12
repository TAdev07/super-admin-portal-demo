import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiClient } from '../shared/auth'
import { message } from 'antd'

export interface AppItem {
  id: number
  name: string
  url: string
  icon?: string
}

interface AppContextType {
  apps: AppItem[]
  loading: boolean
  selectedApp: string | null
  setSelectedApp: (app: string | null) => void
  fetchApps: () => Promise<void>
  createApp: (appData: Omit<AppItem, 'id'>) => Promise<AppItem | null>
  updateApp: (id: number, appData: Partial<Omit<AppItem, 'id'>>) => Promise<AppItem | null>
  deleteApp: (id: number) => Promise<boolean>
  getAppByName: (name: string) => AppItem | undefined
  getAppById: (id: number) => AppItem | undefined
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<AppItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedApp, setSelectedApp] = useState<string | null>(null)

  const fetchApps = useCallback(async () => {
    setLoading(true)
    try {
  const response = await apiClient.get('/apps')
      setApps(response.data)
    } catch (error) {
      console.error('Error fetching apps:', error)
      message.error('Không thể tải danh sách apps')
    } finally {
      setLoading(false)
    }
  }, [])

  const createApp: AppContextType['createApp'] = async (appData) => {
    try {
  const response = await apiClient.post('/apps', appData)
      const newApp = response.data as AppItem
      setApps((prev) => [...prev, newApp])
      message.success('Tạo app thành công!')
      return newApp
    } catch (error: unknown) {
      console.error('Error creating app:', error)
      message.error('Không thể tạo app')
      return null
    }
  }

  const updateApp: AppContextType['updateApp'] = async (id, appData) => {
    try {
  const response = await apiClient.patch(`/apps/${id}`, appData)
      const updated = response.data as AppItem
      setApps((prev) => prev.map((a) => (a.id === id ? updated : a)))
      message.success('Cập nhật app thành công!')
      return updated
    } catch (error: unknown) {
      console.error('Error updating app:', error)
      message.error('Không thể cập nhật app')
      return null
    }
  }

  const deleteApp: AppContextType['deleteApp'] = async (id) => {
    try {
  await apiClient.delete(`/apps/${id}`)
      setApps((prev) => prev.filter((a) => a.id !== id))
      message.success('Xóa app thành công!')
      return true
    } catch (error: unknown) {
      console.error('Error deleting app:', error)
      message.error('Không thể xóa app')
      return false
    }
  }

  const getAppByName = (name: string) => apps.find((a) => a.name.toLowerCase() === name.toLowerCase())
  const getAppById = (id: number) => apps.find((a) => a.id === id)

  useEffect(() => {
    fetchApps()
  }, [])

  const value: AppContextType = {
    apps,
    loading,
    selectedApp,
    setSelectedApp,
    fetchApps,
    createApp,
    updateApp,
    deleteApp,
    getAppByName,
    getAppById,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppStore() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppStore must be used within AppProvider')
  return ctx
}
