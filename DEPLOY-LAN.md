# Deploy em servidor da rede local (LAN)

O SisPTrab roda em um servidor da rede (app + PostgreSQL via Docker) e os demais
computadores acessam pelo navegador em `http://<ip-do-servidor>:3000`.

## Pré-requisitos no servidor

- Docker + Docker Compose
- Porta 3000 liberada no firewall do servidor (entrada TCP na rede local)
- IP fixo (ou reserva DHCP) para o servidor

## Passo a passo

1. **Clonar o repositório e configurar o ambiente:**

   ```bash
   git clone <repo> sisptrab && cd sisptrab
   cp .env.docker.example .env
   ```

   Edite o `.env`:
   - `APP_URL` → `http://<ip-do-servidor>:3000` (ex.: `http://192.168.0.10:3000`)
   - `DB_PASSWORD` e `JWT_SECRET` → valores fortes (`openssl rand -base64 32`)
   - `COOKIE_SECURE=false` (acesso por HTTP na intranet)

2. **Subir os serviços:**

   ```bash
   docker compose up -d --build
   ```

   O entrypoint aplica as migrations (`prisma migrate deploy`) automaticamente —
   as migrations são versionadas em `prisma/migrations/`.

3. **Popular os dados iniciais (primeira vez apenas):**

   O seed cria as OMs (hierarquia do CMA), classes I–X, tipos, naturezas de
   despesa e o usuário administrador. Rode de uma máquina com Node.js
   (pode ser o próprio servidor), apontando para o banco do container:

   ```bash
   npm install
   DATABASE_URL="postgresql://sisptrab:<DB_PASSWORD>@localhost:5432/sisptrab?schema=public" npm run db:seed
   ```

4. **Acessar de outro computador da rede:**

   `http://<ip-do-servidor>:3000`

## Banco já existente (criado antes com `prisma db push`)

Se o banco de produção foi criado sem migrations, marque o baseline como
aplicado uma única vez antes do primeiro `migrate deploy`:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate resolve --applied 0_init
```

## Atualização de versão

```bash
git pull
docker compose up -d --build   # migrations novas são aplicadas no boot
```

## Observações

- O sistema usa internet para a API de preços de combustível (Classe III,
  `combustivelapi.com.br`) e, futuramente, consulta de pregões no
  Compras.gov.br. Há fallback de preços por estado se a API estiver fora.
  Fora isso, o sistema é 100% utilizável sem acesso à internet: sem a API,
  o formulário da Classe III cai automaticamente na tabela de preços de
  referência por estado e ainda permite digitar o preço manualmente — nada
  trava a criação de despesas ou planos de trabalho.
- Para HTTPS na intranet, coloque um proxy reverso (Caddy/nginx) na frente e
  mude `APP_URL` para `https://...` e `COOKIE_SECURE=true`.
- Backup do banco: volume Docker `postgres_data`;
  `docker compose exec postgres pg_dump -U sisptrab sisptrab > backup.sql`.
