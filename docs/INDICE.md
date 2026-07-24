# 📚 Índice da Documentação Técnica
## Centro Médico Dr. Diogo Gonzaga

> Sistema Clínico Seguro | Conformidade LGPD | Criptografia E2EE

---

## Documentos Disponíveis

| # | Documento | Arquivo | Descrição |
|---|-----------|---------|-----------|
| 1 | **README Principal** | [`../README.md`](../README.md) | Visão geral, quick start e badges |
| 2 | **Documentação Técnica Completa** | [`README_TECNICO.md`](README_TECNICO.md) | Arquitetura, componentes, tipos e guias |
| 3 | **Arquitetura do Sistema** | [`ARQUITETURA.md`](ARQUITETURA.md) | Diagramas de camadas, fluxo E2EE, componentes |
| 4 | **Banco de Dados** | [`BANCO_DE_DADOS.md`](BANCO_DE_DADOS.md) | ER, schemas SQL, seed data, mapeamento de campos |
| 5 | **Segurança e Criptografia** | [`SEGURANCA.md`](SEGURANCA.md) | AES-GCM, PBKDF2, 2FA, auditoria, recomendações |
| 6 | **Conformidade LGPD** | [`LGPD_CONFORMIDADE.md`](LGPD_CONFORMIDADE.md) | Bases legais, direitos dos titulares, checklist |
| 7 | **Guia de Deploy** | [`DEPLOY.md`](DEPLOY.md) | Configuração Supabase, GitHub Pages, CI/CD |
| 8 | **Changelog** | [`../CHANGELOG.md`](../CHANGELOG.md) | Histórico de versões do sistema |
| 9 | **Guia de Contribuição** | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Padrões de código, Git flow, PR guidelines |

---

## Mapa Rápido por Assunto

### Quero entender o que o sistema faz
→ Leia o [README Principal](../README.md) e depois o [README Técnico](README_TECNICO.md#1-visão-geral-do-sistema)

### Quero entender a arquitetura e os componentes
→ Leia [Arquitetura do Sistema](ARQUITETURA.md) e [README Técnico — Módulos](README_TECNICO.md#5-módulos-e-componentes)

### Quero criar as tabelas no banco de dados
→ Leia [Banco de Dados — Schemas SQL](BANCO_DE_DADOS.md#23-criar-as-tabelas-no-banco-de-dados)

### Quero entender como a criptografia funciona
→ Leia [Segurança — Criptografia E2EE](SEGURANCA.md#1-criptografia-end-to-end-e2ee)

### Quero saber como a LGPD é implementada
→ Leia [Conformidade LGPD](LGPD_CONFORMIDADE.md)

### Quero fazer o deploy do sistema
→ Leia [Guia de Deploy](DEPLOY.md)

### Quero contribuir com o código
→ Leia [Guia de Contribuição](../CONTRIBUTING.md)

### Quero ver o que mudou em cada versão
→ Leia o [Changelog](../CHANGELOG.md)

---

## Tecnologias Principais

```
React 18 + TypeScript 5 + Vite 5
Tailwind CSS 3 + Lucide React
Supabase (PostgreSQL + BaaS)
Web Crypto API (AES-GCM-256, PBKDF2, SHA-256)
```

## Conformidade

```
LGPD — Lei nº 13.709/2018
CFM Resolução nº 2.299/2021
Apache License 2.0
```

---

*Documentação gerada em 07/07/2026 | Desenvolvido por SidneyMaximo*
