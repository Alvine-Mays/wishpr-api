// Configuration Web Push (activée si les clés VAPID sont présentes)
const webpush = require('web-push');
const logger = require('./logger');
const { env } = require('./env');

let enabled = false;

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.WEB_PUSH_CONTACT) {
  try {
    webpush.setVapidDetails(`mailto:${env.WEB_PUSH_CONTACT}`.trim(), env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    enabled = true;
    logger.info({ msg: 'Web Push activé' });
  } catch (err) {
    enabled = false;
    logger.warn({ msg: 'Échec config Web Push (désactivé)', err: err && err.message });
  }
} else {
  logger.info({ msg: 'Web Push non configuré (clés manquantes)' });
}

async function sendPush(subscription, payload) {
  if (!enabled) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    // Journaliser sans divulguer d’informations sensibles
    logger.warn({ msg: 'Erreur d’envoi Web Push', err: err && err.message });
  }
}

module.exports = { enabled, sendPush };
