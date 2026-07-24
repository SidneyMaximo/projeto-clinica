import { AtendimentoService } from '../../src/services/dbDiagnosticos/atendimentoService';

export default async function handler(req: any, res: any) {
  // Configuração básica de CORS
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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const pedido = req.body;
    
    if (!pedido || !pedido.NumeroAtendimentoApoiado) {
      return res.status(400).json({ error: 'Payload de Pedido inválido ou NumeroAtendimentoApoiado ausente' });
    }

    const resultado = await AtendimentoService.cadastrarAtendimento(pedido);
    return res.status(200).json(resultado);
  } catch (error: any) {
    console.error('Erro na API de RecebeAtendimento:', error);
    
    // Extrai o máximo de detalhes possível do erro SOAP nativo
    const errorDetails = {
      message: error.message || 'Erro desconhecido no SOAP',
      root: error.root?.Envelope?.Body?.Fault || error.root,
      body: error.body,
      response: error.response?.data || error.response?.body,
      stack: error.stack
    };

    return res.status(500).json({ 
      error: 'Erro interno no servidor ao processar Atendimento', 
      details: errorDetails 
    });
  }
}
