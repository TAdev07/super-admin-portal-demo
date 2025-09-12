import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Button } from 'antd';
import {
  UserOutlined,
  AppstoreOutlined,
  TeamOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, initializing } = useAuth();
  const [stats, setStats] = useState({
    totalApps: 0,
    activeApps: 0,
    totalUsers: 1,
    onlineUsers: 1,
  });

  useEffect(() => {
    // TODO: Fetch real statistics from API (future)
    setStats({ totalApps: 0, activeApps: 0, totalUsers: 1, onlineUsers: 1 });
  }, []);

  if (initializing) return <div>Loading...</div>;
  if (!user) return <div>Chưa đăng nhập</div>;

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Statistics Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng số Apps"
              value={stats.totalApps}
              valueStyle={{ color: '#52c41a' }}
              prefix={<AppstoreOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Apps hoạt động"
              value={stats.activeApps}
              valueStyle={{ color: '#1890ff' }}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Tổng số Users"
              value={stats.totalUsers}
              valueStyle={{ color: '#722ed1' }}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Users online"
              value={stats.onlineUsers}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Welcome Card */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                Chào mừng đến với Super Admin Portal
              </span>
            }
            style={{ height: '100%' }}
          >
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '16px', marginBottom: '16px' }}>
                Xin chào <strong>{user.firstName} {user.lastName}</strong>!
                Bạn đã đăng nhập thành công vào hệ thống quản lý.
              </p>
              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '8px 0' }}>
                  <strong>Email:</strong> {user.email}
                </p>
                <p style={{ margin: '8px 0' }}>
                  <strong>Vai trò:</strong>{' '}
                  <span style={{
                    background: '#e6f7ff',
                    color: '#1890ff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}>
                    {(user.legacyRole || (user.roles?.[0]?.name ?? 'user')).toUpperCase()}
                  </span>
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                type="primary"
                icon={<AppstoreOutlined />}
                onClick={() => navigate('/apps')}
                size="large"
              >
                Quản lý Applications
              </Button>
              <Button
                icon={<TeamOutlined />}
                onClick={() => navigate('/users')}
                size="large"
              >
                Quản lý Users
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Hoạt động gần đây" style={{ height: '100%' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
              color: '#8c8c8c'
            }}>
              <AppstoreOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <p>Chưa có hoạt động nào</p>
              <p style={{ fontSize: '12px' }}>
                Các hoạt động sẽ được hiển thị ở đây
              </p>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card title="Thao tác nhanh">
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                type="primary"
                ghost
                icon={<AppstoreOutlined />}
                onClick={() => navigate('/apps')}
              >
                Thêm App mới
              </Button>
              <Button
                icon={<UserOutlined />}
                onClick={() => navigate('/users')}
              >
                Xem danh sách Users
              </Button>
              <Button
                icon={<EyeOutlined />}
              >
                Xem báo cáo
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
