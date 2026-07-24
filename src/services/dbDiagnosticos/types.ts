// WSDL: RecebeAtendimento recebe parâmetro "atendimento" (minúsculo) do tipo ct_Atendimento
// ct_Atendimento extends RequestMessage (CodigoApoiado + CodigoSenhaIntegracao) + Pedido: ct_Pedido_v2
export interface RecebeAtendimentoRequest {
  atendimento: {
    CodigoApoiado: string;
    CodigoSenhaIntegracao: string;
    Pedido: CtPedidoV2;
  }
}


export interface CtPedidoV2 {
  ListaPacienteApoiado: CtPacienteV2;
  NumeroAtendimentoApoiado: string;
  Altura?: string;
  Peso?: string;
  CodigoPrioridade?: string; // 'R' ou 'U'
  DataHoraDum?: string;
  DescricaoDadosClinicos?: string;
  DescricaoMedicamentos?: string;
  ListaProcedimento: CtProcedimentoV2[];
  ListaSolicitante?: CtSolicitanteV2[];
  ListaQuestionarios?: any[];
  NumeroAtendimentoDBReserva?: string;
  UsoApoiado?: string;
  PostoColeta?: string;
}

export interface CtPacienteV2 {
  DataHoraPaciente: string;
  NomePaciente: string;
  NumeroCartaoNacionalSaude?: string;
  NumeroCPF?: string;
  RGPacienteApoiado?: string;
  SexoPaciente: string;
}

export interface CtProcedimentoV2 {
  CodigoExameDB: string;
  DescricaoRegiaoColeta?: string;
  VolumeUrinario?: number;
  IdentificacaoExameApoiado?: string;
  MaterialApoiado?: string;
  DescricaoMaterialApoiado?: string;
  DescricaoExameApoiado?: string;
  CodigoMPP?: string; // CTP ou CDP
}

export interface CtSolicitanteV2 {
  NomeSolicitante?: string;
  CodigoConselho?: string;
  CodigoUFConselhoSolicitante?: string;
  CodigoConselhoSolicitante?: string;
}

// Response Status Atendimento
export interface ConsultaStatusAtendimentoRequest {
  CodigoApoiado: string;
  CodigoSenhaIntegracao: string;
  NumeroAtendimentoApoiado: string;
  Procedimento?: string;
}

export interface ConsultaStatusAtendimentoResponse {
  Pedido: {
    NumeroPedido: string;
    NumeroAtendimento: string;
    RegistroExterno: string;
    Registro: string;
  };
  ListaProcedimento: CtDadosStatusProcedimentoV1[];
}

export interface CtDadosStatusProcedimentoV1 {
  CodigoExameDB: string;
  DataHoraRecebimentoOrigem: string;
  IdentificacaoExameApoiado: string;
  DataHoraCheckout: string;
  DataHoraRecepcaoUP: string;
  DataHoraLiberacaoTecnica: string;
  DataHoraLiberacaoClinica: string;
  DataHoraDivulgacao: string;
  DataHoraImpressao: string;
  StatusProducao: string;
  TipoMPP: string;
}

// Request/Response para Laudo em Base64 (PDF)
export interface EnviaResultadoBase64Request {
  CodigoApoiado: string;
  CodigoSenhaIntegracao: string;
  NumeroAtendimentoApoiado: string;
  CodigoExameDB?: string;
  TipoCabecalho?: string;
}

export interface EnviaResultadoBase64Response {
  LinkLaudo: string;
  Status: number;
}

// 14- Método EnviaAmostras (Reimpressão de Etiqueta)
export interface EnviaAmostrasRequest {
  CodigoApoiado: string;
  CodigoSenhaIntegracao: string;
  NumeroAtendimentoApoiado: string;
}

export interface EnviaAmostrasResponse {
  ct_RecebeAtendimentoEtiquetaResponse: any; // Response type based on documentation
}

// 16- Método ListaProcedimentosPendentes
export interface ListaProcedimentosPendentesRequest {
  CodigoApoiado: string;
  CodigoSenhaIntegracao: string;
  dtInicial: string; // dateTime
  dtFinal: string; // dateTime
}

export interface ListaProcedimentosPendentesResponse {
  ListaPedidos: CtPedidoMPPV2[];
}

// 17- Método EnviaAmostrasProcedimentosPendentes
export interface EnviaAmostrasProcedimentosPendentesRequest {
  CodigoApoiado: string;
  CodigoSenhaIntegracao: string;
  Amostras: CtPedidoMPPV2[];
}

export interface EnviaAmostrasProcedimentosPendentesResponse {
  PedidosAmostras: any[]; // Array of ct_ListaAmostrasPedido_v2
}

export interface CtPedidoMPPV2 {
  NomePaciente?: string;
  NumeroAtendimentoApoiado?: string;
  NumeroAtendimentoDB?: string;
  DataHoraPedido?: string;
  ListaProcedimentoMPP?: CtProcedimentoMPPV2[];
}

export interface CtProcedimentoMPPV2 {
  CodigoExameDB?: string;
  SequenciaExameDB?: number;
  Status?: string;
}

// RelatorioRequisicoesEnviadas (Extra)
export interface RelatorioRequisicoesEnviadasRequest {
  CodigoApoiado: string;
  CodigoSenhaIntegracao: string;
  dtInicial?: string;
  dtFinal?: string;
}
