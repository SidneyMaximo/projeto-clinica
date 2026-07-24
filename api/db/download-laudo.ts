import { AtendimentoService } from '../../src/services/dbDiagnosticos/atendimentoService.js';

/**
 * Rota: GET /api/db/download-laudo
 * 
 * Chama o método SOAP "EnviaResultadoBase64" (parâmetro raiz: "request")
 * conforme WSDL do DB Diagnósticos.
 * 
 * A resposta "ct_EnviaResultadoBase64Response" contém:
 *   - LaudoPDF   : xs:base64Binary → string Base64 do PDF
 *   - LinkLaudo  : xs:string       → link direto (pode conter &amp; que deve ser limpo)
 *   - Mensagem   : xs:string       → mensagem de status
 *   - Status     : xs:int          → código de status
 * 
 * Query params:
 *   - atendimento (obrigatório) : NumeroAtendimentoApoiado
 *   - exame       (opcional)    : CodigoExameDB específico
 */
export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { atendimento, exame } = req.query;

    if (!atendimento) {
      return res.status(400).json({
        error: 'Parâmetro "atendimento" (NumeroAtendimentoApoiado) é obrigatório',
      });
    }

    // Chama EnviaResultadoBase64 via AtendimentoService
    const resultado: any = await AtendimentoService.obterLaudoPDF(
      String(atendimento),
      exame ? String(exame) : undefined
    );

    // O node-soap retorna o resultado dentro de "EnviaResultadoBase64Result"
    const laudoData = resultado?.EnviaResultadoBase64Result ?? resultado ?? {};

    // Trata o LinkLaudo: remove "amp;" conforme documentação do laboratório
    let linkTratado: string | null = laudoData.LinkLaudo ?? null;
    if (linkTratado) {
      linkTratado = linkTratado.replace(/&amp;/g, '&');
      linkTratado = linkTratado.replace(/amp;/g, '');
    }

    return res.status(200).json({
      laudoBase64: laudoData.LaudoPDF ?? null,
      linkLaudo: linkTratado,
      mensagem: laudoData.Mensagem ?? null,
      status: laudoData.Status ?? null,
    });
  } catch (error: any) {
    console.error('Erro na API de Download Laudo:', error);

    // Extrai o faultstring SOAP para mensagem clara ao frontend
    const soapFault =
      error?.root?.Envelope?.Body?.Fault?.faultstring ||
      error?.root?.Envelope?.Body?.Fault?.detail?.ExceptionDetail?.Message ||
      null;

    return res.status(500).json({
      error: soapFault
        ? `Erro do laboratório: ${soapFault}`
        : 'Erro ao baixar laudo PDF',
      details: error.message,
      soapFault,
    });
  }
}
