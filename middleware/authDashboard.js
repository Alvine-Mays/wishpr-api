// Authentification par token de dashboard (non réversible)
const { tokenPrefix, verifyTokenArgon } = require('../utils/crypto');
const User = require('../models/User');

async function authDashboard(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const token = bearer || (typeof req.query.token === 'string' ? req.query.token : null);
    if (!token) return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Token manquant' } });

    const prefix = tokenPrefix(token, 12);
    const user = await User.findOne({ dashboardTokenPrefix: prefix }).lean(false);
    if (!user) return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Accès refusé' } });

    const ok = await verifyTokenArgon(user.dashboardTokenHash, token);
    if (!ok) return res.status(401).json({ ok: false, error: { code: 'UNAUTHORIZED', message: 'Accès refusé' } });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authDashboard;
