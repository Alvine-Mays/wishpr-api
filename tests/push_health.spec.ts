import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;
let app: any;
let token: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = uri;
  process.env.API_ORIGIN = 'https://whispr-api.onrender.com';
  process.env.FRONTEND_ORIGIN = 'https://whispr.netlify.app';
  process.env.BASE_URL = 'https://whispr.netlify.app';
  process.env.JWT_SECRET = 'test_secret_key_1234567890';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_MAX = '1000';
  process.env.MESSAGE_MAX_LEN = '1000';
  process.env.RATE_LIMIT_COOLDOWN_MS_USER = '1';

  await mongoose.connect(uri, { dbName: 'test' });
  const mod = await import('../server.js');
  app = mod.app;

  // user
  const u = await request(app).post('/api/users').send({ username: 'pushuser' }).expect(201);
  token = u.body.data.dashboard_token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Health & Push API', () => {
  it('healthcheck renvoie ok', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('subscribe/unsubscribe web push', async () => {
    const sub = {
      endpoint: 'https://example.com/push/endpoint',
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    };
    const s1 = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send(sub)
      .expect(201);
    expect(s1.body.ok).toBe(true);

    const s2 = await request(app)
      .post('/api/push/unsubscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoint: sub.endpoint })
      .expect(200);
    expect(s2.body.ok).toBe(true);
  });
});
