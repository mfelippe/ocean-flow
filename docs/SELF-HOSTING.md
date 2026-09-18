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

## Primeiro acesso (setup)

No **primeiro acesso**, a instância não tem usuários. Ao abrir a URL, você é
levado automaticamente para **`/setup`**, onde cria a **conta de administrador
da instância** (super admin) e a **primeira organização** — nos moldes do
Uptime Kuma. Depois disso a tela de setup some e o login passa a valer
normalmente.

> Esse primeiro usuário é o **super admin**. Em instalações que já existiam
> antes desta versão, o usuário mais antigo é promovido a super admin
> automaticamente na atualização.

## Administração da instância

O super admin acessa **`/admin`** (link "Admin" no topo do painel) para:

- ver totais de **usuários, organizações, quadros e cards**;
- **resetar a senha** de um usuário (gera uma senha temporária exibida uma
  única vez — repasse-a ao usuário, que pode trocá-la depois);
- **bloquear/desbloquear** um usuário (o bloqueio derruba o acesso na hora e
  impede novos logins).

### Recuperar o acesso do admin (perdeu a senha)

Se você **perdeu a senha do super admin** e não consegue mais entrar no `/admin`,
rode o script de reset **no servidor** (dentro do container da app). Ele pede o
e-mail e uma nova senha (digitada oculta), atualiza o hash, **desbloqueia** a
conta e **garante o super admin** — sem apagar dados nem recriar a organização:

```bash
docker compose -f docker-compose.release.yml exec app node scripts/reset-admin.mjs
```

- Se o e-mail informado **existe**, a senha é redefinida.
- Se **não existe**, o script oferece criar um novo super admin (vinculado a uma
  organização existente como OWNER, quando houver).

Rode num terminal interativo (o `exec` do Compose já aloca um TTY) para o campo
de senha ficar oculto. Como exige acesso ao servidor, não há superfície web nova.

> **Só promover a super admin** (sem trocar senha), direto no banco:
>
> ```bash
> docker compose -f docker-compose.release.yml exec db \
>   psql -U oceanflow -d oceanflow \
>   -c "UPDATE \"User\" SET \"isSuperAdmin\" = true WHERE email = 'voce@exemplo.com';"
> ```

## Variáveis de ambiente

| Variável        | Obrigatória | Descrição                                              |
| --------------- | ----------- | ------------------------------------------------------ |
| `AUTH_SECRET`   | sim         | Segredo do Auth.js (`openssl rand -base64 32`)         |
| `AUTH_URL`      | recomendada | URL pública (ex.: `https://...`)                       |
| `DATABASE_URL`  | não\*       | Postgres externo (`postgresql://...`). Padrão: banco embutido. \*Validada no start — erro se não for PostgreSQL. |
| `PORT`          | não         | Porta exposta (padrão 3000)                            |
| `UPLOAD_DIR`    | —           | Diretório de anexos (volume `/data/uploads`)           |
| `API_RATE_LIMIT` | não        | Requisições por janela por token na API/MCP (padrão 120; `0` desliga) |
| `API_RATE_WINDOW_SECONDS` | não | Tamanho da janela do rate limit em segundos (padrão 60) |

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
