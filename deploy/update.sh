#!/usr/bin/env bash
# Deploys the latest code: pull, install, update every database, build, restart.
#   sudo bash /opt/topupcraft/app/deploy/update.sh
set -euo pipefail
APP=/opt/topupcraft/app
cd "$APP"
run() { sudo -u topupcraft -H env HOME=/opt/topupcraft "$@"; }

echo "==> Backing up before update"
bash "$APP/deploy/backup.sh"

echo "==> Fetching code"
run git pull --ff-only

echo "==> Installing packages"
run npm ci --no-audit --no-fund

echo "==> Updating databases"
run npm run -s saas:migrate

echo "==> Building (this takes a few minutes on a small server)"
SKIP_TYPECHECK=0
[ "$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)" -lt 1900 ] && SKIP_TYPECHECK=1 && echo "    Small server: skipping the build-time type check"
run env NODE_OPTIONS=--max-old-space-size=1536 SKIP_TYPECHECK=$SKIP_TYPECHECK npx next build

echo "==> Restarting"
systemctl restart topupcraft
sleep 3
systemctl --no-pager --lines=5 status topupcraft
