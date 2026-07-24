# 📋 Changelog — Centro Médico Dr. Diogo Gonzaga

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Não Lançado]

### Em Desenvolvimento
- Autenticação real com Supabase Auth
- Hashing de senhas com bcrypt/argon2
- App mobile (React Native)

---

## [1.0.0] — 2026-07-07

### ✨ Adicionado

#### Sistema de Autenticação
- Tela de login com e-mail e senha
- Suporte a múltiplos perfis: médico, recepcionista, admin
- Persistência de sessão via `localStorage`
- Indicador visual do papel do usuário autenticado

#### Prontuários Eletrônicos (E2EE)
- Criptografia AES-GCM-256 ponta a ponta via Web Crypto API
- Derivação de chave PBKDF2 com 100.000 iterações e SHA-256
- IV e Salt únicos por paciente via CSPRNG
- Descriptografia sob demanda no browser do médico
- Edição e recriptografia de prontuários

#### Autenticação de Dois Fatores (2FA)
- Módulo de configuração de 2FA para médicos
- Verificação de token TOTP por sessão
- Bloqueio de acesso a prontuários sem 2FA verificado
- Indicador visual de status 2FA no header

#### Agenda de Consultas
- Agendamento de consultas com paciente, médico, data e horário
- Status de consulta: Agendado, Em Andamento, Concluído, Cancelado
- Registro de método de pagamento e valor
- Filtros e busca de agendamentos

#### Documentos e Receituários
- Emissão de 6 tipos de documentos clínicos
- Receituário Simples e Especial (Portaria 344/98)
- Atestado Médico (Afastamento) e de Aptidão Física
- Declaração de Comparecimento e de Acompanhante
- Armazenamento criptografado E2EE dos documentos no prontuário
- Hash de autenticidade único por documento
- Impressão/exportação em formato PDF A4

#### Especialistas e Procedimentos
- Listagem de médicos especialistas
- Registro de procedimentos históricos
- Vinculação de exames a pacientes
- Classes de risco: Baixo, Médio, Alto

#### Controle de Caixa
- Registro de entradas (pagamentos)
- Registro de sangria (saídas de caixa)
- Totalizadores: Entradas, Saídas, Saldo
- Rastreabilidade por operador

#### Exames
- Catálogo de exames com nome, descrição, duração e preço
- CRUD completo de exames
- Vinculação a pacientes com geração de audit log

#### Painel LGPD & Logs
- Visualização completa dos audit logs
- Base legal LGPD mapeada em cada operação
- Verificação de integridade SHA-256 dos logs
- Filtros por ação, usuário e paciente
- Anonimização completa de pacientes (Art. 18 LGPD)

#### Controle de Acesso
- Gerenciamento de permissões por usuário (admin only)
- Permissões granulares: 6 módulos controláveis individualmente
- Persistência de permissões no localStorage

#### Integração com Supabase
- Suporte a modo online (Supabase) e offline (mock data)
- Mapeamento completo camelCase ↔ snake_case
- Seed automático do banco ao inicializar

#### Segurança e LGPD
- Audit log imutável com SHA-256 para todas as operações sensíveis
- Mascaramento de CPF nos registros de log
- Consentimento LGPD com data, versão e finalidade
- Anonimização com cancelamento automático de agendamentos futuros
- IP e dispositivo registrados em cada acesso

### 🎨 Design
- Interface glassmorphism com tema escuro no login
- Layout responsivo com sidebar colapsável
- Sidebar com card informativo sobre criptografia E2EE
- Badge visual de papel do usuário
- Indicador de 2FA ativo/pendente
- Animações de loading nos formulários
- Tema clínico com paleta teal/slate

### 🛠️ Infraestrutura
- React 18 + TypeScript + Vite 5
- Tailwind CSS 3 para estilização
- Deploy configurado para GitHub Pages via gh-pages
- Scripts: dev, build, preview, lint, deploy

---

## Convenções de Versionamento

```
MAJOR.MINOR.PATCH

MAJOR: Mudanças incompatíveis com versão anterior
MINOR: Novas funcionalidades compatíveis com versão anterior  
PATCH: Correções de bugs compatíveis com versão anterior
```

### Tipos de Mudança

| Tipo | Descrição |
|------|-----------|
| ✨ **Adicionado** | Novas funcionalidades |
| 🔄 **Modificado** | Mudanças em funcionalidades existentes |
| 🗑️ **Removido** | Funcionalidades removidas |
| 🐛 **Corrigido** | Correções de bugs |
| 🔒 **Segurança** | Correções de vulnerabilidades |
| ⚡ **Performance** | Melhorias de desempenho |
| 📚 **Docs** | Atualizações na documentação |

---

*Centro Médico Dr. Diogo Gonzaga — Desenvolvido por SidneyMaximo*
