import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Space, Tag, Typography, Avatar } from 'antd';
import {
  UserOutlined,
  EditOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { apiClient } from '../../shared/auth';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;
// const { Option } = Select;

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  legacyRole?: string;
  roles?: { id: number; name: string; description?: string | null }[];
  permissions?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsModalVisible(true);
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'red';
      case 'user':
        return 'blue';
      case 'moderator':
        return 'orange';
      default:
        return 'default';
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Avatar',
      key: 'avatar',
      width: 60,
      render: (_, record) => (
        <Avatar
          icon={<UserOutlined />}
          style={{ backgroundColor: '#1890ff' }}
        >
          {record.firstName.charAt(0)}{record.lastName.charAt(0)}
        </Avatar>
      ),
    },
    {
      title: 'Tên',
      key: 'name',
      sorter: (a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {record.firstName} {record.lastName}
          </div>
          <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
            {record.email}
          </div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: 'Vai trò',
      key: 'role',
      width: 120,
      render: (_, record) => {
        const role = record.legacyRole || record.roles?.[0]?.name || 'user';
        return (
          <Tag color={getRoleColor(role)}>
            {role.toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: 'Quyền',
      key: 'permissions',
      width: 150,
      render: (_, record) => (
        <div>
          {record.permissions?.slice(0, 2).map((perm, index) => (
            <Tag key={index} style={{ marginBottom: 2, fontSize: '12px' }}>
              {perm}
            </Tag>
          ))}
          {record.permissions && record.permissions.length > 2 && (
            <Tag color="blue" style={{ fontSize: '12px' }}>
              +{record.permissions.length - 2} more
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewUser(record)}
          >
            Xem
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            disabled
          >
            Sửa
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <Title level={3} style={{ margin: 0 }}>
            Quản lý Users
          </Title>
          <Button
            type="primary"
            icon={<UserOutlined />}
            disabled
          >
            Thêm User mới
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} users`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title="Chi tiết User"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedUser(null);
        }}
        footer={[
          <Button key="close" onClick={() => setIsModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={600}
      >
        {selectedUser && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <Avatar
                size={80}
                icon={<UserOutlined />}
                style={{ backgroundColor: '#1890ff' }}
              >
                {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
              </Avatar>
              <Title level={4} style={{ margin: '10px 0' }}>
                {selectedUser.firstName} {selectedUser.lastName}
              </Title>
              <Tag color={getRoleColor(selectedUser.legacyRole || selectedUser.roles?.[0]?.name || 'user')}>
                {(selectedUser.legacyRole || selectedUser.roles?.[0]?.name || 'user').toUpperCase()}
              </Tag>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>Email:</strong> {selectedUser.email}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <strong>ID:</strong> {selectedUser.id}
            </div>

            {selectedUser.roles && selectedUser.roles.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <strong>Vai trò chi tiết:</strong>
                <div style={{ marginTop: '8px' }}>
                  {selectedUser.roles.map((role) => (
                    <Tag key={role.id} color="blue" style={{ marginBottom: '4px' }}>
                      {role.name} {role.description && `- ${role.description}`}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            {selectedUser.permissions && selectedUser.permissions.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <strong>Quyền hạn:</strong>
                <div style={{ marginTop: '8px' }}>
                  {selectedUser.permissions.map((perm, index) => (
                    <Tag key={index} style={{ marginBottom: '4px' }}>
                      {perm}
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <strong>Ngày tạo:</strong> {new Date(selectedUser.createdAt).toLocaleString('vi-VN')}
            </div>

            <div>
              <strong>Cập nhật lần cuối:</strong> {new Date(selectedUser.updatedAt).toLocaleString('vi-VN')}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
