# 🧠 Memória de Longo Prazo & Regras de Negócio

Este documento serve como uma memória persistente para o assistente de código, resumindo as principais decisões arquiteturais, regras de negócio e integrações do projeto "Centro Médico Dr. Diogo Gonzaga".

---

## 1. Integração DB Diagnósticos (SOAP)

- **Status:** O fluxo de homologação com o Web Service SOAP do DB Diagnósticos está **concluído e funcional**.
- **Próximo Passo:** Aguardando as credenciais e endpoints de **Produção**. Quando recebidas, as variáveis de ambiente correspondentes serão atualizadas.
- **Regra de Negócio Crítica:** A resposta real do endpoint `RecebeAtendimento` retorna dados **profundamente aninhados** dentro de `RecebeAtendimentoResult`. Estrutura confirmada via `console.log`:

  **Protocolo DB** → dois caminhos possíveis:
  ```
  data.RecebeAtendimentoResult.StatusLote.ct_StatusLote_v2[0].Pedidos.ct_StatusLotePedido_v2[0].NumeroAtendimentoDB
  data.RecebeAtendimentoResult.Confirmacao.ConfirmacaoPedidov2.ct_ConfirmacaoPedidoEtiqueta_v2[0].NumeroAtendimentoDB
  ```

  **Código de Barras** (NumeroAmostra):
  ```
  data.RecebeAtendimentoResult.Confirmacao.ConfirmacaoPedidov2.ct_ConfirmacaoPedidoEtiqueta_v2[0].Amostras.ct_AmostraEtiqueta_v2[0].NumeroAmostra
  ```

- **Implementação atual** em `LabIntegration.tsx` (com optional chaining e fallbacks):

    ```typescript
    const protocoloLimpo =
      data?.RecebeAtendimentoResult?.StatusLote?.ct_StatusLote_v2?.[0]?.Pedidos?.ct_StatusLotePedido_v2?.[0]?.NumeroAtendimentoDB ||
      data?.RecebeAtendimentoResult?.Confirmacao?.ConfirmacaoPedidov2?.ct_ConfirmacaoPedidoEtiqueta_v2?.[0]?.NumeroAtendimentoDB ||
      'N/A';

    const codigoBarras =
      data?.RecebeAtendimentoResult?.Confirmacao?.ConfirmacaoPedidov2?.ct_ConfirmacaoPedidoEtiqueta_v2?.[0]?.Amostras?.ct_AmostraEtiqueta_v2?.[0]?.NumeroAmostra ||
      'N/A';
    ```


---

## 2. Arquitetura de Autenticação (Fase MVP)

- **Status Atual:** O sistema opera em modo de **MVP (Minimum Viable Product) / Local**.
- **Mecanismo:** A autenticação é simulada localmente, verificando credenciais contra uma lista de usuários (médicos e funcionários) pré-definida ou em memória, sem um provedor de identidade real. As senhas estão em texto plano nos dados de seed.

---

## 3. Roadmap de Segurança (Produção Futura)

- **Estratégia:** Para a versão de produção, a criação e gerenciamento de usuários será migrada para o serviço de autenticação do Supabase (`auth.users`).
- **Implementação:** A criação de novos usuários será realizada através de **Supabase Edge Functions**.
- **Segurança:** Este método garante que a `Service Role Key` (chave com privilégios de administrador) permaneça segura no backend (dentro da Edge Function) e nunca seja exposta no código do frontend, seguindo as melhores práticas de segurança.