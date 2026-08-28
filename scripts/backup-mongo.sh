#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups/mongodb}"
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-restaurante}"
MONGO_USER="${MONGO_USER:-}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
WEBHOOK_URL="${BACKUP_WEBHOOK_URL:-}"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"

log() {
  local msg="[$(date -Iseconds)] $1"
  echo "$msg"
  echo "$msg" >> "$LOG_FILE"
}

send_notification() {
  local status="$1"
  local message="$2"
  if [[ -n "$WEBHOOK_URL" ]]; then
    curl -s -X POST "$WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d "{\"status\": \"${status}\", \"message\": \"${message}\", \"database\": \"${MONGO_DB}\", \"timestamp\": \"$(date -Iseconds)\"}" \
      > /dev/null 2>&1 || true
  fi
}

handle_error() {
  local exit_code=$?
  log "ERROR: Backup falhou com código de saída ${exit_code}"
  send_notification "error" "Backup do MongoDB '${MONGO_DB}' falhou (exit code: ${exit_code})"
  exit "$exit_code"
}
trap handle_error ERR

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEST="${BACKUP_DIR}/${MONGO_DB}_${TIMESTAMP}"

log "Iniciando backup de '${MONGO_DB}'..."

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

if ! mongodump "${DUMP_ARGS}"; then
  log "ERROR: mongodump falhou"
  send_notification "error" "Backup do MongoDB '${MONGO_DB}' - mongodump falhou"
  exit 1
fi

BACKUP_SIZE=$(du -sh "${DEST}" 2>/dev/null | cut -f1)
log "Backup salvo em ${DEST} (${BACKUP_SIZE})"
send_notification "success" "Backup do MongoDB '${MONGO_DB}' concluído com sucesso (${BACKUP_SIZE})"

log "Limpando backups com mais de ${RETENTION_DAYS} dias..."
DELETED=$(find "${BACKUP_DIR}" -maxdepth 1 -mindepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf {} + 2>/dev/null | wc -l)
find "${BACKUP_DIR}" -maxdepth 1 -name "*.gz" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
log "Limpeza concluída. ${DELETED} backups removidos."

log "Backup finalizado com sucesso."
