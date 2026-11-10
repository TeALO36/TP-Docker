#!/bin/sh
# Crée le compte de réplication et autorise la connexion depuis le réplica.
# Ce script est exécuté par l'entrypoint PostgreSQL lors de l'initialisation.
REPL_USER="${REPLICATION_USER:-replicator}"
REPL_PASS="${REPLICATION_PASSWORD:-repl_pookie}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
CREATE ROLE ${REPL_USER} WITH REPLICATION LOGIN PASSWORD '${REPL_PASS}';
EOSQL

echo "host replication ${REPL_USER} all scram-sha-256" >> "$PGDATA/pg_hba.conf"
