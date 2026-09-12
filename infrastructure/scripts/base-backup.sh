#!/usr/bin/env sh
set -eu
: "${PITR_DATABASE_URL:?PITR_DATABASE_URL must be a PostgreSQL replication connection URL}"
: "${BACKUP_DIR:?BACKUP_DIR is required}"
umask 077
mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
temporary="$BACKUP_DIR/.base-$stamp.tmp"
target="$BACKUP_DIR/base-$stamp"
mkdir "$temporary"
trap 'find "$temporary" -depth -delete 2>/dev/null || true' EXIT HUP INT TERM
pg_basebackup --dbname="$PITR_DATABASE_URL" --pgdata="$temporary" --format=tar --gzip --wal-method=stream --checkpoint=fast --manifest-checksums=SHA256 --no-password
test -s "$temporary/base.tar.gz"
test -s "$temporary/pg_wal.tar.gz"
(cd "$temporary" && sha256sum ./* >SHA256SUMS && sha256sum -c SHA256SUMS)
mv "$temporary" "$target"
trap - EXIT HUP INT TERM
printf '%s\n' "$target"
