'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const { RedisStore } = require('connect-redis');

const config = require('./config');
const db = require('./db');
const cache = require('./cache');
const metrics = require('./metrics');
const { attachUser } = require('./auth');

function isPrivateIp(ip) {
  if (!ip) return false;
  const value = ip.replace(/^::ffff:/, '');
  return (
    value === '127.0.0.1' ||
    value === '::1' ||
    value.startsWith('10.') ||
    value.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(value)
  );
}

async function main() {
  const redisClient = await cache.connectCache();
  await db.waitForDatabase();

  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'form-action': ["'self'"],
          'upgrade-insecure-requests': null,
        },
      },
      hsts: config.session.secure,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(metrics.httpMetrics);
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use(express.json({ limit: '20kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

  const store = cache.isReady()
    ? new RedisStore({ client: redisClient, prefix: 'pookie:sess:' })
    : undefined;
  if (!store) {
    console.warn('[session] Redis indisponible : sessions en mémoire (non persistantes)');
  }

  app.use(
    session({
      name: 'pookie.sid',
      store,
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.session.secure,
        maxAge: config.session.maxAge,
      },
    }),
  );

  app.use((req, res, next) => {
    req.flash = (type, message) => {
      req.session.flash = { type, message };
    };
    next();
  });

  app.use(attachUser);
  app.use((req, res, next) => {
    res.locals.appName = config.appName;
    res.locals.publicUrl = config.publicUrl;
    next();
  });

  app.use('/', require('./routes/pages'));
  app.use('/', require('./routes/auth'));
  app.use('/api', require('./routes/api'));

  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  });

  app.get('/health/ready', async (req, res) => {
    const [dbOk, cacheOk] = await Promise.all([db.pingDatabase(), cache.pingCache()]);
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ready' : 'indisponible',
      checks: { db: dbOk, cache: cacheOk },
    });
  });

  app.get('/metrics', async (req, res) => {
    if (!isPrivateIp(req.ip)) {
      return res.status(403).type('text/plain').send('Accès refusé');
    }
    res.set('Content-Type', metrics.registry.contentType);
    return res.send(await metrics.registry.metrics());
  });

  app.use((req, res) => {
    res.status(404).render('404', { title: 'Page introuvable' });
  });

  app.use((err, req, res, next) => {
    console.error('[http]', err);
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(500).json({ error: 'Erreur serveur.' });
    }
    return res.status(500).render('erreur', {
      title: 'Erreur',
      message: config.nodeEnv === 'production'
        ? 'Une erreur interne est survenue. Réessaie dans un instant.'
        : err.message,
    });
  });

  const server = app.listen(config.port, () => {
    console.log(`[http] Pookie écoute sur le port ${config.port}`);
  });

  const shutdown = (signal) => {
    console.log(`[http] ${signal} reçu : arrêt propre`);
    server.close(async () => {
      await db.pool.end().catch(() => {});
      if (redisClient && redisClient.isOpen) await redisClient.quit().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[app] démarrage impossible :', err);
  process.exit(1);
});
