import request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';

describe('Module Federation E2E', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup test user
    const registerResponse = await request(app.getHttpServer() as any)
      .post('/api/auth/register')
      .send({
        username: 'mfuser',
        email: 'mf@test.com',
        password: 'password123',
      });

    expect(registerResponse.status).toBe(201);

    // Login to get access token
    const loginResponse = await request(app.getHttpServer() as any)
      .post('/api/auth/login')
      .send({
        username: 'mfuser',
        password: 'password123',
      });

    expect(loginResponse.status).toBe(201);
    accessToken = (loginResponse.body as any).access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Module Federation Token Flow', () => {
    it('should allow shell-mf-host to request tokens for remotes', async () => {
      const response = await request(app.getHttpServer() as any)
        .post('/api/auth/app/login')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          appName: 'shell-mf-host',
          origin: 'http://localhost:3000',
          requestedScopes: ['read:demo', 'read:users'],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('scopes');
      expect((response.body as any).scopes).toEqual(
        expect.arrayContaining(['read:demo', 'read:users']),
      );
    });

    it('should allow remote apps to use provided tokens', async () => {
      // First get app token for shell
      const appTokenResponse = await request(app.getHttpServer() as any)
        .post('/api/auth/app/login')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          appName: 'shell-mf-host',
          origin: 'http://localhost:3000',
          requestedScopes: ['read:demo'],
        });

      const appToken = (appTokenResponse.body as any).access_token;

      // Use app token to access protected resource
      const profileResponse = await request(app.getHttpServer() as any)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${appToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body).toHaveProperty('username', 'mfuser');
    });

    it('should reject requests with invalid scopes', async () => {
      const response = await request(app.getHttpServer() as any)
        .post('/api/auth/app/login')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          appName: 'shell-mf-host',
          origin: 'http://localhost:3000',
          requestedScopes: ['admin:all'], // Not in allowedScopes
        });

      expect(response.status).toBe(403);
      expect((response.body as any).message).toContain('scope not allowed');
    });

    it('should reject requests with invalid origin', async () => {
      const response = await request(app.getHttpServer() as any)
        .post('/api/auth/app/login')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          appName: 'shell-mf-host',
          origin: 'http://malicious-site.com',
          requestedScopes: ['read:demo'],
        });

      expect(response.status).toBe(403);
      expect((response.body as any).message).toContain('origin mismatch');
    });

    it('should handle mini_portal_mf specific scopes', async () => {
      const response = await request(app.getHttpServer() as any)
        .post('/api/auth/app/login')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          appName: 'mini_portal_mf',
          origin: 'http://localhost:5174',
          requestedScopes: ['read:demo'],
        });

      expect(response.status).toBe(200);
      expect((response.body as any).scopes).toEqual(['read:demo']);
    });
  });
});
