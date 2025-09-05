const express = require('express');
const router = express.Router();

const Subscription = require('../models/Subscription');
const validate = require('../middleware/validate');
const authDashboard = require('../middleware/authDashboard');
const { PushSubscribeSchema, PushUnsubscribeSchema } = require('../utils/validators');
const { getPublicKey } = require('../utils/webpush');

// GET /push/public-key — lecture seule, pas d'auth
router.get('/public-key', (req, res) => {
  const pk = getPublicKey();
  res.set('Cache-Control', 'public, max-age=3600, immutable');
  return res.json({ ok: true, data: { publicKey: pk || '' } });
});

// Les autres routes nécessitent auth par token dashboard
router.use(authDashboard);

// POST /push/subscribe
router.post('/subscribe', validate(PushSubscribeSchema), async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Supporte body direct { endpoint, keys } ou { subscription }
    const sub = req.body.subscription && req.body.subscription.endpoint ? req.body.subscription : req.body;
    const { endpoint, keys } = sub;

    const userAgent = req.headers['user-agent'] || '';

    // Upsert par (userId, endpoint)
    const prev = await Subscription.findOneAndUpdate(
      { userId, endpoint },
      { $set: { p256dh: keys.p256dh, auth: keys.auth, userAgent, lastSeenAt: new Date() } },
      { upsert: true, new: false, setDefaultsOnInsert: true }
    );

    if (prev) return res.status(200).json({ ok: true });
    return res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /push/unsubscribe
router.post('/unsubscribe', validate(PushUnsubscribeSchema), async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { endpoint } = req.body;
    await Subscription.deleteOne({ endpoint, userId });

    // Compat: /api -> 200 JSON, /api/v1 -> 204 no content
    if (req.baseUrl && req.baseUrl.startsWith('/api/v1')) return res.status(204).end();
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
