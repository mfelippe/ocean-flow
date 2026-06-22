#!/usr/bin/env bash
# Restaura um backup .sql no banco do Ocean Flow.
# Uso: ./scripts/restore.sh backups/oceanflow-<timestamp>.sql [arquivo-compose]
set -euo pipefail

DUMP="${1:?Informe o arquivo .sql de backup}"
COMPOSE_FILE="${2:-docker-compose.yml}"

if [ ! -f "${DUMP}" ]; then
  echo "Arquivo não encontrado: ${DUMP}" >&2
  exit 1
fi

echo "Restaurando ${DUMP} (isto sobrescreve os dados atuais)…"
docker compose -f "${COMPOSE_FILE}" exec -T db \
  psql -U oceanflow -d oceanflow < "${DUMP}"

echo "Restauração concluída."
