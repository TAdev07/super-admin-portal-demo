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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const registerResponse = await request(app.getHttpServer() as any)
      .post('/api/auth/register')
      .send({
        username: 'mfuser',
        email: 'mf@test.com',
        password: 'password123',
      });

    expect(registerResponse.status).toBe(201);

    // Login to get access token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loginResponse = await request(app.getHttpServer() as any)
      .post('/api/auth/login')
      .send({
        username: 'mfuser',
        password: 'password123',
      });

    expect(loginResponse.status).toBe(201);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    accessToken = (loginResponse.body as any).access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Module Federation Token Flow', () => {
    it('should allow shell-mf-host to request tokens for remotes', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    });

    it('should handle mini_portal_mf specific scopes', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await request(app.getHttpServer() as any)
        .post('/api/auth/app/login')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          appName: 'mini_portal_mf',
          origin: 'http://localhost:5174',
          requestedScopes: ['read:demo'],
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
    });
  });
});
