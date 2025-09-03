// Gestion centralisée des erreurs avec réponse standardisée
const logger = require('../utils/logger');

function notFound(req, res, next) {
  res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Ressource introuvable' } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error({ msg: 'Erreur non gérée', err: err && err.message, stack: err && err.stack });
  res.status(500).json({ ok: false, error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' } });
}

module.exports = { notFound, errorHandler };
