# 🔧 Troubleshooting — Guia de Resolução de Problemas
## Centro Médico Dr. Diogo Gonzaga

> Este documento registra erros conhecidos, suas causas e as soluções aplicadas.
> Sempre que um bug for identificado e corrigido, adicione uma entrada aqui.

---

## Índice

1. [Integração DB Diagnósticos — LabIntegration](#1-integração-db-diagnósticos--labintegration)
2. [Ambiente de Desenvolvimento](#2-ambiente-de-desenvolvimento)
3. [Supabase e Banco de Dados](#3-supabase-e-banco-de-dados)

---

## 1. Integração DB Diagnósticos — LabIntegration

---

### 🐛 BUG-001 — Protocolo DB e Código de Barras exibindo "N/A" após envio de pedido

**Data:** 2026-07-28
**Arquivo afetado:** `src/components/LabIntegration.tsx`
**Função:** `handleEnviarPedido`
**Status:** ✅ Corrigido

#### Sintoma
Após enviar um pedido de exame com sucesso, a tela exibia:
```
Pedido enviado! Protocolo DB: N/A • Cód. Barras: N/A
```
Mas no Console do DevTools (F12) o dado correto aparecia.

#### Causa Raiz — Problema 1: Extração por caminho fixo frágil
O código tentava acessar o `NumeroAtendimentoDB` por caminhos **fixos e longos**, como:
```typescript
// ❌ FRÁGIL — qualquer variação na estrutura SOAP quebra tudo
const protocoloLimpo =
  data?.RecebeAtendimentoResult?.StatusLote?.ct_StatusLote_v2?.[0]
      ?.Pedidos?.ct_StatusLotePedido_v2?.[0]?.NumeroAtendimentoDB || 'N/A';
```
A biblioteca `node-soap` pode empacotar a resposta em níveis diferentes dependendo da versão do WSDL, autenticação e configuração do servidor. Se o caminho não bater exatamente, retorna `undefined` e cai no `'N/A'`.

#### Causa Raiz — Problema 2: Build antigo sendo servido
O console do navegador exibia o arquivo `index-DYYNwfrs.js` (build de produção da pasta `dist/`), não o código-fonte atualizado. Isso significa que alterações no código-fonte **não eram refletidas** na tela porque o servidor de desenvolvimento não estava sendo usado.

#### Solução Aplicada

**1. Função de busca recursiva** — percorre TODO o objeto de resposta, independente do nível de aninhamento:

```typescript
// ✅ ROBUSTO — encontra a chave em qualquer nível da resposta
const buscaRecursiva = (obj: any, chave: string): any => {
  if (obj === null || obj === undefined) return undefined;
  if (typeof obj !== 'object') return undefined;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = buscaRecursiva(item, chave);
      if (found !== undefined && found !== null && found !== '') return found;
    }
    return undefined;
  }
  for (const k of Object.keys(obj)) {
    if (k === chave && obj[k] !== null && obj[k] !== undefined && obj[k] !== '') return obj[k];
    const found = buscaRecursiva(obj[k], chave);
    if (found !== undefined && found !== null && found !== '') return found;
  }
  return undefined;
};

// Uso:
const protocoloLimpo = buscaRecursiva(data, 'NumeroAtendimentoDB') || 'N/A';
const codigoBarras   = buscaRecursiva(data, 'NumeroAmostra')       || 'N/A';
```

**2. Usar sempre o servidor de desenvolvimento** — ver seção 2.

#### Estrutura real da resposta da API DB Diagnósticos
Confirmada em 2026-07-28 via console.log:
```json
{
  "RecebeAtendimentoResult": {
    "StatusLote": {
      "ct_StatusLote_v2": [{
        "NumeroLote": "...",
        "Pedidos": {
          "ct_StatusLotePedido_v2": [{
            "NomePaciente": "...",
            "NumeroAtendimentoDB": "5055841777",
            "NumeroAtendimentoApoiado": "..."
          }]
        }
      }]
    },
    "Confirmacao": {
      "ConfirmacaoPedidov2": {
        "ct_ConfirmacaoPedidoEtiqueta_v2": [{
          "NumeroAtendimentoDB": "5055841777",
          "Status": "Processado",
          "Amostras": {
            "ct_AmostraEtiqueta_v2": [{
              "NumeroAmostra": "505584177701",
              "Exames": "AFOLI",
              "MeioColeta": "TBAMAR",
              "EtiquetaAmostra": "ZB\r\nR1,0\r\n..."
            }]
          }
        }]
      }
    }
  }
}
```

#### Como diagnosticar no futuro
Abra o DevTools (F12 → Console) e procure por:
```
=== RESPOSTA BRUTA DO SERVIDOR (rawText) ===
=== RESPOSTA API (data completo) ===
✅ protocoloLimpo (busca recursiva): [valor]
✅ codigoBarras   (busca recursiva): [valor]
```
Se os logs mostrarem valores corretos mas a tela mostrar N/A → **você está rodando o build antigo** (veja seção 2).

---

## 2. Ambiente de Desenvolvimento

---

### 🐛 BUG-002 — Tela não reflete alterações no código-fonte

**Data:** 2026-07-28
**Status:** ✅ Documentado (não é bug de código, é erro de processo)

#### Sintoma
Você altera o código-fonte (.tsx, .ts), salva, mas a tela continua igual ao comportamento anterior.

#### Causa
O navegador está carregando um **arquivo compilado antigo** da pasta `dist/` (ex.: `index-DYYNwfrs.js`), e não o servidor de desenvolvimento com hot-reload.

#### Como identificar
No Console do DevTools, o nome do arquivo JS começa com `index-` seguido de um hash:
```
index-DYYNwfrs.js:523  ← build antigo! não é o dev server
```
No servidor de desenvolvimento, os arquivos têm o caminho original:
```
LabIntegration.tsx:178  ← dev server correto!
```

#### Solução — Rodar o ambiente de desenvolvimento correto

O projeto usa **dois servidores simultâneos**:

| Servidor | Porta | Comando | Função |
|----------|-------|---------|--------|
| Vercel Dev | 3000 | `vercel dev` | Backend — APIs (/api/db/*) |
| Vite Dev | 5173 | `npm run dev` | Frontend — React com hot-reload |

**Passo a passo:**

Terminal 1 (Backend):
```bash
vercel dev
```

Terminal 2 (Frontend):
```bash
npm run dev
```

**Acesse sempre:** http://localhost:5173/

> ⚠️ NUNCA abra arquivos da pasta `dist/` diretamente no navegador durante o desenvolvimento.
> A pasta `dist/` é apenas para deploy de produção.

#### Proxy configurado no Vite
O arquivo `vite.config.ts` já redireciona automaticamente:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',  // Vercel Dev
      changeOrigin: true,
    },
  },
},
```
Então ao acessar http://localhost:5173/, chamadas para `/api/db/recebe-atendimento` são automaticamente encaminhadas para o Vercel Dev na porta 3000.

---

## 3. Supabase e Banco de Dados

> *(Adicionar entradas aqui conforme novos bugs forem encontrados e corrigidos)*

---

## 📝 Como adicionar uma nova entrada

Copie o template abaixo e preencha:

```markdown
### 🐛 BUG-XXX — [Título curto do problema]

**Data:** YYYY-MM-DD
**Arquivo afetado:** `caminho/do/arquivo.tsx`
**Função:** `nomeDaFunção`
**Status:** 🔴 Aberto | 🟡 Em investigação | ✅ Corrigido

#### Sintoma
[Descreva o que o usuário vê de errado]

#### Causa Raiz
[Explique tecnicamente por que acontece]

#### Solução Aplicada
[Mostre o código da correção com comentários]

#### Como diagnosticar no futuro
[Dê dicas para identificar este bug rapidamente]
```

---

*Última atualização: 28/07/2026 | Desenvolvido por SidneyMaximo*
