import * as soap from 'soap';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carrega as variáveis de ambiente em desenvolvimento (a Vercel injeta automaticamente em prod)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DB_WSDL_URL = 'https://cirhomprd.diagnosticosdobrasil.com.br/dbsync/wsrvProtocoloDBSync.dbsync.svc?singleWsdl';
const DB_CODIGO_APOIADO = '12588';
const DB_SENHA_INTEGRACAO = 'malore63';

if (!DB_CODIGO_APOIADO || !DB_SENHA_INTEGRACAO) {
  console.warn('Aviso: DB_CODIGO_APOIADO ou DB_SENHA_INTEGRACAO não configurados nas variáveis de ambiente.');
}

let cachedClient: soap.Client | null = null;

export async function getSoapClient(): Promise<soap.Client> {
  if (cachedClient) {
    return cachedClient;
  }
  
  try {
    cachedClient = await soap.createClientAsync(DB_WSDL_URL);
    // Força explicitamente o endpoint de homologação (evita que o WSDL sobrescreva com a URL de produção)
    cachedClient.setEndpoint('https://cirhomprd.diagnosticosdobrasil.com.br/dbsync/wsrvProtocoloDBSync.dbsync.svc');
    return cachedClient;
  } catch (error: any) {
    console.error('Erro ao inicializar o Client SOAP:', error);
    
    // Anexa os detalhes ao erro para que a rota consiga extrair
    const err = new Error('Não foi possível conectar ao Web Service do DB Diagnósticos');
    (err as any).originalError = error;
    (err as any).message = error.message;
    (err as any).body = error.body;
    (err as any).response = error.response;
    throw err;
  }
}

export function getCredenciais() {
  return {
    CodigoApoiado: DB_CODIGO_APOIADO,
    CodigoSenhaIntegracao: DB_SENHA_INTEGRACAO,
  };
}
