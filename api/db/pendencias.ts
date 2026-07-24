import { AtendimentoService } from '../../src/services/dbDiagnosticos/atendimentoService.ts';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // Listar Pendencias
      const { dtInicial, dtFinal } = req.query;
      
      if (!dtInicial || !dtFinal) {
        return res.status(400).json({ error: 'Parâmetros dtInicial e dtFinal são obrigatórios (formato dateTime)' });
      }

      const resultado = await AtendimentoService.listarPendencias(String(dtInicial), String(dtFinal));
      return res.status(200).json(resultado);
    } 
    
    if (req.method === 'POST') {
      // Baixar Pendencias
      const { amostras } = req.body;
      
      if (!amostras || !Array.isArray(amostras)) {
        return res.status(400).json({ error: 'Payload inválido: array de amostras ausente' });
      }

      const resultado = await AtendimentoService.baixarPendencias(amostras);
      return res.status(200).json(resultado);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('Erro na API de Pendências:', error);
    return res.status(500).json({ error: 'Erro interno no servidor', details: error.message });
  }
}
