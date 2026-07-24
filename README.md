# 🏥 Centro Médico Dr. Diogo Gonzaga
### Sistema Clínico Seguro — Conformidade LGPD & Criptografia E2EE

<p align="center">
  <img src="assets/logo.jpg" alt="Centro Médico Dr. Diogo Gonzaga" width="120" style="border-radius: 16px"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React 18"/>
  <img src="https://img.shields.io/badge/TypeScript-5.2-3178C6?logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss" alt="Tailwind"/>
  <img src="https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase" alt="Supabase"/>
  <img src="https://img.shields.io/badge/LGPD-Compliant-009951" alt="LGPD"/>
  <img src="https://img.shields.io/badge/AES--GCM-256bit-red" alt="AES-GCM"/>
</p>

---

## 📌 Sobre o Projeto

O **Centro Médico Dr. Diogo Gonzaga** é uma plataforma completa de gestão clínica com foco em:

- 🔐 **Segurança máxima**: Prontuários criptografados ponta a ponta com AES-GCM-256
- ⚖️ **Conformidade LGPD**: Todas as operações auditadas com base legal mapeada
- 🔑 **Autenticação 2FA**: Médicos precisam de dois fatores para acessar dados sensíveis
- 📋 **Gestão completa**: Agenda, prontuários, documentos clínicos, caixa e exames
- 👥 **Controle de acesso granular**: Permissões individuais por módulo

---

## 🚀 Quick Start

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env   # edite com suas credenciais Supabase

# Iniciar em modo desenvolvimento
npm run dev
```

Acesse: **http://localhost:5173**

---

## 🔑 Credenciais de Acesso (Demo)

| Usuário | E-mail | Senha | Perfil |
|---------|--------|-------|--------|
| Dr. Roberto Vasconcellos | roberto.vasconcellos@drDiogogonzaga.com.br | 123456 | Médico (Cardiologia) |
| Dra. Amanda Guimarães | amanda.guimaraes@drDiogogonzaga.com.br | 123456 | Médico (Pediatria) |
| Paula Souza | paula.souza@drdiogogonzaga.com.br | 123456 | Recepcionista |
| Dr. Diogo Gonzaga | diogo.gonzaga@drdiogogonzaga.com.br | 123456 | Admin |

> Para acessar prontuários como médico, valide o token 2FA na aba **"Acesso Médico (2FA)"**

---

## 🛡️ Pilares de Segurança

### 1. Criptografia E2EE
```
Algoritmo:  AES-GCM 256-bit
KDF:        PBKDF2 (100.000 iterações, SHA-256)
IV:         96-bit (único por operação, CSPRNG)
Salt:       128-bit (único por paciente, CSPRNG)
Provider:   Web Crypto API (nativa do navegador)
```

### 2. Autenticação de 2 Fatores
- Obrigatório para médicos acessarem prontuários
- Token TOTP por sessão
- Secret gerado via CSPRNG com prefixo clínico

### 3. Audit Log Imutável
- Todas as operações sensíveis registradas
- Hash SHA-256 de integridade por entrada
- Base legal LGPD mapeada em cada ação
- IP e dispositivo registrados

### 4. Controle de Acesso (RBAC)
- 6 papéis: admin, doctor, receptionist, nurse, finance, patient
- 6 permissões configuráveis individualmente por usuário
- Verificação dupla: papel + 2FA para prontuários

---

## 📦 Stack Tecnológico

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| React | 18.x | UI & State Management |
| TypeScript | 5.x | Tipagem estática |
| Vite | 5.x | Build & Dev Server |
| Tailwind CSS | 3.x | Estilização |
| Supabase | 2.x | Backend & Database |
| Web Crypto API | nativa | Criptografia |
| Lucide React | 0.395 | Ícones |

---

## 📂 Módulos do Sistema

| Módulo | Acesso | Descrição |
|--------|--------|-----------|
| 📅 Agenda de Consultas | Todos | Agendamento e gestão de consultas |
| 🔒 Prontuários E2EE | Médico + 2FA | Prontuários criptografados ponta a ponta |
| 📄 Documentos & Receituários | Médico + 2FA | Emissão de receitas e atestados |
| 👨‍⚕️ Especialistas & Procedimentos | Todos | Histórico de procedimentos |
| 🧪 Exames | Todos | Catálogo e vinculação de exames |
| 💰 Controle de Caixa | Recepção/Admin | Movimentação financeira |
| ⚖️ Painel LGPD & Logs | Admin/Médico | Auditoria e conformidade |
| 🛡️ Controle de Acesso | Admin | Gerenciamento de permissões |

---

## 📚 Documentação

| Documento | Localização | Conteúdo |
|-----------|------------|---------|
| 📋 README Técnico Completo | [docs/README_TECNICO.md](docs/README_TECNICO.md) | Documentação técnica detalhada |
| 🏗️ Arquitetura | [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Diagramas e decisões arquiteturais |
| 🗄️ Banco de Dados | [docs/BANCO_DE_DADOS.md](docs/BANCO_DE_DADOS.md) | Schemas, ER e SQL de criação |
| 🔒 Segurança | [docs/SEGURANCA.md](docs/SEGURANCA.md) | Criptografia, 2FA e auditoria |
| ⚖️ Conformidade LGPD | [docs/LGPD_CONFORMIDADE.md](docs/LGPD_CONFORMIDADE.md) | Bases legais e direitos dos titulares |
| 🚀 Deploy | [docs/DEPLOY.md](docs/DEPLOY.md) | Configuração e guia de deploy |
| 📋 Changelog | [CHANGELOG.md](CHANGELOG.md) | Histórico de versões |
| 🤝 Contribuição | [CONTRIBUTING.md](CONTRIBUTING.md) | Guia para desenvolvedores |

---

## ⚠️ Avisos para Produção

> Antes do deploy em ambiente real:
> 1. **Trocar todas as senhas** dos usuários de demonstração
> 2. **Implementar bcrypt** para hash de senhas
> 3. **Configurar RLS** no Supabase para cada tabela
> 4. **Criptografar secrets 2FA** no banco de dados
> 5. **Designar DPO** conforme Art. 41 da LGPD
> 6. **Elaborar DPIA** conforme Art. 38 da LGPD

---

## 📜 Licença

```
Apache License 2.0 — SPDX-License-Identifier: Apache-2.0
```

---

<p align="center">
  Desenvolvido por <strong>SidneyMaximo</strong> • 2026<br/>
  Sistema em conformidade com <strong>LGPD (Lei nº 13.709/2018)</strong><br/>
  e <strong>CFM Resolução nº 2.299/2021</strong>
</p>
