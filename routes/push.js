const express = require('express');
const router = express.Router();

const Subscription = require('../models/Subscription');
const validate = require('../middleware/validate');
const authDashboard = require('../middleware/authDashboard');
const { PushSubscribeSchema, PushUnsubscribeSchema } = require('../utils/validators');

// Ces routes nécessitent auth par token dashboard
router.use(authDashboard);

// POST /push/subscribe
router.post('/subscribe', validate(PushSubscribeSchema), async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { endpoint, keys } = req.body;

    const exists = await Subscription.findOne({ endpoint }).lean();
    if (exists) {
      // Si l’abonnement existe déjà, on s’assure qu’il est lié à ce user
      if (String(exists.userId) !== String(userId)) {
        // Réattribuer à l’utilisateur courant
        await Subscription.updateOne({ _id: exists._id }, { $set: { userId, p256dh: keys.p256dh, auth: keys.auth } });
      }
      return res.json({ ok: true });
    }

    await Subscription.create({ userId, endpoint, p256dh: keys.p256dh, auth: keys.auth });
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
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
