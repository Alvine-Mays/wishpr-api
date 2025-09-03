import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;
let app: any;

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
  process.env.RATE_LIMIT_COOLDOWN_MS_USER = '10000';

  await mongoose.connect(uri, { dbName: 'test' });
  const mod = await import('../server.js');
  app = mod.app;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Users API', () => {
  it('crée un utilisateur et renvoie un token unique', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ username: 'Alice_', bio: 'Hello', theme: 'dark' })
      .expect(201);

    expect(res.body.ok).toBe(true);
    expect(res.body.data.username).toBe('alice_');
    expect(typeof res.body.data.dashboard_token).toBe('string');
    const token: string = res.body.data.dashboard_token;
    expect(token.length).toBeGreaterThan(12);

    // Le token n’est pas réexposable publiquement
    const pub = await request(app).get('/api/users/alice_/public').expect(200);
    expect(pub.body.ok).toBe(true);
    expect(pub.body.data).toHaveProperty('bio');
    expect(pub.body.data).not.toHaveProperty('dashboard_token');

    // En base: hash présent + prefix cohérent
    const userModel: any = mongoose.model('User');
    const alice = await userModel.findOne({ username: 'alice_' }).lean();
    expect(alice).toBeTruthy();
    expect(alice.dashboardTokenHash).toBeTruthy();
    expect(alice.dashboardTokenPrefix).toHaveLength(12);
    expect(token.slice(0, 12)).toBe(alice.dashboardTokenPrefix);
  });

  it('refuse un username dupliqué', async () => {
    await request(app).post('/api/users').send({ username: 'bob' }).expect(201);
    const dup = await request(app).post('/api/users').send({ username: 'Bob' }).expect(409);
    expect(dup.body.ok).toBe(false);
    expect(dup.body.error.code).toBe('USERNAME_EXISTS');
  });
});
