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

describe('Messages API', () => {
  it('valide longueur, honeypot et délai minimal, puis crée un message expirant à +7j', async () => {
    // Créer un user destinataire
    const userRes = await request(app).post('/api/users').send({ username: 'target' }).expect(201);
    expect(userRes.body.ok).toBe(true);

    // Trop long
    const tooLong = 'a'.repeat(1001);
    await request(app)
      .post('/api/messages/target')
      .send({ content: tooLong, ts: Date.now() - 1000 })
      .expect(400);

    // Honeypot
    await request(app)
      .post('/api/messages/target')
      .send({ content: 'hello', hp: 'bot', ts: Date.now() - 1000 })
      .expect(400);

    // Délai trop court
    await request(app)
      .post('/api/messages/target')
      .send({ content: 'hello', ts: Date.now() })
      .expect(400);

    // OK
    const ok = await request(app)
      .post('/api/messages/target')
      .send({ content: 'bonjour', ts: Date.now() - 1000 })
      .expect(201);
    expect(ok.body.ok).toBe(true);

    // Vérifier expiresAt ~ +7j
    const Message: any = mongoose.model('Message');
    const msg = await Message.findOne({}).lean();
    const created = new Date(msg.createdAt).getTime();
    const expires = new Date(msg.expiresAt).getTime();
    const diff = Math.round((expires - created) / (24 * 60 * 60 * 1000));
    expect(diff).toBe(7);
  });
});
