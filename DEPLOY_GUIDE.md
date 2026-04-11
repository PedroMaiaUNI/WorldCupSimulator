# 🏆 Copa do Mundo 2026 — Palpites
## Guia Completo de Deploy: Vercel + Supabase

---

## 📋 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────┐
│          USUÁRIO (Browser)              │
│  ┌─────────────────────────────────────┐│
│  │  React App (Vite)                   ││
│  │  • Página Inicial + Nome            ││
│  │  • Palpites: Grupos + Mata-Mata     ││
│  │  • Leaderboard                      ││
│  │  • Ver Palpites                     ││
│  │  • Admin Panel (secreto)            ││
│  └────────────────┬────────────────────┘│
└───────────────────┼─────────────────────┘
                    │ API calls
          ┌─────────▼──────────┐
          │   Supabase          │
          │  (PostgreSQL + RLS) │
          │  • teams            │
          │  • matches          │
          │  • real_results     │
          │  • predictions      │
          │  • predictor_sessions│
          └────────────────────┘
```

---

## 🗃️ PASSO 1: Configurar o Supabase

### 1.1 Criar conta e projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **New Project**
3. Escolha nome: `copa2026-palpites`
4. Escolha uma senha forte para o banco
5. Selecione a região mais próxima (**South America (São Paulo)** é ideal)
6. Clique **Create new project** e aguarde ~2 minutos

### 1.2 Executar o schema SQL

1. No painel do Supabase, clique em **SQL Editor** (ícone de banco de dados)
2. Clique em **New query**
3. Abra o arquivo `supabase_schema.sql` deste projeto
4. Cole todo o conteúdo no editor
5. Clique em **Run** (ou Ctrl+Enter)
6. Verifique se aparecem mensagens de sucesso em verde

> ✅ O schema cria todas as tabelas, índices, políticas RLS e insere os 48 times padrão.

### 1.3 Obter as credenciais

1. No painel do Supabase, vá em **Project Settings** (ícone de engrenagem)
2. Clique em **API**
3. Anote:
   - **Project URL**: `https://xxxxxxxxxxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (longa)

> ⚠️ **Nunca compartilhe a `service_role` key!** Use sempre a `anon` key no front-end.

---

## 💻 PASSO 2: Configurar o Projeto Localmente

### 2.1 Pré-requisitos

- Node.js 18+ instalado ([nodejs.org](https://nodejs.org))
- Git instalado ([git-scm.com](https://git-scm.com))
- Conta no GitHub (para deploy na Vercel)

### 2.2 Instalar dependências

```bash
cd copa-2026-palpites
npm install
```

### 2.3 Configurar variáveis de ambiente

Renomeie `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Abra `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://SEUPROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ADMIN_SECRET=minha_senha_super_secreta_2026
```

> ⚠️ **Escolha uma senha admin forte** — ela é a única proteção do painel administrativo.

### 2.4 Rodar localmente

```bash
npm run dev
```

Abra `http://localhost:3000` no navegador.

---

## 🚀 PASSO 3: Deploy na Vercel

### 3.1 Subir o código para o GitHub

```bash
# Dentro da pasta do projeto:
git init
git add .
git commit -m "🏆 Copa 2026 Palpites - inicial"

# Crie um repositório no github.com, depois:
git remote add origin https://github.com/SEU_USUARIO/copa2026-palpites.git
git branch -M main
git push -u origin main
```

### 3.2 Conectar na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login (pode usar conta GitHub)
2. Clique em **Add New... → Project**
3. Importe o repositório `copa2026-palpites` do GitHub
4. Vercel detecta automaticamente que é Vite → configurações automáticas

### 3.3 Configurar variáveis de ambiente na Vercel

Antes de clicar em Deploy, role a página até **Environment Variables** e adicione:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://SEUPROJETO.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` |
| `VITE_ADMIN_SECRET` | `sua_senha_admin` |

### 3.4 Deploy

1. Clique em **Deploy**
2. Aguarde ~1-2 minutos
3. Sua app estará em: `https://copa2026-palpites.vercel.app`

### 3.5 Domínio personalizado (opcional)

Na Vercel, vá em **Settings → Domains** para adicionar seu domínio personalizado.

---

## 🔒 PASSO 4: Configurar Segurança do Admin

### Acessar o painel admin

Na página inicial, clique no botão **⚙** (discreto, no canto inferior do card).
Digite a senha que você definiu em `VITE_ADMIN_SECRET`.

### Reforçar segurança (produção)

Para maior segurança, você pode adicionar autenticação real via Supabase Auth:

```javascript
// No AdminPage.jsx, adicione verificação de sessão Supabase:
const { data: { session } } = await supabase.auth.getSession()
if (!session) { /* redirecionar para login */ }
```

Ou mantenha a senha simples — funciona bem para uso pessoal/familiar.

---

## 🎮 PASSO 5: Usar o Sistema

### Para palpiteiros:
1. Acesse a URL do site
2. Digite seu nome e clique **FAZER PALPITES**
3. Preencha **todos** os jogos (grupos + mata-mata)
4. Clique **SALVAR PALPITES**
5. Veja o leaderboard!

### Para o admin:
1. Clique em ⚙ → digite senha
2. **Aba Times**: adicione/edite/remova seleções e bandeiras
3. **Aba Grupos**: arraste times entre grupos
4. **Aba Resultados**: insira os resultados reais conforme os jogos acontecem
5. Os scores são calculados automaticamente

---

## 📊 Sistema de Pontuação

### Fase de Grupos
| Situação | Pontos |
|----------|--------|
| Resultado correto (vitória/empate/derrota) | 5 pts |
| Placar exato | +3 pts |
| Gols do mandante corretos | +1 pt |
| Gols do visitante corretos | +1 pt |
| Total de gols correto | +1 pt |
| **Máximo por jogo** | **11 pts** |

### Mata-Mata
| Situação | Pontos |
|----------|--------|
| Vencedor correto | 6 pts |
| Placar correto em 90min | +3 pts |
| Gols do mandante corretos | +1 pt |
| Gols do visitante corretos | +1 pt |
| Total de gols correto | +1 pt |
| **Máximo por jogo** | **12 pts** |

> Acerto de classificado em empate total nos grupos: +1 pt adicional

---

## 🗺️ Cruzamentos do Mata-Mata

### Confrontos fixos (1º vs 2º):
- **2A vs 2B**
- **1F vs 2C**
- **1C vs 2F**
- **2E vs 2I**
- **2K vs 2L**
- **1H vs 2J**
- **1J vs 2H**
- **2D vs 2G**

### Confrontos com melhores 3ºs colocados:
Os 8 melhores 3ºs colocados (de 12 grupos) são distribuídos de acordo com a tabela oficial da FIFA (495 combinações). Os confrontos evitam times do mesmo grupo antes das quartas.

### Restrições de chave:
- Espanha, França, Argentina e Inglaterra ficam em chaves diferentes
- Essas seleções só podem se encontrar nas semifinais

---

## 🔧 Estrutura do Projeto

```
copa-2026-palpites/
├── src/
│   ├── components/
│   │   ├── GroupMatchCard.jsx     # Card de partida de grupo
│   │   ├── KnockoutMatchCard.jsx  # Card de mata-mata (com EP/pens)
│   │   └── TeamBadge.jsx          # Bandeira + nome do time
│   ├── lib/
│   │   ├── supabase.js            # Cliente Supabase + funções DB
│   │   ├── teamsData.js           # Times padrão + estrutura de grupos
│   │   ├── scoring.js             # Cálculo de pontos + classificação
│   │   └── thirdPlaceTable.js     # Tabela de cruzamentos 3ºs colocados
│   ├── pages/
│   │   ├── HomePage.jsx           # Tela inicial + entrada do palpiteiro
│   │   ├── PredictorPage.jsx      # Interface de palpites (grupos + KO)
│   │   ├── LeaderboardPage.jsx    # Ranking geral
│   │   ├── ViewPredictionsPage.jsx # Ver palpites de todos
│   │   └── AdminPage.jsx          # Painel administrativo
│   ├── App.jsx                    # Root + context global
│   ├── main.jsx                   # Entry point React
│   └── index.css                  # Estilos globais
├── supabase_schema.sql            # Schema completo do banco
├── vercel.json                    # Config de deploy Vercel
├── .env.example                   # Exemplo de variáveis de ambiente
├── package.json
└── vite.config.js
```

---

## 🛠️ Manutenção e Atualizações

### Atualizar times após sorteio oficial
Após o sorteio real da Copa 2026, atualize os times no painel admin ou edite `src/lib/teamsData.js` diretamente.

### Backup dos dados
No Supabase, vá em **Database → Backups** para configurar backups automáticos (disponível em planos pagos) ou use o botão de download manual.

### Monitoramento
- Vercel: vá em **Analytics** para ver tráfego
- Supabase: vá em **Database → Logs** para ver queries

---

## ❓ Problemas Comuns

### "Supabase não conectado"
- Verifique se o `.env.local` tem as variáveis corretas
- Verifique se as políticas RLS foram criadas corretamente

### Palpites não salvam
- Verifique o console do navegador (F12) para erros
- Confirme que as políticas `insert_predictions` e `insert_sessions` foram criadas

### Admin não acessa
- Verifique se `VITE_ADMIN_SECRET` está definido corretamente
- A variável deve estar definida **antes** do build

---

## 📱 Progressive Web App (Opcional)

Para instalar como app no celular, adicione ao `index.html`:

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0a0f1e" />
```

E crie `public/manifest.json`:

```json
{
  "name": "Copa 2026 Palpites",
  "short_name": "Palpites 2026",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0f1e",
  "theme_color": "#f0c040",
  "icons": [{ "src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml" }]
}
```

---

*Feito com ⚽ para a Copa do Mundo FIFA 2026 — USA, Canadá, México*
