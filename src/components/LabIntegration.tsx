import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { 
  TestTube, Search, FileText, Printer, CheckCircle, Trash2,
  AlertCircle, Activity, ChevronDown, Download, AlertTriangle, Send, Tag
} from 'lucide-react';

// ============================================================
// Tipos de dados retornados pelo WSDL RecebeAtendimento
// ============================================================
interface EtiquetaDB {
  CodigoBarras?: string;
  MnemonicosExames?: string;
  EPL?: string;
  DescricaoMaterial?: string;
  NomeTubo?: string;
  CorTubo?: string;
  VolumeTubo?: string;
}

interface AtendimentoSalvo {
  id: string;
  data: string;
  nomePaciente: string;
  sexo: string;
  dataNascimento: string;
  numeroAtendimentoApoiado: string;
  examesSelecionados: string[];
  // Retornados pelo DB Diagnósticos (RecebeAtendimentoResult)
  numeroAtendimentoDB?: string;
  numeroPedidoDB?: string;
  codigoBarras?: string;
  etiquetas?: EtiquetaDB[];
  epl?: string;
  status?: number;
  mensagem?: string;
}

const STORAGE_KEY = 'clinica_atendimentos_db';

function salvarAtendimentoLocal(atend: AtendimentoSalvo) {
  try {
    const existentes: AtendimentoSalvo[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existentes.unshift(atend);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existentes.slice(0, 100)));
    return existentes.slice(0, 100);
  } catch { return []; }
}

function carregarAtendimentosLocal(): AtendimentoSalvo[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

export default function LabIntegration() {
  const [activeTab, setActiveTab] = useState<'nova_solicitacao' | 'acompanhamento' | 'pendencias'>('nova_solicitacao');
  
  // Estados para Nova Solicitação
  const [examesDisponiveis, setExamesDisponiveis] = useState<any[]>([]);
  const [loadingExames, setLoadingExames] = useState(false);
  const [solicitacao, setSolicitacao] = useState({
    numeroAtendimentoApoiado: '',
    nomePaciente: '',
    sexo: 'M',
    dataNascimento: '',
    examesSelecionados: [] as string[]
  });
  const [submittingPedido, setSubmittingPedido] = useState(false);
  const [pedidoMensagem, setPedidoMensagem] = useState<{tipo: 'sucesso' | 'erro', texto: string} | null>(null);

  // Estados para Acompanhamento/Laudo
  const [numAtendimentoBusca, setNumAtendimentoBusca] = useState('');
  const [statusResult, setStatusResult] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');

  // Estados para Download de Laudo
  const [downloadLaudoLoading, setDownloadLaudoLoading] = useState(false);
  const [downloadLaudoError, setDownloadLaudoError] = useState('');
  const [downloadLaudoSucesso, setDownloadLaudoSucesso] = useState('');

  // Estados para Pendências MPP (servidor DB)
  const [pendencias, setPendencias] = useState<any[]>([]);
  const [loadingPendencias, setLoadingPendencias] = useState(false);
  const [dataInicioPendencia, setDataInicioPendencia] = useState('');
  const [dataFimPendencia, setDataFimPendencia] = useState('');
  const [pendenciasMessage, setPendenciasMessage] = useState<{tipo: 'sucesso' | 'erro', texto: string} | null>(null);

  // Histórico local de atendimentos enviados (localStorage)
  const [atendimentosSalvos, setAtendimentosSalvos] = useState<AtendimentoSalvo[]>([]);

  useEffect(() => {
    carregarExamesDb();
    setAtendimentosSalvos(carregarAtendimentosLocal());
  }, []);

  const carregarExamesDb = async () => {
    setLoadingExames(true);
    try {
      const { data, error } = await supabase
        .from('exames_db')
        .select('*')
        .eq('ativo', true)
        .order('descricao', { ascending: true });
        
      if (error) throw error;
      setExamesDisponiveis(data || []);
    } catch (err) {
      console.error('Erro ao buscar exames DB:', err);
    } finally {
      setLoadingExames(false);
    }
  };

  const handleEnviarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (solicitacao.examesSelecionados.length === 0) {
      setPedidoMensagem({ tipo: 'erro', texto: 'Selecione pelo menos um exame.' });
      return;
    }

    setSubmittingPedido(true);
    setPedidoMensagem(null);
    
    // Monta o payload conforme types definidos no backend
    const payload = {
      NumeroAtendimentoApoiado: solicitacao.numeroAtendimentoApoiado.trim() || ('ATEND-' + Date.now()),
      ListaPacienteApoiado: {
        NomePaciente: solicitacao.nomePaciente,
        SexoPaciente: solicitacao.sexo,
        DataHoraPaciente: new Date(solicitacao.dataNascimento).toISOString(),
      },
      ListaProcedimento: solicitacao.examesSelecionados.map(cod => ({
        CodigoExameDB: cod
      }))
    };

    try {
      const response = await fetch('/api/db/recebe-atendimento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Falha ao enviar pedido');

      // Extrai dados do retorno do DB Diagnósticos (RecebeAtendimentoResult)
      const resultado = data?.RecebeAtendimentoResult ?? data ?? {};
      const etiquetasRaw = resultado?.Etiquetas?.ct_Etiqueta_v2;

      const novoAtendimento: AtendimentoSalvo = {
        id: Date.now().toString(),
        data: new Date().toISOString(),
        nomePaciente: solicitacao.nomePaciente,
        sexo: solicitacao.sexo,
        dataNascimento: solicitacao.dataNascimento,
        numeroAtendimentoApoiado: payload.NumeroAtendimentoApoiado,
        examesSelecionados: solicitacao.examesSelecionados,
        numeroAtendimentoDB: resultado?.NumeroAtendimentoDB,
        numeroPedidoDB: resultado?.NumeroPedidoDB,
        codigoBarras: resultado?.CodigoBarras,
        etiquetas: etiquetasRaw
          ? (Array.isArray(etiquetasRaw) ? etiquetasRaw : [etiquetasRaw])
          : undefined,
        epl: resultado?.EPL,
        status: resultado?.Status,
        mensagem: resultado?.Mensagem,
      };

      const salvos = salvarAtendimentoLocal(novoAtendimento);
      setAtendimentosSalvos(salvos);

      setPedidoMensagem({ tipo: 'sucesso', texto: `Pedido enviado! Pedido DB: ${resultado?.NumeroPedidoDB || 'N/A'} • Cód. Barras: ${resultado?.CodigoBarras || 'N/A'}` });
      setSolicitacao({ numeroAtendimentoApoiado: '', nomePaciente: '', sexo: 'M', dataNascimento: '', examesSelecionados: [] });
    } catch (err: any) {
      setPedidoMensagem({ tipo: 'erro', texto: err.message });
    } finally {
      setSubmittingPedido(false);
    }
  };

  const handleConsultarStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numAtendimentoBusca) return;
    
    setLoadingStatus(true);
    setStatusError('');
    setStatusResult(null);

    try {
      const response = await fetch(`/api/db/status-atendimento?atendimento=${numAtendimentoBusca}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Falha ao buscar status');
      setStatusResult(data);
    } catch (err: any) {
      setStatusError(err.message);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleVerLaudo = async (codigoExame?: string) => {
    try {
      let url = `/api/db/laudo?atendimento=${numAtendimentoBusca}`;
      if (codigoExame) url += `&exame=${codigoExame}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Falha ao buscar laudo');
      
      if (data && data.LinkLaudo) {
        window.open(data.LinkLaudo, '_blank');
      } else {
        alert('Laudo não disponível no momento.');
      }
    } catch (err: any) {
      alert('Erro ao buscar laudo: ' + err.message);
    }
  };

  /**
   * Download do laudo em PDF via base64.
   * Chama /api/db/download-laudo → recebe laudoBase64 (EnviaResultadoBase64)
   * Converte para Blob application/pdf e abre em nova aba.
   */
  const handleDownloadLaudoPDF = async (numAtend?: string, codigoExame?: string) => {
    const atendimento = numAtend || numAtendimentoBusca;
    if (!atendimento) return;

    setDownloadLaudoLoading(true);
    setDownloadLaudoError('');
    setDownloadLaudoSucesso('');

    try {
      let url = `/api/db/download-laudo?atendimento=${encodeURIComponent(atendimento)}`;
      if (codigoExame) url += `&exame=${encodeURIComponent(codigoExame)}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Erro ao buscar laudo');

      if (data.laudoBase64) {
        // Converte base64 → Uint8Array → Blob → URL → nova aba
        const byteArray = Uint8Array.from(atob(data.laudoBase64), c => c.charCodeAt(0));
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setDownloadLaudoSucesso('PDF aberto em nova aba com sucesso!');
        // Libera memória após 60s
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      } else if (data.linkLaudo) {
        // Fallback: abre link direto se não tiver base64
        window.open(data.linkLaudo, '_blank');
        setDownloadLaudoSucesso('Laudo aberto via link direto.');
      } else {
        throw new Error(data.mensagem || 'Laudo não disponível para este atendimento.');
      }
    } catch (err: any) {
      setDownloadLaudoError(err.message);
    } finally {
      setDownloadLaudoLoading(false);
    }
  };

  const handleBuscarPendencias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataInicioPendencia || !dataFimPendencia) return;
    
    setLoadingPendencias(true);
    setPendenciasMessage(null);
    setPendencias([]);

    try {
      const start = new Date(dataInicioPendencia).toISOString();
      const end = new Date(dataFimPendencia).toISOString();
      
      const response = await fetch(`/api/db/pendencias?dtInicial=${start}&dtFinal=${end}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Falha ao buscar pendências');
      
      if (data.ListaPedidos) {
        setPendencias(data.ListaPedidos);
      } else {
        setPendenciasMessage({ tipo: 'sucesso', texto: 'Nenhuma pendência encontrada no período.' });
      }
    } catch (err: any) {
      setPendenciasMessage({ tipo: 'erro', texto: err.message });
    } finally {
      setLoadingPendencias(false);
    }
  };

  const handleReimprimirEtiqueta = async (atendimento: string) => {
    try {
      const response = await fetch('/api/db/reimprimir-etiqueta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroAtendimentoApoiado: atendimento })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro na reimpressão');
      alert('Comando de reimpressão enviado com sucesso!');
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
  };

  /**
   * Abre janela de impressão com etiquetas 25mm x 50mm.
   * Usa JsBarcode via CDN (sem instalação de pacote).
   * Cada ct_Etiqueta_v2 do DB = 1 etiqueta (1 tubo).
   */
  const handleImprimirEtiquetas = (atend: AtendimentoSalvo) => {
    const etiquetas: EtiquetaDB[] = atend.etiquetas?.length
      ? atend.etiquetas
      : [{ CodigoBarras: atend.codigoBarras, MnemonicosExames: atend.examesSelecionados.join(' / ') }];

    const labelsHTML = etiquetas.map((etq, idx) => {
      const barcode = etq.CodigoBarras || atend.codigoBarras || atend.numeroAtendimentoApoiado;
      const exames = etq.MnemonicosExames || atend.examesSelecionados.join(' / ');
      const tubo = etq.NomeTubo ? `${etq.NomeTubo}${etq.CorTubo ? ' • ' + etq.CorTubo : ''}` : '';
      return `
        <div class="etiqueta">
          <div class="barcode-wrap">
            <svg class="bc" id="bc${idx}" data-value="${barcode}"></svg>
          </div>
          <div class="dados">
            <div class="paciente">${atend.nomePaciente}</div>
            <div class="exames">${exames}</div>
            ${tubo ? `<div class="tubo">${tubo}</div>` : ''}
            <div class="rodape">
              <span>${new Date(atend.data).toLocaleDateString('pt-BR')}</span>
              <span>${atend.numeroPedidoDB ? 'Ped: ' + atend.numeroPedidoDB : atend.numeroAtendimentoApoiado}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    const pw = window.open('', '_blank', 'width=400,height=600');
    if (!pw) { alert('Popup bloqueado. Libere popups para este site.'); return; }

    pw.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Etiquetas — ${atend.nomePaciente}</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
  <style>
    @page { size: 25mm 50mm; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: white; font-family: Arial, Helvetica, sans-serif; }
    .etiqueta {
      width: 25mm; height: 50mm;
      padding: 1.2mm 1.5mm;
      page-break-after: always;
      display: flex; flex-direction: column;
      border: 0.2mm solid #999;
    }
    .etiqueta:last-child { page-break-after: auto; }
    .barcode-wrap { width: 100%; display: flex; justify-content: center; }
    .bc { width: 22mm; height: 20mm; }
    .dados { flex: 1; display: flex; flex-direction: column; gap: 0.8mm; padding-top: 1mm; }
    .paciente { font-size: 6.5pt; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .exames { font-size: 6pt; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tubo { font-size: 5.5pt; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rodape { margin-top: auto; display: flex; justify-content: space-between; font-size: 5pt; color: #777; }
  </style>
</head>
<body>
  ${labelsHTML}
  <script>
    window.addEventListener('load', function() {
      document.querySelectorAll('.bc').forEach(function(el) {
        var val = el.getAttribute('data-value');
        if (val) {
          try {
            JsBarcode(el, val, { format:'CODE128', width:1.0, height:55, fontSize:6, margin:1, displayValue:true });
          } catch(e) {
            JsBarcode(el, val, { format:'CODE39', width:1.0, height:55, fontSize:6, margin:1, displayValue:true });
          }
        }
      });
      setTimeout(function() { window.print(); }, 600);
    });
  <\/script>
</body></html>`);
    pw.document.close();
  };

  const handleRemoverAtendimento = (id: string) => {
    const novos = atendimentosSalvos.filter(a => a.id !== id);
    setAtendimentosSalvos(novos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novos));
  };

  const handleLimparHistorico = () => {
    if (window.confirm('Limpar todo o histórico de atendimentos salvo localmente?')) {
      setAtendimentosSalvos([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative p-4 sm:p-8">
      
      {/* HEADER */}
      <div className="mb-8 shrink-0">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <TestTube className="h-6 w-6 text-indigo-600" />
          Integração DB Diagnósticos
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerenciamento e comunicação com o Web Service laboratorial (Protocolo SOAP)
        </p>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-200 mb-6 shrink-0 overflow-x-auto hide-scrollbar">
        {[
          { id: 'nova_solicitacao', label: 'Nova Solicitação', icon: Send },
          { id: 'acompanhamento', label: 'Rastreio e Laudos', icon: Activity },
          { id: 'pendencias', label: 'Etiquetas & Pendências', icon: AlertTriangle }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`
              flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap
              ${activeTab === tab.id 
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'}
            `}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10">
        
        {/* --- ABA: NOVA SOLICITAÇÃO --- */}
        {activeTab === 'nova_solicitacao' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-3xl">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Cadastrar Pedido de Exames</h2>
            
            {pedidoMensagem && (
              <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${pedidoMensagem.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                {pedidoMensagem.tipo === 'sucesso' ? <CheckCircle className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
                <p className="text-sm font-medium">{pedidoMensagem.texto}</p>
              </div>
            )}

            <form onSubmit={handleEnviarPedido} className="space-y-6">

              {/* Campo: Número do Atendimento Apoiado */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <label className="block text-xs font-bold text-indigo-700 mb-1">
                  Número do Atendimento Apoiado
                  <span className="ml-2 font-normal text-indigo-500">(deixe em branco para gerar automaticamente)</span>
                </label>
                <input
                  type="text"
                  value={solicitacao.numeroAtendimentoApoiado}
                  onChange={e => setSolicitacao({...solicitacao, numeroAtendimentoApoiado: e.target.value})}
                  className="w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm font-mono focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none placeholder:text-slate-400"
                  placeholder={`Ex: ATEND-${Date.now()} (será gerado automaticamente se vazio)`}
                  id="numero-atendimento-apoiado"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nome do Paciente</label>
                  <input
                    type="text"
                    required
                    value={solicitacao.nomePaciente}
                    onChange={e => setSolicitacao({...solicitacao, nomePaciente: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                    placeholder="Nome Completo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Data de Nascimento</label>
                  <input
                    type="date"
                    required
                    value={solicitacao.dataNascimento}
                    onChange={e => setSolicitacao({...solicitacao, dataNascimento: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Sexo Biológico</label>
                  <select
                    value={solicitacao.sexo}
                    onChange={e => setSolicitacao({...solicitacao, sexo: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Selecionar Exames (DB Diagnósticos)</label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-60 overflow-y-auto bg-slate-50 p-2 space-y-1">
                    {loadingExames ? (
                      <p className="text-sm text-slate-500 p-3 text-center">Carregando exames do banco...</p>
                    ) : examesDisponiveis.length === 0 ? (
                      <p className="text-sm text-slate-500 p-3 text-center">Nenhum exame importado ainda.</p>
                    ) : (
                      examesDisponiveis.map(exame => (
                        <label key={exame.codigo_exame_db} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                          <input
                            type="checkbox"
                            checked={solicitacao.examesSelecionados.includes(exame.codigo_exame_db)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSolicitacao(prev => ({...prev, examesSelecionados: [...prev.examesSelecionados, exame.codigo_exame_db]}));
                              } else {
                                setSolicitacao(prev => ({...prev, examesSelecionados: prev.examesSelecionados.filter(c => c !== exame.codigo_exame_db)}));
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{exame.descricao}</p>
                            <p className="text-[10px] text-slate-500">Cód: {exame.codigo_exame_db} • Mnemonico: {exame.mnemonico}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2 text-right">{solicitacao.examesSelecionados.length} exame(s) selecionado(s)</p>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingPedido}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingPedido ? (
                    <span className="animate-pulse">Enviando Protocolo...</span>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar Solicitação ao Laboratório
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- ABA: ACOMPANHAMENTO E LAUDOS --- */}
        {activeTab === 'acompanhamento' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Rastreabilidade de Pedido</h2>
              
              <form onSubmit={handleConsultarStatus} className="flex items-end gap-3 max-w-lg">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Número do Atendimento Apoiado</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={numAtendimentoBusca}
                      onChange={e => setNumAtendimentoBusca(e.target.value)}
                      placeholder="Ex: ATEND-123456789"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loadingStatus}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap"
                >
                  {loadingStatus ? 'Buscando...' : 'Consultar'}
                </button>
              </form>

              {statusError && (
                <p className="mt-4 text-sm text-rose-600 font-medium bg-rose-50 p-3 rounded-xl border border-rose-100">
                  {statusError}
                </p>
              )}
            </div>

            {statusResult && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Detalhes do Pedido DB: {statusResult.Pedido?.NumeroPedido}</h3>
                    <p className="text-sm text-slate-500">Atendimento Local: {statusResult.Pedido?.NumeroAtendimento}</p>
                  </div>
                  <button
                    onClick={() => handleVerLaudo()}
                    className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Ver Laudo Completo
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600 border-collapse">
                    <thead className="bg-slate-50 text-slate-700 uppercase text-[10px] font-black tracking-wider border-y border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Exame DB</th>
                        <th className="px-4 py-3">Status Atual</th>
                        <th className="px-4 py-3">Recebido DB</th>
                        <th className="px-4 py-3">Divulgação</th>
                        <th className="px-4 py-3">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statusResult.ListaProcedimento?.map((proc: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-800">{proc.CodigoExameDB}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {proc.StatusProducao}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs">{new Date(proc.DataHoraRecebimentoOrigem).toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs">{proc.DataHoraDivulgacao ? new Date(proc.DataHoraDivulgacao).toLocaleString() : '-'}</td>
                          <td className="px-4 py-3">
                             <button
                                onClick={() => handleVerLaudo(proc.CodigoExameDB)}
                                className="text-indigo-600 hover:text-indigo-800 font-bold text-xs underline decoration-indigo-300 underline-offset-2"
                              >
                                Laudo Específico
                              </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* === SEÇÃO: DOWNLOAD DE LAUDO PDF === */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Download className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-800">Download de Laudo (PDF)</h2>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Método SOAP: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-indigo-700">EnviaResultadoBase64</code> — 
                Recebe o laudo em Base64 e converte localmente para PDF.
              </p>

              <div className="flex items-end gap-3 max-w-lg">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Número do Atendimento Apoiado</label>
                  <input
                    type="text"
                    value={numAtendimentoBusca}
                    onChange={e => setNumAtendimentoBusca(e.target.value)}
                    placeholder="Ex: ATEND-123456789"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                    id="num-atendimento-laudo"
                  />
                </div>
                <button
                  onClick={() => handleDownloadLaudoPDF()}
                  disabled={downloadLaudoLoading || !numAtendimentoBusca}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  id="btn-download-laudo-pdf"
                >
                  {downloadLaudoLoading ? (
                    <span className="animate-pulse">Baixando...</span>
                  ) : (
                    <><Download className="h-4 w-4" /> Baixar Laudo (PDF)</>
                  )}
                </button>
              </div>

              {downloadLaudoSucesso && (
                <div className="mt-4 flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl p-3">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <p className="text-sm font-medium">{downloadLaudoSucesso}</p>
                </div>
              )}

              {downloadLaudoError && (
                <div className="mt-4 bg-rose-50 border border-rose-100 rounded-xl p-3">
                  <p className="text-sm font-bold text-rose-700 mb-1">Erro ao baixar laudo:</p>
                  <p className="text-sm text-rose-600">{downloadLaudoError}</p>
                </div>
              )}
            </div>

          </div>
        )}


        {/* --- ABA: PENDÊNCIAS E ETIQUETAS --- */}
        {activeTab === 'pendencias' && (
          <div className="space-y-6">

            {/* SEÇÃO 1: Histórico local de atendimentos + impressão de etiquetas */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-800">Etiquetas de Tubo — Histórico de Atendimentos</h2>
                </div>
                {atendimentosSalvos.length > 0 && (
                  <button onClick={handleLimparHistorico} className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Limpar histórico
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Cada pedido enviado com sucesso é salvo aqui. Clique em <strong>Imprimir Etiquetas</strong> para abrir a janela de impressão no formato <strong>2,5 cm × 5,0 cm</strong> (etiqueta de tubo).
              </p>

              {atendimentosSalvos.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Printer className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum atendimento enviado ainda.</p>
                  <p className="text-xs mt-1">Envie um pedido na aba <strong>Nova Solicitação</strong> para ver as etiquetas aqui.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {atendimentosSalvos.map((atend) => (
                    <div key={atend.id} className="border border-slate-200 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-800 text-sm">{atend.nomePaciente}</h4>
                            {atend.numeroPedidoDB && (
                              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-mono">
                                Ped. DB: {atend.numeroPedidoDB}
                              </span>
                            )}
                            {atend.status === 200 && (
                              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                                ✓ Aceito
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Atend. Apoiado: <span className="font-mono">{atend.numeroAtendimentoApoiado}</span>
                            {atend.numeroAtendimentoDB && <> • DB: <span className="font-mono">{atend.numeroAtendimentoDB}</span></>}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(atend.data).toLocaleString('pt-BR')} • {atend.examesSelecionados.length} exame(s)
                          </p>
                          {atend.codigoBarras && (
                            <p className="text-xs text-slate-400 font-mono mt-0.5">Código de barras: {atend.codigoBarras}</p>
                          )}
                          {/* Tubos retornados pelo DB */}
                          {atend.etiquetas && atend.etiquetas.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {atend.etiquetas.map((etq, i) => (
                                <span key={i} className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                  {etq.NomeTubo || etq.CodigoBarras || `Tubo ${i+1}`}
                                  {etq.CorTubo && ` • ${etq.CorTubo}`}
                                  {etq.MnemonicosExames && ` (${etq.MnemonicosExames})`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleImprimirEtiquetas(atend)}
                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                            title="Abre janela de impressão 25mm x 50mm com código de barras"
                          >
                            <Printer className="h-3.5 w-3.5" /> Imprimir Etiquetas
                          </button>
                          <button
                            onClick={() => handleRemoverAtendimento(atend.id)}
                            className="flex items-center gap-1 text-slate-400 hover:text-rose-500 px-2 py-2 rounded-lg text-xs transition-colors"
                            title="Remover do histórico local"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: Gestão de Pendências MPP do DB */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Pendências MPP no Apoio (DB Diagnósticos)</h2>
            
            <form onSubmit={handleBuscarPendencias} className="flex flex-wrap items-end gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Período Inicial</label>
                <input
                  type="datetime-local"
                  required
                  value={dataInicioPendencia}
                  onChange={e => setDataInicioPendencia(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Período Final</label>
                <input
                  type="datetime-local"
                  required
                  value={dataFimPendencia}
                  onChange={e => setDataFimPendencia(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={loadingPendencias}
                className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                {loadingPendencias ? 'Buscando...' : 'Buscar Pendências'}
              </button>
            </form>

            {pendenciasMessage && (
              <p className={`mb-4 text-sm font-medium p-3 rounded-lg border ${pendenciasMessage.tipo === 'sucesso' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'}`}>
                {pendenciasMessage.texto}
              </p>
            )}

            {pendencias.length > 0 && (
              <div className="space-y-4">
                {pendencias.map((pend, idx) => (
                  <div key={idx} className="border border-amber-200 bg-amber-50 rounded-xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
                      <div>
                        <h4 className="font-bold text-amber-900">{pend.NomePaciente}</h4>
                        <p className="text-xs text-amber-700">Atend. Local: {pend.NumeroAtendimentoApoiado} | DB: {pend.NumeroAtendimentoDB}</p>
                      </div>
                      <div className="flex gap-2">
                         <button
                          onClick={() => handleReimprimirEtiqueta(pend.NumeroAtendimentoApoiado)}
                          className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          <Printer className="h-3.5 w-3.5" /> Re-imprimir Etiqueta Original
                        </button>
                        <button
                          onClick={() => alert('Disparar endpoint de baixa de pendência para gerar EPL nova...')} // Aqui você conectaria com o POST
                          className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Baixar Pendência (Nova Etiqueta)
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-2 border border-amber-100">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Procedimentos com Pendência (MPP)</p>
                      <ul className="text-sm text-slate-700 list-disc list-inside">
                        {pend.ListaProcedimentoMPP?.map((p: any, i: number) => (
                          <li key={i}>
                            Código: <span className="font-bold">{p.CodigoExameDB}</span> (Status: {p.Status})
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>{/* fim SEÇÃO 2 */}
          </div>
        )}
      </div>
    </div>
  );
}
