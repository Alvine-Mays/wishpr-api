// Configuration Web Push et gestion des clés VAPID
const webpush = require('web-push');
const logger = require('./logger');
const { env } = require('./env');
const VapidKey = require('../models/VapidKey');
const Subscription = require('../models/Subscription');

let enabled = false;
let publicKey = env.VAPID_PUBLIC_KEY || process.env.PUBLIC_VAPID_KEY || '';

function isEnabled() {
  return enabled;
}

function getPublicKey() {
  return publicKey || '';
}

function configure(contact, pub, priv) {
  try {
    webpush.setVapidDetails(`mailto:${contact}`.trim(), pub, priv);
    enabled = true;
    publicKey = pub;
    logger.info({ msg: 'Web Push activé' });
  } catch (err) {
    enabled = false;
    logger.warn({ msg: 'Échec config Web Push (désactivé)', err: err && err.message });
  }
}

// Configuration immédiate si les clés d'env sont présentes
(() => {
  const contact = env.WEB_PUSH_CONTACT || 'mayalachristgottlieb@gmail.com';
  const pub = env.VAPID_PUBLIC_KEY || process.env.PUBLIC_VAPID_KEY;
  const priv = env.VAPID_PRIVATE_KEY || process.env.PRIVATE_VAPID_KEY;
  if (pub && priv) configure(contact, pub, priv);
  else logger.info({ msg: 'Web Push non configuré (clés absentes en env, tentative après connexion DB)' });
})();

// Initialisation après connexion Mongo (lecture/écriture des clés en base si nécessaire)
async function initWebPush() {
  if (enabled) return; // déjà configuré via env
  try {
    const contact = env.WEB_PUSH_CONTACT || 'mayalachristgottlieb@gmail.com';

    // Tenter de charger depuis la base
    const existing = await VapidKey.findOne().lean();
    if (existing) {
      configure(contact, existing.publicKey, existing.privateKey);
      return;
    }

    // Générer, persister et journaliser UNE FOIS avec instructions admin
    const keys = webpush.generateVAPIDKeys();
    try {
      await VapidKey.create({ publicKey: keys.publicKey, privateKey: keys.privateKey });
    } catch (_) {
      // si erreur d'écriture, on continue quand même en mémoire
    }
    configure(contact, keys.publicKey, keys.privateKey);

    logger.warn({
      msg: 'Clés VAPID générées automatiquement. Veuillez les PÉRENNISER dans les variables d\'environnement (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY ou PUBLIC_VAPID_KEY/PRIVATE_VAPID_KEY) et redéployer. Ces clés ne seront pas réaffichées après cette initialisation.',
      publicKey: keys.publicKey,
      // Ne pas logguer la clé privée en production sauf première génération contrôlée
      privateKey: keys.privateKey,
    });
  } catch (err) {
    logger.warn({ msg: 'Initialisation Web Push échouée', err: err && err.message });
  }
}

async function sendPush(subscription, payload) {
  if (!enabled) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    logger.warn({ msg: 'Erreur d\'envoi Web Push', err: err && err.message });
  }
}

// Envoi avec purge automatique si endpoint invalide
async function sendPushToDoc(doc, payload) {
  if (!enabled) return;
  const subscription = { endpoint: doc.endpoint, keys: { p256dh: doc.p256dh, auth: doc.auth } };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
  } catch (err) {
    const sc = err && (err.statusCode || (err.response && err.response.statusCode));
    if (sc === 404 || sc === 410) {
      try {
        await Subscription.deleteOne({ _id: doc._id });
        logger.info({ msg: 'Abonnement Web Push nettoyé (endpoint expiré)', id: String(doc._id) });
      } catch (_) {}
    } else {
      logger.warn({ msg: 'Erreur d\'envoi Web Push', err: err && err.message });
    }
  }
}

module.exports = { isEnabled, getPublicKey, initWebPush, sendPush, sendPushToDoc };

