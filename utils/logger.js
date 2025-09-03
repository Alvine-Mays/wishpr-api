// Logger pino configuré avec redaction pour ne pas divulguer de contenus sensibles.
const pino = require('pino');

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.content',
      'req.body.hp',
      'req.body.ts',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]'
  },
  base: undefined
});

module.exports = logger;
