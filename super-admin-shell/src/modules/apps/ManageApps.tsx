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
  Typography,
  Upload
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  GlobalOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../context/AppContext';
import type { ColumnsType } from 'antd/es/table';
import type { AppItem } from '../../context/AppContext';
import type { UploadFile } from 'antd/es/upload/interface';

const { Title } = Typography;

interface AppFormData {
  name: string;
  code: string;
  icon?: string;
  origin?: string;
  allowedScopesCsv?: string; // UI uses CSV string, we'll map to string[] when submitting
  bundleFile?: File;
}

export default function ManageApps() {
  const { apps, loading, createApp, updateApp, deleteApp, uploadBundle } = useAppStore();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [uploadingApp, setUploadingApp] = useState<AppItem | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [formFileList, setFormFileList] = useState<File[]>([]);

  const handleCreate = () => {
    setEditingApp(null);
    form.resetFields();
    setFormFileList([]);
    setIsModalVisible(true);
  };

  const handleEdit = (app: AppItem) => {
    setEditingApp(app);
    form.setFieldsValue({
      ...app,
      allowedScopesCsv: (app.allowedScopes || []).join(',')
    });
    setFormFileList([]);
    setIsModalVisible(true);
  };

  const handleUpload = (app: AppItem) => {
    setUploadingApp(app);
    setIsUploadModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    await deleteApp(id);
  };

  const handleSubmit = async (values: AppFormData) => {
    setSubmitLoading(true);
    try {
      // Prepare data with bundle file if exists
      const appData = {
        name: values.name,
        code: values.code,
        icon: values.icon,
        origin: values.origin,
        allowedScopes: values.allowedScopesCsv
          ? values.allowedScopesCsv.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
        bundleFile: formFileList.length > 0 ? formFileList[0] : undefined,
      };

      if (editingApp) {
        await updateApp(editingApp.id, appData);
      } else {
        await createApp(appData);
      }

      setIsModalVisible(false);
      form.resetFields();
      setFormFileList([]);
      setEditingApp(null);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleUploadSubmit = async () => {
    if (!uploadingApp || fileList.length === 0 || !fileList[0].originFileObj) {
      // You can add a message here to inform the user
      return;
    }
    setSubmitLoading(true);
    try {
      await uploadBundle(uploadingApp.code, fileList[0].originFileObj);
      setIsUploadModalVisible(false);
      setFileList([]);
      setUploadingApp(null);
    } catch (error) {
      console.error('Error uploading bundle:', error);
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
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <div style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>
          {code}
        </div>
      ),
    },
    {
      title: 'Bundle',
      dataIndex: 'remoteEntry',
      key: 'remoteEntry',
      render: (remoteEntry: string, record: AppItem) => (
        <Space>
          {remoteEntry ? (
            <Tag color="blue">Module Federation</Tag>
          ) : (
            <Tag color="orange">Iframe App</Tag>
          )}
          <Button
            icon={<UploadOutlined />}
            size="small"
            onClick={() => handleUpload(record)}
            title={remoteEntry ? "Cập nhật bundle" : "Upload bundle để dùng Module Federation"}
          >
            {remoteEntry ? "Update" : "Upload"}
          </Button>
        </Space>
      ),
    },
    {
      title: 'Origin',
      dataIndex: 'origin',
      key: 'origin',
      render: (origin?: string) => origin ? (
        <div style={{ fontFamily: 'monospace', background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px' }}>
          {origin}
        </div>
      ) : <Tag color="default">N/A</Tag>,
    },
    {
      title: 'Allowed Scopes',
      dataIndex: 'allowedScopes',
      key: 'allowedScopes',
      render: (scopes?: string[]) => (
        <Space wrap>
          {(scopes && scopes.length > 0) ? scopes.map(s => (
            <Tag key={s} color="geekblue">{s}</Tag>
          )) : <Tag color="default">None</Tag>}
        </Space>
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
          setFormFileList([]);
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
            label="Code"
            name="code"
            rules={[
              { required: true, message: 'Vui lòng nhập code!' },
              { pattern: /^[a-zA-Z0-9-_]+$/, message: 'Code chỉ chứa chữ, số, dấu gạch ngang và gạch dưới!' }
            ]}
          >
            <Input placeholder="my-app-code" />
          </Form.Item>

          <Form.Item
            label="Origin (tuỳ chọn)"
            name="origin"
            tooltip="Origin của shell/host được phép phát hành token cho app này (ví dụ: http://localhost:3000)"
          >
            <Input placeholder="http://localhost:3000" />
          </Form.Item>

          <Form.Item
            label="Allowed Scopes (CSV, tuỳ chọn)"
            name="allowedScopesCsv"
            tooltip="Danh sách scopes được phép cho app này, phân tách bằng dấu phẩy"
          >
            <Input placeholder="read:demo,write:demo,bus:publish" />
          </Form.Item>

          <Form.Item
            label="Bundle File (tuỳ chọn)"
            name="bundleFile"
            help="Bundle sẽ được upload sau khi tạo app thành công"
          >
            <Upload.Dragger
              name="bundleFile"
              multiple={false}
              fileList={formFileList as unknown as UploadFile[]}
              beforeUpload={(file) => {
                setFormFileList([file]);
                return false; // Prevent auto-upload
              }}
              onRemove={() => {
                setFormFileList([]);
              }}
              accept=".zip"
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Nhấp hoặc kéo file bundle (.zip) vào đây</p>
              <p className="ant-upload-hint">
                File bundle cho Module Federation (remoteEntry.js)
              </p>
            </Upload.Dragger>
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

      <Modal
        title={`Upload Bundle cho: ${uploadingApp?.name}`}
        open={isUploadModalVisible}
        onCancel={() => {
          setIsUploadModalVisible(false);
          setFileList([]);
          setUploadingApp(null);
        }}
        onOk={handleUploadSubmit}
        confirmLoading={submitLoading}
        okText="Upload"
        cancelText="Hủy"
        destroyOnClose
      >
        <Upload.Dragger
          name="file"
          multiple={false}
          fileList={fileList}
          beforeUpload={(file) => {
            setFileList([file]);
            return false; // Prevent auto-upload
          }}
          onRemove={() => {
            setFileList([]);
          }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined />
          </p>
          <p className="ant-upload-text">Nhấp hoặc kéo tệp vào khu vực này để tải lên</p>
          <p className="ant-upload-hint">
            Chỉ hỗ trợ tải lên một tệp .zip.
          </p>
        </Upload.Dragger>
      </Modal>
    </div>
  );
}
