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

  // Créer un user + récupérer token
  const u = await request(app).post('/api/users').send({ username: 'dash' }).expect(201);
  token = u.body.data.dashboard_token;

  // Créer un message à lui adresser
  await request(app)
    .post('/api/messages/dash')
    .send({ content: 'msg1', ts: Date.now() - 1000 })
    .expect(201);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe('Dashboard API', () => {
  it('refuse un token invalide', async () => {
    const res = await request(app).get('/api/dashboard/messages').set('Authorization', 'Bearer invalid').expect(401);
    expect(res.body.ok).toBe(false);
  });

  it('liste, met à jour puis supprime des messages', async () => {
    // Liste
    const list = await request(app)
      .get('/api/dashboard/messages')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.ok).toBe(true);
    expect(Array.isArray(list.body.data.items)).toBe(true);
    expect(list.body.data.items.length).toBe(1);

    const id = list.body.data.items[0]._id;

    // MAJ flags
    const patched = await request(app)
      .patch(`/api/dashboard/messages/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isRead: true, isFavorite: true })
      .expect(200);
    expect(patched.body.ok).toBe(true);
    expect(patched.body.data.isRead).toBe(true);
    expect(patched.body.data.isFavorite).toBe(true);

    // Suppression
    const del = await request(app)
      .delete(`/api/dashboard/messages/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(del.body.ok).toBe(true);
  });

  it('retourne des stats agrégées 7j', async () => {
    // Recréer un message pour stats
    await request(app)
      .post('/api/messages/dash')
      .send({ content: 'msg2', ts: Date.now() - 1000 })
      .expect(201);

    const stats = await request(app)
      .get('/api/dashboard/stats?range=7d')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(stats.body.ok).toBe(true);
    expect(Array.isArray(stats.body.data.labels)).toBe(true);
    expect(Array.isArray(stats.body.data.series)).toBe(true);
    expect(stats.body.data.labels.length).toBe(7);
    expect(stats.body.data.series.length).toBe(7);
    // Somme >= 1
    const total = stats.body.data.series.reduce((a: number, b: number) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(1);
  });
});
