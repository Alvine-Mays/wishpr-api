// Hachage IP : SHA256(ip + pepper) pour stocker une empreinte non réversible
const crypto = require('crypto');
const { env } = require('./env');

function ipHash(ip) {
  const pepper = env.IP_SALT || env.JWT_SECRET;
  const h = crypto.createHash('sha256');
  h.update(String(ip));
  h.update('|');
  h.update(String(pepper));
  return h.digest('hex');
}

module.exports = { ipHash };
