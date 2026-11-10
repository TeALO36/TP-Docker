'use strict';

const { Pool } = require('pg');
const config = require('./config');
const { dbUp } = require('./metrics');

const pool = new Pool({
  ...config.db,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
});

pool.on('connect', () => dbUp.set(1));
pool.on('error', (err) => {
  dbUp.set(0);
  console.error('[db] erreur sur un client inactif :', err.message);
});

function query(text, params) {
  return pool.query(text, params);
}

async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDatabase({ attempts = 30, delayMs = 1000 } = {}) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      await pool.query('SELECT 1');
      dbUp.set(1);
      console.log('[db] PostgreSQL connecté');
      return true;
    } catch (err) {
      dbUp.set(0);
      console.warn(`[db] PostgreSQL indisponible (tentative ${i}/${attempts}) : ${err.message}`);
      await sleep(delayMs);
    }
  }
  throw new Error('Impossible de joindre PostgreSQL après plusieurs tentatives');
}

async function pingDatabase() {
  try {
    await pool.query('SELECT 1');
    dbUp.set(1);
    return true;
  } catch (err) {
    dbUp.set(0);
    return false;
  }
}

module.exports = { pool, query, withTransaction, waitForDatabase, pingDatabase };
