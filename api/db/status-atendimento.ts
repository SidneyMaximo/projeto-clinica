import { AtendimentoService } from '../../src/services/dbDiagnosticos/atendimentoService.ts';

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
    const { atendimento, procedimento } = req.query;
    
    if (!atendimento) {
      return res.status(400).json({ error: 'Parâmetro atendimento (NumeroAtendimentoApoiado) é obrigatório' });
    }

    const resultado = await AtendimentoService.consultarStatus(
      String(atendimento), 
      procedimento ? String(procedimento) : undefined
    );
    
    return res.status(200).json(resultado);
  } catch (error: any) {
    console.error('Erro na API de Consulta Status:', error);

    // Extrai o faultstring do SOAP para dar uma mensagem clara ao frontend
    const soapFault =
      error?.root?.Envelope?.Body?.Fault?.faultstring ||
      error?.root?.Envelope?.Body?.Fault?.detail?.ExceptionDetail?.Message ||
      null;

    return res.status(500).json({
      error: soapFault
        ? `Erro do laboratório: ${soapFault}`
        : 'Erro interno no servidor ao consultar Status',
      details: error.message,
      soapFault,
    });
  }
}

