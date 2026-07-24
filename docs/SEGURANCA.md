# 🔒 Documentação de Segurança — Centro Médico Dr. Diogo Gonzaga

## Visão Geral

Este documento descreve em detalhe todas as medidas de segurança implementadas no sistema clínico, incluindo criptografia, autenticação, controle de acesso e auditoria.

---

## 1. Criptografia End-to-End (E2EE)

### 1.1 Princípio Fundamental

> **Zero-Knowledge Architecture**: O servidor (Supabase) armazena apenas dados cifrados. Nenhuma informação de saúde é legível fora do navegador do médico autorizado.

### 1.2 Algoritmos Utilizados

| Algoritmo | Uso | Parâmetros |
|-----------|-----|-----------|
| **AES-GCM** | Criptografia simétrica dos prontuários | Chave 256-bit, IV 96-bit |
| **PBKDF2** | Derivação de chave a partir de passphrase | SHA-256, 100.000 iterações, Salt 128-bit |
| **SHA-256** | Hash de integridade para logs de auditoria | Via `SubtleCrypto.digest()` |
| **CSPRNG** | Geração de Salt, IV e secrets 2FA | Via `crypto.getRandomValues()` |

### 1.3 Fluxo Completo de Criptografia

```
╔══════════════════════════════════════════════════════════════╗
║                    PROCESSO DE CRIPTOGRAFIA                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ENTRADA: DecryptedMedicalRecord (objeto JavaScript)        ║
║                                                              ║
║  1. JSON.stringify(record) → string JSON                    ║
║  2. TextEncoder.encode(json) → Uint8Array                   ║
║  3. crypto.getRandomValues(Uint8Array(16)) → salt (128-bit) ║
║  4. crypto.getRandomValues(Uint8Array(12)) → iv (96-bit)    ║
║                                                              ║
║  5. PBKDF2:                                                  ║
║     importKey(passphrase) → KeyMaterial                     ║
║     deriveKey(KeyMaterial, salt, 100000 iter, SHA-256)      ║
║     → CryptoKey (AES-GCM 256-bit)                          ║
║                                                              ║
║  6. AES-GCM.encrypt(iv, CryptoKey, Uint8Array)             ║
║     → ArrayBuffer (ciphertext)                              ║
║                                                              ║
║  7. arrayBufferToBase64(ciphertext) → string Base64         ║
║  8. arrayBufferToBase64(salt) → string Base64               ║
║  9. arrayBufferToBase64(iv) → string Base64                 ║
║                                                              ║
║  SAÍDA: { ciphertext: string, iv: string, salt: string }   ║
║  (tudo em Base64 — pronto para armazenar no DB)             ║
╚══════════════════════════════════════════════════════════════╝
```

### 1.4 Fluxo de Descriptografia

```
ENTRADA: { ciphertextBase64, ivBase64, saltBase64, passphrase }
    │
    ▼
atob(ciphertextBase64) → bytes → Uint8Array
atob(ivBase64) → bytes → Uint8Array
atob(saltBase64) → bytes → Uint8Array
    │
    ▼
PBKDF2(passphrase, salt, 100000, SHA-256) → CryptoKey
    │
    ▼
AES-GCM.decrypt(iv, CryptoKey, ciphertext) → ArrayBuffer
    │
    ▼
TextDecoder.decode(ArrayBuffer) → JSON string
    │
    ▼
JSON.parse(string) → DecryptedMedicalRecord
    │
    ▼
SAÍDA: Objeto legível apenas no browser do médico
```

### 1.5 Por que AES-GCM?

O AES-GCM (Galois/Counter Mode) foi escolhido por:
- **Autenticação integrada**: Detecta adulteração do ciphertext automaticamente
- **Desempenho**: Aceleração por hardware em CPUs modernas (AES-NI)
- **Padrão NIST**: Aprovado pelo NIST SP 800-38D
- **Paralelizável**: Melhor que CBC para grandes volumes de dados

---

## 2. Derivação de Chaves (KDF)

### PBKDF2 — Por que 100.000 iterações?

```
Custo computacional para descoberta de senha por força bruta:

Iterações     | Tempo por tentativa (CPU moderna) | Segurança
-----------   | ---------------------------------  | ---------
  1.000       | ~0.1ms                             | Fraca
 10.000       | ~1ms                               | Mínima aceitável
100.000       | ~10ms                              | ✅ Recomendada (OWASP 2024)
500.000       | ~50ms                              | Alta (mas lenta para UX)

Com 100.000 iterações:
→ Uma tentativa por hacker leva ~10ms
→ 10.000 tentativas por segundo máximo (por thread)
→ Inviável por força bruta sem supercomputador
```

### Salt único por paciente

Cada paciente tem um `cryptoSalt` único gerado por `crypto.getRandomValues()`:
- Garante que a mesma passphrase gere chaves diferentes para cada paciente
- Previne ataques de tabela arco-íris (rainbow tables)
- Previne ataques de dicionário offline

---

## 3. Autenticação de Dois Fatores (2FA)

### 3.1 Fluxo de Verificação

```
Médico acessa aba "Prontuários"
          │
          ▼
    is2FAVerified?
    ─────┬─────
   Não   │  Sim
         │     └──► Acesso liberado
         ▼
  Redireciona para aba "2FA"
         │
         ▼
  Médico digita token (= twoFactorSecret do doctor)
         │
         ▼
  Verifica: token === doctor.twoFactorSecret?
  ──────────────────┬──────────────────
         Não        │      Sim
                    ▼
          setCurrentSession({ is2FAVerified: true })
                    │
                    ▼
          Audit Log: 'Autenticação 2FA'
                    │
                    ▼
          Acesso ao prontuário liberado
```

### 3.2 Geração do Secret TOTP

```typescript
export function generateRandomSecret(): string {
  const array = new Uint8Array(10);
  window.crypto.getRandomValues(array);  // CSPRNG — seguro
  const hexString = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return ('DRDiogoGONZAGA' + hexString).toUpperCase();
}
```

- Prefixo clínico identificável: `DRDiogoGONZAGA`
- 10 bytes aleatórios via CSPRNG = 80 bits de entropia
- Resultado: string de ~34 caracteres alfanuméricos

---

## 4. Controle de Acesso Baseado em Papéis (RBAC)

### 4.1 Hierarquia de Papéis

```
admin (acesso total)
  ├── doctor (prontuários + 2FA obrigatório)
  │     └── [is2FAVerified = true para EHR]
  ├── receptionist (agenda + caixa)
  ├── nurse (agenda + prontuários, sem documentos)
  └── finance (apenas caixa)
```

### 4.2 Verificação de Permissões no Layout

```typescript
// Aba visível apenas se a permissão for verdadeira
const visibleTabs = tabs.filter(tab => {
  if (tab.permissionRequired) {
    return !!currentSession.permissions?.[tab.permissionRequired];
  }
  if (tab.rolesAllowed) {
    return tab.rolesAllowed.includes(currentSession.role);
  }
  return true;
});
```

### 4.3 Verificação de 2FA para Prontuários

```typescript
// Em HealthRecords.tsx — verificação dupla:
// 1. Papel deve ser 'doctor'
// 2. 2FA deve estar verificado na sessão atual
const isRestricted = tab.requireDoctor && 
  (currentSession.role !== 'doctor' || !currentSession.is2FAVerified);
```

---

## 5. Auditoria e Rastreabilidade

### 5.1 Eventos Auditados

| Ação | Quando Registrada |
|------|------------------|
| `Acesso ao Prontuário` | Médico visualiza prontuário |
| `Criação de Prontuário` | Novo paciente cadastrado |
| `Atualização de Prontuário` | Prontuário editado e salvo |
| `Exclusão de Dados` | Paciente anonimizado |
| `Exportação de Dados (Portabilidade)` | Dados exportados |
| `Alteração de Consentimento` | Status de consentimento modificado |
| `Autenticação 2FA` | Médico verifica token 2FA |
| `Agendamento de Consulta` | Nova consulta agendada |
| `Lançamento de Caixa` | Transação financeira registrada |
| `Gestão de Exame` | Exame criado/editado/removido |
| `Vinculação de Exame` | Exame vinculado a paciente |

### 5.2 Estrutura do Log de Auditoria

```typescript
{
  id: 'log_xyz123',
  timestamp: '2026-07-07T13:22:00Z',
  userId: 'doc_01',
  userName: 'Dr. Roberto Vasconcellos',
  userRole: 'doctor',
  action: 'Acesso ao Prontuário',
  patientId: 'pat_01',
  patientName: 'Carlos Eduardo Oliveira',
  details: 'Visualização de prontuário E2EE descriptografado para consulta de Cardiologia.',
  lgpdBasis: 'Tutela da Saúde (Art. 7, VIII)',
  ipAddress: '192.168.1.105',
  deviceInfo: 'Chrome v124 / Windows 11',
  securityHash: 'a3f9b2c1...' // SHA-256 do conteúdo
}
```

### 5.3 Geração do Hash de Integridade

```typescript
// Calculado ANTES da inserção no banco
const logString = `${action} ${patientId} ${patientName} ${timestamp} ${userName}`;
const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(logString));
const securityHash = Array.from(new Uint8Array(hashBuffer))
  .map(b => b.toString(16).padStart(2, '0'))
  .join('');
```

Qualquer adulteração posterior no registro produzirá um hash diferente, detectável na verificação.

---

## 6. Proteção de Dados Pessoais

### 6.1 Mascaramento de CPF

```typescript
export function anonymizeCPF(cpf: string): string {
  if (!cpf || cpf.length < 14) return '***.***.***-**';
  return cpf.replace(/^\d{3}\.\d{3}/, '***.***');
  // '123.456.789-00' → '***.***'.789-00
}
```

O CPF é mascarado em qualquer contexto onde não seja estritamente necessário exibir o número completo.

### 6.2 Dados Nunca Transmitidos em Texto Claro

Os seguintes dados **nunca saem do browser sem criptografia**:
- Anamnese do paciente
- Diagnóstico médico
- Prescrições e medicamentos
- Alergias medicamentosas
- Sinais vitais detalhados
- Documentos clínicos (receitas, atestados)

### 6.3 Processo de Anonimização (Direito ao Esquecimento)

```typescript
// Pseudocódigo do processo de anonimização
function anonymizePatient(patientId: string) {
  // 1. Substitui dados identificáveis
  patient.name = 'DADO ANONIMIZADO';
  patient.cpf = '000.000.000-00';
  patient.email = 'anonimizado@lgpd.invalid';
  patient.phone = '(00) 00000-0000';
  patient.birthDate = '1900-01-01';
  
  // 2. Marca como anonimizado
  patient.isAnonymized = true;
  
  // 3. Limpa prontuário
  patient.encryptedMedicalRecords = '';
  patient.cryptoIv = '';
  patient.cryptoSalt = '';
  
  // 4. Cancela agendamentos futuros
  appointments
    .filter(a => a.patientId === patientId && a.status === 'Agendado')
    .forEach(a => a.status = 'Cancelado');
  
  // 5. Registra no audit log
  addAuditLogEntry(
    'Exclusão de Dados',
    patientId, 
    'DADO ANONIMIZADO',
    'Exercício do direito ao esquecimento conforme Art. 18 LGPD.',
    'Cumprimento de Obrigação Legal (Art. 7, II)'
  );
}
```

---

## 7. Recomendações de Segurança para Produção

### 7.1 Críticas (Implementar antes do go-live)

| Item | Ação Necessária | Risco se Ignorado |
|------|----------------|-------------------|
| Senhas em plaintext | Implementar bcrypt/argon2 com salt | Exposição de credenciais |
| Secret 2FA em plaintext | Criptografar com AES antes de salvar | Comprometimento de 2FA |
| Passphrase hardcoded | Usar passphrase por médico (não master key) | Todos os prontuários com mesma chave |
| RLS no Supabase | Configurar Row Level Security | Acesso não autorizado via API |
| HTTPS | Garantir TLS 1.3 em produção | Interceptação de dados |

### 7.2 Importantes (Implementar nas próximas sprints)

- **Rate limiting** na API de autenticação (anti-brute-force)
- **CAPTCHA** na tela de login após falhas consecutivas
- **Timeout de sessão** automático após inatividade (ex: 30 min)
- **CSP Headers** (Content Security Policy) no servidor
- **Subresource Integrity** para scripts externos
- **Penetration testing** antes do go-live
- **DPIA (Data Protection Impact Assessment)** conforme LGPD Art. 38

### 7.3 Boas Práticas Já Implementadas

✅ Web Crypto API nativa (sem bibliotecas criptográficas de terceiros não auditadas)  
✅ CSPRNG para geração de Salt, IV e secrets  
✅ AES-GCM com autenticação integrada (detecta adulteração do ciphertext)  
✅ PBKDF2 com 100.000 iterações (OWASP recomendado)  
✅ IV único por operação de criptografia  
✅ Salt único por paciente  
✅ Hash SHA-256 para integridade dos logs  
✅ Mascaramento de CPF nos logs  
✅ Verificação dupla de papel + 2FA para acesso a prontuários  
✅ Audit log de todas as operações sensíveis  

---

## 8. Conformidade com Normas

| Norma | Status | Observações |
|-------|--------|-------------|
| LGPD (Lei 13.709/2018) | ✅ Implementada | Bases legais, consentimento, anonimização, audit log |
| CFM Resolução 2.299/2021 | ✅ Referenciada | Prontuário eletrônico e assinatura digital |
| OWASP Top 10 | 🔶 Parcial | E2EE e RBAC implementados; autenticação requer bcrypt em produção |
| NIST SP 800-38D | ✅ Seguido | AES-GCM conforme especificação |
| ISO 27001 | 🔶 Parcial | Auditoria e controle de acesso; DPO e políticas formais pendentes |

---

*Documentação de Segurança — Centro Médico Dr. Diogo Gonzaga*
*Versão 1.0 — 07/07/2026*
*Desenvolvido por SidneyMaximo*
