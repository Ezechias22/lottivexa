#!/usr/bin/env sh
set -eu
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL must target an empty recovery database}"
: "${1:?usage: restore.sh BACKUP.dump}"
backup="$1"
"$(dirname "$0")/verify-backup.sh" "$backup"
case "$RESTORE_DATABASE_URL" in *production*|*prod*) printf 'refusing an ambiguous production restore target\n' >&2; exit 2;; esac
pg_restore --exit-on-error --clean --if-exists --no-owner --dbname="$RESTORE_DATABASE_URL" "$backup"
psql "$RESTORE_DATABASE_URL" -v ON_ERROR_STOP=1 -c 'SELECT count(*) AS migrations FROM "_prisma_migrations";'
printf 'restore completed and migration table verified\n'
