# sisptrab - Sistema de Gestão de Operações

Sistema web completo para gerenciamento de operações militares, planos de trabalho logísticos e workflow de aprovações.

## 🚀 Funcionalidades

- ✅ **Autenticação JWT** - Login seguro com controle de sessão
- ✅ **Gestão de Operações** - Cadastro e acompanhamento de operações militares
- ✅ **Planos de Trabalho** - Criação e gestão de planos logísticos
- ✅ **Itens Financeiros** - Matriz OM x Natureza de Despesa
- ✅ **Workflow de Aprovações** - Fluxo hierárquico de aprovações
- ✅ **Controle de Permissões** - 6 níveis de acesso (roles)
- ✅ **Auditoria Completa** - Log de todas as ações importantes
- ✅ **Interface Moderna** - UI responsiva com Tailwind CSS

## 📋 Pré-requisitos

### Opção 1: Instalação Local

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### Opção 2: Docker (Recomendado)

- Docker 20.10+
- Docker Compose 2.0+

## 🐳 Instalação Rápida com Docker

**Modo mais fácil - Apenas 2 comandos!**

```bash
# 1. Iniciar banco de dados
docker-compose -f docker-compose.dev.yml up -d postgres

# 2. Configurar e iniciar app
cp .env.example .env
# Edite .env com: DATABASE_URL="postgresql://sisptrab:dev_password@localhost:5432/sisptrab"
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Acesse: http://localhost:3000

📖 **Guia completo do Docker**: Veja [DOCKER.md](DOCKER.md)

## 🔧 Instalação Manual

### 1. Clone ou navegue até o diretório do projeto

```bash
cd /Users/pedrojob/Desktop/ORF
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o banco de dados

Crie um banco PostgreSQL:

```sql
CREATE DATABASE sisptrab;
```

### 4. Configure as variáveis de ambiente

Copie o arquivo de exemplo e edite com suas configurações:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```env
# Database
DATABASE_URL="postgresql://usuario:senha@localhost:5432/sisptrab?schema=public"

# JWT Secret (IMPORTANTE: Mude isso em produção!)
JWT_SECRET="sua-chave-secreta-super-segura-aqui"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Execute as migrações do Prisma

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 6. Popule o banco com dados iniciais (opcional)

Crie um arquivo `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Criar OM de exemplo
  const coter = await prisma.organizacaoMilitar.create({
    data: {
      nome: "Comando de Operações Terrestres",
      sigla: "COTER",
      tipo: "COTER",
      codUG: "160548",
    },
  });

  const cma = await prisma.organizacaoMilitar.create({
    data: {
      nome: "Comando Militar da Amazônia",
      sigla: "CMA",
      tipo: "CMA",
      codUG: "160016",
      omPaiId: coter.id,
    },
  });

  const brigada = await prisma.organizacaoMilitar.create({
    data: {
      nome: "1ª Brigada de Infantaria de Selva",
      sigla: "1ª Bda Inf Sl",
      tipo: "BRIGADA",
      codUG: "160482",
      omPaiId: cma.id,
    },
  });

  const batalhao = await prisma.organizacaoMilitar.create({
    data: {
      nome: "6º Batalhão de Engenharia de Construção",
      sigla: "6º BEC",
      tipo: "BATALHAO",
      codUG: "160353",
      omPaiId: brigada.id,
    },
  });

  // Criar usuário super admin
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@eb.mil.br",
      passwordHash,
      nomeCompleto: "Administrador do Sistema",
      nomeGuerra: "Admin",
      postoGraduacao: "Gen Div",
      telefone: "(92) 3659-1174",
      role: "SUPER_ADMIN",
      isActive: true,
      omId: coter.id,
    },
  });

  // Criar naturezas de despesa
  const naturezas = [
    { codigo: "GND-3-01", nome: "Gêneros Alimentícios" },
    { codigo: "GND-3-02", nome: "Combustível" },
    { codigo: "GND-3-03", nome: "Manutenção de Comunicações/TI" },
    { codigo: "GND-3-04", nome: "Manutenção de Viaturas" },
    { codigo: "GND-3-05", nome: "Suprimento de Fundos" },
    { codigo: "GND-3-06", nome: "Diárias" },
    { codigo: "GND-3-07", nome: "Passagens" },
    { codigo: "GND-3-08", nome: "Locação de Veículos" },
    { codigo: "GND-3-09", nome: "Manutenção de Ar Condicionado" },
    { codigo: "GND-3-10", nome: "Telecomunicações" },
  ];

  for (const nat of naturezas) {
    await prisma.naturezaDespesa.create({
      data: nat,
    });
  }

  console.log("✅ Dados iniciais criados com sucesso!");
  console.log("");
  console.log("📧 Email: admin@eb.mil.br");
  console.log("🔑 Senha: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Execute o seed:

```bash
npx tsx prisma/seed.ts
```

### 7. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

## 🔐 Credenciais Padrão

Após executar o seed:

- **Email**: admin@eb.mil.br
- **Senha**: admin123

## 📁 Estrutura do Projeto

```
ORF/
├── prisma/
│   └── schema.prisma          # Schema do banco de dados
├── src/
│   ├── app/
│   │   ├── api/               # API Routes (Next.js 14+)
│   │   │   ├── auth/          # Autenticação
│   │   │   ├── operacoes/     # Operações CRUD
│   │   │   └── planos/        # Planos de Trabalho CRUD
│   │   ├── dashboard/         # Páginas do dashboard
│   │   │   ├── operacoes/     # Gestão de operações
│   │   │   └── planos/        # Gestão de planos
│   │   ├── login/             # Página de login
│   │   ├── layout.tsx         # Layout principal
│   │   ├── page.tsx           # Home (redirect)
│   │   └── globals.css        # Estilos globais
│   ├── components/
│   │   └── ui/                # Componentes reutilizáveis
│   └── lib/
│       ├── prisma.ts          # Cliente Prisma
│       ├── auth.ts            # Funções de autenticação
│       └── permissions.ts     # Controle de permissões
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## 👥 Roles e Permissões

### SUPER_ADMIN

- Acesso total ao sistema
- Gerenciar usuários
- Ver todas as operações e planos
- Aprovar em qualquer nível

### CMT_CMA

- Comandante de Comando Militar de Área
- Ver operações da sua CMA e subordinados
- Aprovar planos no nível CMA

### CMT_BRIGADA

- Comandante de Brigada
- Ver operações da sua Brigada e subordinados
- Aprovar planos no nível Brigada

### CMT_OM

- Comandante de OM
- Ver operações apenas da sua OM
- Aprovar planos no nível OM
- Criar operações

### INTEGRANTE_CMA / INTEGRANTE_OM

- Ver operações da sua OM
- Criar planos de trabalho
- Editar planos em rascunho

## 🔄 Workflow de Aprovações

```
RASCUNHO
    ↓ (Enviar para análise)
EM_ANALISE → CMT_OM aprova
    ↓
EM_ANALISE → CMT_BRIGADA aprova
    ↓
EM_ANALISE → CMT_CMA aprova
    ↓
EM_ANALISE → COTER aprova
    ↓
APROVADO ✅

(Qualquer nível pode REPROVAR ❌ e o plano volta ao status REPROVADO)
```

## 🛠️ Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar produção
npm start

# Lint
npm run lint

# Prisma Studio (GUI do banco)
npx prisma studio
```

## 📊 Banco de Dados

O sistema utiliza PostgreSQL com Prisma ORM. Principais entidades:

- **User** - Usuários do sistema
- **OrganizacaoMilitar** - Estrutura organizacional (OM)
- **Operacao** - Operações militares
- **PlanoTrabalho** - Planos de trabalho logísticos
- **ItemFinanceiro** - Itens de despesa (matriz)
- **NaturezaDespesa** - Categorias de despesas
- **AprovacaoHistorico** - Histórico de aprovações
- **AuditoriaLog** - Log de auditoria

## 🔍 Funcionalidades Principais

### 1. Gestão de Operações

- Criar operação com nome, efetivo, período
- Campos descritivos: finalidade, motivação, consequências
- Vincular à OM responsável

### 2. Planos de Trabalho

- Vinculado a uma operação
- Versionamento automático
- Responsável definido
- Workflow de status

### 3. Itens Financeiros (Matriz)

- OM específica por item
- Natureza de despesa
- Valor unitário, quantidade e total
- Descrição detalhada obrigatória
- Totalização automática

### 4. Aprovações

- Hierarquia automática (OM → Brigada → CMA → COTER)
- Registro de quem aprovou/reprovou e quando
- Motivo obrigatório para reprovação
- Histórico completo

### 5. Auditoria

- Log de criação, edição, aprovação, reprovação
- Metadados em JSON para rastreabilidade
- Timestamp automático
- Vinculação com usuário, plano e operação

## 🚀 Deploy em Produção

### Opção 1: Docker (Recomendado)

**Já está pronto! Use o docker-compose.yml incluído:**

```bash
# 1. Configurar variáveis de produção
cp .env.example .env
# Edite .env com credenciais seguras

# 2. Build e iniciar
docker-compose up -d --build

# 3. Executar migrações
docker-compose exec app npx prisma migrate deploy

# 4. (Opcional) Popular dados iniciais
docker-compose exec app npm run db:seed
```

Acesse: http://seu-servidor:3000

📖 **Guia completo**: [DOCKER.md](DOCKER.md)

### Opção 2: Vercel (Frontend + Database externa)

```bash
npm install -g vercel
vercel

# Configurar DATABASE_URL nas variáveis de ambiente do Vercel
```

### Opção 3: VPS Manual

```bash
# Build da aplicação
npm run build

# Iniciar com PM2
npm install -g pm2
pm2 start npm --name "sisptrab" -- start

# Configurar nginx como reverse proxy
```

## 📝 Próximas Funcionalidades

- [ ] Exportação de documentos (PDF/Excel)
- [ ] Upload de anexos
- [ ] Notificações por email
- [ ] Dashboards analíticos
- [ ] Relatórios consolidados
- [ ] Gestão de usuários (CRUD completo)
- [ ] Histórico de versões de planos

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é de uso interno do Exército Brasileiro.

## 📞 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido para o Comando Militar da Amazônia** 🇧🇷
