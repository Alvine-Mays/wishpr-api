const express = require('express');
const router = express.Router();

const Message = require('../models/Message');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const validate = require('../middleware/validate');
const { CreateMessageSchema, MessageParamsSchema } = require('../utils/validators');
const { env } = require('../utils/env');
const { ipHash } = require('../utils/iphash');
const { createMessageLimiter } = require('../middleware/rateLimit');
const { sendPush, enabled: pushEnabled } = require('../utils/webpush');

// Limiteur spécifique à l’envoi de messages
const messageLimiter = createMessageLimiter();

// Mémoire pour le cooldown par IP hash et username
const cooldownMap = new Map(); // key: `${iphash}::${username}` => Number (timestamp expiration)

function setCooldown(key, ttlMs) {
  const expiresAt = Date.now() + ttlMs;
  cooldownMap.set(key, expiresAt);
  setTimeout(() => {
    // Nettoyage paresseux
    const exp = cooldownMap.get(key);
    if (exp && exp <= Date.now()) cooldownMap.delete(key);
  }, ttlMs + 1000).unref?.();
}

function checkCooldown(key) {
  const exp = cooldownMap.get(key);
  if (!exp) return false;
  if (exp <= Date.now()) {
    cooldownMap.delete(key);
    return false;
  }
  return true;
}

// POST /messages/:username — envoyer un message
router.post('/:username', messageLimiter, validate(MessageParamsSchema, 'params'), validate(CreateMessageSchema), async (req, res, next) => {
  try {
    const { username } = req.params;
    const { content, hp = '', ts } = req.body;

    // Honeypot
    if (hp && hp.trim() !== '') {
      return res.status(400).json({ ok: false, error: { code: 'SPAM_DETECTED', message: 'Requête invalide' } });
    }

    // Délai minimal 700ms
    const now = Date.now();
    if (typeof ts !== 'number' || now - ts < 700) {
      return res.status(400).json({ ok: false, error: { code: 'TOO_FAST', message: 'Envoi trop rapide, réessayez.' } });
    }

    // Trouver l’utilisateur destinataire
    const user = await User.findOne({ username }).lean();
    if (!user) return res.status(404).json({ ok: false, error: { code: 'USER_NOT_FOUND', message: 'Utilisateur introuvable' } });

    // Cooldown par IP hash et username
    const ip = req.ip;
    const hash = ipHash(ip);
    const key = `${hash}::${username}`;
    if (checkCooldown(key)) {
      return res.status(429).json({ ok: false, error: { code: 'COOLDOWN', message: 'Veuillez patienter avant un nouvel envoi.' } });
    }

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);

    await Message.create({
      userId: user._id,
      content,
      isRead: false,
      isArchived: false,
      isFavorite: false,
      createdAt,
      expiresAt,
      sourceIpHash: hash,
    });

    // Appliquer le cooldown après création
    setCooldown(key, env.RATE_LIMIT_COOLDOWN_MS_USER);

    // Envoi Web Push si activé
    if (pushEnabled) {
      try {
        const subs = await Subscription.find({ userId: user._id }).lean();
        const payload = { title: 'Nouveau message Whispr', body: 'Vous avez reçu un message anonyme', data: { username } };
        await Promise.allSettled(
          subs.map((s) =>
            sendPush(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              payload
            )
          )
        );
      } catch (_) {
        // Erreurs déjà journalisées par utilitaire
      }
    }

    return res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
