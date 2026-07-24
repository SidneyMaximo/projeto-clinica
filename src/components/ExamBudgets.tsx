/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText, Plus, Trash2, Printer, Search, User, CheckCircle,
  ClipboardList, Package, DollarSign, Calendar, Info, X, Check, Stethoscope
} from 'lucide-react';
import { Exam, ExamBudget, ExamBudgetItem, Patient, UserSession, Doctor } from '../types';

interface ExamBudgetsProps {
  patients: Patient[];
  exams: Exam[];
  doctors: Doctor[];
  budgets: ExamBudget[];
  currentSession: UserSession;
  onAddBudget: (budget: Omit<ExamBudget, 'id' | 'createdAt' | 'operatorId' | 'operatorName'>) => void;
}

export default function ExamBudgets({
  patients,
  exams,
  doctors,
  budgets,
  currentSession,
  onAddBudget
}: ExamBudgetsProps) {
  // --- Form state ---
  const [patientMode, setPatientMode] = useState<'existing' | 'avulso'>('existing');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [avulsoName, setAvulsoName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<ExamBudgetItem[]>([]);
  const [examSearch, setExamSearch] = useState('');
  const [activeSelectionTab, setActiveSelectionTab] = useState<'exams' | 'consultations'>('exams');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // --- Budget history state ---
  const [viewingBudget, setViewingBudget] = useState<ExamBudget | null>(null);
  const [historySearch, setHistorySearch] = useState('');

  const printRef = useRef<HTMLDivElement>(null);

  // Filtered exams for selection
  const filteredExams = exams.filter(e =>
    e.name.toLowerCase().includes(examSearch.toLowerCase()) ||
    e.description.toLowerCase().includes(examSearch.toLowerCase())
  );

  // Filtered doctors for selection
  const filteredDoctors = doctors.filter(d =>
    d.name.toLowerCase().includes(examSearch.toLowerCase()) ||
    d.specialty.toLowerCase().includes(examSearch.toLowerCase())
  );

  // Get patient name for display
  const getPatientName = () => {
    if (patientMode === 'avulso') return avulsoName.trim() || 'Paciente Avulso';
    const p = patients.find(p => p.id === selectedPatientId);
    return p ? p.name : '';
  };

  // Add exam to selection
  const handleAddExam = (exam: Exam) => {
    setSelectedItems(prev => {
      const existing = prev.find(i => i.examId === exam.id);
      if (existing) {
        return prev.map(i => i.examId === exam.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { examId: exam.id, examName: exam.name, quantity: 1, unitPrice: exam.price }];
    });
  };

  // Add consultation to selection
  const handleAddConsultation = (doctor: Doctor) => {
    const price = doctor.consultationPrice !== undefined ? doctor.consultationPrice : 250.00;
    const itemName = `Consulta Clínica — Dr(a). ${doctor.name} (${doctor.specialty})`;
    setSelectedItems(prev => {
      const existing = prev.find(i => i.examId === doctor.id);
      if (existing) {
        return prev.map(i => i.examId === doctor.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { examId: doctor.id, examName: itemName, quantity: 1, unitPrice: price }];
    });
  };

  // Remove exam from selection
  const handleRemoveExam = (examId: string) => {
    setSelectedItems(prev => prev.filter(i => i.examId !== examId));
  };

  // Update quantity
  const handleQtyChange = (examId: string, qty: number) => {
    if (qty < 1) return;
    setSelectedItems(prev => prev.map(i => i.examId === examId ? { ...i, quantity: qty } : i));
  };

  const totalAmount = selectedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const patientName = getPatientName();

    if (!patientName) {
      setFormError('Por favor, selecione ou informe o nome do paciente.');
      return;
    }
    if (selectedItems.length === 0) {
      setFormError('Adicione pelo menos um exame ou consulta ao orçamento.');
      return;
    }

    const patientId = patientMode === 'existing' ? selectedPatientId : undefined;

    onAddBudget({
      patientId,
      patientName,
      items: selectedItems,
      totalAmount,
      notes,
      status: 'pendente'
    });

    // Reset form
    setSelectedPatientId('');
    setAvulsoName('');
    setNotes('');
    setSelectedItems([]);
    setExamSearch('');
    setFormSuccess('Orçamento gerado e salvo com sucesso!');
    setTimeout(() => setFormSuccess(''), 4000);
  };

  const handlePrint = (budget: ExamBudget) => {
    setViewingBudget(budget);
    setTimeout(() => window.print(), 300);
  };

  // Filtered history
  const filteredBudgets = budgets.filter(b =>
    b.patientName.toLowerCase().includes(historySearch.toLowerCase()) ||
    b.items.some(i => i.examName.toLowerCase().includes(historySearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-700 to-cyan-600 p-5 rounded-2xl text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold">Orçamentos de Exames & Consultas</h2>
            <p className="text-xs text-teal-100 mt-0.5">
              Gere orçamentos personalizados para exames e consultas médicas e entregue ao paciente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* ─── Formulário (7 cols) ─── */}
        <div className="xl:col-span-7 space-y-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                <ClipboardList className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-800">Novo Orçamento</h3>
                <p className="text-[10px] text-slate-400">Selecione exames ou consultas e gere o orçamento.</p>
              </div>
            </div>

            {/* Paciente */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Paciente
              </label>
              <div className="flex gap-3 mb-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={patientMode === 'existing'} onChange={() => setPatientMode('existing')}
                    className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-xs font-semibold text-slate-700">Cadastrado</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" checked={patientMode === 'avulso'} onChange={() => setPatientMode('avulso')}
                    className="w-3.5 h-3.5 text-teal-600" />
                  <span className="text-xs font-semibold text-slate-700">Avulso (sem cadastro)</span>
                </label>
              </div>

              {patientMode === 'existing' ? (
                <select
                  id="budget-patient-select"
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="">Selecione o paciente...</option>
                  {patients.filter(p => !p.isAnonymized).map(p => (
                    <option key={p.id} value={p.id}>{p.name} — CPF: {p.cpf}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="budget-avulso-name"
                  type="text"
                  placeholder="Nome do paciente avulso"
                  value={avulsoName}
                  onChange={e => setAvulsoName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              )}
            </div>

            {/* Busca de exames & consultas */}
            <div>
              <div className="flex border-b border-slate-200 mb-3 gap-4">
                <button
                  type="button"
                  onClick={() => setActiveSelectionTab('exams')}
                  className={`pb-2 px-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    activeSelectionTab === 'exams'
                      ? 'border-teal-600 text-teal-700 font-extrabold'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Exames
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSelectionTab('consultations')}
                  className={`pb-2 px-1 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    activeSelectionTab === 'consultations'
                      ? 'border-teal-600 text-teal-700 font-extrabold'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Consultas Médicas
                </button>
              </div>

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  id="exam-search-budget"
                  type="text"
                  placeholder={activeSelectionTab === 'exams' ? "Buscar exame..." : "Buscar médico ou especialidade..."}
                  value={examSearch}
                  onChange={e => setExamSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {activeSelectionTab === 'exams' ? (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredExams.length > 0 ? filteredExams.map(exam => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all cursor-pointer group"
                      onClick={() => handleAddExam(exam)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{exam.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{exam.description}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2 shrink-0">
                        <span className="text-xs font-extrabold text-teal-700">
                          R$ {exam.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="p-1 bg-teal-100 group-hover:bg-teal-600 rounded-lg transition-colors">
                          <Plus className="h-3 w-3 text-teal-600 group-hover:text-white" />
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum exame encontrado.</p>
                  )}
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredDoctors.length > 0 ? filteredDoctors.map(doctor => {
                    const price = doctor.consultationPrice !== undefined ? doctor.consultationPrice : 250.00;
                    return (
                      <div
                        key={doctor.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all cursor-pointer group"
                        onClick={() => handleAddConsultation(doctor)}
                      >
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg shrink-0">
                            <Stethoscope className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">Consulta — Dr(a). {doctor.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{doctor.specialty} • CRM: {doctor.crm}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-xs font-extrabold text-teal-700">
                            R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <div className="p-1 bg-teal-100 group-hover:bg-teal-600 rounded-lg transition-colors">
                            <Plus className="h-3 w-3 text-teal-600 group-hover:text-white" />
                          </div>
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum médico encontrado.</p>
                  )}
                </div>
              )}
            </div>

            {/* Itens selecionados */}
            {selectedItems.length > 0 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Itens do Orçamento
                </label>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 font-bold text-slate-500 text-[10px] uppercase">Exame</th>
                        <th className="text-center px-3 py-2 font-bold text-slate-500 text-[10px] uppercase w-16">Qtd.</th>
                        <th className="text-right px-3 py-2 font-bold text-slate-500 text-[10px] uppercase">Unit.</th>
                        <th className="text-right px-3 py-2 font-bold text-slate-500 text-[10px] uppercase">Total</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedItems.map(item => (
                        <tr key={item.examId} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2 text-slate-800 font-medium">{item.examName}</td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={e => handleQtyChange(item.examId, parseInt(e.target.value) || 1)}
                              className="w-12 text-center border border-slate-200 rounded-lg py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-slate-600 font-mono">
                            R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-right font-extrabold text-teal-700 font-mono">
                            R$ {(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveExam(item.examId)}
                              className="p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3 text-rose-500" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-teal-50 border-t-2 border-teal-100">
                      <tr>
                        <td colSpan={3} className="px-3 py-2.5 text-xs font-extrabold text-teal-800 uppercase tracking-wide">
                          Total do Orçamento
                        </td>
                        <td className="px-3 py-2.5 text-right text-base font-extrabold text-teal-700 font-mono">
                          R$ {totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Observações */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Observações (opcional)
              </label>
              <textarea
                id="budget-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Instruções de preparo, validade do orçamento, etc..."
                rows={2}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                {formSuccess}
              </div>
            )}

            <button
              id="generate-budget-btn"
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              Gerar e Salvar Orçamento
            </button>
          </form>
        </div>

        {/* ─── Histórico (5 cols) ─── */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800">Histórico de Orçamentos</h3>
              <p className="text-[10px] text-slate-400">{budgets.length} orçamento(s) gerado(s).</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-teal-500 w-32"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[60vh] pr-1">
            {filteredBudgets.length > 0 ? filteredBudgets.map(budget => (
              <div
                key={budget.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:border-teal-200 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-teal-600" />
                      <span className="text-xs font-bold text-slate-800">{budget.patientName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {new Date(budget.createdAt).toLocaleDateString('pt-BR')} às {new Date(budget.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-teal-700">
                      R$ {budget.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <div className="mt-0.5">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${
                        budget.status === 'aprovado' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        budget.status === 'expirado' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {budget.status}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mb-2.5">
                  {budget.items.map(item => (
                    <span key={item.examId} className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[9px] font-semibold text-slate-600">
                      {item.quantity}× {item.examName}
                    </span>
                  ))}
                </div>

                {budget.notes && (
                  <p className="text-[10px] text-slate-500 italic mb-2">{budget.notes}</p>
                )}

                <button
                  id={`print-budget-${budget.id}`}
                  onClick={() => handlePrint(budget)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-[10px] font-bold border border-teal-100 transition-all cursor-pointer"
                >
                  <Printer className="h-3 w-3" />
                  Imprimir / PDF
                </button>
              </div>
            )) : (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">Nenhum orçamento gerado ainda</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Utilize o formulário ao lado para criar o primeiro orçamento.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════*/}
      {viewingBudget && (
        <>
          {createPortal(
        <div id="print-area" className="hidden print:block" ref={printRef}>
          <style>{`
            @media print {
              body {
                background: white !important;
                color: black !important;
              }
              #app-layout {
                display: none !important;
              }
              #print-area {
                display: block !important;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
            }
          `}</style>
          <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#1e293b', maxWidth: '680px', margin: '0 auto', padding: '20px' }}>
            {/* Cabeçalho */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0d9488', paddingBottom: '16px', marginBottom: '20px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#0f766e', margin: 0 }}>
                Centro Médico Dr.Diogo Gonzaga
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b' }}>
                CNPJ: 67.148.560/0001-69 • Tel: 82981781586
              </p>
            </div>

            {/* Título do documento */}
            <div style={{ backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f766e' }}>
                  ORÇAMENTO DE EXAMES & CONSULTAS
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                  Ref. #{viewingBudget.id.toUpperCase()} • {new Date(viewingBudget.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Validade: 30 dias</p>
              </div>
            </div>

            {/* Dados do paciente */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Paciente
              </p>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                {viewingBudget.patientName}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                Emitido por: {viewingBudget.operatorName} • Data: {new Date(viewingBudget.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>

            {/* Tabela de exames */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exame / Procedimento</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Qtd.</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Valor Unit.</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {viewingBudget.items.map((item, idx) => (
                  <tr key={item.examId} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e293b' }}>{item.examName}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontFamily: 'monospace' }}>
                      R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#1e293b', fontFamily: 'monospace' }}>
                      R$ {(item.unitPrice * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#0f766e', color: 'white' }}>
                  <td colSpan={3} style={{ padding: '12px', fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total do Orçamento
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 900, fontSize: '16px', fontFamily: 'monospace' }}>
                    R$ {viewingBudget.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Observações */}
            {viewingBudget.notes && (
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>Observações</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#78350f' }}>{viewingBudget.notes}</p>
              </div>
            )}

            {/* Rodapé */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8' }}>
                Este orçamento é válido por 30 dias a partir da data de emissão. Valores sujeitos a alteração.
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#94a3b8' }}>
                Centro Médico Dr. Diogo Gonzaga • Sistema Clínico Seguro — LGPD Lei nº 13.709/2018
              </p>
            </div>

            {/* Botão fechar (só aparece na tela) */}
            <div className="print:hidden mt-6 flex justify-end">
              <button
                onClick={() => setViewingBudget(null)}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      , document.body)}
          <button className="text-slate-700 transition-all cursor-pointer">
            <X className="h-3.5 w-3.5" />
            Fechar Visualização
          </button>
        </>
      )}
    </div>
  );
}
