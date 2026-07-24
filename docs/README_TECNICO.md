# 📋 Documentação Técnica — Centro Médico Dr. Diogo Gonzaga
> Sistema Clínico Seguro com Conformidade LGPD

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura da Aplicação](#2-arquitetura-da-aplicação)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Estrutura de Pastas](#4-estrutura-de-pastas)
5. [Módulos e Componentes](#5-módulos-e-componentes)
6. [Modelo de Dados](#6-modelo-de-dados)
7. [Segurança e Criptografia](#7-segurança-e-criptografia)
8. [Conformidade LGPD](#8-conformidade-lgpd)
9. [Controle de Acesso e Permissões](#9-controle-de-acesso-e-permissões)
10. [Integração com Supabase](#10-integração-com-supabase)
11. [Configuração do Ambiente](#11-configuração-do-ambiente)
12. [Scripts Disponíveis](#12-scripts-disponíveis)
13. [Perfis de Usuário](#13-perfis-de-usuário)
14. [Fluxo de Autenticação](#14-fluxo-de-autenticação)
15. [Licença](#15-licença)

---

## 1. Visão Geral do Sistema

O **Centro Médico Dr. Diogo Gonzaga** é uma plataforma de gestão clínica completa desenvolvida em React + TypeScript, com foco prioritário em:

- **Segurança da informação** via criptografia ponta a ponta (E2EE)
- **Conformidade total com a LGPD** (Lei nº 13.709/2018)
- **Autenticação multifator (2FA)** para profissionais médicos
- **Auditoria imutável** de todas as operações sensíveis
- **Controle de acesso granular** por perfil e permissão individual

O sistema gerencia o ciclo completo de uma clínica médica: agendamentos, prontuários eletrônicos criptografados, documentos clínicos, controle financeiro, exames e conformidade legal.

---

## 2. Arquitetura da Aplicação

```
┌────────────────────────────────────────────────────┐
│                  BROWSER (Cliente)                  │
│                                                    │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │  React + TS  │    │    Web Crypto API         │  │
│  │  (UI/State)  │◄──►│  AES-GCM-256 / PBKDF2    │  │
│  └──────┬───────┘    │  SHA-256 / CSPRNG         │  │
│         │            └──────────────────────────┘  │
│         │ localStorage (sessão + permissões)        │
│         ▼                                           │
│  ┌──────────────┐                                  │
│  │  Supabase    │ (opcional — fallback para mock)  │
│  │  Client SDK  │                                  │
│  └──────┬───────┘                                  │
└─────────┼──────────────────────────────────────────┘
          │ HTTPS / REST
          ▼
┌─────────────────────────────────────────────────────┐
│              SUPABASE (BaaS — Cloud)                 │
│                                                     │
│  PostgreSQL Database:                               │
│  • doctors       • patients      • appointments     │
│  • procedures    • audit_logs    • cash_transactions│
│  • employees     • exams                            │
│                                                     │
│  Row Level Security (RLS) habilitado                │
└─────────────────────────────────────────────────────┘
```

### Modelo de Execução

- **Online**: Dados são lidos e escritos diretamente no Supabase (PostgreSQL)
- **Offline/Mock**: Se `VITE_SUPABASE_URL` não estiver configurado, o sistema usa dados semente em memória (seed data)
- **Criptografia**: Toda a criptografia ocorre **exclusivamente no cliente** (navegador). O servidor **nunca** recebe dados de saúde em texto claro.

---

## 3. Stack Tecnológico

| Camada | Tecnologia | Versão | Propósito |
|--------|-----------|--------|-----------|
| UI Framework | React | ^18.2.0 | Componentização e reatividade |
| Linguagem | TypeScript | ^5.2.2 | Tipagem estática |
| Build Tool | Vite | ^5.2.0 | Dev server e bundling |
| Estilização | Tailwind CSS | ^3.4.4 | Utilitários de CSS responsivo |
| Ícones | Lucide React | ^0.395.0 | Ícones SVG modernos |
| Backend | Supabase JS | ^2.110.0 | BaaS: DB, Auth, RLS |
| Criptografia | Web Crypto API | nativa | AES-GCM, PBKDF2, SHA-256 |
| Deploy | gh-pages | ^6.3.0 | GitHub Pages |
| CSS Processor | PostCSS + Autoprefixer | latest | Compatibilidade cross-browser |

---

## 4. Estrutura de Pastas

```
PROJETO CLINICA/
│
├── src/                            # Código-fonte principal
│   ├── App.tsx                     # Componente raiz; estado global e roteamento
│   ├── main.tsx                    # Ponto de entrada (ReactDOM.render)
│   ├── index.css                   # Estilos globais + diretivas Tailwind
│   ├── vite-env.d.ts               # Tipos das variáveis de ambiente Vite
│   │
│   ├── types.ts                    # Interfaces e tipos TypeScript globais
│   │
│   ├── components/                 # Componentes de página/feature
│   │   ├── Layout.tsx              # Estrutura principal: header, sidebar, footer
│   │   ├── LoginScreen.tsx         # Tela de autenticação
│   │   ├── Appointments.tsx        # Módulo de Agenda de Consultas
│   │   ├── HealthRecords.tsx       # Módulo de Prontuários Eletrônicos (E2EE)
│   │   ├── ClinicalDocuments.tsx   # Módulo de Receituários e Atestados
│   │   ├── DoctorHistory.tsx       # Módulo de Histórico Médico / Procedimentos
│   │   ├── Doctors2FA.tsx          # Módulo de Configuração de 2FA Médico
│   │   ├── Exams.tsx               # Módulo de Gestão de Exames
│   │   ├── CashRegister.tsx        # Módulo de Controle de Caixa
│   │   ├── LGPDDashboard.tsx       # Painel de Conformidade LGPD e Logs
│   │   └── AccessControl.tsx       # Módulo de Controle de Acesso (Admin)
│   │
│   └── utils/                      # Utilitários
│       ├── crypto.ts               # Funções criptográficas (AES-GCM, PBKDF2)
│       └── supabaseClient.ts       # Cliente Supabase inicializado
│
├── assets/                         # Recursos estáticos
│   └── logo.jpg                    # Logotipo da clínica
│
├── docs/                           # Documentação técnica (este diretório)
│
├── dist/                           # Build de produção (gerado pelo Vite)
│
├── index.html                      # HTML base da SPA
├── package.json                    # Dependências e scripts npm
├── tsconfig.json                   # Configuração do TypeScript
├── vite.config.ts                  # Configuração do Vite
├── tailwind.config.js              # Configuração do Tailwind CSS
├── postcss.config.js               # Configuração do PostCSS
├── .env                            # Variáveis de ambiente (não versionado)
└── .gitignore                      # Arquivos ignorados pelo Git
```

---

## 5. Módulos e Componentes

### 5.1 `App.tsx` — Orquestrador Principal

Estado global da aplicação gerenciado com `useState` e `useEffect`. Responsável por:

- Inicialização e seeding de dados (Supabase ou mock em memória)
- Gerenciamento de sessão do usuário (`currentSession`)
- Mapa de permissões por usuário (`permissionsMap`)
- Função `addAuditLogEntry` — gera logs com hash SHA-256 de integridade
- Roteamento entre abas (tab-based navigation)
- Persistência de sessão via `localStorage`

**Dados gerenciados:**
```typescript
patients[]        // Pacientes com prontuários criptografados
doctors[]         // Médicos com configuração de 2FA
appointments[]    // Agendamentos de consultas
procedures[]      // Procedimentos e histórico médico
auditLogs[]       // Logs imutáveis de auditoria LGPD
cashTransactions[] // Transações financeiras
employees[]       // Funcionários (recepção, admin, etc.)
exams[]           // Catálogo de exames disponíveis
```

---

### 5.2 `Layout.tsx` — Estrutura Visual

Componente de layout responsivo com:
- **Header**: Logo, nome da clínica, badge de papel do usuário, indicador de status 2FA, botão de logout
- **Sidebar**: Navegação por abas com controle de visibilidade baseado em permissões
- **Main**: Área de conteúdo da aba ativa
- **Footer**: Informações legais e de conformidade

**Abas disponíveis (filtradas por permissão):**

| ID | Label | Permissão Requerida |
|----|-------|---------------------|
| `appointments` | Agenda de Consultas | `viewAppointments` |
| `health_records` | Prontuários E2EE | `viewEHR` + médico com 2FA |
| `clinical_documents` | Documentos & Receituários | `createClinicalDocs` + médico com 2FA |
| `specialists` | Especialistas & Procedimentos | `viewAppointments` |
| `exams` | Exames | `viewAppointments` |
| `cash_register` | Controle de Caixa | `viewCashRegister` |
| `lgpd` | Painel LGPD & Logs | `viewLGPD` |
| `access_control` | Controle de Acesso | `manageUsers` |
| `auth_2fa` | Acesso Médico (2FA) | role = `doctor` |

---

### 5.3 `LoginScreen.tsx` — Autenticação

- Formulário de login com e-mail e senha
- Validação cruzada contra arrays `doctors[]` e `employees[]`
- Feedback visual de loading (spinner animado)
- Exibição/ocultação de senha
- Mensagem de erro para credenciais inválidas
- Design glassmorphism com gradiente escuro

---

### 5.4 `HealthRecords.tsx` — Prontuários Eletrônicos

Módulo mais crítico do sistema. Funcionalidades:
- Listagem de pacientes com status de anonimização
- Visualização de dados demográficos e de consentimento LGPD
- **Descriptografia sob demanda** dos prontuários via passphrase do médico
- Edição de anamnese, diagnóstico, prescrição, alergias e sinais vitais
- **Recriptografia** ao salvar alterações
- Geração de audit log para cada acesso ao prontuário

> **Restrição de segurança**: Aba bloqueada para não-médicos. Médicos precisam ter 2FA verificado na sessão atual para acesso.

---

### 5.5 `ClinicalDocuments.tsx` — Documentos e Receituários

Emissão de documentos médicos em conformidade com o CFM:

| Tipo | Descrição |
|------|-----------|
| Receituário Simples | Prescrição de medicamentos comuns |
| Receituário Especial | Portaria 344/98 (substâncias controladas) |
| Atestado Médico (Afastamento) | Justificativa de afastamento do trabalho |
| Atestado de Aptidão Física | Declaração de capacidade física |
| Declaração de Comparecimento | Comprovação de presença na consulta |
| Declaração de Acompanhante | Para menores ou pacientes dependentes |

**Funcionalidades:**
- Preenchimento via formulário com campos dinâmicos por tipo
- Armazenamento criptografado no prontuário do paciente (E2EE)
- Geração de hash de autenticidade único por documento
- Impressão/exportação para PDF (formato A4 com timbrado profissional e QR Code simulado)

---

### 5.6 `DoctorHistory.tsx` — Histórico & Procedimentos

- Listagem de todos os procedimentos realizados
- Filtros por médico, tipo de procedimento e classe de risco
- Vinculação de exames do catálogo a pacientes
- Registro de novos procedimentos com audit log

---

### 5.7 `Doctors2FA.tsx` — Autenticação de Dois Fatores

- Exibição do secret TOTP do médico logado
- Verificação da senha 2FA para ativação da sessão segura
- Status visual de verificação (ativo/pendente)
- Geração de segredo com prefixo `DRDiogoGONZAGA` via CSPRNG

---

### 5.8 `Exams.tsx` — Gestão de Exames

- Catálogo de exames com nome, descrição, duração e preço
- Criação, edição e remoção de exames (com confirmação)
- Vinculação de exames a pacientes e geração de audit log
- Dados persistidos no Supabase (`exams` table) e em `localStorage`

---

### 5.9 `CashRegister.tsx` — Controle de Caixa

- Registro de entradas (pagamentos de consultas e exames)
- Registro de **Sangria** (saídas/retiradas de caixa)
- Filtros por período, método de pagamento e operador
- Totalizadores: Entradas, Saídas e Saldo
- Rastreabilidade: cada transação vinculada ao operador

---

### 5.10 `LGPDDashboard.tsx` — Painel LGPD

- Visualização de todos os audit logs com filtros avançados
- Exibição das bases legais de cada operação (Art. 7 LGPD)
- Verificação de integridade do hash SHA-256 de cada log
- **Anonimização de paciente**: executa o direito ao esquecimento (Art. 18 LGPD)
  - Apaga dados identificáveis (nome, CPF, e-mail, telefone)
  - Cancela agendamentos futuros
  - Limpa prontuário criptografado
  - Registra log de exclusão

---

### 5.11 `AccessControl.tsx` — Controle de Acesso

Exclusivo para `admin`. Permite:
- Visualizar todos os usuários (médicos e funcionários)
- Editar permissões individuais de acesso por módulo
- Habilitar/desabilitar: Agenda, Prontuários, Documentos Clínicos, Caixa, LGPD, Gestão de Usuários
- Persistência das permissões no `localStorage`

---

## 6. Modelo de Dados

### `UserSession`
```typescript
interface UserSession {
  loggedIn: boolean;
  role: UserRole;           // 'doctor' | 'receptionist' | 'patient' | 'admin' | 'finance' | 'nurse'
  userId: string;
  name: string;
  crm?: string;
  is2FAVerified: boolean;
  avatar?: string;
  permissions?: UserPermissions;
}
```

### `Patient`
```typescript
interface Patient {
  id: string;
  name: string;
  cpf: string;                     // Sensível — nunca exposto em texto claro nos logs
  email: string;
  phone: string;
  birthDate: string;
  encryptedMedicalRecords: string; // Base64 do ciphertext AES-GCM
  cryptoIv: string;                // Base64 do IV (Vetor de Inicialização)
  cryptoSalt: string;              // Base64 do Salt PBKDF2
  consentGiven: boolean;
  consentDate: string | null;
  consentVersion: string;
  consentPurpose: string;
  isAnonymized: boolean;
}
```

### `Doctor`
```typescript
interface Doctor {
  id: string;
  name: string;
  crm: string;
  specialty: string;
  email: string;
  phone: string;
  is2FAEnabled: boolean;
  twoFactorSecret: string;         // Secret TOTP (Base32)
  avatar: string;
  consultationPrice?: number;
  password?: string;
}
```

### `Appointment`
```typescript
interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'Agendado' | 'Concluído' | 'Cancelado' | 'Em Andamento';
  notes: string;
  paymentMethod?: 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Pix' | 'Convênio';
  price?: number;
}
```

### `AuditLog`
```typescript
interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;                  // Tipo da operação auditada
  patientId: string | null;
  patientName: string | null;
  details: string;
  lgpdBasis: string;               // Base legal da LGPD (Art. 7)
  ipAddress: string;
  deviceInfo: string;
  securityHash: string;            // SHA-256 do conteúdo do log
}
```

### `DecryptedMedicalRecord` (nunca persiste em texto claro)
```typescript
interface DecryptedMedicalRecord {
  anamnese: string;
  diagnostico: string;
  prescricao: string;
  alergias: string;
  sinaisVitais: {
    pressao: string;
    peso: string;
    temperatura: string;
  };
  lastUpdated: string;
  documents?: ClinicalDocument[];  // Receitas e atestados emitidos
}
```

---

## 7. Segurança e Criptografia

### 7.1 Criptografia End-to-End (E2EE)

Implementada em `src/utils/crypto.ts` usando a **Web Crypto API** nativa do navegador.

**Fluxo de criptografia:**
```
Dados do Prontuário (JSON)
        │
        ▼
  JSON.stringify()
        │
        ▼
  TextEncoder.encode()  ──► ArrayBuffer
        │
        ▼
  PBKDF2 (100.000 iterações, SHA-256)
  ┌─────────────────────────────┐
  │  passphrase + salt aleatório│
  │  → CryptoKey (AES-GCM 256) │
  └─────────────────────────────┘
        │
        ▼
  AES-GCM.encrypt(iv aleatório, key, data)
        │
        ▼
  ArrayBuffer → Base64 (ciphertext)
        │
        ▼
  Armazenado no Supabase/localStorage
  {encryptedMedicalRecords, cryptoIv, cryptoSalt}
```

**Parâmetros criptográficos:**
- Algoritmo: `AES-GCM`
- Tamanho da chave: `256 bits`
- IV: `12 bytes` (96 bits) — gerado por `crypto.getRandomValues()`
- Salt: `16 bytes` (128 bits) — gerado por `crypto.getRandomValues()`
- KDF: `PBKDF2` com `100.000 iterações` e hash `SHA-256`

### 7.2 Funções em `crypto.ts`

| Função | Descrição |
|--------|-----------|
| `encryptMedicalRecord(record, passphrase)` | Criptografa um prontuário. Retorna `{ciphertext, iv, salt}` em Base64 |
| `decryptMedicalRecord(ciphertext, iv, salt, passphrase)` | Descriptografa e retorna o objeto `DecryptedMedicalRecord` |
| `anonymizeCPF(cpf)` | Mascara CPF para exibição: `***.***`.XXX-XX |
| `calculateAuditHash(logData)` | Calcula SHA-256 de uma entrada de log para integridade |
| `generateRandomSecret()` | Gera secret TOTP via CSPRNG com prefixo clínico |

### 7.3 Integridade dos Logs de Auditoria

Cada log de auditoria possui um campo `securityHash` calculado via SHA-256:

```typescript
const logString = `${action} ${patientId} ${patientName} ${timestamp} ${userName}`;
const securityHash = await calculateAuditHash(logString);
```

Isso permite detecção de adulteração posterior dos registros.

---

## 8. Conformidade LGPD

### Bases Legais Implementadas (Art. 7)

| Base Legal | Uso no Sistema |
|-----------|---------------|
| `Consentimento (Art. 7, I)` | Cadastro de paciente, agendamento |
| `Tutela da Saúde (Art. 7, VIII)` | Acesso ao prontuário médico |
| `Cumprimento de Obrigação Legal (Art. 7, II)` | Documentos obrigatórios |
| `Legítimo Interesse (Art. 7, IX)` | Comunicações administrativas |
| `Execução de Contrato (Art. 7, V)` | Controle de caixa/pagamento |

### Direitos do Titular (Art. 18)

| Direito | Implementação |
|---------|--------------|
| Acesso | Visualização dos dados via prontuário |
| Correção | Edição de dados demográficos e prontuário |
| Anonimização | Botão de anonimização no painel LGPD |
| Portabilidade | Log de exportação auditado |
| Consentimento | Campo `consentGiven` + data + versão + finalidade |

### Campos de Consentimento no Paciente

```typescript
consentGiven: boolean;         // Consentimento foi coletado?
consentDate: string | null;    // Quando foi coletado
consentVersion: string;        // Versão da política (ex: "v1.2 (2026)")
consentPurpose: string;        // Finalidade declarada
isAnonymized: boolean;         // Paciente já exerceu o direito ao esquecimento
```

### Processo de Anonimização

1. Substitui Nome, CPF, E-mail, Telefone, Data de Nascimento por dados genéricos
2. Define `isAnonymized = true`
3. Cancela todos os agendamentos futuros do paciente
4. Limpa o conteúdo do prontuário criptografado
5. Gera log de auditoria com base legal `Cumprimento de Obrigação Legal (Art. 7, II)`

---

## 9. Controle de Acesso e Permissões

### Papéis de Usuário (`UserRole`)

| Role | Descrição |
|------|-----------|
| `doctor` | Médico especialista — acesso a prontuários (requer 2FA) |
| `receptionist` | Recepcionista — agenda e caixa |
| `admin` | Diretor/Administrador — acesso total + gestão de usuários |
| `finance` | Financeiro — apenas caixa |
| `nurse` | Enfermagem — agenda e prontuários (sem criar documentos) |
| `patient` | Paciente (reservado para expansão futura) |

### Permissões Granulares (`UserPermissions`)

```typescript
interface UserPermissions {
  viewAppointments: boolean;      // Visualizar e gerenciar agenda
  viewEHR: boolean;               // Acessar prontuários eletrônicos
  createClinicalDocs: boolean;    // Emitir receitas e atestados
  viewCashRegister: boolean;      // Acessar controle de caixa
  viewLGPD: boolean;              // Acessar painel LGPD e logs
  manageUsers: boolean;           // Gerenciar usuários e permissões
}
```

### Permissões Padrão por Papel

| Role | Agenda | Prontuário | Documentos | Caixa | LGPD | Usuários |
|------|--------|-----------|-----------|-------|------|---------|
| `doctor` | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| `receptionist` | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `finance` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `nurse` | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

> As permissões podem ser customizadas individualmente pelo administrador via módulo **Controle de Acesso** e são persistidas em `localStorage`.

---

## 10. Integração com Supabase

### Tabelas no PostgreSQL

| Tabela | Descrição | Campos principais |
|--------|-----------|-------------------|
| `doctors` | Médicos | id, name, crm, specialty, email, is_2fa_enabled, two_factor_secret, consultation_price |
| `employees` | Funcionários | id, name, role, email, phone, avatar, password |
| `patients` | Pacientes | id, name, cpf, email, encrypted_medical_records, crypto_iv, crypto_salt, consent_* |
| `appointments` | Agendamentos | id, patient_id, doctor_id, date, time, status, payment_method, price |
| `procedures` | Procedimentos | id, patient_id, doctor_id, type, name, risk_class, duration_minutes |
| `audit_logs` | Logs de Auditoria | id, user_id, action, lgpd_basis, security_hash, ip_address |
| `cash_transactions` | Transações | id, amount, payment_method, operator_id, patient_id |
| `exams` | Catálogo de Exames | id, name, description, duration_minutes, price |

### Mapeamento de Campos (camelCase ↔ snake_case)

O código realiza conversão entre os formatos JavaScript e SQL:

```typescript
// JS → DB (exemplo Patient)
{ birthDate } → { birth_date }
{ encryptedMedicalRecords } → { encrypted_medical_records }
{ cryptoIv } → { crypto_iv }
{ consentGiven } → { consent_given }

// DB → JS
{ birth_date } → { birthDate }
// ... (inversamente)
```

### Modo Offline (Mock Data)

Se `VITE_SUPABASE_URL` não estiver configurado ou for o valor placeholder, o sistema:
1. Detecta via `isSupabaseConfigured` (em `supabaseClient.ts`)
2. Inicializa dados semente (`seedDatabase(false)`) em memória
3. Opera 100% localmente sem persistência entre sessões

---

## 11. Configuração do Ambiente

### Variáveis de Ambiente (`.env`)

```env
VITE_SUPABASE_URL=https://SEU-PROJETO-ID.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

> ⚠️ **Nunca versionar o arquivo `.env`**. Ele já está no `.gitignore`.

### Configuração do `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true
  }
}
```

### Configuração do `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './'
});
```

---

## 12. Scripts Disponíveis

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (http://localhost:5173)
npm run dev

# Gerar build de produção (pasta /dist)
npm run build

# Pré-visualizar build de produção localmente
npm run preview

# Executar linting (ESLint)
npm run lint

# Deploy automático no GitHub Pages
npm run deploy
# (executa: npm run build && cria dist/.nojekyll && gh-pages -d dist)
```

---

## 13. Perfis de Usuário (Credenciais de Teste)

| Nome | E-mail | Senha | Papel | Acesso 2FA |
|------|--------|-------|-------|-----------|
| Dr. Roberto Vasconcellos | roberto.vasconcellos@drDiogogonzaga.com.br | 123456 | Médico (Cardiologia) | Habilitado |
| Dra. Amanda Guimarães | amanda.guimaraes@drDiogogonzaga.com.br | 123456 | Médico (Pediatria) | Desabilitado |
| Dr. Felipe Albuquerque | felipe.albuquerque@drDiogogonzaga.com.br | 123456 | Médico (Dermatologia) | Desabilitado |
| Paula Souza | paula.souza@drdiogogonzaga.com.br | 123456 | Recepcionista | N/A |
| Dr. Diogo Gonzaga | diogo.gonzaga@drdiogogonzaga.com.br | 123456 | Admin | N/A |

> ⚠️ **Em produção, trocar todas as senhas e desativar o modo de seed com dados padrão.**

---

## 14. Fluxo de Autenticação

```
Usuário acessa /
       │
       ▼
LoginScreen renderiza
       │
       ▼ (submit formulário)
Verifica e-mail e senha contra doctors[] e employees[]
       │
  ┌────┴────┐
Médico?   Funcionário?
  │           │
  ▼           ▼
setCurrentSession com role = 'doctor' | role do employee
       │
       ▼
Layout renderiza abas baseado em permissions
       │
       ▼ (se médico tenta acessar prontuário)
is2FAVerified? ──No──► Redireciona para aba auth_2fa
       │Yes
       ▼
Prontuário descriptografado no cliente
       │
       ▼
addAuditLogEntry('Acesso ao Prontuário', ...)
```

---

## 15. Licença

```
SPDX-License-Identifier: Apache-2.0
```

Todos os arquivos de código-fonte são licenciados sob a **Apache License 2.0**.

---

*Documentação gerada em 07/07/2026 — Desenvolvido por SidneyMaximo*
*Sistema em conformidade com LGPD (Lei nº 13.709/2018) e CFM Resolução nº 2.299/2021*
