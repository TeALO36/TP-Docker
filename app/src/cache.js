'use strict';

const { createClient } = require('redis');
const config = require('./config');
const { cacheHits, cacheMisses } = require('./metrics');

let client = null;
let ready = false;
let errorLogged = false;

async function connectCache() {
  client = createClient({
    socket: {
      host: config.redis.host,
      port: config.redis.port,
      reconnectStrategy: (retries) => Math.min(200 + retries * 200, 3000),
    },
    password: config.redis.password,
  });

  client.on('ready', () => {
    ready = true;
    errorLogged = false;
    console.log('[cache] Redis connecté');
  });
  client.on('end', () => {
    ready = false;
  });
  client.on('error', (err) => {
    ready = false;
    if (!errorLogged) {
      errorLogged = true;
      console.warn('[cache] Redis indisponible :', err.message);
    }
  });

  const firstAttempt = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 5000);
    client.once('ready', () => {
      clearTimeout(timer);
      resolve(true);
    });
    client.once('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });

  client.connect().catch(() => {
  });

  if (!(await firstAttempt)) {
    console.warn('[cache] démarrage sans Redis : cache désactivé, sessions en mémoire');
  }
  return client;
}

function isReady() {
  return ready && client !== null && client.isOpen;
}

async function getJson(key) {
  if (!isReady()) {
    cacheMisses.inc();
    return null;
  }
  try {
    const value = await client.get(key);
    if (value === null) {
      cacheMisses.inc();
      return null;
    }
    cacheHits.inc();
    return JSON.parse(value);
  } catch (err) {
    cacheMisses.inc();
    return null;
  }
}

async function setJson(key, value, ttlSeconds = 60) {
  if (!isReady()) return;
  try {
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.warn('[cache] écriture impossible :', err.message);
  }
}

async function del(...keys) {
  if (!isReady()) return;
  try {
    await client.del(keys);
  } catch (err) {
    console.warn('[cache] suppression impossible :', err.message);
  }
}

async function pingCache() {
  if (!isReady()) return false;
  try {
    return (await client.ping()) === 'PONG';
  } catch (err) {
    return false;
  }
}

module.exports = { connectCache, getClient: () => client, isReady, getJson, setJson, del, pingCache };
