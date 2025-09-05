import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;
let app: any;
let token: string = '';
let userId: any;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = uri;
  process.env.API_ORIGIN = 'https://wishpr-api.onrender.com';
  process.env.FRONTEND_ORIGIN = 'https://whispr-mobile.netlify.app';
  process.env.BASE_URL = 'https://whispr-mobile.netlify.app';
  process.env.JWT_SECRET = 'test_secret_key_1234567890';
  process.env.RATE_LIMIT_WINDOW_MS = '60000';
  process.env.RATE_LIMIT_MAX = '1000';
  process.env.MESSAGE_MAX_LEN = '1000';
  process.env.RATE_LIMIT_COOLDOWN_MS_USER = '1';

  await mongoose.connect(uri, { dbName: 'test' });
  const mod = await import('../server.js');
  app = mod.app;

  const userRes = await request(app).post('/api/users').send({ username: 'alice' }).expect(201);
  expect(userRes.body.ok).toBe(true);
  token = userRes.body.data.dashboard_token;

  const User: any = mongoose.model('User');
  const u = await User.findOne({ username: 'alice' }).lean();
  userId = u._id;

  const Message: any = mongoose.model('Message');
  const now = Date.now();
  const docs = Array.from({ length: 45 }).map((_, i) => ({
    userId,
    content: `m${i}`,
    isRead: i % 2 === 0,
    isArchived: false,
    isFavorite: i % 5 === 0,
    createdAt: new Date(now - i * 1000),
    expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000),
  }));
  await Message.insertMany(docs);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Dashboard messages pagination and shape', () => {
  it('returns paginated messages with id and status', async () => {
    const res1 = await request(app)
      .get('/api/dashboard/messages?limit=20&page=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res1.body.ok).toBe(true);
    expect(res1.body.data.items.length).toBe(20);
    expect(res1.body.data.items[0].id).toBeDefined();
    expect(typeof res1.body.data.items[0].status).toBe('string');
    expect(res1.body.data.total).toBe(45);
  });

  it('returns last page with remaining items and allows PATCH returning id', async () => {
    const res3 = await request(app)
      .get('/api/dashboard/messages?limit=20&page=3')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res3.body.data.items.length).toBe(5);
    const targetId = res3.body.data.items[0].id;

    const upd = await request(app)
      .patch(`/api/dashboard/messages/${targetId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isRead: true })
      .expect(200);

    expect(upd.body.ok).toBe(true);
    expect(upd.body.data.id).toBeDefined();
    expect(upd.body.data.isRead).toBe(true);
  });
});
