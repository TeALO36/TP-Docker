'use strict';

const env = process.env;

module.exports = {
  nodeEnv: env.NODE_ENV || 'development',
  port: Number(env.PORT || 3000),
  appName: 'Pookie',
  publicUrl: env.PUBLIC_URL || 'http://pookie.localhost',

  session: {
    secret: env.SESSION_SECRET || 'pookie-secret-de-dev-a-changer',
    secure: env.SESSION_COOKIE_SECURE === 'true',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 jours
  },

  db: {
    host: env.PGHOST || 'db',
    port: Number(env.PGPORT || 5432),
    user: env.PGUSER || 'pookie',
    password: env.PGPASSWORD || 'pookie',
    database: env.PGDATABASE || 'pookie',
    max: Number(env.PGPOOL_MAX || 10),
  },

  redis: {
    host: env.REDIS_HOST || 'cache',
    port: Number(env.REDIS_PORT || 6379),
    password: env.REDIS_PASSWORD || undefined,
  },

};
