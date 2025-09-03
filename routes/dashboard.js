const express = require('express');
const router = express.Router();

const Message = require('../models/Message');
const validate = require('../middleware/validate');
const authDashboard = require('../middleware/authDashboard');
const {
  DashboardListQuerySchema,
  DashboardUpdateSchema,
  DashboardIdParamsSchema,
  StatsQuerySchema,
} = require('../utils/validators');

// Toutes les routes dashboard nécessitent auth
router.use(authDashboard);

// GET /dashboard/messages — liste paginée + filtres
router.get('/messages', validate(DashboardListQuerySchema, 'query'), async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { isRead, isArchived, isFavorite, page = '1', limit = '20' } = req.query;

    const q = { userId };
    if (isRead) q.isRead = isRead === 'true';
    if (isArchived) q.isArchived = isArchived === 'true';
    if (isFavorite) q.isFavorite = isFavorite === 'true';

    const pageN = Math.max(1, parseInt(page, 10) || 1);
    const limitN = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const [items, total] = await Promise.all([
      Message.find(q).sort({ createdAt: -1 }).skip((pageN - 1) * limitN).limit(limitN).lean(),
      Message.countDocuments(q),
    ]);

    return res.json({ ok: true, data: { items, page: pageN, limit: limitN, total } });
  } catch (err) {
    next(err);
  }
});

// PATCH /dashboard/messages/:id — MAJ partielle flags
router.patch('/messages/:id', validate(DashboardIdParamsSchema, 'params'), validate(DashboardUpdateSchema), async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const update = {};
    ['isRead', 'isArchived', 'isFavorite'].forEach((k) => {
      if (typeof req.body[k] === 'boolean') update[k] = req.body[k];
    });

    const msg = await Message.findOneAndUpdate({ _id: id, userId }, { $set: update }, { new: true }).lean();
    if (!msg) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Message introuvable' } });

    return res.json({ ok: true, data: msg });
  } catch (err) {
    next(err);
  }
});

// DELETE /dashboard/messages/:id — suppression
router.delete('/messages/:id', validate(DashboardIdParamsSchema, 'params'), async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const resDel = await Message.deleteOne({ _id: id, userId });
    if (!resDel.deletedCount) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Message introuvable' } });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /dashboard/stats?range=7d|30d
router.get('/stats', validate(StatsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const userId = req.user._id;
    const days = req.query.range === '30d' ? 30 : 7;
    const now = new Date();
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const agg = await Message.aggregate([
      { $match: { userId, createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Normaliser sur toute la fenêtre avec 0 par défaut
    const labels = [];
    const map = new Map(agg.map((a) => [a._id, a.count]));
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const label = d.toISOString().slice(0, 10);
      labels.push(label);
    }
    const series = labels.map((l) => map.get(l) || 0);

    return res.json({ ok: true, data: { labels, series } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
