# 🏗️ Arquitetura do Sistema — Centro Médico Dr. Diogo Gonzaga

## Visão Geral da Arquitetura

O sistema segue uma arquitetura **SPA (Single Page Application)** com backend-as-a-service (BaaS) via Supabase. Toda a lógica sensível de criptografia é executada exclusivamente no cliente (browser).

---

## Diagrama de Camadas

```
╔══════════════════════════════════════════════════════════════╗
║                  CAMADA DE APRESENTAÇÃO (UI)                 ║
║                                                              ║
║  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  ║
║  │LoginScr. │ │ Layout   │ │Appointments│ │HealthRecords │  ║
║  └──────────┘ └──────────┘ └───────────┘ └──────────────┘  ║
║  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  ║
║  │ClinicalD.│ │CashReg.  │ │LGPD Panel │ │AccessControl │  ║
║  └──────────┘ └──────────┘ └───────────┘ └──────────────┘  ║
╠══════════════════════════════════════════════════════════════╣
║                  CAMADA DE ESTADO (App.tsx)                  ║
║                                                              ║
║  useState: patients, doctors, appointments, auditLogs...     ║
║  useEffect: inicialização, persistência localStorage         ║
║  Handlers: addAuditLog, handleLogin, handleAnonymize...      ║
╠══════════════════════════════════════════════════════════════╣
║               CAMADA DE SERVIÇOS / UTILITÁRIOS               ║
║                                                              ║
║  ┌─────────────────────────┐  ┌──────────────────────────┐  ║
║  │     crypto.ts           │  │   supabaseClient.ts      │  ║
║  │ • encryptMedicalRecord  │  │ • createClient()         │  ║
║  │ • decryptMedicalRecord  │  │ • isSupabaseConfigured   │  ║
║  │ • calculateAuditHash    │  │                          │  ║
║  │ • anonymizeCPF          │  │                          │  ║
║  │ • generateRandomSecret  │  │                          │  ║
║  └─────────────────────────┘  └──────────────────────────┘  ║
╠══════════════════════════════════════════════════════════════╣
║               CAMADA DE INFRAESTRUTURA                       ║
║                                                              ║
║  ┌──────────────────┐    ┌────────────────────────────────┐  ║
║  │  Web Crypto API  │    │        Supabase Cloud          │  ║
║  │ (nativa browser) │    │  PostgreSQL + RLS + REST API   │  ║
║  │ • AES-GCM        │    │                                │  ║
║  │ • PBKDF2         │    │  Tabelas:                      │  ║
║  │ • SHA-256        │    │  doctors, patients, appoint.   │  ║
║  │ • CSPRNG         │    │  audit_logs, cash_trans...     │  ║
║  └──────────────────┘    └────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Fluxo de Dados — Prontuário Eletrônico (E2EE)

```
MÉDICO (Browser)                    SERVIDOR (Supabase)
      │                                     │
      │── Login com e-mail + senha ─────────│
      │── Verifica token 2FA ───────────────│
      │                                     │
      │── Solicita prontuário ──────────────┤
      │                          ┌──────────┘
      │◄─ {ciphertext, iv, salt}─┤  (dados criptografados)
      │                          └──────────
      │
      │  [DESCRIPTOGRAFIA LOCAL — jamais sai do browser]
      │  passphrase + salt ──► PBKDF2 ──► CryptoKey (AES-256)
      │  AES-GCM.decrypt(ciphertext, iv, key) ──► JSON
      │
      │── Exibe prontuário legível para o médico
      │
      │  [EDIÇÃO E RECRIPTOGRAFIA LOCAL]
      │  JSON ──► AES-GCM.encrypt() ──► novo ciphertext
      │
      │── PUT {ciphertext, iv, salt} ──────►│  (só cifrado chega)
      │                                     │
      │── Audit Log (SHA-256 hash) ─────────►│
```

---

## Fluxo de Autenticação e Sessão

```
        ┌───────────────────────────────────────┐
        │            INÍCIO DA SESSÃO            │
        └──────────────────┬────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ LoginScreen │
                    └──────┬──────┘
                           │ e-mail + senha
              ┌────────────▼────────────┐
              │ Busca em doctors[]      │
              │ Busca em employees[]    │
              └────────────┬────────────┘
                 ┌─────────▼─────────┐
          ┌─────►│   Autenticado?    │◄─────┐
          │      └─────────┬─────────┘      │
          │ Não            │ Sim             │
          │     ┌──────────▼──────────┐      │
          │     │ Carrega permissões  │      │
          │     │ do permissionsMap[] │      │
          │     └──────────┬──────────┘      │
          │                │                  │
          │     ┌──────────▼──────────┐      │
          │     │ setCurrentSession() │      │
          │     │ Persiste localStorage│      │
          │     └──────────┬──────────┘      │
          │                │                  │
          │     ┌──────────▼──────────┐      │
          │     │     Layout()        │      │
          │     │  Filtra abas por    │      │
          │     │   permissions[]     │      │
          │     └──────────┬──────────┘      │
          │                │                  │
          │     ┌──────────▼──────────┐      │
          │     │  Role = 'doctor'?   │      │
          │     └────┬──────────┬─────┘      │
          │         Sim        Não            │
          │    ┌────▼───┐  ┌───▼────────┐    │
          │    │ 2FA    │  │ Acesso     │    │
          │    │ Screen │  │ Direto     │    │
          │    └────┬───┘  └────────────┘    │
          │    verificar    (sem prontuário)  │
          │    token        │                 │
          │         │       │                 │
          │    ┌────▼───────▼────┐            │
          │    │ is2FAVerified   │            │
          └────┤    = true/false ├────────────┘
               └────────────────┘
```

---

## Arquitetura de Segurança — Camadas de Defesa

```
┌─────────────────────────────────────────────────────┐
│ CAMADA 1: Autenticação                              │
│  • Login por e-mail + senha                         │
│  • Validação contra lista de usuários conhecidos    │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ CAMADA 2: Autorização por Papel (RBAC)              │
│  • UserRole: doctor, receptionist, admin...         │
│  • Abas filtradas por permissions[]                 │
│  • Botões/ações bloqueados por papel                │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ CAMADA 3: Autenticação de 2 Fatores (2FA/MFA)       │
│  • Obrigatório para acesso a prontuários            │
│  • Token baseado em secret TOTP por médico          │
│  • Sessão 2FA não persiste entre logouts            │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ CAMADA 4: Criptografia E2EE dos Dados               │
│  • AES-GCM-256 com PBKDF2 (100k iterações)          │
│  • Servidor NUNCA vê dados de saúde em texto claro  │
│  • Salt e IV únicos por paciente (CSPRNG)           │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│ CAMADA 5: Auditoria e Integridade                   │
│  • Log imutável de toda operação sensível           │
│  • Hash SHA-256 de cada entrada de log              │
│  • Base legal LGPD registrada em cada ação          │
└─────────────────────────────────────────────────────┘
```

---

## Modelo de Componentes React

```
App (src/App.tsx)
│
├── LoginScreen (se !loggedIn)
│
└── Layout (se loggedIn)
    ├── Header
    │   ├── Logo + Nome da Clínica
    │   ├── Badge de Papel do Usuário
    │   ├── Indicador 2FA (doctors only)
    │   └── Botão de Logout
    │
    ├── Sidebar (nav)
    │   ├── Tab: Agenda de Consultas       → Appointments
    │   ├── Tab: Prontuários E2EE          → HealthRecords
    │   ├── Tab: Documentos & Receituários → ClinicalDocuments
    │   ├── Tab: Especialistas             → DoctorHistory
    │   ├── Tab: Exames                    → Exams
    │   ├── Tab: Controle de Caixa         → CashRegister
    │   ├── Tab: Painel LGPD & Logs        → LGPDDashboard
    │   ├── Tab: Controle de Acesso        → AccessControl
    │   └── Tab: Acesso Médico (2FA)       → Doctors2FA
    │
    ├── Main (conteúdo da aba ativa)
    │   └── {children} — componente da aba ativa
    │
    └── Footer (info legal)
```

---

## Tecnologias e Justificativas de Escolha

| Decisão | Alternativas Consideradas | Justificativa |
|---------|--------------------------|---------------|
| React 18 | Vue, Angular, Svelte | Ecossistema maduro, hooks, performance |
| TypeScript | JavaScript puro | Segurança de tipos, IntelliSense, redução de bugs |
| Vite | CRA, Webpack | HMR instantâneo, builds rápidos, ESM nativo |
| Tailwind CSS | CSS Modules, Styled-Components | Velocidade de desenvolvimento, consistência |
| Supabase | Firebase, AWS Amplify | PostgreSQL real, RLS nativa, open-source |
| Web Crypto API | CryptoJS, forge | Nativa do browser, FIPS-aprovada, sem dependências externas |
| gh-pages | Vercel, Netlify | Simples, sem custo, integrado ao Git |

---

*Arquitetura documentada em 07/07/2026 — Centro Médico Dr. Diogo Gonzaga*
