/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
// Import via require to avoid TS generic App typing friction in strict test env
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');
import { AppModule } from '../src/app.module';

describe('Silent SSO & /users/me (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Apply cookie parser like in main bootstrap to populate req.cookies
    app.use(cookieParser());
    await app.init();
    // http server ready
  });

  afterAll(async () => {
    await app.close();
  });

  it('login → get refresh cookie → silent SSO returns access token', async () => {
    // register user
    const email = `user${Date.now()}@test.local`;
    const password = 'Password123!';
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password, firstName: 'A', lastName: 'B' })
      .expect(201);
    const regBody: any = reg.body;
    expect(regBody.access_token).toBeDefined();
    const setCookie = reg.get('set-cookie') as unknown as string[] | undefined;
    expect(setCookie).toBeDefined();
    const refreshCookieFull = (setCookie || []).find((c) =>
      c.startsWith('refresh_token='),
    );
    const refreshCookie = refreshCookieFull
      ? refreshCookieFull.split(';')[0]
      : undefined;
    expect(refreshCookie).toBeDefined();

    // silent
    const silent = await request(app.getHttpServer())
      .get('/auth/silent?trace=1')
      .set('Cookie', refreshCookie!)
      .expect(200);
    const silentBody: any = silent.body;
    expect(silentBody.authenticated).toBe(true);
    expect(silentBody.access_token).toBeDefined();

    // use access token to call /users/me
    const me = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${silentBody.access_token}`)
      .expect(200);
    const meBody: any = me.body;
    expect(meBody.email).toBe(email);
    expect(Array.isArray(meBody.roles)).toBe(true);
    expect(Array.isArray(meBody.permissions)).toBe(true);
  });

  it('silent SSO without cookie returns authenticated:false', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/silent')
      .expect(200);
    const resBody: any = res.body;
    expect(resBody.authenticated).toBe(false);
    expect(resBody.reason).toBe('no_refresh_cookie');
  });
});
