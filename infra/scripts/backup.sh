#!/usr/bin/env bash
# Backup della sandbox (da eseguire sulla VPS come crmdev): dump dei due database e dello storage file di Twenty.
# Uso: infra/scripts/backup.sh            → ~/data/backups/AAAAMMGG-HHMMSS/
# Conserva gli ultimi $KEEP backup (default 7). Non contiene segreti dell'applicazione (.env è escluso di proposito:
# va salvato a parte, perché senza ENCRYPTION_KEY i segreti cifrati nel DB non sono leggibili).
set -euo pipefail
export DOCKER_HOST=${DOCKER_HOST:-unix:///run/user/$(id -u)/docker.sock}
cd "$(dirname "$0")/../compose"
KEEP=${KEEP:-7}
DEST=~/data/backups/$(date +%Y%m%d-%H%M%S)
mkdir -p "$DEST" && chmod 700 "$DEST"
umask 077
docker compose exec -T db pg_dump -U postgres -d default -Fc > "$DEST/twenty.dump"
docker compose exec -T db pg_dump -U postgres -d hub -Fc > "$DEST/hub.dump"
docker compose exec -T server tar -C /app/packages/twenty-server -czf - .local-storage > "$DEST/storage.tgz"
( cd "$DEST" && sha256sum twenty.dump hub.dump storage.tgz > SHA256SUMS )
echo "backup in $DEST: $(du -sh "$DEST" | cut -f1)"
ls -1d ~/data/backups/*/ | sort | head -n -"$KEEP" | xargs -r rm -rf
