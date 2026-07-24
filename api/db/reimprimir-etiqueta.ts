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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { numeroAtendimentoApoiado } = req.body;
    
    if (!numeroAtendimentoApoiado) {
      return res.status(400).json({ error: 'Payload inválido: numeroAtendimentoApoiado ausente' });
    }

    const resultado = await AtendimentoService.reimprimirEtiqueta(numeroAtendimentoApoiado);
    return res.status(200).json(resultado);
  } catch (error: any) {
    console.error('Erro na API de Reimprimir Etiqueta:', error);
    return res.status(500).json({ error: 'Erro interno no servidor', details: error.message });
  }
}
