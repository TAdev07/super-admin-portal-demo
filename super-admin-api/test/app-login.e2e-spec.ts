/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import { AppModule } from '../src/app.module';

describe('App Login (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('register → create app → app login issues scoped token', async () => {
    const email = `user${Date.now()}@mini.local`;
    const password = 'Password123!';

    // register user
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, firstName: 'Mini', lastName: 'Portal' })
      .expect(201);
    const accessToken: string = reg.body.access_token;
    expect(accessToken).toBeDefined();

    // create app (needs auth)
    const appName = `mini-portal-${Date.now()}`;
    const origin = 'http://localhost:5173';
    const allowedScopes = 'users:read,permissions:read';
    const create = await request(app.getHttpServer())
      .post('/apps')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: appName, url: origin, origin, icon: 'app', allowedScopes })
      .expect(201);
    expect(create.body.name).toBe(appName);

    // call app login
    const appLogin = await request(app.getHttpServer())
      .post('/auth/app/login')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ appName, origin, requestedScopes: ['users:read'] })
      .expect(201);
    expect(appLogin.body.access_token).toBeDefined();
    expect(appLogin.body.scopes).toEqual(['users:read']);
  });
});
