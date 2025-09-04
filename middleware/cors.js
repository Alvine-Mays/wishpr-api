// CORS strict pour le frontend uniquement
const cors = require('cors');
const { env } = require('../utils/env');

function corsStrict() {
  return cors({
    origin: env.FRONTEND_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600,
  });
}

module.exports = corsStrict;
