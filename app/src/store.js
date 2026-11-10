'use strict';

const db = require('./db');
const cache = require('./cache');

const GAMES_KEY = 'pookie:jeux';
const GAMES_TTL = 300;
const CLASSEMENT_TTL = 30;

const classementKey = (slug) => `pookie:classement:${slug}`;

async function listGames() {
  const cached = await cache.getJson(GAMES_KEY);
  if (cached) return cached;
  const { rows } = await db.query(
    'SELECT slug, title, description, category, emoji, gradient, how_to FROM games ORDER BY position',
  );
  await cache.setJson(GAMES_KEY, rows, GAMES_TTL);
  return rows;
}

async function getGame(slug) {
  const games = await listGames();
  return games.find((game) => game.slug === slug) || null;
}

async function topScores(slug, limit = 10) {
  const key = classementKey(slug);
  const cached = await cache.getJson(key);
  if (cached) return cached.slice(0, limit);

  const { rows } = await db.query(
    `SELECT u.pseudo, MAX(s.score)::int AS score
       FROM scores s
       JOIN users u ON u.id = s.user_id
      WHERE s.game_slug = $1
      GROUP BY u.id, u.pseudo
      ORDER BY score DESC
      LIMIT 10`,
    [slug],
  );
  await cache.setJson(key, rows, CLASSEMENT_TTL);
  return rows.slice(0, limit);
}

async function globalTop(limit = 10) {
  const key = classementKey('global');
  const cached = await cache.getJson(key);
  if (cached) return cached.slice(0, limit);

  const { rows } = await db.query(
    `SELECT u.pseudo, SUM(p.best_score)::int AS points, SUM(p.games_played)::int AS parties
       FROM progress p
       JOIN users u ON u.id = p.user_id
      GROUP BY u.id, u.pseudo
      ORDER BY points DESC
      LIMIT 10`,
  );
  await cache.setJson(key, rows, CLASSEMENT_TTL);
  return rows.slice(0, limit);
}

async function progressFor(userId) {
  const { rows } = await db.query(
    `SELECT p.game_slug, p.best_score, p.games_played, p.total_seconds, p.last_played_at,
            g.title, g.emoji, g.gradient
       FROM progress p
       JOIN games g ON g.slug = p.game_slug
      WHERE p.user_id = $1
      ORDER BY g.position`,
    [userId],
  );
  return rows;
}

async function userStats(userId) {
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(best_score), 0)::int AS points,
            COALESCE(SUM(games_played), 0)::int AS parties,
            COALESCE(SUM(total_seconds), 0)::int AS secondes
       FROM progress
      WHERE user_id = $1`,
    [userId],
  );
  return rows[0];
}

async function recentScores(userId, limit = 10) {
  const { rows } = await db.query(
    `SELECT s.score, s.duration_seconds, s.created_at, s.game_slug, g.title, g.emoji
       FROM scores s
       JOIN games g ON g.slug = s.game_slug
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC, s.id DESC
      LIMIT $2`,
    [userId, limit],
  );
  return rows;
}

async function createUser({ pseudo, email, passwordHash }) {
  const { rows } = await db.query(
    `INSERT INTO users (pseudo, email, password_hash)
          VALUES ($1, $2, $3)
       RETURNING id, pseudo, email, created_at`,
    [pseudo, email, passwordHash],
  );
  return rows[0];
}

async function findUserByIdentifier(identifier) {
  const { rows } = await db.query(
    'SELECT id, pseudo, email, password_hash FROM users WHERE pseudo = $1 OR lower(email) = lower($1) LIMIT 1',
    [identifier],
  );
  return rows[0] || null;
}

async function pseudoOrEmailExists(pseudo, email) {
  const { rows } = await db.query(
    'SELECT pseudo, email FROM users WHERE pseudo = $1 OR lower(email) = lower($2) LIMIT 1',
    [pseudo, email],
  );
  return rows[0] || null;
}

async function saveScore({ userId, game, score, duration }) {
  const result = await db.withTransaction(async (client) => {
    const previous = await client.query(
      'SELECT best_score FROM progress WHERE user_id = $1 AND game_slug = $2',
      [userId, game.slug],
    );
    const previousBest = previous.rows.length ? previous.rows[0].best_score : 0;

    await client.query(
      'INSERT INTO scores (user_id, game_slug, score, duration_seconds) VALUES ($1, $2, $3, $4)',
      [userId, game.slug, score, duration],
    );

    const upsert = await client.query(
      `INSERT INTO progress (user_id, game_slug, best_score, games_played, total_seconds)
            VALUES ($1, $2, $3, 1, $4)
       ON CONFLICT (user_id, game_slug) DO UPDATE
            SET best_score = CASE WHEN EXCLUDED.best_score > progress.best_score
                                  THEN EXCLUDED.best_score ELSE progress.best_score END,
                games_played = progress.games_played + 1,
                total_seconds = progress.total_seconds + EXCLUDED.total_seconds,
                last_played_at = now()
        RETURNING best_score, games_played`,
      [userId, game.slug, score, duration],
    );

    return { ...upsert.rows[0], previousBest, isRecord: score > previousBest };
  });

  await cache.del(classementKey(game.slug), classementKey('global'));
  return result;
}

module.exports = {
  listGames,
  getGame,
  topScores,
  globalTop,
  progressFor,
  userStats,
  recentScores,
  createUser,
  findUserByIdentifier,
  pseudoOrEmailExists,
  saveScore,
};
