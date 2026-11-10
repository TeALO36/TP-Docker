#!/bin/sh
set -eu

PRIMARY_HOST="${PRIMARY_HOST:-db}"
REPLICATION_USER="${REPLICATION_USER:-replicator}"

echo "[replica] attente du serveur primaire ${PRIMARY_HOST}..."
until pg_isready -h "$PRIMARY_HOST" -p 5432 -U "$REPLICATION_USER" >/dev/null 2>&1; do
  sleep 2
done

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "[replica] copie initiale via pg_basebackup"
  rm -rf "${PGDATA:?}"/* 2>/dev/null || true
  PGPASSWORD="$REPLICATION_PASSWORD" pg_basebackup \
    -h "$PRIMARY_HOST" -U "$REPLICATION_USER" -D "$PGDATA" -Fp -Xs -P -R
fi

echo "[replica] démarrage en lecture seule (hot standby)"
exec postgres -D "$PGDATA"
