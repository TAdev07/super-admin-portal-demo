import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Button, Avatar, Dropdown, Space, message } from 'antd'
import {
  UserOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  DashboardOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import 'antd/dist/reset.css'
import './styles/globals.css'
import { AuthProvider, useAuth } from './modules/auth/AuthContext'
import { AppProvider } from './context/AppContext'
import AppMenu from './components/AppMenu'
import DynamicAppViewer from './components/DynamicAppViewer'
import Dashboard from './modules/dashboard/Dashboard'
import Login from './modules/auth/Login'
import ManageApps from './modules/apps/ManageApps'
import ManageUsers from './modules/users/ManageUsers'
import type { MenuProps } from 'antd'

const { Header, Sider, Content } = Layout

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth()
  const location = useLocation()

  if (initializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Đang tải...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await logout()
    message.success('Đăng xuất thành công!')
  }

  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Thông tin cá nhân', disabled: true },
    { key: 'settings', icon: <SettingOutlined />, label: 'Cài đặt', disabled: true },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Đăng xuất', onClick: handleLogout },
  ]

  const mainMenuItems: MenuProps['items'] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/apps', icon: <AppstoreOutlined />, label: 'Quản lý Apps' },
    { key: '/users', icon: <TeamOutlined />, label: 'Quản lý Users' },
  ]

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key)
  }

  const getSelectedKey = () => {
    const { pathname } = location
    if (pathname === '/' || pathname.startsWith('/dashboard')) return ['/dashboard']
    if (pathname.startsWith('/apps')) return ['/apps']
    if (pathname.startsWith('/users')) return ['/users']
    // For dynamic routes, we don't highlight any main menu item
    if (pathname.startsWith('/app/') || pathname.startsWith('/dynamic-app/')) return []
    return ['/dashboard']
  }

  const getPageTitle = () => {
    const { pathname } = location
    if (pathname.startsWith('/dashboard')) return 'Dashboard'
    if (pathname.startsWith('/apps')) return 'Quản lý Applications'
    if (pathname.startsWith('/users')) return 'Quản lý Users'
    if (pathname.startsWith('/app/')) return `Legacy App: ${decodeURIComponent(pathname.split('/app/')[1])}`
    if (pathname.startsWith('/dynamic-app/')) return `App: ${decodeURIComponent(pathname.split('/dynamic-app/')[1])}`
    return 'Super Admin Portal'
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark" width={250} style={{ position: 'fixed', height: '100vh', left: 0, top: 0, bottom: 0 }}>
        <div style={{ height: 64, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
          {collapsed ? 'SAP' : 'Super Admin Portal'}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={getSelectedKey()} items={mainMenuItems} onClick={handleMenuClick} />
        <AppMenu collapsed={collapsed} />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'margin-left 0.2s' }}>
        <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'sticky', top: 0, zIndex: 1 }}>
          <Space>
            <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} style={{ fontSize: '16px', width: 40, height: 40 }} />
            <h1 style={{ margin: 0, fontSize: '20px' }}>{getPageTitle()}</h1>
          </Space>
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <Button type="text" style={{ height: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <span>{user?.firstName} {user?.lastName}</span>
            </Button>
          </Dropdown>
        </Header>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff', minHeight: 280 }}>
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="apps" element={<ManageApps />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="dynamic-app/:appCode" element={<DynamicAppViewer />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<ProtectedRoute><AppLayout /></ProtectedRoute>} />
          </Routes>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
