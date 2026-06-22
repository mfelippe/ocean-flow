#!/usr/bin/env bash
# Backup do banco do Ocean Flow para ./backups/oceanflow-<timestamp>.sql
# Uso: ./scripts/backup.sh [arquivo-compose]
set -euo pipefail

COMPOSE_FILE="${1:-docker-compose.yml}"
mkdir -p backups
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="backups/oceanflow-${STAMP}.sql"

echo "Gerando backup em ${OUT}…"
docker compose -f "${COMPOSE_FILE}" exec -T db \
  pg_dump -U oceanflow oceanflow > "${OUT}"

echo "Pronto: ${OUT}"
echo "Obs.: os anexos ficam no volume oceanflow_uploads (faça backup à parte)."
