# 🤝 Guia de Contribuição — Centro Médico Dr. Diogo Gonzaga

Obrigado por se interessar em contribuir com o projeto! Este documento descreve o processo de desenvolvimento, padrões de código e fluxo de contribuição.

---

## 1. Configuração do Ambiente de Desenvolvimento

### Requisitos

- Node.js >= 18.x
- npm >= 9.x
- Git >= 2.x
- Editor: VS Code (recomendado)

### Extensões VS Code Recomendadas

```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag"
  ]
}
```

### Configuração Inicial

```bash
# 1. Faça fork do repositório e clone
git clone https://github.com/SEU_USUARIO/projeto-clinica.git
cd projeto-clinica

# 2. Instale as dependências
npm install

# 3. Configure o .env (use o arquivo .env.example como base)
cp .env.example .env
# Edite o .env com suas credenciais Supabase (ou deixe em modo offline)

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

---

## 2. Fluxo de Trabalho Git

### Branches

| Branch | Propósito |
|--------|-----------|
| `main` | Código de produção — apenas via PR aprovado |
| `develop` | Branch de integração |
| `feature/nome-da-feature` | Novas funcionalidades |
| `fix/nome-do-bug` | Correções de bugs |
| `hotfix/nome-do-fix` | Correções urgentes de produção |
| `docs/nome-da-doc` | Atualizações de documentação |

### Fluxo Padrão

```bash
# 1. Sempre parta da branch atualizada
git checkout develop
git pull origin develop

# 2. Crie sua branch
git checkout -b feature/minha-nova-feature

# 3. Desenvolva e faça commits atômicos
git add .
git commit -m "feat(appointments): adiciona filtro por especialidade"

# 4. Sincronize com develop antes de abrir PR
git fetch origin
git rebase origin/develop

# 5. Envie sua branch
git push origin feature/minha-nova-feature

# 6. Abra um Pull Request no GitHub
```

---

## 3. Convenção de Commits (Conventional Commits)

Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-BR/):

```
<tipo>(<escopo>): <descrição curta em imperativo>

[corpo opcional]

[rodapé opcional]
```

### Tipos

| Tipo | Uso |
|------|-----|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `docs` | Documentação |
| `style` | Formatação (sem mudança de lógica) |
| `refactor` | Refatoração de código |
| `perf` | Melhoria de performance |
| `test` | Adição de testes |
| `chore` | Tarefas de manutenção (deps, configs) |
| `security` | Correção de vulnerabilidade |
| `lgpd` | Mudança relacionada à conformidade LGPD |

### Exemplos

```bash
# Feature
git commit -m "feat(health-records): adiciona campo de histórico familiar"

# Correção de bug
git commit -m "fix(appointments): corrige ordenação por data no calendar view"

# Segurança (sempre descrever)
git commit -m "security(crypto): aumenta iterações PBKDF2 de 100k para 150k"

# LGPD
git commit -m "lgpd(audit): adiciona base legal 'Legítimo Interesse' aos logs"

# Breaking change (com !)
git commit -m "feat(auth)!: migra autenticação para Supabase Auth real"
```

---

## 4. Padrões de Código

### 4.1 TypeScript

- **Sempre tipar** — Evite `any`. Use tipos específicos ou `unknown`
- **Interfaces para objetos** de domínio (em `types.ts`)
- **Type aliases** para tipos utilitários simples
- **Nunca** usar `// @ts-ignore` sem comentário explicativo

```typescript
// ✅ Correto
const getPatientById = (id: string): Patient | undefined => {
  return patients.find(p => p.id === id);
};

// ❌ Evitar
const getPatientById = (id: any): any => {
  return patients.find((p: any) => p.id === id);
};
```

### 4.2 React / Componentes

- **Componentes funcionais** com hooks — sem class components
- **Props tipadas** com interface explícita
- **Nome do componente** em PascalCase
- **Arquivo** com mesmo nome do componente: `Appointments.tsx`
- **Um componente principal por arquivo**
- Extrair sub-componentes apenas quando o arquivo exceder ~300 linhas

```typescript
// ✅ Padrão do projeto
interface AppointmentsProps {
  appointments: Appointment[];
  patients: Patient[];
  onAddAppointment: (appt: Appointment) => void;
}

export default function Appointments({ appointments, patients, onAddAppointment }: AppointmentsProps) {
  // ...
}
```

### 4.3 Segurança (Obrigatório)

> ⚠️ **Crítico**: Qualquer contribuição que afete segurança ou LGPD deve ser revisada com atenção especial.

- **Nunca** armazenar dados de saúde em localStorage sem criptografia
- **Nunca** logar dados sensíveis (CPF, prontuário) no `console.log`
- **Sempre** registrar audit log em operações que envolvam dados de pacientes
- **Sempre** verificar `is2FAVerified` antes de exibir dados de prontuário
- **Sempre** usar `crypto.getRandomValues()` — nunca `Math.random()` para fins de segurança

```typescript
// ✅ Seguro — CSPRNG
const array = new Uint8Array(16);
window.crypto.getRandomValues(array);

// ❌ Nunca para criptografia
const randomBytes = Math.random().toString(36);
```

### 4.4 Tailwind CSS

- Usar classes Tailwind — sem CSS em linha (`style={{}}`) exceto para valores dinâmicos que o Tailwind não suporta
- Classes em ordem: Layout → Spacing → Sizing → Typography → Colors → Effects
- Agrupar responsivo no final: `md:`, `lg:`
- Evitar `!important` (`!` prefix do Tailwind)

### 4.5 Nomenclatura

| Contexto | Convenção | Exemplo |
|----------|-----------|---------|
| Componentes React | PascalCase | `HealthRecords` |
| Arquivos de componente | PascalCase.tsx | `HealthRecords.tsx` |
| Funções/variáveis | camelCase | `addAuditLogEntry` |
| Constantes globais | UPPER_SNAKE_CASE | `DEFAULT_PERMISSIONS` |
| Tipos/Interfaces | PascalCase | `UserSession`, `Patient` |
| Campos de banco (SQL) | snake_case | `encrypted_medical_records` |
| IDs de elementos HTML | kebab-case | `login-submit`, `tab-button-appointments` |

---

## 5. Adicionando Novos Módulos

### 5.1 Novo Componente de Página

1. Crie o arquivo em `src/components/NomeDoModulo.tsx`
2. Defina a interface de props
3. Importe e registre em `App.tsx`
4. Adicione a aba correspondente em `Layout.tsx` (array `tabs`)
5. Defina a permissão necessária no tipo `UserPermissions` em `types.ts`
6. Adicione a permissão padrão em `DEFAULT_PERMISSIONS` e `getDefaultPermissionsForRole`

### 5.2 Novo Tipo de Dado

1. Adicione a interface em `src/types.ts`
2. Crie o `useState` correspondente em `App.tsx`
3. Crie tabela no Supabase (execute SQL no dashboard)
4. Implemente mapeamento camelCase ↔ snake_case em `App.tsx`
5. Adicione seeding de dados em `seedDatabase()`

### 5.3 Nova Operação Auditável

Sempre que uma operação envolver dados de pacientes:

```typescript
await addAuditLogEntry(
  'Nome da Ação',           // AuditLog['action']
  patient.id,               // ou null
  patient.name,             // ou null
  'Descrição detalhada.',   // details
  'Base Legal (Art. X)'     // lgpdBasis
);
```

---

## 6. Testes

### 6.1 Testes Manuais Obrigatórios

Antes de abrir um PR, verifique:

- [ ] Login como cada tipo de usuário (médico, recepcionista, admin)
- [ ] Acesso 2FA para médico
- [ ] Criação e edição de agendamento
- [ ] Descriptografia de prontuário (médico com 2FA)
- [ ] Emissão de pelo menos 1 tipo de documento clínico
- [ ] Registro de transação no caixa
- [ ] Anonimização de paciente no painel LGPD
- [ ] Alteração de permissão no controle de acesso
- [ ] Verificação de audit log gerado

### 6.2 Testes Automatizados (Futuros)

- Unitários: `vitest` para funções utilitárias (`crypto.ts`)
- Integração: `@testing-library/react` para componentes críticos
- E2E: `Playwright` para fluxos completos

---

## 7. Pull Request

### Checklist do PR

Antes de abrir o PR, confirme:

```markdown
## Checklist
- [ ] Código segue os padrões do projeto
- [ ] Commits seguem Conventional Commits
- [ ] Nenhum dado sensível foi logado no console
- [ ] Operações com dados de pacientes geram audit log
- [ ] Sem `any` no TypeScript sem justificativa
- [ ] Testado manualmente em Chrome e Firefox
- [ ] Responsivo em mobile (min 375px)
- [ ] Build de produção funciona: `npm run build`
- [ ] Lint sem erros: `npm run lint`
```

### Template de PR

```markdown
## Descrição
Breve descrição do que foi implementado/corrigido.

## Tipo de Mudança
- [ ] Nova feature
- [ ] Correção de bug
- [ ] Melhoria de segurança
- [ ] Documentação
- [ ] Refatoração

## Impacto na LGPD/Segurança
Descrever se há impacto em dados de pacientes ou segurança.

## Como Testar
1. Passo 1
2. Passo 2
3. Resultado esperado

## Screenshots (se UI)
```

---

## 8. Relatando Issues

### Bug Report

Inclua:
- **Versão** do sistema e do browser
- **Passos para reproduzir**
- **Comportamento esperado** vs **comportamento atual**
- **Logs de console** (sem dados reais de pacientes)
- **Screenshot** se for visual

### Feature Request

Inclua:
- **Problema que resolve**
- **Proposta de solução**
- **Impacto na LGPD/Segurança** (se houver)
- **Alternativas consideradas**

---

*Guia de Contribuição — Centro Médico Dr. Diogo Gonzaga*
*Versão 1.0 — 07/07/2026*
