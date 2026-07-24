import { AtendimentoService } from '../../src/services/dbDiagnosticos/atendimentoService';

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
    const { atendimento, exame } = req.query;
    
    if (!atendimento) {
      return res.status(400).json({ error: 'Parâmetro atendimento (NumeroAtendimentoApoiado) é obrigatório' });
    }

    const resultado = await AtendimentoService.obterLaudoPDF(
      String(atendimento),
      exame ? String(exame) : undefined
    );
    
    // Conforme documentação, página 16: Tratar remoção do "amp;" do Link retornado
    if (resultado && resultado.LinkLaudo) {
      // O SOAP client pode já decodificar algumas entities XML dependendo da implementação,
      // mas faremos o replace explícito de 'amp;' para garantir a visualização correta 
      // (pois a documentação cita que ele pode vir como '...&amp;...').
      // Substituimos 'amp;' por vazio conforme o guia ou '&amp;' por '&' se for formatação padrão HTML,
      // mas o manual diz especificamente "remover o trecho 'amp;'". 
      // Faremos a remoção da string "amp;" e de "&amp;" por garantia.
      
      let linkTratado = resultado.LinkLaudo;
      linkTratado = linkTratado.replace(/&amp;/g, '&'); // Decodifica HTML Entity usual
      linkTratado = linkTratado.replace(/amp;/g, ''); // Remove apenas "amp;" conforme documentação
      
      resultado.LinkLaudo = linkTratado;
    }

    return res.status(200).json(resultado);
  } catch (error: any) {
    console.error('Erro na API de PDF Laudo:', error);
    return res.status(500).json({ error: 'Erro interno no servidor ao consultar Laudo PDF', details: error.message });
  }
}
