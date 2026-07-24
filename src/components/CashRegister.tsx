/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DollarSign, Wallet, CreditCard, Coins, Plus, Lock, ShieldAlert, User, Clock, Check, TrendingUp, Search, Info, ArrowUpCircle, ArrowDownCircle, TrendingDown, X, AlertTriangle, FileText } from 'lucide-react';
import { Patient, CashTransaction, UserSession, Appointment, Employee } from '../types';

interface CashRegisterProps {
  appointments: Appointment[];
  patients: Patient[];
  employees: Employee[];
  currentSession: UserSession;
  transactions: CashTransaction[];
  onAddTransaction: (transaction: Omit<CashTransaction, 'id' | 'timestamp' | 'operatorId' | 'operatorName'>) => void;
  onAddWithdrawal: (withdrawal: { description: string; amount: number }) => void;
}

// Motivos predefinidos para sangria
const WITHDRAWAL_REASONS = [
  'Pagamento de fornecedor',
  'Compra de material de escritório',
  'Pagamento de conta de serviço',
  'Reembolso a paciente',
  'Pagamento de colaborador',
  'Compra de material clínico/hospitalar',
  'Despesa com limpeza e higiene',
  'Outros (especificar abaixo)',
];

export default function CashRegister({
  appointments,
  patients,
  employees,
  currentSession,
  transactions,
  onAddTransaction,
  onAddWithdrawal
}: CashRegisterProps) {
  const isAdmin = currentSession.role === 'admin';
  const canWithdraw = currentSession.role === 'admin' || currentSession.role === 'receptionist';

  // --- Estados do formulário de ENTRADA ---
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<CashTransaction['paymentMethod']>('Pix');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // --- Estado de Fundo de Troco (Initial Cash) ---
  const [initialCash, setInitialCash] = useState<number>(() => {
    const saved = localStorage.getItem('clinic_initial_cash_today');
    const todayStr = new Date().toISOString().split('T')[0];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.date === todayStr) return parsed.amount;
      } catch (e) {}
    }
    return 0; // Padrão: 0
  });
  const [isEditingInitialCash, setIsEditingInitialCash] = useState<boolean>(false);
  const [tempInitialCash, setTempInitialCash] = useState<string>(initialCash.toString());

  const handleSaveInitialCash = () => {
    const parsed = parseFloat(tempInitialCash.replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      setInitialCash(parsed);
      localStorage.setItem('clinic_initial_cash_today', JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        amount: parsed
      }));
    }
    setIsEditingInitialCash(false);
  };

  // --- Estados do modal de SANGRIA ---
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalReason, setWithdrawalReason] = useState<string>('');
  const [withdrawalCustomReason, setWithdrawalCustomReason] = useState<string>('');
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [withdrawalError, setWithdrawalError] = useState<string>('');
  const [withdrawalSuccess, setWithdrawalSuccess] = useState<string>('');
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);

  // --- Estados de filtros (Admin) ---
  const [filterOperator, setFilterOperator] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('');
  const [filterType, setFilterType] = useState<string>(''); // '' | 'entrada' | 'saida'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPeriod, setFilterPeriod] = useState<'diario' | 'semanal' | 'mensal'>('diario');

  // --- Helper: calcular range de datas conforme período ---
  const getPeriodRange = () => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (filterPeriod === 'diario') {
      return { startStr: todayStr, endStr: todayStr };
    } else if (filterPeriod === 'semanal') {
      const start = new Date(now);
      start.setDate(now.getDate() - 6); // últimos 7 dias (hoje incluído)
      return { startStr: start.toISOString().split('T')[0], endStr: todayStr };
    } else {
      // Mensal: primeiro ao último dia do mês atual
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startStr: firstDay.toISOString().split('T')[0], endStr: todayStr };
    }
  };

  // --- Submissão de ENTRADA ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!description.trim()) {
      setErrorMessage('Por favor, informe a descrição do lançamento.');
      return;
    }

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Por favor, insira um valor válido maior que zero.');
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId);
    onAddTransaction({
      patientId: patient ? patient.id : undefined,
      patientName: patient ? patient.name : undefined,
      description,
      amount: parsedAmount,
      paymentMethod
    });

    setSelectedPatientId('');
    setDescription('');
    setAmount('');
    setPaymentMethod('Pix');
    setSuccessMessage('Entrada lançada no caixa com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // --- Submissão de SANGRIA ---
  const handleWithdrawalSubmit = () => {
    setWithdrawalError('');

    const isCustom = withdrawalReason === 'Outros (especificar abaixo)';
    const finalReason = isCustom ? withdrawalCustomReason.trim() : withdrawalReason;

    if (!finalReason) {
      setWithdrawalError('Selecione ou informe o motivo da retirada.');
      return;
    }
    if (isCustom && !withdrawalCustomReason.trim()) {
      setWithdrawalError('Por favor, descreva o motivo da retirada no campo de texto.');
      return;
    }

    const parsedAmount = parseFloat(withdrawalAmount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setWithdrawalError('Insira um valor válido maior que zero para a retirada.');
      return;
    }

    if (!confirmWithdrawal) {
      setWithdrawalError('Confirme a retirada marcando a caixa de confirmação.');
      return;
    }

    const description = `[SANGRIA] ${finalReason}`;
    onAddWithdrawal({ description, amount: parsedAmount });

    // Reset e fecha modal
    setShowWithdrawalModal(false);
    setWithdrawalReason('');
    setWithdrawalCustomReason('');
    setWithdrawalAmount('');
    setConfirmWithdrawal(false);
    setWithdrawalError('');
    setWithdrawalSuccess('Sangria registrada com sucesso!');
    setTimeout(() => setWithdrawalSuccess(''), 4000);
  };

  const openWithdrawalModal = () => {
    setWithdrawalReason('');
    setWithdrawalCustomReason('');
    setWithdrawalAmount('');
    setConfirmWithdrawal(false);
    setWithdrawalError('');
    setShowWithdrawalModal(true);
  };

  // --- Filtros ---
  const displayedTransactions = transactions.filter(tx => {
    if (!isAdmin && tx.operatorId !== currentSession.userId) return false;

    if (filterType === 'entrada' && tx.amount < 0) return false;
    if (filterType === 'saida' && tx.amount >= 0) return false;

    if (isAdmin) {
      const matchesOperator = filterOperator ? tx.operatorId === filterOperator : true;
      const matchesMethod = filterMethod ? tx.paymentMethod === filterMethod : true;
      const matchesSearch = searchQuery
        ? tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (tx.patientName && tx.patientName.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      return matchesOperator && matchesMethod && matchesSearch;
    }

    return true;
  });

  // --- Métricas ---
  const todayStr = new Date().toISOString().split('T')[0];
  const { startStr, endStr } = getPeriodRange();

  // Transações dentro do período
  const periodTransactions = transactions.filter(t => {
    const tDate = t.timestamp.split('T')[0];
    return tDate >= startStr && tDate <= endStr;
  });

  // Entradas Realizadas: Soma de todos os lançamentos positivos no período (agendamentos confirmados + lançamentos manuais)
  const totalEntradasRealizadas = periodTransactions
    .filter(t => t.amount > 0)
    .reduce((acc, t) => acc + t.amount, 0);

  // Saídas do período: Soma de todos os lançamentos negativos no período (sangrias / saídas)
  const totalSaidas = periodTransactions
    .filter(t => t.amount < 0)
    .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  
  // Saldo do Caixa: Entradas Realizadas - Saídas/Sangrias (Fundo de troco removido da soma por solicitação)
  const totalBalance = totalEntradasRealizadas - totalSaidas;

  // Métricas por Forma de Pagamento no período (soma total de entradas)
  const calcMethodTotal = (methods: string[]) => {
    return periodTransactions
      .filter(t => t.amount > 0 && t.paymentMethod && methods.includes(t.paymentMethod))
      .reduce((acc, t) => acc + t.amount, 0);
  };

  const pixTotal = calcMethodTotal(['Pix']);
  const moneyTotal = calcMethodTotal(['Dinheiro']);
  const cardsTotal = calcMethodTotal(['Cartão de Crédito', 'Cartão de Débito']);

  return (
    <div className="space-y-6">

      {/* ─── Cartões de Resumo ─── */}
      {/* Toggle de Período (somente Admin) */}
      {isAdmin && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Período:</span>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
            {(['diario', 'semanal', 'mensal'] as const).map(period => {
              const labels = { diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' };
              const isActive = filterPeriod === period;
              return (
                <button
                  key={period}
                  id={`period-filter-${period}`}
                  onClick={() => setFilterPeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-white hover:text-slate-800'
                  }`}
                >
                  {labels[period]}
                </button>
              );
            })}
          </div>
          <span className="text-[10px] text-slate-400 italic">
            {filterPeriod === 'diario' && 'Hoje'}
            {filterPeriod === 'semanal' && 'Últimos 7 dias'}
            {filterPeriod === 'mensal' && `${new Date().toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {/* Entradas Realizadas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ArrowUpCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Entradas Realizadas</p>
            {isAdmin ? (
              <p className="text-xl font-extrabold text-emerald-700">
                R$ {totalEntradasRealizadas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            ) : (
              <div className="flex items-center gap-1 text-slate-400 font-bold text-xs mt-1">
                <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Bloqueado</span>
              </div>
            )}
          </div>
        </div>

        {/* Total Saídas / Sangria */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-xl">
            <ArrowDownCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Saídas / Sangria</p>
            {isAdmin ? (
              <p className="text-xl font-extrabold text-rose-600">
                R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            ) : (
              <div className="flex items-center gap-1 text-slate-400 font-bold text-xs mt-1">
                <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Bloqueado</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Saldo Destaque */}
      <div className={`p-5 rounded-2xl border shadow-sm flex items-center gap-4 ${isAdmin ? (totalBalance >= 0 ? 'bg-teal-950 border-teal-800' : 'bg-rose-950 border-rose-800') : 'bg-white border-slate-100'}`}>
        <div className={`p-3 rounded-xl ${isAdmin ? 'bg-white/10' : 'bg-teal-50'}`}>
          <Wallet className={`h-6 w-6 ${isAdmin ? 'text-white' : 'text-teal-600'}`} />
        </div>
        <div>
          <p className={`text-[10px] font-bold uppercase ${isAdmin ? 'text-white/60' : 'text-slate-400'}`}>Saldo Total do Caixa</p>
          {isAdmin ? (
            <p className={`text-2xl font-extrabold ${totalBalance >= 0 ? 'text-white' : 'text-rose-300'}`}>
              R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          ) : (
            <div className="flex items-center gap-1 text-slate-400 font-bold text-xs mt-1">
              <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Bloqueado (Admin)</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Workspace principal ─── */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6">

        {/* ─── Painel de formulários (5 cols) ─── */}
        <div className="lg:col-span-5 space-y-4">

          {/* Formulário de ENTRADA */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                <ArrowUpCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Lançar Entrada de Valores</h3>
                <p className="text-[10px] text-slate-400">Registre valores recebidos no caixa.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Paciente Associado (Opcional)
                </label>
                <select
                  id="tx-patient-select"
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="">Nenhum (Lançamento avulso)</option>
                  {patients.filter(p => !p.isAnonymized).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Descrição
                </label>
                <input
                  id="tx-description"
                  type="text"
                  placeholder="Ex: Consulta de Cardiologia"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Consulta Particular', 'Procedimento Clínico', 'Exame Especialista'].map(s => (
                    <button key={s} type="button" onClick={() => setDescription(s)}
                      className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-2 py-1 rounded transition-all cursor-pointer">
                      + {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Valor (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                  <input
                    id="tx-amount"
                    type="text"
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Forma de Pagamento
                </label>
                <select
                  id="tx-payment-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as CashTransaction['paymentMethod'])}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Pix">⚡ Pix</option>
                  <option value="Dinheiro">💵 Dinheiro</option>
                  <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                  <option value="Cartão de Débito">💳 Cartão de Débito</option>
                  <option value="Convênio">🏥 Convênio / Plano de Saúde</option>
                </select>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-2 items-start text-xs text-rose-700 font-medium">
                  <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {successMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-2 items-center text-xs text-emerald-800 font-semibold">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                id="submit-tx-btn"
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Registrar Entrada de Valores
              </button>
            </form>
          </div>

          {/* Botão de SANGRIA */}
          {canWithdraw && (
            <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 border-b border-rose-50 pb-3">
                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800">Retirada / Sangria de Caixa</h3>
                  <p className="text-[10px] text-slate-400">Registre saídas de valores do caixa com justificativa obrigatória.</p>
                </div>
              </div>

              {withdrawalSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex gap-2 items-center text-xs text-emerald-800 font-semibold">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{withdrawalSuccess}</span>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2 text-[10px] text-amber-800 leading-relaxed">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p>
                  Toda retirada é registrada no <strong>livro caixa</strong> e no <strong>log de auditoria</strong> com o nome do operador e o motivo informado.
                </p>
              </div>

              <button
                id="open-withdrawal-modal-btn"
                type="button"
                onClick={openWithdrawalModal}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowDownCircle className="h-4 w-4" />
                Realizar Retirada de Caixa
              </button>
            </div>
          )}

          {/* Info */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex gap-2 items-start text-[10px] text-slate-500 leading-normal">
            <Info className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
            <p>Os lançamentos são vinculados ao perfil do operador e entram na trilha de auditoria para compliance financeiro.</p>
          </div>
        </div>

        {/* ─── Painel do Livro Caixa (7 cols) ─── */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 flex flex-col h-[calc(100vh-14rem)] min-h-[360px] sm:min-h-[520px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3 mb-4 shrink-0">
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                {isAdmin ? 'Livro Caixa Consolidado' : 'Seus Lançamentos'}
              </h3>
              <p className="text-[10px] text-slate-400">
                {isAdmin ? 'Todas as entradas e saídas registradas no sistema.' : 'Lançamentos inseridos sob sua conta nesta sessão.'}
              </p>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              {/* Filtro Tipo (entrada/saída) — visível para todos */}
              <select
                id="tx-filter-type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] text-slate-600 cursor-pointer font-sans"
              >
                <option value="">Todos</option>
                <option value="entrada">✅ Entradas</option>
                <option value="saida">🔴 Saídas</option>
              </select>

              {isAdmin && (
                <>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search className="h-3.5 w-3.5" />
                    </span>
                    <input
                      id="tx-search-input"
                      type="text"
                      placeholder="Buscar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-6.5 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-600 w-28"
                    />
                  </div>
                  <select
                    id="tx-filter-method"
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] text-slate-600 cursor-pointer font-sans"
                  >
                    <option value="">Métodos</option>
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">C. Crédito</option>
                    <option value="Cartão de Débito">C. Débito</option>
                    <option value="Convênio">Convênio</option>
                  </select>
                  <select
                    id="tx-filter-operator"
                    value={filterOperator}
                    onChange={(e) => setFilterOperator(e.target.value)}
                    className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] text-slate-600 cursor-pointer font-sans"
                  >
                    <option value="">Operadores</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </div>

          {/* Lista de transações */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {displayedTransactions.length > 0 ? (
              displayedTransactions.map((tx) => {
                const isSangria = tx.amount < 0;

                let badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                if (tx.paymentMethod === 'Pix') badgeColor = 'bg-cyan-50 text-cyan-700 border-cyan-100';
                if (tx.paymentMethod === 'Dinheiro') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                if (tx.paymentMethod === 'Convênio') badgeColor = 'bg-slate-100 text-slate-600 border-slate-200';

                return (
                  <div
                    key={tx.id}
                    className={`p-3.5 rounded-xl flex items-center justify-between hover:border-slate-300 transition-all text-xs border ${
                      isSangria
                        ? 'bg-rose-50/60 border-rose-200/80'
                        : 'bg-slate-50 border-slate-200/60'
                    }`}
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Ícone de tipo */}
                        {isSangria ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 font-bold text-[9px] rounded-full border bg-rose-100 text-rose-700 border-rose-200 shrink-0">
                            <ArrowDownCircle className="h-2.5 w-2.5" /> SANGRIA
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 font-bold text-[9px] rounded-full border shrink-0 ${badgeColor}`}>
                            {tx.paymentMethod}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-700 font-bold truncate">
                          {isSangria
                            ? tx.description.replace('[SANGRIA] ', '')
                            : tx.description}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[9px] text-slate-400 font-mono">
                        {tx.patientName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {tx.patientName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(tx.timestamp).toLocaleDateString()}
                        </span>
                        {isAdmin && (
                          <span className={`font-semibold px-1 py-0.5 rounded text-[8px] font-sans ${isSangria ? 'text-rose-600 bg-rose-100' : 'text-teal-600 bg-teal-50'}`}>
                            Op: {tx.operatorName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={`text-right font-mono font-extrabold ml-3 shrink-0 ${isSangria ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {isSangria ? '−' : '+'}
                      R$ {Math.abs(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <DollarSign className="h-9 w-9 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Nenhum lançamento localizado</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
                  {isAdmin ? 'Nenhuma transação atende aos filtros selecionados.' : 'Você ainda não realizou lançamentos nesta sessão.'}
                </p>
              </div>
            )}
          </div>

          {/* Rodapé do livro caixa */}
          {isAdmin && displayedTransactions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 shrink-0 flex justify-between items-center">
              <span className="text-[10px] text-slate-400">{displayedTransactions.length} lançamento(s) exibido(s)</span>
              <div className="flex items-center gap-4 text-xs font-bold font-mono">
                <span className="text-emerald-700">
                  + R$ {displayedTransactions.filter(t => t.amount > 0).reduce((a, t) => a + t.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-rose-600">
                  − R$ {Math.abs(displayedTransactions.filter(t => t.amount < 0).reduce((a, t) => a + t.amount, 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL DE SANGRIA
      ══════════════════════════════════════════════════ */}
      {showWithdrawalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md border border-rose-100 overflow-hidden max-h-[95dvh] overflow-y-auto">
            {/* Header do modal */}
            <div className="bg-gradient-to-r from-rose-600 to-rose-500 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <TrendingDown className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white">Retirada / Sangria de Caixa</h2>
                  <p className="text-[11px] text-rose-100 mt-0.5">Operador: <strong>{currentSession.name}</strong></p>
                </div>
              </div>
              <button
                id="close-withdrawal-modal"
                onClick={() => setShowWithdrawalModal(false)}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Aviso */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start text-[11px] text-amber-800">
                <FileText className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p>A retirada será registrada com <strong>nome do operador, data, hora e motivo</strong> no livro caixa e no log de auditoria LGPD.</p>
              </div>

              {/* Motivo da retirada */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Motivo da Retirada <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  {WITHDRAWAL_REASONS.map(reason => (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        withdrawalReason === reason
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="withdrawal-reason"
                        value={reason}
                        checked={withdrawalReason === reason}
                        onChange={() => setWithdrawalReason(reason)}
                        className="accent-rose-600 shrink-0"
                      />
                      <span className="text-xs font-medium">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Campo de motivo customizado */}
              {withdrawalReason === 'Outros (especificar abaixo)' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Descreva o Motivo <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="withdrawal-custom-reason"
                    rows={3}
                    placeholder="Descreva detalhadamente a finalidade desta retirada..."
                    value={withdrawalCustomReason}
                    onChange={(e) => setWithdrawalCustomReason(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                  />
                </div>
              )}

              {/* Valor */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Valor da Retirada (R$) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-extrabold text-rose-400">R$</span>
                  <input
                    id="withdrawal-amount"
                    type="text"
                    placeholder="0,00"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-extrabold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 font-mono"
                  />
                </div>
              </div>

              {/* Confirmação */}
              <label className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl cursor-pointer">
                <input
                  id="withdrawal-confirm-checkbox"
                  type="checkbox"
                  checked={confirmWithdrawal}
                  onChange={(e) => setConfirmWithdrawal(e.target.checked)}
                  className="accent-rose-600 mt-0.5 shrink-0 h-4 w-4"
                />
                <span className="text-[11px] text-rose-800 leading-relaxed font-medium">
                  Confirmo que esta retirada é autorizada e que as informações fornecidas são verdadeiras. Estou ciente de que esta operação é rastreada e auditada.
                </span>
              </label>

              {/* Erros */}
              {withdrawalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex gap-2 items-start text-xs text-rose-700 font-medium">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{withdrawalError}</span>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowWithdrawalModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="confirm-withdrawal-btn"
                  type="button"
                  onClick={handleWithdrawalSubmit}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowDownCircle className="h-4 w-4" />
                  Confirmar Retirada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
