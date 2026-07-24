# 🚀 Guia de Deploy e Configuração — Centro Médico Dr. Diogo Gonzaga

## Pré-requisitos

| Ferramenta | Versão mínima | Instalação |
|-----------|--------------|-----------|
| Node.js | >= 18.x | https://nodejs.org |
| npm | >= 9.x | Incluído com Node.js |
| Git | >= 2.x | https://git-scm.com |
| Conta Supabase | — | https://supabase.com |
| Conta GitHub | — | (para deploy no GitHub Pages) |

---

## 1. Configuração do Ambiente Local

### 1.1 Clonar o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd "PROJETO CLINICA"
```

### 1.2 Instalar Dependências

```bash
npm install
```

> No Windows/PowerShell com restrições de política de execução:
> ```powershell
> npm.cmd install
> ```

### 1.3 Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto:

```env
# URL do projeto Supabase
VITE_SUPABASE_URL=https://SEU-PROJETO-ID.supabase.co

# Chave pública anônima do Supabase (anon key)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **Segurança**: Nunca commite o arquivo `.env`. Ele já está no `.gitignore`.

### 1.4 Iniciar Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse: [http://localhost:5173](http://localhost:5173)

---

## 2. Configuração do Supabase

### 2.1 Criar Projeto no Supabase

1. Acesse [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Clique em **"New Project"**
3. Configure:
   - **Name**: `clinica-dr-diogo-gonzaga`
   - **Database Password**: senha forte
   - **Region**: `South America (São Paulo)` — **sa-east-1** (conformidade LGPD)
4. Aguarde a inicialização (~2 minutos)

### 2.2 Obter as Credenciais

Na dashboard do projeto Supabase:
1. Acesse **Settings → API**
2. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 2.3 Criar as Tabelas no Banco de Dados

No editor SQL do Supabase (SQL Editor), execute:

```sql
-- Tabela de Médicos
CREATE TABLE IF NOT EXISTS doctors (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  crm                 TEXT NOT NULL UNIQUE,
  specialty           TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  phone               TEXT,
  is_2fa_enabled      BOOLEAN DEFAULT FALSE,
  two_factor_secret   TEXT,
  avatar              TEXT,
  consultation_price  NUMERIC(10, 2),
  password            TEXT NOT NULL
);

-- Tabela de Funcionários
CREATE TABLE IF NOT EXISTS employees (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  role     TEXT NOT NULL,
  email    TEXT NOT NULL UNIQUE,
  phone    TEXT,
  avatar   TEXT,
  password TEXT NOT NULL
);

-- Tabela de Pacientes (dados de saúde criptografados E2EE)
CREATE TABLE IF NOT EXISTS patients (
  id                       TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  cpf                      TEXT NOT NULL,
  email                    TEXT,
  phone                    TEXT,
  birth_date               DATE,
  encrypted_medical_records TEXT,
  crypto_iv                TEXT,
  crypto_salt              TEXT,
  consent_given            BOOLEAN DEFAULT FALSE,
  consent_date             TIMESTAMPTZ,
  consent_version          TEXT,
  consent_purpose          TEXT,
  is_anonymized            BOOLEAN DEFAULT FALSE
);

-- Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id             TEXT PRIMARY KEY,
  patient_id     TEXT,
  patient_name   TEXT NOT NULL,
  doctor_id      TEXT,
  doctor_name    TEXT NOT NULL,
  specialty      TEXT NOT NULL,
  date           DATE NOT NULL,
  time           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'Agendado',
  notes          TEXT,
  payment_method TEXT,
  price          NUMERIC(10, 2)
);

-- Tabela de Procedimentos Históricos
CREATE TABLE IF NOT EXISTS procedures (
  id               TEXT PRIMARY KEY,
  patient_id       TEXT,
  patient_name     TEXT NOT NULL,
  doctor_id        TEXT,
  doctor_name      TEXT NOT NULL,
  specialty        TEXT NOT NULL,
  date             DATE NOT NULL,
  type             TEXT NOT NULL,
  name             TEXT NOT NULL,
  notes            TEXT,
  risk_class       TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL
);

-- Tabela de Logs de Auditoria LGPD
CREATE TABLE IF NOT EXISTS audit_logs (
  id            TEXT PRIMARY KEY,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id       TEXT NOT NULL,
  user_name     TEXT NOT NULL,
  user_role     TEXT NOT NULL,
  action        TEXT NOT NULL,
  patient_id    TEXT,
  patient_name  TEXT,
  details       TEXT NOT NULL,
  lgpd_basis    TEXT NOT NULL,
  ip_address    TEXT,
  device_info   TEXT,
  security_hash TEXT NOT NULL
);

-- Tabela de Transações de Caixa
CREATE TABLE IF NOT EXISTS cash_transactions (
  id             TEXT PRIMARY KEY,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patient_id     TEXT,
  appointment_id TEXT,
  patient_name   TEXT,
  description    TEXT NOT NULL,
  amount         NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  operator_id    TEXT NOT NULL,
  operator_name  TEXT NOT NULL
);

-- Tabela de Catálogo de Exames
CREATE TABLE IF NOT EXISTS exams (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT,
  duration_minutes INTEGER NOT NULL,
  price            NUMERIC(10, 2) NOT NULL
);

-- Tabela de Orçamentos de Exames
CREATE TABLE IF NOT EXISTS exam_budgets (
  id             TEXT PRIMARY KEY,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patient_id     TEXT,
  patient_name   TEXT NOT NULL,
  operator_id    TEXT NOT NULL,
  operator_name  TEXT NOT NULL,
  items          JSONB NOT NULL,
  total_amount   NUMERIC(10, 2) NOT NULL,
  notes          TEXT,
  status         TEXT NOT NULL DEFAULT 'pendente' -- pendente, aprovado, expirado
);

```

### 2.4 Desabilitar RLS Temporariamente (Desenvolvimento)

> ⚠️ Para produção, configure RLS com políticas adequadas.

```sql
-- Para desenvolvimento/MVP (remover em produção)
ALTER TABLE doctors DISABLE ROW LEVEL SECURITY;
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE procedures DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
```

---

## 3. Build de Produção

### 3.1 Gerar Build

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `/dist`.

### 3.2 Verificar Build Localmente

```bash
npm run preview
```

Acesse: [http://localhost:4173](http://localhost:4173)

---

## 4. Deploy no GitHub Pages

### 4.1 Configurar o Repositório

1. Crie um repositório no GitHub
2. Configure o remote:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
   git push -u origin main
   ```

### 4.2 Configurar Secrets do GitHub Actions (opcional)

Se usar GitHub Actions para CI/CD, adicione em **Settings → Secrets**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 4.3 Deploy Manual

```bash
npm run deploy
```

Esse comando executa:
1. `npm run build` — gera a pasta `/dist`
2. Cria `dist/.nojekyll` — evita processamento Jekyll do GitHub Pages
3. `gh-pages -d dist` — faz push do `/dist` para a branch `gh-pages`

### 4.4 Configurar GitHub Pages

No repositório GitHub:
1. Acesse **Settings → Pages**
2. Source: `Deploy from a branch`
3. Branch: `gh-pages` / `/ (root)`
4. Salve e aguarde ~2 minutos

A aplicação estará disponível em:
`https://SEU_USUARIO.github.io/SEU_REPO/`

---

## 5. Configuração de Produção Avançada

### 5.1 Domínio Personalizado (GitHub Pages)

1. Adicione o arquivo `CNAME` na pasta `/dist` antes do deploy:
   ```
   clinica.drdiogogonzaga.com.br
   ```

2. Configure o DNS do domínio com CNAME apontando para:
   ```
   SEU_USUARIO.github.io
   ```

3. Habilite HTTPS no GitHub Pages (Settings → Pages → Enforce HTTPS)

### 5.2 Variáveis de Ambiente em CI/CD

Para GitHub Actions (`.github/workflows/deploy.yml`):

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 5.3 Row Level Security (RLS) para Produção

```sql
-- Exemplo de política RLS para appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Médico só vê agendamentos dos seus próprios pacientes
CREATE POLICY "doctors_see_own_appointments" ON appointments
  FOR SELECT
  USING (doctor_id = auth.uid()::text);

-- Recepcionistas veem todos os agendamentos
CREATE POLICY "receptionists_see_all" ON appointments
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'receptionist');
```

---

## 6. Monitoramento e Logs

### 6.1 Logs do Supabase

Acesse **Supabase Dashboard → Logs** para monitorar:
- Queries ao banco de dados
- Erros de autenticação
- Uso da API

### 6.2 Audit Logs da Aplicação

Todos os eventos sensíveis são registrados na tabela `audit_logs` e acessíveis via:
- Interface: **Painel LGPD & Logs** na aplicação
- Diretamente via SQL no Supabase:

```sql
-- Ver últimos 50 acessos a prontuários
SELECT * FROM audit_logs 
WHERE action = 'Acesso ao Prontuário' 
ORDER BY timestamp DESC 
LIMIT 50;

-- Verificar logs de um paciente específico
SELECT * FROM audit_logs 
WHERE patient_id = 'pat_01' 
ORDER BY timestamp DESC;
```

---

## 7. Troubleshooting

### Erro: "Supabase não configurado"

**Sintoma**: O sistema roda em modo mock (dados em memória).  
**Solução**: Verifique o arquivo `.env` e garanta que as URLs não são os valores placeholder.

```typescript
// supabaseClient.ts verifica isso:
export const isSupabaseConfigured =
  !!supabaseUrl &&
  supabaseUrl !== 'https://seu-projeto-id.supabase.co' &&
  !!supabaseAnonKey &&
  supabaseAnonKey !== 'sua-chave-anon-publica-aqui';
```

### Erro: "Falha na descriptografia"

**Sintoma**: Modal de erro ao abrir prontuário.  
**Causa**: Passphrase incorreta ou dados corrompidos.  
**Solução**: Verificar se a passphrase usada na descriptografia é idêntica à usada na criptografia original.

### Build com erro no Windows PowerShell

**Sintoma**: Script bloqueado por política de execução.  
**Solução**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Erro CORS no Supabase

**Sintoma**: Requests bloqueados no browser.  
**Solução**: Adicionar o domínio da aplicação nas configurações de CORS no Supabase Dashboard → Settings → API → CORS Origins.

---

## 8. Checklist de Go-Live

```
[ ] Arquivo .env configurado com credenciais reais do Supabase
[ ] Tabelas criadas no banco de dados Supabase
[ ] RLS configurado nas tabelas sensíveis
[ ] Todas as senhas padrão alteradas (médicos e funcionários)
[ ] Master passphrase de criptografia substituída por passphrase por médico
[ ] HTTPS habilitado no domínio de produção
[ ] Testes de login para cada tipo de usuário
[ ] Teste de criptografia/descriptografia de prontuário
[ ] Teste de anonimização de paciente
[ ] Verificação de logs de auditoria
[ ] Backup automático configurado no Supabase
[ ] DPO designado conforme Art. 41 LGPD
[ ] Política de Privacidade publicada
```

---

*Guia de Deploy — Centro Médico Dr. Diogo Gonzaga*
*Versão 1.0 — 07/07/2026*
*Desenvolvido por SidneyMaximo*
