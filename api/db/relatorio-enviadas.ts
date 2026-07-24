import { AtendimentoService } from '../../src/services/dbDiagnosticos/atendimentoService';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { dtInicial, dtFinal } = req.query;
    
    // Conforme a documentação não é estritamente claro se os parâmetros são opcionais,
    // mas por segurança passaremos caso fornecidos.
    const resultado = await AtendimentoService.relatorioRequisicoesEnviadas(
      dtInicial ? String(dtInicial) : undefined,
      dtFinal ? String(dtFinal) : undefined
    );
    
    return res.status(200).json(resultado);
  } catch (error: any) {
    console.error('Erro na API de Relatório de Requisições Enviadas:', error);
    return res.status(500).json({ error: 'Erro interno no servidor', details: error.message });
  }
}
