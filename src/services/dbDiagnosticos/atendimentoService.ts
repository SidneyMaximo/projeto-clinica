import { getSoapClient, getCredenciais } from './soapClient.js';
import { 
  CtPedidoV2,
  ConsultaStatusAtendimentoRequest,
  EnviaResultadoBase64Request,
  EnviaAmostrasRequest,
  ListaProcedimentosPendentesRequest,
  EnviaAmostrasProcedimentosPendentesRequest,
  RelatorioRequisicoesEnviadasRequest,
  CtPedidoMPPV2
} from './types.js';

export class AtendimentoService {
  
  /**
   * Passo 3 - RecebeAtendimento (Cadastro do Pedido)
   * 
   * WSDL: O parâmetro raiz chama-se "atendimento" (minúsculo), do tipo ct_Atendimento.
   * ct_Atendimento estende RequestMessage (CodigoApoiado + CodigoSenhaIntegracao) e adiciona Pedido.
   * ListaProcedimento e ListaSolicitante são ArrayOf, então precisam do wrapper ct_* interno.
   */
  static async cadastrarAtendimento(pedido: CtPedidoV2) {
    try {
      const client = await getSoapClient();
      const credenciais = getCredenciais();

      // Serializa arrays no formato correto exigido pelo WSDL (ArrayOfCt_X_v2 → { ct_X_v2: [...] })
      const pedidoSoap: any = {
        ...pedido,
        ListaProcedimento: pedido.ListaProcedimento?.length
          ? { ct_Procedimento_v2: pedido.ListaProcedimento }
          : undefined,
        ListaSolicitante: pedido.ListaSolicitante?.length
          ? { ct_Solicitante_v2: pedido.ListaSolicitante }
          : undefined,
      };

      // Parâmetro correto conforme WSDL: "atendimento" (não "Entrada")
      const [result] = await client.RecebeAtendimentoAsync({
        atendimento: {
          CodigoApoiado: credenciais.CodigoApoiado,
          CodigoSenhaIntegracao: credenciais.CodigoSenhaIntegracao,
          Pedido: pedidoSoap,
        }
      });
      return result;
    } catch (error) {
      console.error('Erro em cadastrarAtendimento:', error);
      throw error;
    }
  }

  /**
   * ConsultaStatusAtendimento (Rastreabilidade)
   * WSDL: parâmetro raiz = "request"
   */
  static async consultarStatus(numeroAtendimentoApoiado: string, procedimento?: string) {
    try {
      const client = await getSoapClient();
      const credenciais = getCredenciais();
      
      const payload: ConsultaStatusAtendimentoRequest = {
        ...credenciais,
        NumeroAtendimentoApoiado: numeroAtendimentoApoiado,
      };

      if (procedimento) {
        payload.Procedimento = procedimento;
      }

      const [result] = await client.ConsultaStatusAtendimentoAsync({ request: payload });
      return result;
    } catch (error) {
      console.error('Erro em consultarStatus:', error);
      throw error;
    }
  }

  /**
   * EnviaResultadoBase64 (Download do Laudo PDF)
   * WSDL: parâmetro raiz = "request"
   */
  static async obterLaudoPDF(numeroAtendimentoApoiado: string, codigoExame?: string) {
    try {
      const client = await getSoapClient();
      const credenciais = getCredenciais();
      
      const payload: EnviaResultadoBase64Request = {
        ...credenciais,
        NumeroAtendimentoApoiado: numeroAtendimentoApoiado,
      };

      if (codigoExame) {
        payload.CodigoExameDB = codigoExame;
      }

      const [result] = await client.EnviaResultadoBase64Async({ request: payload });
      return result;
    } catch (error) {
      console.error('Erro em obterLaudoPDF:', error);
      throw error;
    }
  }

  /**
   * EnviaAmostras (Reimpressão de Etiquetas)
   * WSDL: parâmetro raiz = "request"
   */
  static async reimprimirEtiqueta(numeroAtendimentoApoiado: string) {
    try {
      const client = await getSoapClient();
      const payload: EnviaAmostrasRequest = {
        ...getCredenciais(),
        NumeroAtendimentoApoiado: numeroAtendimentoApoiado,
      };
      const [result] = await client.EnviaAmostrasAsync({ request: payload });
      return result;
    } catch (error) {
      console.error('Erro em reimprimirEtiqueta:', error);
      throw error;
    }
  }

  /**
   * ListaProcedimentosPendentes
   * WSDL: parâmetro raiz = "request"
   */
  static async listarPendencias(dtInicial: string, dtFinal: string) {
    try {
      const client = await getSoapClient();
      const payload: ListaProcedimentosPendentesRequest = {
        ...getCredenciais(),
        dtInicial,
        dtFinal,
      };
      const [result] = await client.ListaProcedimentosPendentesAsync({ request: payload });
      return result;
    } catch (error) {
      console.error('Erro em listarPendencias:', error);
      throw error;
    }
  }

  /**
   * EnviaAmostrasProcedimentosPendentes
   * WSDL: parâmetro raiz = "request"
   */
  static async baixarPendencias(amostras: CtPedidoMPPV2[]) {
    try {
      const client = await getSoapClient();
      const payload: EnviaAmostrasProcedimentosPendentesRequest = {
        ...getCredenciais(),
        Amostras: amostras,
      };
      const [result] = await client.EnviaAmostrasProcedimentosPendentesAsync({ request: payload });
      return result;
    } catch (error) {
      console.error('Erro em baixarPendencias:', error);
      throw error;
    }
  }

  /**
   * RelatorioRequisicoesEnviadas
   * WSDL: parâmetro raiz = "request"
   */
  static async relatorioRequisicoesEnviadas(dtInicial?: string, dtFinal?: string) {
    try {
      const client = await getSoapClient();
      const payload: RelatorioRequisicoesEnviadasRequest = {
        ...getCredenciais(),
        dtInicial,
        dtFinal,
      };
      const [result] = await client.RelatorioRequisicoesEnviadasAsync({ request: payload });
      return result;
    } catch (error) {
      console.error('Erro em relatorioRequisicoesEnviadas:', error);
      throw error;
    }
  }
}
