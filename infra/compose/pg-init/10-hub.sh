#!/bin/sh
# Crea il database dell'Hub con un utente dedicato.
# L'Hub non ha alcun privilegio sul database di Twenty.
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE ROLE hub LOGIN PASSWORD '${HUB_DB_PASSWORD}';
CREATE DATABASE hub OWNER hub;
REVOKE ALL ON DATABASE "${POSTGRES_DB}" FROM PUBLIC;
SQL
