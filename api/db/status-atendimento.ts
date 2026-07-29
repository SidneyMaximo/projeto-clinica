import { AtendimentoService } from '../../src/services/dbDiagnosticos/atendimentoService.js';

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

    const dados = await AtendimentoService.consultarStatus(
      String(atendimento), 
      procedimento ? String(procedimento) : undefined
    );
    
    // 4. Valide se a resposta da DB não é um erro de autenticação antes de tentar extrair os pedidos.
    if (dados?.Fault || (typeof dados === 'string' && dados.includes('Fault'))) {
      return res.status(401).json({ error: 'Falha de autenticação ou erro no serviço SOAP da DB' });
    }

    // 3. Utilize Optional Chaining (?.) em todas as extrações de dados
    // Vamos garantir que se houver RecebeAtendimentoResult ou ConsultaStatusAtendimentoResult, enviamos com segurança.
    const lote = dados?.RecebeAtendimentoResult?.StatusLote?.ct_StatusLote_v2?.[0];
    const seguro = dados?.ConsultaStatusAtendimentoResult || dados;

    return res.status(200).json(seguro);
  } catch (error: any) {
    // 2. Dentro do catch, adicione console.error("Erro na integração DB:", error) 
    // e retorne algo seguro para o frontend: res.status(500).json({ error: "Falha na comunicação com o laboratório", details: error.message })
    console.error("Erro na integração DB:", error);

    return res.status(500).json({
      error: "Falha na comunicação com o laboratório",
      details: error.message
    });
  }
}

