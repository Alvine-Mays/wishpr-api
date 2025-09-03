// Middleware de sécurité Helmet + CSP stricte
const helmet = require('helmet');
const { env } = require('../utils/env');

function security() {
  return [
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", env.FRONTEND_ORIGIN, env.API_ORIGIN],
          imgSrc: ["'self'", 'data:', 'https:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
      // xssFilter est obsolète et non utilisé par Helmet v7
      noSniff: true,
    }),
  ];
}

module.exports = security;
