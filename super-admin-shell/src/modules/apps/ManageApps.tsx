import { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  // message,
  Popconfirm,
  Tag,
  Typography
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import { useAppStore } from '../../context/AppContext';
import type { ColumnsType } from 'antd/es/table';
import type { AppItem } from '../../context/AppContext';

const { Title } = Typography;

interface AppFormData {
  name: string;
  url: string;
  icon?: string;
}

export default function ManageApps() {
  const { apps, loading, createApp, updateApp, deleteApp } = useAppStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);



  const handleCreate = () => {
    setEditingApp(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (app: AppItem) => {
    setEditingApp(app);
    form.setFieldsValue(app);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    await deleteApp(id);
  };

  const handleSubmit = async (values: AppFormData) => {
    setSubmitLoading(true);
    try {
      if (editingApp) {
        await updateApp(editingApp.id, values);
      } else {
        await createApp(values);
      }
      setIsModalVisible(false);
      form.resetFields();
      setEditingApp(null);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const columns: ColumnsType<AppItem> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
    },
    {
      title: 'Tên App',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
  render: (text) => (
        <Space>
          <GlobalOutlined style={{ color: '#1890ff' }} />
          <strong>{text}</strong>
        </Space>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      render: (url: string) => (
        <div style={{ wordBreak: 'break-all' }}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#52c41a' }}
          >
            <LinkOutlined style={{ marginRight: 4 }} />
            {url}
          </a>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: () => (
        <Tag color="green">Hoạt động</Tag>
      ),
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
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa app"
            description="Bạn có chắc chắn muốn xóa app này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okType="danger"
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
            >
              Xóa
            </Button>
          </Popconfirm>
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
            Quản lý Applications
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            size="large"
          >
            Thêm App mới
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={apps}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} của ${total} apps`,
          }}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingApp ? 'Chỉnh sửa App' : 'Thêm App mới'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingApp(null);
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            label="Tên App"
            name="name"
            rules={[
              { required: true, message: 'Vui lòng nhập tên app!' },
              { min: 2, message: 'Tên app phải có ít nhất 2 ký tự!' }
            ]}
          >
            <Input placeholder="Nhập tên app" />
          </Form.Item>

          <Form.Item
            label="URL"
            name="url"
            rules={[
              { required: true, message: 'Vui lòng nhập URL!' },
              { type: 'url', message: 'URL không hợp lệ!' }
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item
            label="Icon (tuỳ chọn)"
            name="icon"
          >
            <Input placeholder="URL icon hoặc tên icon" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => setIsModalVisible(false)}
              >
                Hủy
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitLoading}
              >
                {editingApp ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
