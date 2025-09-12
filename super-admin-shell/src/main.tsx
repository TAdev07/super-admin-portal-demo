import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import AppViewer from './components/AppViewer'
import Dashboard from './modules/dashboard/Dashboard'
import Login from './modules/auth/Login'
import ManageApps from './modules/apps/ManageApps'
import ManageUsers from './modules/users/ManageUsers'
import type { MenuProps } from 'antd'

const { Header, Sider, Content } = Layout

function Protected({ children }: { children: React.ReactNode }) {
  const { user, initializing } = useAuth()

  if (initializing) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
      }}>
        Đang tải...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await logout()
    message.success('Đăng xuất thành công!')
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin cá nhân',
      disabled: true,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ]

  const menuItems: MenuProps['items'] = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'apps',
      icon: <AppstoreOutlined />,
      label: 'Quản lý Apps',
    },
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: 'Quản lý Users',
    },
  ]

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'dashboard':
        window.location.href = '/'
        break
      case 'apps':
        window.location.href = '/apps'
        break
      case 'users':
        window.location.href = '/users'
        break
      default:
        break
    }
  }

  // Determine selected menu key based on current path
  const getSelectedKey = () => {
    const pathname = window.location.pathname
    if (pathname === '/') return ['dashboard']
    if (pathname.startsWith('/apps')) return ['apps']
    if (pathname.startsWith('/users')) return ['users']
    if (pathname.startsWith('/app/')) return []
    return ['dashboard']
  }

  // Get page title
  const getPageTitle = () => {
    const pathname = window.location.pathname
    if (pathname === '/') return 'Dashboard'
    if (pathname.startsWith('/apps')) return 'Quản lý Applications'
    if (pathname.startsWith('/users')) return 'Quản lý Users'
    if (pathname.startsWith('/app/')) {
      const appName = pathname.split('/app/')[1]
      return `Application: ${decodeURIComponent(appName)}`
    }
    return 'Dashboard'
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={250}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            height: 64,
            margin: '16px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: collapsed ? '14px' : '16px',
            transition: 'all 0.2s',
          }}
        >
          {collapsed ? 'SAP' : 'Super Admin Portal'}
        </div>

        {/* Navigation Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKey()}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            borderRight: 0,
            marginBottom: 16,
          }}
        />

        {/* Apps Menu */}
        <AppMenu collapsed={collapsed} />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 250, transition: 'all 0.2s' }}>
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: 40,
                height: 40,
              }}
            />
            <h1
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1890ff',
              }}
            >
              {getPageTitle()}
            </h1>
          </Space>

          <Dropdown
            menu={{ items: userMenuItems }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              type="text"
              style={{
                height: 'auto',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Avatar size="small" icon={<UserOutlined />} />
              <span style={{ fontWeight: 500 }}>
                {user?.firstName} {user?.lastName}
              </span>
            </Button>
          </Dropdown>
        </Header>

        {/* Main Content */}
        <Content
          style={{
            margin: window.location.pathname.startsWith('/app/') ? 0 : 0,
            overflow: 'auto',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <Protected>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </Protected>
            } />
            <Route path="/apps" element={
              <Protected>
                <AppLayout>
                  <ManageApps />
                </AppLayout>
              </Protected>
            } />
            <Route path="/users" element={
              <Protected>
                <AppLayout>
                  <ManageUsers />
                </AppLayout>
              </Protected>
            } />
            <Route path="/app/:name" element={
              <Protected>
                <AppLayout>
                  <AppViewer />
                </AppLayout>
              </Protected>
            } />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
