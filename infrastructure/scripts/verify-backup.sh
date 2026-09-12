#!/usr/bin/env sh
set -eu
: "${1:?usage: verify-backup.sh BACKUP.dump}"
backup="$1"
test -f "$backup" && test -f "$backup.sha256"
sha256sum -c "$backup.sha256"
pg_restore --list "$backup" >/dev/null
printf 'backup verified: %s\n' "$backup"
