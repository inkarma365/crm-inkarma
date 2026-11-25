#!/usr/bin/env bash
# Pubblica il ramo corrente sul mirror bare della VPS e aggiorna il checkout di lavoro.
# Uso: infra/scripts/deploy.sh [servizi compose da (ri)avviare...]
set -euo pipefail
REMOTE=${CRMDEV_HOST:-crmdev}
BRANCH=$(git rev-parse --abbrev-ref HEAD)

git push -q "$REMOTE:data/repo.git" "$BRANCH"
# Portale compilato in locale (il build sulla VPS satura la memoria della sandbox).
yarn workspace @inkarma/portal build >/dev/null
rsync -a --delete --chmod=D755,F644 apps/portal/dist/ "$REMOTE:data/repo/apps/portal/dist/"
ssh "$REMOTE" bash -s -- "$BRANCH" "$@" <<'EOF'
set -euo pipefail
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
BRANCH=$1; shift
cd ~/data/repo
git fetch -q origin "$BRANCH"
git checkout -q "$BRANCH" 2>/dev/null || git checkout -q -b "$BRANCH" "origin/$BRANCH"
git reset -q --hard "origin/$BRANCH"
cd infra/compose
[[ -f .env ]] || ../scripts/gen-env.sh
docker compose up -d --build --remove-orphans "$@"
docker compose ps --format 'table {{.Service}}\t{{.Status}}'
EOF
