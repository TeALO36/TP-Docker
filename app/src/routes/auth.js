'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const store = require('../store');
const { requireGuest } = require('../auth');

const router = express.Router();

const PSEUDO_RE = /^[a-zA-Z0-9_-]{3,16}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Hachage factice : évite de révéler par le temps de réponse si un compte existe.
const FAKE_HASH = bcrypt.hashSync('pookie-anti-timing', 10);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Trop de tentatives, réessaie dans quelques minutes.',
});

// Regénère la session après connexion (protection contre la fixation de session).
function startSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      return req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

router.get('/inscription', requireGuest, (req, res) => {
  res.render('inscription', { title: 'Créer un compte' });
});

router.post('/inscription', authLimiter, async (req, res, next) => {
  const pseudo = String(req.body.pseudo || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const errors = [];
  if (!PSEUDO_RE.test(pseudo)) {
    errors.push('Pseudo invalide : 3 à 16 caractères (lettres, chiffres, - et _).');
  }
  if (!EMAIL_RE.test(email) || email.length > 255) {
    errors.push('Adresse e-mail invalide.');
  }
  if (password.length < 8 || password.length > 72) {
    errors.push('Mot de passe : 8 caractères minimum.');
  }
  if (errors.length > 0) {
    req.flash('danger', errors.join(' '));
    return res.redirect('/inscription');
  }

  try {
    const exists = await store.pseudoOrEmailExists(pseudo, email);
    if (exists) {
      req.flash('danger', 'Ce pseudo ou cet e-mail est déjà utilisé.');
      return res.redirect('/inscription');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await store.createUser({ pseudo, email, passwordHash });
    await startSession(req, user.id);

    req.flash('success', `Bienvenue ${user.pseudo} ! Ta progression sera sauvegardée.`);
    return res.redirect('/');
  } catch (err) {
    // Violation de contrainte UNIQUE (course entre deux inscriptions).
    if (err.code === '23505') {
      req.flash('danger', 'Ce pseudo ou cet e-mail est déjà utilisé.');
      return res.redirect('/inscription');
    }
    return next(err);
  }
});

router.get('/connexion', requireGuest, (req, res) => {
  res.render('connexion', { title: 'Connexion' });
});

router.post('/connexion', authLimiter, async (req, res, next) => {
  const identifier = String(req.body.identifier || '').trim();
  const password = String(req.body.password || '');

  if (!identifier || !password) {
    req.flash('danger', 'Renseigne ton pseudo (ou e-mail) et ton mot de passe.');
    return res.redirect('/connexion');
  }

  try {
    const user = await store.findUserByIdentifier(identifier);
    const valid = await bcrypt.compare(password, user ? user.password_hash : FAKE_HASH);
    if (!user || !valid) {
      req.flash('danger', 'Identifiants incorrects.');
      return res.redirect('/connexion');
    }

    await startSession(req, user.id);
    req.flash('success', `Content de te revoir, ${user.pseudo} !`);
    return res.redirect('/');
  } catch (err) {
    return next(err);
  }
});

router.post('/deconnexion', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('pookie.sid');
    res.redirect('/');
  });
});

module.exports = router;
