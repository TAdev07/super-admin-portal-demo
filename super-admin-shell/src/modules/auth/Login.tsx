import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
// import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../shared/auth';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  // const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (values: LoginFormData) => {
    setLoading(true);
    try {
      const response = await apiClient.post(
        '/auth/login',
        {
          email: values.email,
          password: values.password,
        }
      );

      const { access_token, user } = response.data;

      // Lưu token vào localStorage
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      // Fetch enriched profile to populate roles/permissions immediately
      try {
        const profile = await apiClient.get('/users/me', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        localStorage.setItem('user_profile', JSON.stringify(profile.data));
      } catch (e) {
        // Non-fatal; silent SSO later will refresh
        console.warn('Could not fetch enriched profile immediately:', e);
      }

      message.success('Đăng nhập thành công!');

      // Chuyển hướng về trang chủ bằng hard redirect để tránh Protected bounce
      // Không cần gọi silentAuthenticate vì đã có token và profile rồi
      window.location.replace('/');
    } catch (error: unknown) {
      console.error('Login error:', error);
      const err = error as { response?: { data?: { message?: string } } };
      if (err.response?.data?.message) {
        message.error(err.response.data.message);
      } else {
        message.error('Đăng nhập thất bại. Vui lòng thử lại!');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <Card
        title="Đăng nhập Super Admin Portal"
        style={{
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          borderRadius: '12px'
        }}
        headStyle={{
          textAlign: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          borderBottom: '1px solid #f0f0f0'
        }}
        bodyStyle={{ padding: '30px' }}
      >
        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          layout="vertical"
          size="large"
          initialValues={{
            email: 'admin@example.com',
            password: 'admin123'
          }}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email không hợp lệ!' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Nhập email của bạn"
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu của bạn"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{
                height: '48px',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '8px'
              }}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
