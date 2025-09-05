// Serveur Express pour Whispr — sécurisé, conforme à la spécification
const express = require('express');
const mongoose = require('mongoose');
const pinoHttp = require('pino-http');
const crypto = require('crypto');
const compression = require('compression');

const logger = require('./utils/logger');
const { env } = require('./utils/env');
const security = require('./middleware/security');
const corsStrict = require('./middleware/cors');
const { globalLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { initWebPush } = require('./utils/webpush');

const healthRouter = require('./routes/health');
const usersRouter = require('./routes/users');
const messagesRouter = require('./routes/messages');
const dashboardRouter = require('./routes/dashboard');
const pushRouter = require('./routes/push');

const app = express();

// Proxies de Render: nécessaire pour obtenir la bonne IP client
app.set('trust proxy', 1);

// Logger HTTP avec corrélation reqId
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-request-id'] || crypto.randomBytes(6).toString('hex'),
    customLogLevel: (res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, id: req.id, ip: req.ip }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  })
);

// Compression
app.use(compression());

// Sécurité + CORS
app.use(security());
app.use(corsStrict());

// Parsing JSON strict, limite 20kb
app.use(express.json({ limit: '20kb' }));

// Rate limiting global
app.use(globalLimiter);

// Base API
const api = express.Router();
app.use('/api', api);
app.use('/api/v1', api); // alias versionné

// Routes
api.use('/health', healthRouter);
api.use('/users', usersRouter);
api.use('/messages', messagesRouter);
api.use('/dashboard', dashboardRouter);
api.use('/push', pushRouter);

// 404 et erreurs
app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await mongoose.connect(env.MONGO_URI, { dbName: 'whispr' });
    await initWebPush();
    const port = env.PORT || 3000;
    app.listen(port, () => {
      logger.info({ msg: `API Whispr démarrée sur :${port}` });
    });
  } catch (err) {
    logger.error({ msg: 'Échec connexion MongoDB', err: err && err.message });
    process.exit(1);
  }
}

// Démarrage seulement hors test
if (process.env.NODE_ENV !== 'test') {
  start();
}

module.exports = { app, start };
