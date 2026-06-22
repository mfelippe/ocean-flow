# Self-hosting

Como rodar o Ocean Flow na sua infraestrutura. Único pré-requisito: **Docker**.

## Instalação (imagem publicada)

A cada release, uma imagem é publicada em
`ghcr.io/mfelippe/ocean-flow`. Para subir sem buildar localmente:

```bash
mkdir ocean-flow && cd ocean-flow
curl -O https://raw.githubusercontent.com/mfelippe/ocean-flow/main/docker-compose.release.yml

cat > .env <<'EOF'
AUTH_SECRET=cole-aqui-o-resultado-de-openssl-rand-base64-32
AUTH_URL=https://kanban.seu-dominio.com
PORT=3000
# Opcional: use um Postgres externo (senão usa o banco embutido):
# DATABASE_URL=postgresql://usuario:senha@host:5432/banco?schema=public
EOF

docker compose -f docker-compose.release.yml up -d
```

Gere o `AUTH_SECRET` com `openssl rand -base64 32`. A aplicação sobe na porta
`PORT` (padrão 3000); as migrations rodam automaticamente no start.

> **Banco:** por padrão sobe um PostgreSQL embutido (não exposto). Para usar um
> banco **externo/gerenciado**, defina `DATABASE_URL` apontando para ele. O
> start valida a URL: se não for `postgresql://...`, o container falha com uma
> mensagem clara em vez de subir quebrado.

> Para HTTPS, coloque um proxy reverso (Caddy, Nginx, Traefik) na frente e
> aponte `AUTH_URL` para o domínio público.

## Instalação (build local)

Para buildar a imagem a partir do código (sem usar o registro):

```bash
git clone https://github.com/mfelippe/ocean-flow.git
cd ocean-flow
docker compose up --build -d
```

## Variáveis de ambiente

| Variável        | Obrigatória | Descrição                                              |
| --------------- | ----------- | ------------------------------------------------------ |
| `AUTH_SECRET`   | sim         | Segredo do Auth.js (`openssl rand -base64 32`)         |
| `AUTH_URL`      | recomendada | URL pública (ex.: `https://...`)                       |
| `DATABASE_URL`  | não\*       | Postgres externo (`postgresql://...`). Padrão: banco embutido. \*Validada no start — erro se não for PostgreSQL. |
| `PORT`          | não         | Porta exposta (padrão 3000)                            |
| `UPLOAD_DIR`    | —           | Diretório de anexos (volume `/data/uploads`)           |

## Dados e volumes

- **Banco**: volume `oceanflow_db` (PostgreSQL).
- **Anexos**: volume `oceanflow_uploads` (arquivos enviados nos cards).

Faça backup dos dois.

## Backup e restauração

Scripts prontos (usam `pg_dump`/`psql` no container `db`):

```bash
# Backup do banco → backups/oceanflow-<timestamp>.sql
./scripts/backup.sh docker-compose.release.yml

# Restauração (sobrescreve os dados atuais)
./scripts/restore.sh backups/oceanflow-20260622-120000.sql docker-compose.release.yml
```

Os **anexos** ficam no volume `oceanflow_uploads` — faça backup à parte, por
exemplo:

```bash
docker run --rm -v oceanflow_uploads:/data -v "$PWD/backups:/out" \
  alpine tar czf /out/uploads.tar.gz -C /data .
```

## Atualização

```bash
docker compose -f docker-compose.release.yml pull
docker compose -f docker-compose.release.yml up -d
```

As migrations pendentes são aplicadas automaticamente no start do container.
**Faça backup antes de atualizar.**

## Saúde

O endpoint `GET /api/health` retorna `{"status":"ok","db":"up"}` (HTTP 200) ou
`503` se o banco estiver inacessível — útil para o healthcheck do Docker e para
monitores externos. Os containers já têm healthcheck configurado.
