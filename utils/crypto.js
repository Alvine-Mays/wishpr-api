// Utilitaires cryptographiques: base64url, HMAC, génération de token, hash/verify argon2
const crypto = require('crypto');
const argon2 = require('argon2');

// Encodage base64url (sans padding)
function base64url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function hmacSHA256(data, secret) {
  return crypto.createHmac('sha256', secret).update(String(data)).digest();
}

function randomBytes(size = 32) {
  return crypto.randomBytes(size);
}

// Générer le token dashboard: base64url( random(32) || HMAC(userId, JWT_SECRET) )
function generateDashboardToken(userId, secret) {
  const rnd = randomBytes(32);
  const mac = hmacSHA256(String(userId), secret);
  const buf = Buffer.concat([rnd, mac]);
  return base64url(buf);
}

function tokenPrefix(token, length = 12) {
  return token.slice(0, length);
}

async function hashTokenArgon(token) {
  return argon2.hash(token, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

async function verifyTokenArgon(hash, token) {
  try {
    return await argon2.verify(hash, token);
  } catch (_) {
    return false;
  }
}

module.exports = {
  base64url,
  hmacSHA256,
  randomBytes,
  generateDashboardToken,
  tokenPrefix,
  hashTokenArgon,
  verifyTokenArgon,
};
