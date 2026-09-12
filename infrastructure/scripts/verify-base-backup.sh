#!/usr/bin/env sh
set -eu
: "${1:?usage: verify-base-backup.sh BASE_BACKUP_DIRECTORY}"
directory="$1"
test -d "$directory" && test -f "$directory/SHA256SUMS"
(cd "$directory" && sha256sum -c SHA256SUMS)
gzip -t "$directory/base.tar.gz"
gzip -t "$directory/pg_wal.tar.gz"
test -s "$directory/backup_manifest"
printf 'physical base backup verified: %s\n' "$directory"
