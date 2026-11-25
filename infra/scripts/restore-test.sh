#!/usr/bin/env bash
# Prova di ripristino NON distruttiva: ripristina l'ultimo backup in due database temporanei,
# confronta i conteggi delle tabelle chiave con quelli attuali, poi elimina i database temporanei.
# Uso (sulla VPS): infra/scripts/restore-test.sh [cartella-backup]
set -euo pipefail
export DOCKER_HOST=${DOCKER_HOST:-unix:///run/user/$(id -u)/docker.sock}
cd "$(dirname "$0")/../compose"
SRC=${1:-$(ls -1d ~/data/backups/*/ | sort | tail -1)}
( cd "$SRC" && sha256sum -c SHA256SUMS --quiet ) && echo "checksum ok: $SRC"
psql() { docker compose exec -T db psql -U postgres -v ON_ERROR_STOP=1 -tA "$@"; }
for db in restore_check_twenty restore_check_hub; do psql -d postgres -c "DROP DATABASE IF EXISTS $db" >/dev/null; psql -d postgres -c "CREATE DATABASE $db" >/dev/null; done
docker compose exec -T db pg_restore -U postgres -d restore_check_twenty --no-owner < "$SRC/twenty.dump" 2>/dev/null || true
docker compose exec -T db pg_restore -U postgres -d restore_check_hub --no-owner < "$SRC/hub.dump"
SCHEMA=$(psql -d default -c "select schema_name from information_schema.schemata where schema_name like 'workspace_%' limit 1")
fail=0
confronta() { # db_orig db_rest query
  a=$(psql -d "$1" -c "$3"); b=$(psql -d "$2" -c "$3")
  printf '%-60s attuale=%-6s ripristinato=%-6s %s\n' "$3" "$a" "$b" "$([ "$a" = "$b" ] && echo ok || echo DIVERSO)"
  [ "$a" = "$b" ] || fail=1
}
for t in commessa campagna appartenenza "consegnaLead" "feedbackLead" opposizione person company; do
  confronta default restore_check_twenty "select count(*) from \"$SCHEMA\".\"_$t\"" 2>/dev/null || confronta default restore_check_twenty "select count(*) from \"$SCHEMA\".\"$t\""
done
for t in event_log effect_outbox portal_user portal_membership audit_log import_batch; do confronta hub restore_check_hub "select count(*) from $t"; done
for db in restore_check_twenty restore_check_hub; do psql -d postgres -c "DROP DATABASE $db" >/dev/null; done
tar -tzf "$SRC/storage.tgz" >/dev/null && echo "archivio storage leggibile"
[ $fail = 0 ] && echo "RIPRISTINO VERIFICATO" || { echo "RIPRISTINO CON DIFFERENZE (scritture avvenute dopo il backup?)"; exit 1; }
