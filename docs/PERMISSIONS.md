# Permissões

O Ocean Flow tem dois níveis de permissão: **papel na organização** e
**acesso por quadro**.

## Papéis na organização

Cada membro tem um papel na organização:

| Papel    | Pode                                                         |
| -------- | ------------------------------------------------------------ |
| `OWNER`  | Tudo; acesso total a todos os quadros; gerencia integrações  |
| `ADMIN`  | Como OWNER no dia a dia; acesso total aos quadros; integrações |
| `MEMBER` | Cria e edita conteúdo conforme o acesso ao quadro            |
| `VIEWER` | Somente leitura                                              |

Membros são gerenciados na página da organização (`/orgs/<slug>`) por OWNER/ADMIN.

## Visibilidade e acesso por quadro

Cada quadro tem uma **visibilidade**:

- **ORG** (padrão): todos os membros da organização acessam, com o papel da org.
- **PRIVATE**: apenas OWNER/ADMIN da org e **membros do quadro** acessam.

Além disso, um quadro pode ter **membros do quadro** com papel próprio
(`ADMIN`, `MEMBER`, `VIEWER`), gerenciados na página **Acesso**
(`/orgs/<slug>/boards/<id>/settings`).

### Papel efetivo

O acesso a um quadro é calculado assim:

1. **OWNER/ADMIN da organização** → acesso total a qualquer quadro (sempre).
2. Demais membros:
   - Quadro **ORG**: papel de membro do quadro (se houver) **sobrepõe** o papel
     da organização; senão usa o papel da organização.
   - Quadro **PRIVATE**: exige ser membro do quadro — senão, o quadro fica
     oculto na listagem e o acesso direto retorna `404`.

`VIEWER` (efetivo) é somente leitura: sem criar/mover/editar/arquivar.
Apenas papéis efetivos `OWNER`/`ADMIN` veem a página **Acesso** e gerenciam o
quadro.

> Quem cria um quadro vira automaticamente **ADMIN do quadro**, mantendo o
> acesso mesmo que o quadro se torne privado.

## Tokens de API / MCP / Webhooks

Tokens de API e webhooks são **escopados à organização** e criados por
OWNER/ADMIN em Integrações (`/orgs/<slug>/settings`). Um token concede acesso
aos quadros da organização através da API e do MCP.
