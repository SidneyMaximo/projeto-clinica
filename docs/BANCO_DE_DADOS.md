# 🗄️ Documentação do Banco de Dados — Centro Médico Dr. Diogo Gonzaga

## Visão Geral

O sistema utiliza **PostgreSQL** via **Supabase** como banco de dados principal. O acesso é realizado através do SDK `@supabase/supabase-js` com Row Level Security (RLS) habilitado.

Em modo offline (sem Supabase configurado), os dados são mantidos em memória via seed data no `App.tsx`.

---

## Diagrama Entidade-Relacionamento (ER)

```
┌──────────────┐         ┌─────────────────┐        ┌──────────────────┐
│   doctors    │         │  appointments   │        │    patients      │
├──────────────┤         ├─────────────────┤        ├──────────────────┤
│ id (PK)      │────┐    │ id (PK)         │    ┌───│ id (PK)          │
│ name         │    └───►│ doctor_id (FK)  │◄───┘   │ name             │
│ crm          │         │ patient_id (FK) │────────│ cpf              │
│ specialty    │         │ date            │        │ email            │
│ email        │         │ time            │        │ phone            │
│ phone        │         │ status          │        │ birth_date       │
│ is_2fa_en.   │         │ notes           │        │ encrypted_med.   │
│ 2fa_secret   │         │ payment_method  │        │ crypto_iv        │
│ avatar       │         │ price           │        │ crypto_salt      │
│ consult_price│         └─────────────────┘        │ consent_given    │
│ password     │                                    │ consent_date     │
└──────────────┘                                    │ consent_version  │
                                                    │ consent_purpose  │
                                                    │ is_anonymized    │
                                                    └──────────────────┘
                                                              │
                         ┌─────────────────┐                 │
                         │   procedures    │                 │
                         ├─────────────────┤                 │
                         │ id (PK)         │                 │
                         │ patient_id (FK) │─────────────────┘
                         │ doctor_id (FK)  │
                         │ specialty       │
                         │ date            │
                         │ type            │
                         │ name            │
                         │ notes           │
                         │ risk_class      │
                         │ duration_min.   │
                         └─────────────────┘

┌──────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│   employees      │     │   cash_transactions  │     │  audit_logs  │
├──────────────────┤     ├─────────────────────┤     ├──────────────┤
│ id (PK)          │     │ id (PK)             │     │ id (PK)      │
│ name             │     │ timestamp           │     │ timestamp    │
│ role             │     │ patient_id (FK opt) │     │ user_id      │
│ email            │────►│ patient_name        │     │ user_name    │
│ phone            │     │ description         │     │ user_role    │
│ avatar           │     │ amount              │     │ action       │
│ password         │     │ payment_method      │     │ patient_id   │
└──────────────────┘     │ operator_id (FK)   │     │ patient_name │
                         │ operator_name       │     │ details      │
                         └─────────────────────┘     │ lgpd_basis   │
                                                      │ ip_address   │
                              ┌──────────┐            │ device_info  │
                              │  exams   │            │ security_hash│
                              ├──────────┤            └──────────────┘
                              │ id (PK)  │
                              │ name     │
                              │ descr.   │
                              │ dur_min. │
                              │ price    │
                              └──────────┘
```

---

## Schemas Detalhados das Tabelas

### Tabela: `doctors`

```sql
CREATE TABLE doctors (
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
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | TEXT PK | Identificador único (ex: `doc_01`) |
| `name` | TEXT | Nome completo do médico |
| `crm` | TEXT UNIQUE | Número do CRM com UF (ex: `CRM-SP 123456`) |
| `specialty` | TEXT | Especialidade médica |
| `email` | TEXT UNIQUE | E-mail de login |
| `phone` | TEXT | Telefone de contato |
| `is_2fa_enabled` | BOOLEAN | Se 2FA está configurado |
| `two_factor_secret` | TEXT | Segredo TOTP (plaintext para MVP — hash em produção) |
| `avatar` | TEXT | URL do avatar |
| `consultation_price` | NUMERIC | Preço padrão da consulta |
| `password` | TEXT | Senha (plaintext para MVP — bcrypt em produção) |

---

### Tabela: `patients`

```sql
CREATE TABLE patients (
  id                       TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  cpf                      TEXT NOT NULL UNIQUE,
  email                    TEXT,
  phone                    TEXT,
  birth_date               DATE,
  encrypted_medical_records TEXT,   -- AES-GCM ciphertext em Base64
  crypto_iv                TEXT,    -- IV em Base64 (12 bytes)
  crypto_salt              TEXT,    -- Salt PBKDF2 em Base64 (16 bytes)
  consent_given            BOOLEAN DEFAULT FALSE,
  consent_date             TIMESTAMPTZ,
  consent_version          TEXT,
  consent_purpose          TEXT,
  is_anonymized            BOOLEAN DEFAULT FALSE
);
```

> ⚠️ **Dados sensíveis**: O campo `encrypted_medical_records` contém prontuários criptografados via AES-GCM-256. O servidor **nunca** recebe ou armazena dados de saúde em texto claro.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `encrypted_medical_records` | TEXT | Ciphertext AES-GCM em Base64 |
| `crypto_iv` | TEXT | Initialization Vector (96-bit) em Base64 |
| `crypto_salt` | TEXT | Salt PBKDF2 (128-bit) em Base64 |
| `consent_given` | BOOLEAN | Consentimento LGPD coletado |
| `consent_version` | TEXT | Versão da política de privacidade aceita |
| `is_anonymized` | BOOLEAN | Paciente exerceu direito ao esquecimento |

---

### Tabela: `appointments`

```sql
CREATE TABLE appointments (
  id             TEXT PRIMARY KEY,
  patient_id     TEXT REFERENCES patients(id),
  patient_name   TEXT NOT NULL,
  doctor_id      TEXT REFERENCES doctors(id),
  doctor_name    TEXT NOT NULL,
  specialty      TEXT NOT NULL,
  date           DATE NOT NULL,
  time           TIME NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('Agendado', 'Concluído', 'Cancelado', 'Em Andamento')),
  notes          TEXT,
  payment_method TEXT CHECK (payment_method IN ('Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Convênio')),
  price          NUMERIC(10, 2)
);
```

---

### Tabela: `procedures`

```sql
CREATE TABLE procedures (
  id               TEXT PRIMARY KEY,
  patient_id       TEXT REFERENCES patients(id),
  patient_name     TEXT NOT NULL,
  doctor_id        TEXT REFERENCES doctors(id),
  doctor_name      TEXT NOT NULL,
  specialty        TEXT NOT NULL,
  date             DATE NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('Consulta', 'Cirurgia', 'Exame Clínico', 'Laudo', 'Procedimento Estético', 'Terapia')),
  name             TEXT NOT NULL,
  notes            TEXT,
  risk_class       TEXT NOT NULL CHECK (risk_class IN ('Baixo', 'Médio', 'Alto')),
  duration_minutes INTEGER NOT NULL
);
```

---

### Tabela: `audit_logs`

```sql
CREATE TABLE audit_logs (
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
  security_hash TEXT NOT NULL  -- SHA-256 da entrada do log
);
```

> 🔒 **Integridade**: O campo `security_hash` é um SHA-256 calculado no cliente antes da inserção, permitindo detectar qualquer adulteração posterior do registro.

---

### Tabela: `cash_transactions`

```sql
CREATE TABLE cash_transactions (
  id             TEXT PRIMARY KEY,
  timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  patient_id     TEXT REFERENCES patients(id),
  patient_name   TEXT,
  description    TEXT NOT NULL,
  amount         NUMERIC(10, 2) NOT NULL,  -- Positivo = entrada; Negativo = sangria
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'Pix', 'Convênio')),
  operator_id    TEXT NOT NULL,
  operator_name  TEXT NOT NULL
);
```

---

### Tabela: `employees`

```sql
CREATE TABLE employees (
  id       TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  role     TEXT NOT NULL CHECK (role IN ('receptionist', 'nurse', 'admin', 'finance')),
  email    TEXT NOT NULL UNIQUE,
  phone    TEXT,
  avatar   TEXT,
  password TEXT NOT NULL
);
```

---

### Tabela: `exams`

```sql
CREATE TABLE exams (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT,
  duration_minutes INTEGER NOT NULL,
  price            NUMERIC(10, 2) NOT NULL
);
```

---

## Dados Semente (Seed Data)

O sistema é inicializado com os seguintes dados de demonstração:

### Médicos (3)
| ID | Nome | Especialidade | CRM |
|----|------|--------------|-----|
| `doc_01` | Dr. Roberto Vasconcellos | Cardiologia | CRM-SP 123456 |
| `doc_02` | Dra. Amanda Guimarães | Pediatria | CRM-RJ 654321 |
| `doc_03` | Dr. Felipe Albuquerque | Dermatologia | CRM-MG 987654 |

### Pacientes (3)
| ID | Nome | Condição |
|----|------|---------|
| `pat_01` | Carlos Eduardo Oliveira | Hipertensão arterial |
| `pat_02` | Marieta Santos Silveira | Enxaqueca vestibular |
| `pat_03` | Ana Julia Mendonça | Dermatite atópica |

### Funcionários (2)
| ID | Nome | Papel |
|----|------|-------|
| `rec_10` | Paula Souza | Recepcionista |
| `admin_01` | Dr. Diogo Gonzaga | Administrador |

---

## Mapeamento de Campos (TypeScript ↔ SQL)

| TypeScript (camelCase) | SQL (snake_case) | Tabela |
|------------------------|------------------|--------|
| `birthDate` | `birth_date` | patients |
| `encryptedMedicalRecords` | `encrypted_medical_records` | patients |
| `cryptoIv` | `crypto_iv` | patients |
| `cryptoSalt` | `crypto_salt` | patients |
| `consentGiven` | `consent_given` | patients |
| `consentDate` | `consent_date` | patients |
| `consentVersion` | `consent_version` | patients |
| `consentPurpose` | `consent_purpose` | patients |
| `isAnonymized` | `is_anonymized` | patients |
| `is2FAEnabled` | `is_2fa_enabled` | doctors |
| `twoFactorSecret` | `two_factor_secret` | doctors |
| `consultationPrice` | `consultation_price` | doctors |
| `patientId` | `patient_id` | appointments, procedures |
| `doctorId` | `doctor_id` | appointments, procedures |
| `paymentMethod` | `payment_method` | appointments, cash_transactions |
| `riskClass` | `risk_class` | procedures |
| `durationMinutes` | `duration_minutes` | procedures, exams |
| `userId` | `user_id` | audit_logs |
| `userName` | `user_name` | audit_logs |
| `userRole` | `user_role` | audit_logs |
| `patientName` | `patient_name` | audit_logs |
| `lgpdBasis` | `lgpd_basis` | audit_logs |
| `ipAddress` | `ip_address` | audit_logs |
| `deviceInfo` | `device_info` | audit_logs |
| `securityHash` | `security_hash` | audit_logs |
| `operatorId` | `operator_id` | cash_transactions |
| `operatorName` | `operator_name` | cash_transactions |

---

## Recomendações para Produção

> ⚠️ As configurações abaixo são recomendadas antes do deploy em produção real:

1. **Hashing de senhas**: Substituir senhas em plaintext por hashes `bcrypt` ou `argon2`
2. **RLS no Supabase**: Configurar Row Level Security para cada tabela conforme perfil do usuário autenticado
3. **Backup automático**: Habilitar backups diários automáticos no Supabase
4. **Índices**: Adicionar índices nos campos de busca frequente (`patient_id`, `doctor_id`, `timestamp`)
5. **Auditoria do DB**: Habilitar `pg_audit` no PostgreSQL para log de nível de banco de dados
6. **Criptografia do secret 2FA**: Criptografar `two_factor_secret` no banco (em produção deve ser AES-256 ou similar)

```sql
-- Índices recomendados para produção
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_patient ON audit_logs(patient_id);
CREATE INDEX idx_cash_transactions_timestamp ON cash_transactions(timestamp DESC);
CREATE INDEX idx_procedures_patient ON procedures(patient_id);
```

---

*Documentação de banco de dados — Centro Médico Dr. Diogo Gonzaga*
*Versão 1.0 — 07/07/2026*
