# SisPTrab — Sistema de Planos de Trabalho

Sistema web para gestão de Planos de Trabalho (PTrab) de operações militares:
criação, cálculo de despesas por Classe de Suprimento, fluxo de aprovação
hierárquico por OM e exportação de documentos oficiais.

## Instalação

1. Baixe `start-sisptrab.exe` na página de
   [Releases](https://github.com/Schuinki/ORF-Plan-Trab/releases) (ou direto
   da raiz deste repositório).
2. Dê duplo-clique.

Não precisa clonar o repositório, instalar Node.js ou PostgreSQL. O
instalador faz tudo sozinho:

- Pede permissão de administrador (UAC).
- Habilita o WSL2, se ainda não estiver habilitado.
- Instala o Docker Desktop, se ainda não estiver instalado.
- Baixa a aplicação (imagem pronta, publicada neste repositório) e o banco
  de dados PostgreSQL, e sobe tudo.
- Popula o banco com a estrutura inicial (OMs, naturezas de despesa) e o
  usuário administrador, na primeira execução.
- Abre o navegador em `http://localhost:3000`.
- Cria um atalho **SisPTrab** na Área de Trabalho para abrir o sistema nas
  próximas vezes, sem precisar rodar o instalador de novo.

**Login padrão** (troque a senha após o primeiro acesso):

- **Email:** `admin@eb.mil.br`
- **Senha:** `admin123`

### Observações

- Se o Windows precisar reiniciar para concluir a instalação do WSL2, o
  instalador avisa e para. Depois do reinício, basta dar duplo-clique no
  `.exe` novamente — ele continua de onde parou.
- Na primeiríssima vez que o Docker Desktop abre, ele pode pedir para aceitar
  os termos de uso em uma janela própria. Se o instalador ficar esperando
  "o Docker responder", abra o Docker Desktop manualmente, aceite os termos
  e execute o instalador de novo.
- O sistema continua rodando em segundo plano (via Docker) depois que você
  fecha a janela do instalador. Para acessar depois, use o atalho **SisPTrab**
  criado na Área de Trabalho (ele garante que os containers estão de pé e abre
  o navegador) — não precisa rodar o `.exe` de novo.
- Para outros computadores da rede local acessarem pelo IP da máquina que
  instalou, libere a porta 3000 no firewall (entrada TCP). Veja mais detalhes
  em [DEPLOY-LAN.md](DEPLOY-LAN.md).
- Configuração e dados ficam em `%LOCALAPPDATA%\SisPTrab` (arquivo `.env` com
  as senhas geradas e o `docker-compose.yml` usado para subir os containers).

## Funcionalidades

- **Operações militares** — cadastro com efetivo, período, finalidade e OMs
  participantes (com rateio por OM e por natureza de despesa).
- **Planos de Trabalho** de 5 tipos: Logístico (Classes I a X), Operacional
  (GND 3 e GND 4), Ração (R‑2) e Munição — cada um com cálculo automático
  próprio (`src/lib/calculos`) e carimbo de memória de cálculo gerado por
  fórmula, não por texto livre.
- **Entrada rápida** (lançamento em lote, colunas dinâmicas por Classe) para
  preencher planos inteiros mais rápido, reaproveitando os mesmos cálculos do
  formulário completo.
- **Importação** de planos a partir de planilha/PDF de terceiros, com
  inferência automática da Classe de Suprimento.
- **Fluxo de aprovação hierárquico** por OM, com histórico de quem aprovou
  ou reprovou, quando e por quê.
- **Exportação** para PDF e XLSX (um documento por OM) e geração de DOR.
- **Dashboard analítico** com KPIs e gráficos por Classe, Natureza de
  Despesa, OM e status.
- **Consulta** — artigos de referência sobre Pregão, ComprasNET e
  regulamentos.
- **Auditoria** — log de criação, edição, aprovação e reprovação.

O sistema funciona mesmo sem internet: a Classe III busca preços de
combustível via API externa, mas cai automaticamente para uma tabela de
referência por estado (com preço editável à mão) se a API estiver fora do
ar — nada trava a criação de despesas ou planos.

## Papéis e permissões

| Papel         | Pode fazer                                                         |
| ------------- | -------------------------------------------------------------------- |
| `INTEGRANTE`  | Criar e editar planos em rascunho da própria OM                     |
| `S4`          | Tudo do INTEGRANTE + aprovar/reprovar planos da própria OM na hierarquia |
| `COMANDANTE`  | Visualizar planos e operações da própria OM (não aprova)            |
| `SUPER_ADMIN` | Acesso total: qualquer OM, qualquer operação, aprova em qualquer nível |

A visibilidade de operações e planos segue a hierarquia de OMs (uma OM "pai"
vê as subordinadas); `SUPER_ADMIN` vê tudo.

## Fluxo de aprovação

```
RASCUNHO → EM_ANALISE → APROVADO
               │
               └─→ REPROVADO (com motivo obrigatório; volta para edição)
```

## Desenvolvimento local

Para contribuir com o código (não é necessário para apenas usar o sistema —
veja [Instalação](#instalação) acima).

### Pré-requisitos

- Node.js 20+
- PostgreSQL 14+ (ou Docker, para só o banco)
- Yarn

### Passo a passo

```bash
git clone https://github.com/Schuinki/ORF-Plan-Trab.git
cd ORF-Plan-Trab
yarn install

cp .env.example .env
# Edite .env com DATABASE_URL, JWT_SECRET, NEXT_PUBLIC_APP_URL

npx prisma migrate dev
npx tsx prisma/seed.ts   # popula OMs, naturezas de despesa e usuário admin

yarn dev
```

Acesse [http://localhost:3000](http://localhost:3000).

> ⚠️ `prisma/seed.ts` apaga todos os dados antes de recriar — não rode contra
> um banco com dados que você queira manter.

### Atalho rápido (Windows)

Depois do primeiro setup acima, dê duplo-clique em `start-dev.bat` (ou no
atalho "SisPTrab (Dev)" na Área de Trabalho, se você já criou um) para subir o
Postgres via Docker e iniciar `yarn dev` automaticamente, abrindo o navegador
quando a aplicação responder.

### Scripts úteis

```bash
yarn dev          # servidor de desenvolvimento
yarn build        # build de produção
yarn start        # iniciar build de produção
yarn lint         # lint
npx prisma studio # GUI do banco de dados
```

### Estrutura do projeto

```
├── prisma/
│   ├── schema.prisma       # Modelo do banco (User, OrganizacaoMilitar,
│   │                       #   Operacao, PlanoTrabalho, Despesa, ...)
│   ├── seed.ts             # Dados iniciais (destrutivo)
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── api/            # Rotas de API (auth, operacoes, planos, ...)
│   │   ├── dashboard/      # Páginas autenticadas
│   │   └── login/
│   ├── components/         # Componentes React (formulários, tabelas, UI)
│   ├── lib/
│   │   ├── calculos/       # Cálculo de despesas por Classe
│   │   ├── pdf/ xlsx/      # Exportação de documentos
│   │   ├── importacao/     # Importação de planos de terceiros
│   │   ├── services/       # Integrações externas (ex.: preço de combustível)
│   │   └── permissions.ts  # Controle de acesso por papel/hierarquia de OM
│   └── types/
├── docker-entrypoint.sh    # Migrations + seed condicional no 1º boot
├── Dockerfile              # Build da imagem publicada no GHCR
├── start-sisptrab.ps1      # Código-fonte do instalador (.exe) de produção
├── start-dev.ps1/.bat      # Atalho de desenvolvimento local (yarn dev)
└── .github/workflows/      # CI: publica a imagem Docker a cada push na main
```

## Deploy em servidor de rede (LAN)

Para um servidor fixo na rede que todos acessam por IP — sem instalador,
via Docker Compose direto — veja [DEPLOY-LAN.md](DEPLOY-LAN.md).

## Nota para manutenção (publicação da imagem)

O workflow `.github/workflows/docker-publish.yml` builda e publica a imagem
em `ghcr.io/schuinki/orf-plan-trab` a cada push na `main`. **Na primeira vez**,
é preciso tornar o pacote público manualmente (senão `docker compose pull`
falha com "unauthorized" para quem não tem login no GHCR): acesse
`https://github.com/users/Schuinki/packages/container/orf-plan-trab/settings`
e mude a visibilidade para *Public*. Isso só precisa ser feito uma vez.

## Backup

Os dados ficam no volume Docker `postgres_data`. Para gerar um backup:

```bash
docker exec sisptrab-db pg_dump -U sisptrab sisptrab > backup.sql
```

## Licença

Uso interno do Exército Brasileiro.
