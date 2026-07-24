import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configuração para __dirname funcionar em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega as variáveis de ambiente do .env na raiz do projeto
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Erro: Credenciais do Supabase não encontradas no arquivo .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function importarExames() {
  const filePath = path.join(__dirname, 'exames.xlsx'); // Coloque o arquivo baixado com este nome na pasta scripts
  
  if (!fs.existsSync(filePath)) {
    console.error(`Erro: Arquivo não encontrado em ${filePath}`);
    console.log("Por favor, baixe a planilha como 'exames.xlsx' e coloque na pasta scripts/.");
    process.exit(1);
  }

  console.log("Lendo arquivo Excel...");
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converte a primeira aba em JSON
  const data = xlsx.utils.sheet_to_json(worksheet);

  console.log(`Encontrados ${data.length} exames para importar.`);

  let inseridos = 0;
  let erros = 0;

  // Deduplica por CD_EXAME para evitar múltiplas inserções da mesma linha
  const examesMap = new Map();
  for (const row of data) {
    const codigo = String(row['CD_EXAME'] || row['CodigoExameDB'] || row['CODIGO'] || row['Codigo'] || '').trim();
    if (!codigo) continue;
    if (!examesMap.has(codigo)) {
      examesMap.set(codigo, row);
    }
  }

  console.log(`Exames únicos encontrados: ${examesMap.size}`);

  for (const [codigo, row] of examesMap) {
    // MAPEAMENTO: colunas reais da planilha
    const exame = {
      codigo_exame_db: codigo,
      mnemonico: String(row['CD_EXAME'] || row['Mnemonico'] || row['MNEMONICO'] || codigo).trim(),
      descricao: String(row['DS_EXAME'] || row['Descricao'] || row['Exame'] || row['NOME'] || '').trim(),
      material: String(row['MATERIAL'] || row['Material'] || '').trim(),
      prazo_dias: parseInt(row['Prazo'] || row['PRAZO'] || 0, 10) || 0,
      metodo: String(row['METODOLOGIA'] || row['Metodo'] || row['METODO'] || '').trim(),
    };

    if (!exame.descricao) {
      exame.descricao = 'Exame ' + codigo;
    }

    const { error } = await supabase
      .from('exames_db')
      .upsert([exame], { onConflict: 'codigo_exame_db' });

    if (error) {
      console.error(`Erro ao inserir/atualizar exame ${exame.codigo_exame_db}:`, error.message);
      erros++;
    } else {
      inseridos++;
    }
  }

  console.log('--- Resumo da Importação ---');
  console.log(`Exames importados/atualizados: ${inseridos}`);
  console.log(`Erros: ${erros}`);
}

importarExames().catch(console.error);
