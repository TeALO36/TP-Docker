'use strict';

const client = require('prom-client');

const registry = new client.Registry();
registry.setDefaultLabels({ service: 'pookie-app' });
client.collectDefaultMetrics({ register: registry, prefix: 'pookie_' });

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP traitées',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [registry],
});

const cacheHits = new client.Counter({
  name: 'pookie_cache_hits_total',
  help: 'Lectures de cache servies par Redis',
  registers: [registry],
});

const cacheMisses = new client.Counter({
  name: 'pookie_cache_misses_total',
  help: 'Lectures de cache non servies par Redis (miss ou Redis indisponible)',
  registers: [registry],
});

const scoresSaved = new client.Counter({
  name: 'pookie_scores_saved_total',
  help: 'Scores enregistrés en base',
  labelNames: ['game'],
  registers: [registry],
});

const dbUp = new client.Gauge({
  name: 'pookie_db_up',
  help: '1 si la dernière requête PostgreSQL a réussi, 0 sinon',
  registers: [registry],
});

function httpMetrics(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const route = req.route ? `${req.baseUrl || ''}${req.route.path}` : 'autre';
    const labels = { method: req.method, route, status: res.statusCode };
    httpRequests.inc(labels);
    httpDuration.observe(labels, Number(process.hrtime.bigint() - start) / 1e9);
  });
  next();
}

module.exports = {
  registry,
  httpMetrics,
  cacheHits,
  cacheMisses,
  scoresSaved,
  dbUp,
};
