'use strict';

const db = require('./db');

async function attachUser(req, res, next) {
  res.locals.user = null;
  res.locals.currentPath = req.path;
  res.locals.flash = req.session.flash || null;
  if (req.session.flash) delete req.session.flash;

  if (!req.session.userId) return next();

  try {
    const { rows } = await db.query(
      'SELECT id, pseudo, email, created_at FROM users WHERE id = $1',
      [req.session.userId],
    );
    if (rows.length === 0) {
      req.session.userId = undefined;
      return next();
    }
    req.user = rows[0];
    res.locals.user = req.user;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireAuth(req, res, next) {
  if (req.user) return next();
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(401).json({ error: 'Connecte-toi pour sauvegarder ta progression.' });
  }
  req.flash('info', 'Connecte-toi pour accéder à cette page.');
  return res.redirect('/connexion');
}

function requireGuest(req, res, next) {
  if (req.user) return res.redirect('/profil');
  return next();
}

module.exports = { attachUser, requireAuth, requireGuest };
