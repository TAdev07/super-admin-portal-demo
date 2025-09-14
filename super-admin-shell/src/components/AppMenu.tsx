// React 18: no default import needed
import { Menu } from 'antd'
import { AppstoreOutlined, GlobalOutlined, LinkOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../context/AppContext'

export default function AppMenu({ collapsed }: { collapsed: boolean }) {
  const nav = useNavigate()
  const { apps, loading } = useAppStore()

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const app = apps.find((a) => a.id.toString() === key)
    if (app) {
      // All apps now use Module Federation with code-based routing
      nav(`/dynamic-app/${encodeURIComponent(app.code)}`)
    }
  }

  const appMenuItems: MenuProps['items'] = apps.map((app) => ({
    key: app.id.toString(),
    icon: <GlobalOutlined />,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{app.name}</span>
        {!collapsed && <LinkOutlined style={{ fontSize: 12, opacity: 0.7, marginLeft: 'auto' }} />}
      </div>
    ),
    title: collapsed ? `${app.name} - ${app.code}` : undefined,
  }))

  if (apps.length === 0 && !loading) {
    return (
      <Menu theme="dark" mode="inline" items={[{ key: 'no-apps', icon: <AppstoreOutlined />, label: collapsed ? '...' : 'Chưa có app nào', disabled: true }]} style={{ borderRight: 0 }} />
    )
  }

  return (
    <Menu
      theme="dark"
      mode="inline"
      items={[
        {
          key: 'apps-group',
          type: 'group',
          label: collapsed ? null : 'Applications',
          children: loading
            ? [{ key: 'loading', icon: <AppstoreOutlined />, label: collapsed ? '...' : 'Đang tải...', disabled: true }]
            : appMenuItems,
        },
      ]}
      onClick={handleMenuClick}
      style={{ borderRight: 0 }}
    />
  )
}
