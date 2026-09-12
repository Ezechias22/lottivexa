#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
umask 077
mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$BACKUP_DIR/lottivexa-$stamp.dump"
pg_dump --format=custom --compress=9 --no-owner --dbname="$DATABASE_URL" --file="$target.tmp"
pg_restore --list "$target.tmp" >/dev/null
mv "$target.tmp" "$target"
sha256sum "$target" >"$target.sha256"
find "$BACKUP_DIR" -type f -name 'lottivexa-*.dump' -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -type f -name 'lottivexa-*.dump.sha256' -mtime "+$RETENTION_DAYS" -delete
printf '%s\n' "$target"
