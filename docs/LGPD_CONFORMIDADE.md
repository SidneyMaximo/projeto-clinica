# ⚖️ Conformidade LGPD — Centro Médico Dr. Diogo Gonzaga

## Introdução

A **Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709, de 14 de agosto de 2018)** regulamenta o tratamento de dados pessoais no Brasil, com atenção especial aos dados sensíveis de saúde (Art. 11).

Este documento descreve como o sistema implementa tecnicamente cada requisito da LGPD.

---

## 1. Bases Legais para Tratamento de Dados (Art. 7)

O sistema mapeia explicitamente a base legal de **cada operação** nos logs de auditoria:

| Base Legal | Artigo | Uso no Sistema |
|-----------|--------|---------------|
| Consentimento | Art. 7, I | Cadastro de paciente, agendamento de consulta |
| Tutela da Saúde | Art. 7, VIII | Acesso e edição de prontuário médico |
| Cumprimento de Obrigação Legal | Art. 7, II | Emissão de documentos obrigatórios, anonimização |
| Legítimo Interesse | Art. 7, IX | Comunicações administrativas com paciente |
| Execução de Contrato | Art. 7, V | Registro de pagamentos e controle de caixa |

### Dados Sensíveis de Saúde (Art. 11)

Prontuários médicos são classificados como **dados sensíveis** (Art. 5, II) e recebem tratamento especial:
- Bases legais aplicáveis: Art. 11, II, "a" (consentimento explícito) e Art. 11, II, "f" (tutela da saúde)
- Criptografados ponta a ponta — **nenhum dado de saúde é legível no servidor**
- Acesso restrito a médicos com 2FA verificado

---

## 2. Princípios LGPD Implementados (Art. 6)

| Princípio | Como é Implementado |
|-----------|---------------------|
| **Finalidade** | Propósito registrado no campo `consentPurpose` de cada paciente |
| **Adequação** | Dados coletados apenas para fins clínicos declarados |
| **Necessidade** | Acesso por módulo controlado por permissões granulares |
| **Livre Acesso** | Visualização dos dados pelo titular (via médico responsável) |
| **Qualidade** | Módulo de prontuário permite atualização de dados |
| **Transparência** | Base legal visível em cada log de auditoria |
| **Segurança** | E2EE com AES-GCM-256 + PBKDF2 + 2FA |
| **Prevenção** | Controle de acesso por papel e permissões individuais |
| **Não Discriminação** | Não há uso de dados para finalidades discriminatórias |
| **Responsabilização** | Audit log imutável com hash SHA-256 de integridade |

---

## 3. Direitos do Titular (Art. 18)

| Direito | Artigo | Implementação Técnica |
|---------|--------|----------------------|
| **Confirmação de existência** | Art. 18, I | Consulta à lista de pacientes |
| **Acesso aos dados** | Art. 18, II | Visualização do prontuário descriptografado |
| **Correção** | Art. 18, III | Edição de dados demográficos e clínicos |
| **Anonimização/Exclusão** | Art. 18, IV | Botão de anonimização no painel LGPD |
| **Portabilidade** | Art. 18, V | Log de exportação auditado |
| **Revogação de consentimento** | Art. 18, IX | Alteração do campo `consentGiven` |
| **Informação sobre compartilhamento** | Art. 18, VII | Registros de acesso no audit log |

---

## 4. Consentimento (Art. 7, I e Art. 8)

### Campos de Consentimento no Banco de Dados

```typescript
interface Patient {
  consentGiven: boolean;       // Foi obtido consentimento?
  consentDate: string | null;  // Data e hora do consentimento (ISO 8601)
  consentVersion: string;      // Versão da política de privacidade aceita
  consentPurpose: string;      // Finalidade declarada ao titular
  isAnonymized: boolean;       // Paciente exerceu direito ao esquecimento
}
```

### Exemplo de Registro de Consentimento

```json
{
  "consentGiven": true,
  "consentDate": "2026-03-10T14:30:00Z",
  "consentVersion": "v1.2 (2026)",
  "consentPurpose": "Processamento de prontuário e dados sensíveis de saúde para fins terapêuticos (LGPD Art. 7, I e Art. 11, II, \"a\")."
}
```

### Requisitos do Consentimento (Art. 8) Atendidos

| Requisito | Status |
|-----------|--------|
| Fornecido por escrito ou outro meio que demonstre manifestação | ✅ Campo `consentGiven` com data |
| Finalidade específica | ✅ Campo `consentPurpose` |
| Revogável a qualquer momento | ✅ Campo `consentGiven` editável |
| Versionado | ✅ Campo `consentVersion` |
| Não condicionado a serviço essencial | ✅ Estrutura do sistema permite recusa |

---

## 5. Registro de Operações de Tratamento (Art. 37)

O sistema mantém um **registro imutável** de todas as operações de tratamento via `audit_logs`:

### Campos do Audit Log

| Campo | Propósito LGPD |
|-------|---------------|
| `timestamp` | Data/hora da operação |
| `userId` | Identificação do operador/controlador |
| `userRole` | Papel dentro da organização |
| `action` | Tipo de operação realizada |
| `patientId` | Titular dos dados afetado |
| `lgpdBasis` | Base legal aplicável (Art. 7/11) |
| `ipAddress` | Rastreabilidade do acesso |
| `deviceInfo` | Informações do dispositivo |
| `securityHash` | SHA-256 para detecção de adulteração |

### Operações Registradas com Base Legal

```
Criação de Prontuário      → Consentimento (Art. 7, I)
Acesso ao Prontuário       → Tutela da Saúde (Art. 7, VIII)
Atualização de Prontuário  → Tutela da Saúde (Art. 7, VIII)
Agendamento de Consulta    → Consentimento (Art. 7, I)
Lançamento de Caixa        → Execução de Contrato (Art. 7, V)
Gestão de Exame            → Tutela da Saúde (Art. 7, VIII)
Autenticação 2FA           → Cumprimento de Obrigação Legal (Art. 7, II)
Exclusão de Dados          → Cumprimento de Obrigação Legal (Art. 7, II)
```

---

## 6. Anonimização e Direito ao Esquecimento (Art. 18, IV)

### Processo de Anonimização

Quando o titular exercer o direito ao esquecimento, o sistema executa:

```
PASSO 1: Substituição de Dados Identificáveis
  • nome         → "DADO ANONIMIZADO"
  • cpf          → "000.000.000-00"
  • email        → "anonimizado@lgpd.invalid"
  • phone        → "(00) 00000-0000"
  • birthDate    → "1900-01-01"

PASSO 2: Marcação
  • isAnonymized → true

PASSO 3: Limpeza do Prontuário Criptografado
  • encryptedMedicalRecords → ""
  • cryptoIv                → ""
  • cryptoSalt              → ""

PASSO 4: Cancelamento de Agendamentos Futuros
  • Todos os appointments com status 'Agendado' → 'Cancelado'

PASSO 5: Registro no Audit Log
  • action: "Exclusão de Dados"
  • lgpdBasis: "Cumprimento de Obrigação Legal (Art. 7, II)"
  • details: "Exercício do direito ao esquecimento conforme Art. 18 LGPD."
```

> ⚠️ **Nota técnica**: Os logs históricos de auditoria são mantidos por obrigação legal (Art. 7, II — Cumprimento de Obrigação Legal), com os dados do paciente substituídos por "DADO ANONIMIZADO". Isso está em conformidade com o Art. 16, I da LGPD.

---

## 7. Segurança dos Dados (Art. 46)

O Art. 46 da LGPD exige que os agentes de tratamento adotem medidas de segurança técnicas e administrativas. O sistema implementa:

### Medidas Técnicas

| Medida | Implementação |
|--------|--------------|
| Criptografia em trânsito | HTTPS/TLS (padrão do Supabase) |
| Criptografia em repouso | AES-GCM-256 ponta a ponta |
| Controle de acesso | RBAC + 2FA para dados sensíveis |
| Auditoria | Logs imutáveis com hash SHA-256 |
| Minimização de dados | Prontuário acessível apenas por médico com 2FA |
| Segregação de dados | Recepcionista não acessa prontuários clínicos |

### Medidas Administrativas

| Medida | Status |
|--------|--------|
| Política de privacidade versionada | ✅ Campo `consentVersion` |
| Treinamento de usuários | 🔶 Recomendado implementar externamente |
| DPO (Encarregado de Dados) | 🔶 Designar conforme Art. 41 LGPD |
| DPIA (Avaliação de Impacto) | 🔶 Elaborar conforme Art. 38 LGPD |

---

## 8. Incidentes de Segurança (Art. 48)

O Art. 48 exige comunicação à ANPD em caso de incidentes de segurança. O sistema suporta esse processo através dos audit logs, que permitem identificar:

- **Quem** acessou dados comprometidos
- **Quando** o acesso ocorreu
- **Quais** registros foram afetados
- **De onde** o acesso foi realizado (IP + dispositivo)

**Prazo legal**: Comunicação em até 72 horas após ciência do incidente.

---

## 9. Transferência Internacional de Dados (Art. 33)

O Supabase pode hospedar dados em servidores fora do Brasil. Para garantir conformidade:

- Verificar a região do servidor Supabase (preferir `sa-east-1` — São Paulo)
- O Supabase está em conformidade com GDPR, que é compatível com os padrões LGPD
- Os dados de saúde, por serem criptografados E2EE, mesmo transferidos, são ilegíveis sem a chave

---

## 10. Checklist de Conformidade LGPD

### ✅ Implementado

- [x] Registro de consentimento com data, versão e finalidade
- [x] Base legal mapeada em cada operação de tratamento
- [x] Audit log imutável com SHA-256 de integridade
- [x] Criptografia E2EE para dados de saúde (Art. 46)
- [x] Controle de acesso por papel (princípio da necessidade)
- [x] 2FA obrigatório para acesso a prontuários
- [x] Anonimização com direito ao esquecimento (Art. 18)
- [x] Mascaramento de CPF nos logs
- [x] IP e dispositivo registrados em cada acesso

### 🔶 Pendente / Recomendado para Produção

- [ ] Designar DPO (Encarregado de Dados) — Art. 41
- [ ] Elaborar DPIA formal — Art. 38
- [ ] Criar Política de Privacidade pública
- [ ] Implementar canal de atendimento para titular (Art. 18)
- [ ] Relatório de inventário de dados (ROPA)
- [ ] Contratos com operadores de dados (Supabase/outros fornecedores)
- [ ] Plano de resposta a incidentes — Art. 48
- [ ] Auditorias periódicas de conformidade

---

## 11. Referências Legais

| Documento | Relevância |
|-----------|-----------|
| Lei nº 13.709/2018 (LGPD) | Lei principal |
| ANPD — Resolução CD/ANPD nº 2/2022 | Comunicação de incidentes |
| CFM Resolução nº 2.299/2021 | Prontuário eletrônico médico |
| CFM Resolução nº 1.821/2007 | Digitalização de documentos médicos |
| NIST SP 800-38D | AES-GCM — padrão criptográfico |
| OWASP ASVS v4.0 | Boas práticas de segurança de aplicação |

---

*Documento de Conformidade LGPD — Centro Médico Dr. Diogo Gonzaga*
*Versão 1.0 — 07/07/2026*
*Elaborado por SidneyMaximo*
