# Backup and recovery

Run `backup.sh` daily with `DATABASE_URL`, `BACKUP_DIR`, and an optional `BACKUP_RETENTION_DAYS`. It writes a temporary custom-format dump, validates its catalog, atomically renames it, creates SHA-256 evidence and prunes expired backups. Replicate completed dump/checksum pairs to encrypted storage in another failure domain.

Production Compose enables PostgreSQL WAL archiving into a dedicated volume. Create regular physical recovery anchors with `base-backup.sh`, using a least-privileged replication connection in `PITR_DATABASE_URL`, and validate them with `verify-base-backup.sh`. Copy base backups and continuous WAL segments to encrypted, immutable storage in another failure domain. A WAL archive without a matching base backup is not a PITR strategy.

Retain daily logical backups for 30 days, monthly backups for one year, and enough base backups/WAL to satisfy the documented recovery-point objective. Apply lifecycle deletion in the off-host backup store; the base-backup script does not silently delete physical recovery anchors.

Test restoration at least monthly:

1. Provision an isolated empty recovery database.
2. Run `RESTORE_DATABASE_URL=... infrastructure/scripts/restore.sh BACKUP.dump`.
3. The script verifies checksum/catalog, restores with fail-fast behavior and checks Prisma migration history.
4. Run `/ready`, ledger balance checks, tenant-isolation tests and a sample ticket validation.
5. Record recovery time and recovery point achieved; destroy recovery credentials after the exercise.

The restore script refuses target URLs visibly named `prod` or `production`. Production recovery requires a reviewed runbook, a new database target and an explicit cutover.

For PITR, select one verified base backup and an unbroken WAL sequence, restore into an isolated PostgreSQL data directory, configure `restore_command` and `recovery_target_time`, create `recovery.signal`, then start an isolated server. Stop and inspect the recovered ledger/audit state before promoting or changing application connection strings. Never extract a base backup over a running production data directory.
