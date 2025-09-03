// Rate limiting global et spécifique via express-rate-limit
const rateLimit = require('express-rate-limit');
const { env } = require('../utils/env');

const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Trop de requêtes, réessayez plus tard.' } },
});

function createMessageLimiter() {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${req.ip}::${req.params.username || ''}`,
    message: { ok: false, error: { code: 'RATE_LIMITED', message: 'Trop de requêtes, réessayez plus tard.' } },
  });
}

module.exports = { globalLimiter, createMessageLimiter };
