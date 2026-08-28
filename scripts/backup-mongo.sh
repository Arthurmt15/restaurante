#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups/mongodb}"
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-restaurante}"
MONGO_USER="${MONGO_USER:-}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEST="${BACKUP_DIR}/${MONGO_DB}_${TIMESTAMP}"

mkdir -p "${BACKUP_DIR}"

DUMP_ARGS=(
  --host "${MONGO_HOST}"
  --port "${MONGO_PORT}"
  --db "${MONGO_DB}"
  --out "${DEST}"
  --gzip
)

if [[ -n "${MONGO_USER}" ]]; then
  DUMP_ARGS+=(--username "${MONGO_USER}")
  if [[ -n "${MONGO_PASS:-}" ]]; then
    export MONGOCrypt_CMD_PASSWORD="${MONGO_PASS}"
    DUMP_ARGS+=(--password "${MONGO_PASS}")
  fi
fi

echo "[$(date -Iseconds)] Starting MongoDB backup of '${MONGO_DB}'..."
mongodump "${DUMP_ARGS}"
echo "[$(date -Iseconds)] Backup saved to ${DEST}"

echo "[$(date -Iseconds)] Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -maxdepth 1 -mindepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf {} +
find "${BACKUP_DIR}" -maxdepth 1 -name "*.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date -Iseconds)] Cleanup done."
