const express = require('express');
const router = express.Router();

const User = require('../models/User');
const validate = require('../middleware/validate');
const { CreateUserSchema, PublicUserParamsSchema } = require('../utils/validators');
const { env } = require('../utils/env');
const { generateDashboardToken, tokenPrefix, hashTokenArgon } = require('../utils/crypto');

// POST /users — créer utilisateur et renvoyer le token UNE SEULE FOIS
router.post('/', validate(CreateUserSchema), async (req, res, next) => {
  try {
    const { username, bio = '', theme = 'system' } = req.body;

    // Préparer l’objet utilisateur (l’_id est généré côté Mongoose avant save)
    const user = new User({ username, bio, theme, dashboardTokenHash: '', dashboardTokenPrefix: '' });

    // Générer le token à partir de l’_id pré-généré
    const token = generateDashboardToken(user._id, env.JWT_SECRET);
    const prefix = tokenPrefix(token, 12);
    const hash = await hashTokenArgon(token);

    user.dashboardTokenHash = hash;
    user.dashboardTokenPrefix = prefix;

    await user.save();

    return res.status(201).json({ ok: true, data: { username: user.username, dashboard_token: token } });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ ok: false, error: { code: 'USERNAME_EXISTS', message: 'Nom d’utilisateur déjà pris' } });
    }
    next(err);
  }
});

// GET /users/:username/public — infos publiques
router.get('/:username/public', validate(PublicUserParamsSchema, 'params'), async (req, res, next) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).lean();
    if (!user) return res.status(404).json({ ok: false, error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' } });

    const { bio = '', avatarUrl = '', coverUrl = '', theme = 'system' } = user;
    return res.json({ ok: true, data: { bio, avatarUrl, coverUrl, theme } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
