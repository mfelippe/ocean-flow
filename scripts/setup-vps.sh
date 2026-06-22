#!/usr/bin/env bash
# scripts/setup-vps.sh
# Roda UMA VEZ no VPS recém-criado (Ubuntu 22.04+).
# Uso: bash <(curl -fsSL https://raw.githubusercontent.com/mfelippe/ocean-flow/main/scripts/setup-vps.sh)
#
# O que faz:
#   1. Instala Docker + Docker Compose plugin
#   2. Instala Caddy (reverse proxy com SSL automático)
#   3. Cria o usuário `deploy` com acesso ao Docker (para o CI/CD)
#   4. Cria /opt/ocean-flow com compose + .env de exemplo
#   5. Exibe as próximas instruções

set -euo pipefail

echo "=== Ocean Flow — setup VPS ==="

# 1. Docker
if ! command -v docker &>/dev/null; then
  echo "→ Instalando Docker…"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
echo "✓ Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"

# 2. Caddy
if ! command -v caddy &>/dev/null; then
  echo "→ Instalando Caddy…"
  apt-get update -q
  apt-get install -y -q debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
fi
echo "✓ Caddy $(caddy version 2>/dev/null | head -1)"

# 3. Usuário deploy (sem senha, com sudo docker)
if ! id deploy &>/dev/null; then
  echo "→ Criando usuário deploy…"
  useradd -m -s /bin/bash deploy
  usermod -aG docker deploy
fi
# Cria diretório .ssh para chave do CI
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
echo "✓ Usuário deploy pronto (adicione a chave pública em /home/deploy/.ssh/authorized_keys)"

# 4. Diretório da aplicação
APP_DIR="/opt/ocean-flow"
mkdir -p "$APP_DIR"

# Baixa o compose de release se não existir
if [ ! -f "$APP_DIR/docker-compose.yml" ]; then
  echo "→ Baixando docker-compose.yml…"
  curl -fsSL \
    https://raw.githubusercontent.com/mfelippe/ocean-flow/main/docker-compose.release.yml \
    -o "$APP_DIR/docker-compose.yml"
fi

# Cria .env de exemplo se não existir
if [ ! -f "$APP_DIR/.env" ]; then
  AUTH_SECRET=$(openssl rand -base64 32)
  cat > "$APP_DIR/.env" <<EOF
# Gerado automaticamente — EDITE antes de subir
AUTH_SECRET=${AUTH_SECRET}
AUTH_URL=https://SEU-DOMINIO.COM
# DATABASE_URL padrão usa o Postgres embutido — OK para começar
# DATABASE_URL=postgresql://oceanflow:oceanflow@db:5432/oceanflow?schema=public
PORT=3000
EOF
  echo "✓ /opt/ocean-flow/.env criado (edite AUTH_URL)"
fi

chown -R deploy:deploy "$APP_DIR"

# 5. Caddyfile inicial (placeholder)
if [ ! -f /etc/caddy/Caddyfile ]; then
  cat > /etc/caddy/Caddyfile <<'EOF'
# Edite SEU-DOMINIO.COM abaixo e rode: systemctl reload caddy
SEU-DOMINIO.COM {
  reverse_proxy localhost:3000
}
EOF
fi

systemctl enable --now caddy

echo ""
echo "========================================"
echo "  Próximos passos manuais"
echo "========================================"
echo ""
echo "1. Aponte o DNS do seu domínio para o IP deste servidor."
echo ""
echo "2. Edite o Caddyfile:"
echo "   nano /etc/caddy/Caddyfile"
echo "   (substitua SEU-DOMINIO.COM pelo seu domínio)"
echo "   systemctl reload caddy"
echo ""
echo "3. Edite as variáveis de ambiente:"
echo "   nano /opt/ocean-flow/.env"
echo "   (defina AUTH_URL=https://seu-dominio.com)"
echo ""
echo "4. Adicione a chave SSH pública do CI:"
echo "   nano /home/deploy/.ssh/authorized_keys"
echo "   (cole o conteúdo de VPS_SSH_KEY_PUB)"
echo ""
echo "5. Suba pela primeira vez:"
echo "   cd /opt/ocean-flow && docker compose pull && docker compose up -d"
echo ""
echo "6. Configure os secrets no GitHub:"
echo "   VPS_HOST  → IP do servidor"
echo "   VPS_USER  → deploy"
echo "   VPS_SSH_KEY → chave privada (ssh-keygen -t ed25519 -C 'oceanflow-ci')"
echo ""
echo "Depois disso, basta criar uma tag (git tag v0.2.0 && git push --tags)"
echo "e o CI/CD faz o deploy automaticamente."
echo "========================================"
