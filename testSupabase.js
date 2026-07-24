import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wkxziqcdrhikdpqkssdx.supabase.co';
const supabaseKey = 'sb_publishable_Jvov4LmjQnpqmcf-m58oPQ_rqMkOIWg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('orcamentos_exames').select('*').limit(1);
  console.log('Select:', { data, error });
  
  const { data: iData, error: iError } = await supabase.from('orcamentos_exames').insert({
    id: 'test_123',
    patient_name: 'Test',
    operator_id: 'op1',
    operator_name: 'Op 1',
    items: [],
    total_amount: 0,
    status: 'pendente'
  });
  console.log('Insert:', { iData, iError });
}
test();
