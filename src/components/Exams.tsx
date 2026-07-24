/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Exam, Patient, Doctor, Procedure, Appointment, UserSession } from '../types';
import { Plus, Edit2, Trash2, Search, Activity, Clock, DollarSign, FileText, ClipboardCopy, Check, AlertCircle, ShieldAlert } from 'lucide-react';

interface ExamsProps {
  patients: Patient[];
  doctors: Doctor[];
  currentSession: UserSession;
  exams: Exam[];
  onAddExam: (exam: Omit<Exam, 'id'>) => Promise<void>;
  onUpdateExam: (id: string, exam: Omit<Exam, 'id'>) => Promise<void>;
  onDeleteExam: (id: string) => Promise<void>;
  onAddProcedure: (proc: Omit<Procedure, 'id'>) => Promise<void>;
  onAddAppointment: (app: Omit<Appointment, 'id'>) => Promise<void>;
}

export default function Exams({
  patients,
  doctors,
  currentSession,
  exams,
  onAddExam,
  onUpdateExam,
  onDeleteExam,
  onAddProcedure,
  onAddAppointment
}: ExamsProps) {
  const isAdmin = currentSession.role === 'admin';

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Form (Add / Edit) Visibility & State
  const [showForm, setShowForm] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [price, setPrice] = useState<string>('150.00');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Modal (Offer Exam to Patient) State
  const [selectedExamForOffer, setSelectedExamForOffer] = useState<Exam | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [offerType, setOfferType] = useState<'procedure' | 'appointment'>('procedure');
  const [offerDate, setOfferDate] = useState('');
  const [offerTime, setOfferTime] = useState('08:00');
  const [offerNotes, setOfferNotes] = useState('');
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState('');

  // Reset offer modal states
  const closeOfferModal = () => {
    setSelectedExamForOffer(null);
    setSelectedPatientId('');
    setSelectedDoctorId('');
    setOfferType('procedure');
    setOfferDate('');
    setOfferTime('08:00');
    setOfferNotes('');
    setOfferError('');
    setOfferSuccess('');
  };

  // Filter exams by query
  const filteredExams = exams.filter(exam => 
    exam.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Form submit (Create or Update Exam)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!name.trim() || !description.trim()) {
      setFormError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Por favor, insira um valor válido para o exame.');
      return;
    }

    try {
      if (editingExamId) {
        await onUpdateExam(editingExamId, {
          name: name.trim(),
          description: description.trim(),
          durationMinutes: duration,
          price: priceNum
        });
        setFormSuccess('Exame atualizado com sucesso!');
      } else {
        await onAddExam({
          name: name.trim(),
          description: description.trim(),
          durationMinutes: duration,
          price: priceNum
        });
        setFormSuccess('Exame cadastrado com sucesso!');
      }

      // Reset form states
      setName('');
      setDescription('');
      setDuration(30);
      setPrice('150.00');
      setEditingExamId(null);
      setTimeout(() => {
        setShowForm(false);
        setFormSuccess('');
      }, 1000);
    } catch (err: any) {
      setFormError(err.message || 'Falha ao salvar exame.');
    }
  };

  // Cancel edit/add form
  const handleCancel = () => {
    setName('');
    setDescription('');
    setDuration(30);
    setPrice('150.00');
    setEditingExamId(null);
    setShowForm(false);
    setFormError('');
    setFormSuccess('');
  };

  // Start Edit Mode
  const startEdit = (exam: Exam) => {
    setName(exam.name);
    setDescription(exam.description);
    setDuration(exam.durationMinutes);
    setPrice(exam.price.toString());
    setEditingExamId(exam.id);
    setShowForm(true);
    // Scroll to form smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit Exam Offer (Link to patient)
  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfferError('');
    setOfferSuccess('');

    if (!selectedExamForOffer) return;
    if (!selectedPatientId) {
      setOfferError('Por favor, selecione um paciente.');
      return;
    }
    if (!selectedDoctorId) {
      setOfferError('Por favor, selecione o médico/responsável.');
      return;
    }
    if (!offerDate) {
      setOfferError('Por favor, informe a data.');
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId);
    const doctor = doctors.find(d => d.id === selectedDoctorId);

    if (!patient || !doctor) {
      setOfferError('Paciente ou médico inválido.');
      return;
    }

    try {
      if (offerType === 'procedure') {
        // Register as a completed procedure
        await onAddProcedure({
          patientId: patient.id,
          patientName: patient.name,
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          date: offerDate,
          type: 'Exame Clínico',
          name: selectedExamForOffer.name,
          notes: offerNotes || `Exame Clínico realizado: ${selectedExamForOffer.description}`,
          riskClass: 'Baixo',
          durationMinutes: selectedExamForOffer.durationMinutes
        });
        setOfferSuccess('Exame registrado como procedimento realizado com sucesso!');
      } else {
        // Create an appointment
        await onAddAppointment({
          patientId: patient.id,
          patientName: patient.name,
          doctorId: doctor.id,
          doctorName: doctor.name,
          specialty: doctor.specialty,
          date: offerDate,
          time: offerTime,
          status: 'Agendado',
          notes: offerNotes || `Agendamento para realização de Exame: ${selectedExamForOffer.name}`,
          price: selectedExamForOffer.price,
          paymentMethod: 'Dinheiro'
        });
        setOfferSuccess('Exame agendado com sucesso!');
      }

      setTimeout(() => {
        closeOfferModal();
      }, 1500);
    } catch (err: any) {
      setOfferError(err.message || 'Falha ao vincular exame.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section with Stats */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Activity className="h-6 w-6 text-teal-600 animate-pulse" />
            Catálogo & Gestão de Exames
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Gerencie os exames oferecidos pela clínica e adicione-os diretamente ao atendimento dos pacientes.
          </p>
        </div>
        
        {/* Toggle Form Button */}
        <button
          onClick={() => {
            if (showForm) {
              handleCancel();
            } else {
              setShowForm(true);
            }
          }}
          className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm font-sans"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Fechar Formulário' : 'Novo Exame'}
        </button>
      </div>

      {/* Inline Form to Add / Edit Exam */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-teal-500/30 p-6 shadow-md space-y-4 animate-fade-in">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {editingExamId ? `Editar Exame: ${name}` : 'Cadastrar Novo Exame'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome do Exame *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Ultrassonografia Transvaginal, Coleta de Sangue"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Duração Média (minutos)</label>
                  <input
                    type="number"
                    min={5}
                    value={duration}
                    onChange={e => setDuration(parseInt(e.target.value) || 30)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="150.00"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-slate-800 font-mono font-bold"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Descrição / Notas do Exame *</label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Descreva o procedimento, recomendações de jejum e finalidade do exame..."
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 text-slate-800"
                required
              />
            </div>

            {formError && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-700 text-xs px-4 py-2.5 rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs px-4 py-2.5 rounded-xl">
                <Check className="h-4 w-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer font-sans"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer font-sans"
              >
                {editingExamId ? 'Salvar Alterações' : 'Salvar Exame'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main List Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:max-w-md bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl focus-within:ring-2 focus-within:ring-teal-500/30 transition-all">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar exames por nome ou descrição..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs w-full focus:outline-none"
          />
        </div>
        
        <div className="text-slate-400 text-[11px] font-medium font-sans">
          Total de exames cadastrados: <span className="font-bold text-slate-700">{filteredExams.length}</span>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="py-4 px-5">Nome do Exame</th>
                <th className="py-4 px-5">Descrição</th>
                <th className="py-4 px-5 text-center">Duração</th>
                <th className="py-4 px-5 text-right">Valor</th>
                <th className="py-4 px-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-slate-400 font-sans">
                    Nenhum exame cadastrado ou encontrado.
                  </td>
                </tr>
              ) : (
                filteredExams.map(exam => (
                  <tr key={exam.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-teal-50 text-teal-600 rounded-xl shrink-0">
                          <Activity className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-slate-800 text-xs">{exam.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <p className="text-xs text-slate-500 leading-normal max-w-sm font-sans">{exam.description}</p>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {exam.durationMinutes}m
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right font-mono font-black text-xs text-teal-600">
                      R$ {exam.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center justify-center gap-2">
                        {/* Offer/Add to Service Button */}
                        <button
                          onClick={() => setSelectedExamForOffer(exam)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:text-white bg-teal-50 hover:bg-teal-600 px-2.5 py-1.5 rounded-lg border border-teal-100 hover:border-teal-600 transition-all cursor-pointer shadow-xs font-sans"
                          title="Oferecer exame e vincular a paciente"
                        >
                          <ClipboardCopy className="h-3.5 w-3.5" />
                          Oferecer
                        </button>
                        
                        {/* Edit Button */}
                        <button
                          onClick={() => startEdit(exam)}
                          className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all cursor-pointer"
                          title="Editar dados do exame"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        
                        {/* Delete Button */}
                        <button
                          onClick={async () => {
                            if (window.confirm(`Excluir permanentemente o exame "${exam.name}"? Esta ação não pode ser desfeita.`)) {
                              try {
                                await onDeleteExam(exam.id);
                              } catch (err: any) {
                                alert(err.message || 'Erro ao deletar exame.');
                              }
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Remover exame"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Oferecer/Adicionar ao Atendimento */}
      {selectedExamForOffer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 bg-teal-600 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-sm">Vincular Exame ao Atendimento</h3>
                <p className="text-[10px] text-teal-100 mt-0.5">Exame selecionado: {selectedExamForOffer.name}</p>
              </div>
              <button
                onClick={closeOfferModal}
                className="text-white hover:text-teal-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOfferSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 font-sans">
              
              {/* Type of Binding */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Ação a Realizar</label>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setOfferType('procedure')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      offerType === 'procedure' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Registrar Realizado
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfferType('appointment')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      offerType === 'appointment' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Criar Agendamento
                  </button>
                </div>
              </div>

              {/* Patient Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selecione o Paciente *</label>
                <select
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 cursor-pointer font-sans"
                  required
                >
                  <option value="">Selecione o paciente cadastrado...</option>
                  {patients.filter(p => !p.isAnonymized).map(p => (
                    <option key={p.id} value={p.id}>{p.name} (CPF: {p.cpf})</option>
                  ))}
                </select>
              </div>

              {/* Doctor / Attendant Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  {offerType === 'procedure' ? 'Médico Solicitante / Executor *' : 'Especialista Solicitado *'}
                </label>
                <select
                  value={selectedDoctorId}
                  onChange={e => setSelectedDoctorId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 cursor-pointer font-sans"
                  required
                >
                  <option value="">Selecione o especialista...</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>Dr(a). {d.name} ({d.specialty})</option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data *</label>
                  <input
                    type="date"
                    value={offerDate}
                    onChange={e => setOfferDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    required
                  />
                </div>

                {offerType === 'appointment' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Horário *</label>
                    <input
                      type="time"
                      value={offerTime}
                      onChange={e => setOfferTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor do Exame</label>
                    <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-mono font-bold">
                      R$ {selectedExamForOffer.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observações do Vínculo</label>
                <textarea
                  rows={2}
                  value={offerNotes}
                  onChange={e => setOfferNotes(e.target.value)}
                  placeholder="Ex: Paciente fará jejum de 8h. Ultrassom obstétrica."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-sans"
                />
              </div>

              {offerError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-700 text-xs px-4 py-2.5 rounded-xl">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{offerError}</span>
                </div>
              )}

              {offerSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs px-4 py-2.5 rounded-xl animate-fade-in">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{offerSuccess}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 justify-end shrink-0">
                <button
                  type="button"
                  onClick={closeOfferModal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1 font-sans"
                >
                  <Check className="h-4 w-4" />
                  Confirmar Vínculo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
