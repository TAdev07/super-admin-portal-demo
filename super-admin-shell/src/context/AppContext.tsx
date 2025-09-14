import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { apiClient } from '../shared/auth'
import { message } from 'antd'

export interface AppItem {
  id: number
  name: string
  code: string
  icon?: string
  remoteEntry?: string
}

export interface CreateAppData {
  name: string
  code: string
  icon?: string
  bundleFile?: File
}

interface AppContextType {
  apps: AppItem[]
  loading: boolean
  selectedApp: string | null
  setSelectedApp: (app: string | null) => void
  fetchApps: () => Promise<void>
  createApp: (appData: CreateAppData) => Promise<AppItem | null>
  updateApp: (id: number, appData: Partial<CreateAppData>) => Promise<AppItem | null>
  deleteApp: (id: number) => Promise<boolean>
  uploadBundle: (appCode: string, file: File) => Promise<boolean>
  getAppByName: (name: string) => AppItem | undefined
  getAppById: (id: number) => AppItem | undefined
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<AppItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

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
      // Check if we have a bundle file
      if (appData.bundleFile) {
        const formData = new FormData()
        formData.append('name', appData.name)
        formData.append('code', appData.code)
        if (appData.icon) {
          formData.append('icon', appData.icon)
        }
        formData.append('bundle', appData.bundleFile)

        const response = await apiClient.post('/apps/with-bundle', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        const newApp = response.data as AppItem
        setApps((prev) => [...prev, newApp])
        message.success('Tạo app với bundle thành công!')
        return newApp
      } else {
        // Regular JSON request
        const jsonData = {
          name: appData.name,
          code: appData.code,
          icon: appData.icon,
        }
        const response = await apiClient.post('/apps', jsonData)
        const newApp = response.data as AppItem
        setApps((prev) => [...prev, newApp])
        message.success('Tạo app thành công!')
        return newApp
      }
    } catch (error: unknown) {
      console.error('Error creating app:', error)
      message.error('Không thể tạo app')
      return null
    }
  }

  const updateApp: AppContextType['updateApp'] = async (id, appData) => {
    console.log('appData: ', appData);
    try {
      // Check if we have a bundle file
      if (appData.bundleFile) {
        const formData = new FormData()
        if (appData.name) formData.append('name', appData.name)
        if (appData.code) formData.append('code', appData.code)
        if (appData.icon) formData.append('icon', appData.icon)
        formData.append('bundle', appData.bundleFile)

        const response = await apiClient.patch(`/apps/${id}/with-bundle`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        const updated = response.data as AppItem
        setApps((prev) => prev.map((a) => (a.id === id ? updated : a)))
        message.success('Cập nhật app với bundle thành công!')
        return updated
      } else {
        // Regular JSON request
        const jsonData = {
          name: appData.name,
          code: appData.code,
          icon: appData.icon,
        }
        const response = await apiClient.patch(`/apps/${id}`, jsonData)
        const updated = response.data as AppItem
        setApps((prev) => prev.map((a) => (a.id === id ? updated : a)))
        message.success('Cập nhật app thành công!')
        return updated
      }
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

  const uploadBundle: AppContextType['uploadBundle'] = async (appCode, file) => {
    const formData = new FormData();
    formData.append('bundle', file, file.name);

    try {
      await apiClient.post(`/bundles/upload/${appCode}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      message.success('Tải lên bundle thành công!');
      await fetchApps(); // Tải lại danh sách apps để cập nhật remoteEntry
      return true;
    } catch (error) {
      console.error('Lỗi tải lên bundle:', error);
      message.error('Không thể tải lên bundle.');
      return false;
    }
  };

  const getAppByName = (name: string) => apps.find((a) => a.name.toLowerCase() === name.toLowerCase())
  const getAppById = (id: number) => apps.find((a) => a.id === id)

  useEffect(() => {
    if (hasInitialized) return // Prevent multiple fetches
    setHasInitialized(true)
    fetchApps()
  }, [hasInitialized, fetchApps])

  const value: AppContextType = {
    apps,
    loading,
    selectedApp,
    setSelectedApp,
    fetchApps,
    createApp,
    updateApp,
    deleteApp,
    uploadBundle,
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
