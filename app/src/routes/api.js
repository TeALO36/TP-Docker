'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const store = require('../store');
const { scoresSaved } = require('../metrics');
const { requireAuth } = require('../auth');

const router = express.Router();

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, patiente quelques secondes.' },
});

router.use(apiLimiter);

router.get('/progression', requireAuth, async (req, res, next) => {
  try {
    const [progress, stats] = await Promise.all([
      store.progressFor(req.user.id),
      store.userStats(req.user.id),
    ]);
    res.set('Cache-Control', 'private, no-store');
    res.json({ stats, progress });
  } catch (err) {
    next(err);
  }
});

router.post('/scores', requireAuth, async (req, res, next) => {
  try {
    const slug = String(req.body.game_slug || '');
    const score = Number(req.body.score);
    const duration = Number(req.body.duration || 0);

    const game = await store.getGame(slug);
    if (!game) {
      return res.status(400).json({ error: 'Jeu inconnu.' });
    }
    if (!Number.isInteger(score) || score < 0 || score > 100000) {
      return res.status(400).json({ error: 'Score invalide (0 à 100000).' });
    }
    if (!Number.isInteger(duration) || duration < 0 || duration > 7200) {
      return res.status(400).json({ error: 'Durée invalide (0 à 7200 secondes).' });
    }

    const result = await store.saveScore({
      userId: req.user.id,
      game,
      score,
      duration,
    });

    scoresSaved.inc({ game: game.slug });

    return res.status(201).json({
      ok: true,
      record: result.isRecord,
      best: result.best_score,
      games_played: result.games_played,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
