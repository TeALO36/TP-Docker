'use strict';

const express = require('express');
const store = require('../store');
const { requireAuth } = require('../auth');

const router = express.Router();

// Normalise pour une recherche insensible à la casse et aux accents.
function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// Recherche « tous les mots » sur le titre, la description, la catégorie et le slug.
function filterGames(games, query) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return games;
  return games.filter((game) => {
    const haystack = normalize([game.title, game.description, game.category, game.slug].join(' '));
    return terms.every((term) => haystack.includes(term));
  });
}

function indexBy(rows, key) {
  const out = {};
  rows.forEach((row) => {
    out[row[key]] = row;
  });
  return out;
}

router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 60);
    const [allGames, top] = await Promise.all([store.listGames(), store.globalTop(5)]);
    const games = filterGames(allGames, q);
    const progress = req.user ? await store.progressFor(req.user.id) : [];
    res.render('accueil', {
      title: q ? `Recherche : ${q}` : 'Mini-jeux en ligne',
      games,
      q,
      totalGames: allGames.length,
      top,
      progressByGame: indexBy(progress, 'game_slug'),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/jeu/:slug', async (req, res, next) => {
  try {
    const game = await store.getGame(req.params.slug);
    if (!game) {
      return res.status(404).render('404', { title: 'Jeu introuvable' });
    }
    const top = await store.topScores(game.slug, 5);
    let mine = null;
    if (req.user) {
      const progress = await store.progressFor(req.user.id);
      mine = progress.find((row) => row.game_slug === game.slug) || null;
    }
    return res.render('jeu', {
      title: game.title,
      game,
      top,
      mine,
      bestScore: mine ? mine.best_score : 0,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/classement', async (req, res, next) => {
  try {
    const [games, global] = await Promise.all([store.listGames(), store.globalTop(10)]);
    const boards = await Promise.all(
      games.map(async (game) => ({ game, rows: await store.topScores(game.slug, 10) })),
    );
    res.render('classement', { title: 'Classements', boards, global });
  } catch (err) {
    next(err);
  }
});

router.get('/profil', requireAuth, async (req, res, next) => {
  try {
    const [progress, stats, scores] = await Promise.all([
      store.progressFor(req.user.id),
      store.userStats(req.user.id),
      store.recentScores(req.user.id, 10),
    ]);
    const level = Math.floor(stats.points / 500) + 1;
    const levelProgress = Math.round(((stats.points % 500) / 500) * 100);
    res.render('profil', {
      title: 'Ma progression',
      progress,
      stats,
      scores,
      level,
      levelProgress,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
