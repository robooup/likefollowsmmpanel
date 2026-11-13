#!/usr/bin/env bash
# Nightly backup: every TopupCraft database + uploaded files. Keeps 14 days.
set -euo pipefail
DEST=/var/backups/topupcraft
STAMP=$(date +%F)
mkdir -p "$DEST/$STAMP"
chmod 700 "$DEST"

for db in $(sudo -u postgres psql -Atc "SELECT datname FROM pg_database WHERE datname LIKE 'tc\_%' ESCAPE '\\'"); do
  sudo -u postgres pg_dump -Fc "$db" > "$DEST/$STAMP/$db.dump"
done
tar -czf "$DEST/$STAMP/storage.tar.gz" -C /var/lib/topupcraft storage 2>/dev/null || true

find "$DEST" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "Backup written to $DEST/$STAMP"
