import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // mirror cookie parsing from main bootstrap
    app.use(cookieParser());
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  describe('Silent SSO & enriched /users/me', () => {
    it('register -> silent -> /users/me enriched profile', async () => {
      const email = `user${Date.now()}@test.local`;
      const password = 'Password123!';
      const reg = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password, firstName: 'A', lastName: 'B' })
        .expect(201);
      const setCookie = reg.get('set-cookie') as string[] | undefined;
      const refreshCookieFull = (setCookie || []).find((c) =>
        c.startsWith('refresh_token='),
      );
      const refreshCookie = refreshCookieFull
        ? refreshCookieFull.split(';')[0]
        : undefined;
      expect(refreshCookie).toBeDefined();

      const silent = await request(app.getHttpServer())
        .get('/auth/silent?trace=1')
  .set('Cookie', refreshCookie!)
        .expect(200);
      const silentBody: any = silent.body;
      expect(silentBody.authenticated).toBe(true);
      expect(silentBody.access_token).toBeDefined();

      const me = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${silentBody.access_token}`)
        .expect(200);
      const meBody: any = me.body;
      expect(meBody.email).toBe(email);
      expect(Array.isArray(meBody.roles)).toBe(true);
      expect(Array.isArray(meBody.permissions)).toBe(true);
    });

    it('silent without cookie returns unauthenticated', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/silent')
        .expect(200);
      const resBody: any = res.body;
      expect(resBody.authenticated).toBe(false);
      expect(resBody.reason).toBe('no_refresh_cookie');
    });
  });
});
