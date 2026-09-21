# Prompt Forge

# KaduDev Prompt Engine

Crie uma plataforma SaaS privada chamada **KaduDev Prompt Engine**. Gere o projeto COMPLETO em uma única execução, sem dividir em etapas, sem pedir confirmação e sem simplificar funcionalidades.

O sistema deve estar pronto para deploy e uso real pela **KaduDev Studios**.

## OBJETIVO

A plataforma serve para:

- pesquisar empresas locais gratuitamente no Google Maps,
- gerir leads,
- preencher briefings,
- gerar sites profissionais a partir de briefings com IA,
- gerar mensagens comerciais prontas,
- abrir o WhatsApp automaticamente com a mensagem preenchida,
- acompanhar vendas e clientes.

### REGRA MAIS IMPORTANTE

**NÃO use Google Places API.**

O módulo **Sites com IA** usa Groq exclusivamente no servidor para transformar um briefing em `index.html`, `styles.css` e `script.js`. Cada geração e cada salvamento cria uma versão imutável em `generated_sites`; o painel oferece preview isolado, edição por abas e download dos arquivos. A chave `GROQ_API_KEY` jamais é exposta ao navegador.

---

# TECNOLOGIAS

Use obrigatoriamente:

- React + Vite + TypeScript
- TailwindCSS
- shadcn/ui
- Node.js + Express + TypeScript
- PostgreSQL (Supabase)
- Prisma ORM
- Supabase Auth
- Zustand
- React Hook Form + Zod
- Framer Motion
- Recharts
- Lucide React

---

# DESIGN

Visual **minimalista premium**, semelhante a Linear, Vercel e Notion.

### Cores

- Fundo: #0a0a0a
- Superfícies: #111111
- Cards: #151515
- Bordas: #232323
- Texto principal: #f5f5f5
- Texto secundário: #a1a1aa
- Destaque: #ff7a00

### Estilo

- muito espaço em branco,
- tipografia moderna,
- cantos 20px,
- sombras suaves,
- animações leves,
- sem excesso de neon,
- totalmente responsivo.

Adicionar logotipo textual **KaduDev Prompt Engine** na sidebar.

---

# SEGURANÇA

- Login obrigatório.
- Cadastro público desativado.
- Apenas admin cria utilizadores.
- Middleware protegendo rotas.
- Logout.
- Recuperação de senha.
- Sessões seguras.

Crie o utilizador inicial diretamente no Supabase Auth, usando credenciais fortes e exclusivas do ambiente. Nunca versiona nem publique credenciais de acesso.

---

# LAYOUT

## Sidebar recolhível

- Dashboard
- Empresas / Maps
- Leads
- Briefings
- Gerador de Prompt
- Mensagens
- Clientes
- Relatórios
- Configurações

## Topbar

- pesquisa global,
- notificações,
- avatar,
- menu do utilizador.

---

# DASHBOARD

Cards:

- Leads hoje
- Leads mês
- Prompts gerados
- Mensagens enviadas
- Vendas fechadas
- Receita mensal

Gráficos:

- Leads por dia
- Conversão por nicho
- Receita mensal

Tabela “Leads recentes”.

---

# PÁGINA EMPRESAS / MAPS (GRATUITA)

Criar formulário com:

- Nicho
- Cidade
- Estado

Ao clicar em **Pesquisar no Maps**, o sistema deve montar automaticamente a URL:

`https://www.google.com/maps/search/{nicho}+em+{cidade}+{estado}`

Exemplo:

- Nicho: restaurantes
- Cidade: Belém
- Estado: Pará

Resultado:
https://www.google.com/maps/search/restaurantes+em+Belém+Pará

### Funcionalidades obrigatórias

1. Abrir a pesquisa em nova aba.
2. Exibir um mapa incorporado usando iframe com a mesma pesquisa.
3. Botão “Abrir no Google Maps”.
4. Formulário lateral “Adicionar empresa manualmente” com:

   - nome,
   - telefone,
   - WhatsApp,
   - Instagram,
   - endereço.

5. Botão “Adicionar ao pipeline”.

**NÃO use APIs pagas.**

---

# PÁGINA LEADS (CRM)

Tabela profissional com:

- pesquisa,
- filtros,
- paginação,
- ordenação,
- etiquetas,
- notas.

Status:

- Novo
- Contactado
- Respondeu
- Reunião
- Proposta
- Fechado
- Perdido

Adicionar visual Kanban com drag and drop.

---

# PÁGINA BRIEFINGS

Campos:

- Nome da empresa
- Nicho
- Cidade
- Estado
- Telefone
- WhatsApp
- Instagram
- E-mail
- Endereço
- Cor principal
- Cor secundária
- Estilo visual
- Público-alvo
- Objetivo do site
- Páginas desejadas
- Serviços principais
- Diferenciais
- Promoções
- Horário
- CTA principal
- Observações

Salvar automaticamente.

Adicionar preview das cores.

---

# PÁGINA GERADOR DE PROMPT (PRINCIPAL)

Criar um motor de templates avançado.

Ao clicar em **Gerar Prompt**, usar TODOS os campos do briefing para produzir um prompt profissional detalhado.

O prompt deve incluir:

- contexto do negócio,
- identidade visual,
- estrutura de páginas,
- copywriting,
- SEO local,
- WhatsApp,
- mapa,
- formulário de contacto,
- responsividade,
- acessibilidade,
- performance.

Criar modelos por nicho:

- Barbearia
- Restaurante
- Clínica
- Academia
- Loja
- Hotel
- Pizzaria
- Oficina
- Advogado
- Dentista

## Interface

- editor grande estilo IDE,
- syntax highlight,
- contador de caracteres,
- botão Copiar,
- botão Baixar TXT,
- botão Regenerar,
- botão Salvar modelo.

Salvar histórico automaticamente.

---

# PÁGINA MENSAGENS

Gerar mensagens comerciais automaticamente.

Tipos:

- WhatsApp inicial,
- Follow-up 1,
- Follow-up 2,
- Instagram DM,
- E-mail profissional.

Usar variáveis:

- {{empresa}}
- {{cidade}}
- {{nicho}}
- {{whatsapp}}

## FUNCIONALIDADE OBRIGATÓRIA

Criar botão **Enviar no WhatsApp**.

O sistema deve gerar automaticamente:

`https://wa.me/NUMERO?text=MENSAGEM`

e abrir o WhatsApp em nova aba já com a mensagem preenchida.

Adicionar preview da mensagem e botão copiar.

---

# PÁGINA CLIENTES

Campos:

- nome,
- nicho,
- cidade,
- valor do projeto,
- data de fechamento,
- status,
- domínio,
- observações.

Adicionar timeline de atividades.

---

# RELATÓRIOS

Implementar:

- exportação PDF,
- exportação CSV,
- exportação XLSX,
- relatório mensal,
- gráfico de faturação.

---

# CONFIGURAÇÕES

Permitir:

- alterar logotipo,
- alterar nome da empresa,
- alterar cores,
- assinatura padrão das mensagens,
- tema claro/escuro,
- gestão de utilizadores.

---

# BANCO DE DADOS

Criar schema Prisma completo com:

- User
- Company
- Lead
- Briefing
- Prompt
- Message
- Client
- Deal
- Activity
- Settings

Criar migrations e seed com dados fictícios.

---

# API

Criar rotas REST:

- /auth
- /companies
- /leads
- /briefings
- /prompts
- /messages
- /clients
- /deals
- /reports
- /settings

Documentar com Swagger.

---

# UX

Implementar:

- skeleton loading,
- toasts,
- modais,
- autosave,
- atalhos de teclado,
- estados vazios elegantes,
- animações suaves,
- acessibilidade ARIA,
- tabelas responsivas.

---

# DEVOPS

Gerar:

- Dockerfile frontend,
- Dockerfile backend,
- docker-compose,
- .env.example,
- README completo,
- scripts npm.

---

# PÁGINA DE LOGIN

Tela centralizada minimalista premium com:

- logotipo,
- título “Entrar no KaduDev Prompt Engine”,
- e-mail,
- senha,
- lembrar sessão,
- recuperar senha.

---

# RESULTADO FINAL

Depois do login devo conseguir:

1. escolher nicho, cidade e estado;
2. abrir automaticamente o Google Maps pesquisado;
3. visualizar o mapa incorporado;
4. adicionar empresas manualmente ao pipeline;
5. preencher briefing;
6. gerar prompt profissional completo;
7. copiar ou baixar o prompt;
8. gerar mensagem comercial personalizada;
9. abrir o WhatsApp automaticamente com a mensagem pronta;
10. gerir leads num CRM;
11. acompanhar vendas e faturação;
12. gerir clientes.

Quero aparência de software SaaS profissional da **KaduDev Studios**, pronto para uso real e totalmente funcional sem APIs pagas.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kadu-studio-kit.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/20bc3711-2234-4ec0-abc1-63dcb8bc0009).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

### Variáveis de ambiente

Além das variáveis Supabase já configuradas, defina no ambiente de servidor:

```sh
OPENROUTER_API_KEY=sua_chave_da_openrouter
AI_MODEL=nvidia/nemotron-3-ultra-550b-a55b:free
AI_FALLBACK_MODELS=poolside/laguna-s-2.1:free,cohere/north-mini-code:free,openrouter/free
```

O gerador tenta os modelos em ordem. Se um estiver indisponível, atingir limite ou retornar uma resposta inválida, tenta o próximo automaticamente. Briefings são enviados somente no momento em que o utilizador solicita a geração; a chave OpenRouter jamais é exposta ao navegador.

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

