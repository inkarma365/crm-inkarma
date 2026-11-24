#!/usr/bin/env bash
# Genera infra/compose/.env con segreti casuali, se non esiste già. Non sovrascrive mai.
set -euo pipefail
cd "$(dirname "$0")/../compose"
if [[ -f .env ]]; then echo ".env esiste già: nessuna modifica"; exit 0; fi
umask 077
sed \
  -e "s|^PG_DATABASE_PASSWORD=.*|PG_DATABASE_PASSWORD=$(openssl rand -hex 32)|" \
  -e "s|^HUB_DB_PASSWORD=.*|HUB_DB_PASSWORD=$(openssl rand -hex 32)|" \
  -e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(openssl rand -base64 32)|" \
  .env.example > .env
echo ".env creato (permessi 600)"
