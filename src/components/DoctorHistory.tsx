/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react'; // Apenas um comentário para forçar a atualização do diff
import { User, Activity, Clock, ShieldAlert, Award, FileText, Plus, Check, SlidersHorizontal, FolderHeart, Calendar, History, Image, DollarSign, Mail, Phone, Users, Shield } from 'lucide-react';
import { Doctor, Procedure, Patient, Employee, UserSession } from '../types';

interface DoctorHistoryProps {
  doctors: Doctor[];
  procedures: Procedure[];
  patients: Patient[];
  employees: Employee[];
  currentSession: UserSession;
  onAddProcedure: (procedure: Omit<Procedure, 'id'>) => void;
  onAddDoctor: (doctor: Omit<Doctor, 'id' | 'twoFactorSecret' | 'is2FAEnabled'>) => void;
  onAddEmployee: (employee: Omit<Employee, 'id'>) => void;
}

export default function DoctorHistory({
  doctors,
  procedures,
  patients,
  employees,
  currentSession,
  onAddProcedure,
  onAddDoctor,
  onAddEmployee
}: DoctorHistoryProps) {
  const isAdmin = currentSession.role === 'admin';
  const canManageDoctors = isAdmin || currentSession.role === 'receptionist';

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(doctors[0]?.id || '');
  const [showAddProcedure, setShowAddProcedure] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'doctors' | 'employees'>('doctors');

  // Modals visibility
  const [showAddDoctorModal, setShowAddDoctorModal] = useState<boolean>(false);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState<boolean>(false);

  // Form states for new procedure
  const [patientId, setPatientId] = useState<string>('');
  const [procedureDate, setProcedureDate] = useState<string>('');
  const [procedureType, setProcedureType] = useState<Procedure['type']>('Consulta');
  const [procedureName, setProcedureName] = useState<string>('');
  const [procedureNotes, setProcedureNotes] = useState<string>('');
  const [riskClass, setRiskClass] = useState<Procedure['riskClass']>('Baixo');
  const [duration, setDuration] = useState<number>(30);
  const [procedureError, setProcedureError] = useState<string>('');

  // Form states for new Doctor
  const [docName, setDocName] = useState<string>('');
  const [docCRM, setDocCRM] = useState<string>('');
  const [docSpecialty, setDocSpecialty] = useState<string>('Cardiologia');
  const [docEmail, setDocEmail] = useState<string>('');
  const [docPhone, setDocPhone] = useState<string>('');
  const [docPrice, setDocPrice] = useState<string>('250,00');
  const [docPassword, setDocPassword] = useState<string>('123456');
  const [docAvatar, setDocAvatar] = useState<string>('');
  const [docError, setDocError] = useState<string>('');

  // Form states for new Employee
  const [empName, setEmpName] = useState<string>('');
  const [empRole, setEmpRole] = useState<Employee['role']>('receptionist');
  const [empEmail, setEmpEmail] = useState<string>('');
  const [empPhone, setEmpPhone] = useState<string>('');
  const [empPassword, setEmpPassword] = useState<string>('123456');
  const [empAvatar, setEmpAvatar] = useState<string>('');
  const [empError, setEmpError] = useState<string>('');

  const activeDoctor = doctors.find(d => d.id === selectedDoctorId);

  // Filter procedures by selected doctor
  const doctorProcedures = procedures.filter(p => p.doctorId === selectedDoctorId);

  // Compute metrics
  const totalProcedures = doctorProcedures.length;
  const totalMinutes = doctorProcedures.reduce((acc, p) => acc + p.durationMinutes, 0);
  const avgDuration = totalProcedures > 0 ? Math.round(totalMinutes / totalProcedures) : 0;
  
  const consultCount = doctorProcedures.filter(p => p.type === 'Consulta').length;
  const surgeryCount = doctorProcedures.filter(p => p.type === 'Cirurgia').length;
  const examCount = doctorProcedures.filter(p => p.type === 'Exame Clínico').length;

  const handleSubmitProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    setProcedureError('');

    if (!isAdmin) {
      setProcedureError('Apenas administradores podem lançar registros de procedimentos.');
      return;
    }
    if (!activeDoctor) return;
    if (!patientId) {
      setProcedureError('Por favor, selecione o paciente.');
      return;
    }
    if (!procedureName || !procedureDate) {
      setProcedureError('Por favor, defina o nome e data do procedimento.');
      return;
    }

    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    onAddProcedure({
      patientId: patient.id,
      patientName: patient.name,
      doctorId: activeDoctor.id,
      doctorName: activeDoctor.name,
      specialty: activeDoctor.specialty,
      date: procedureDate,
      type: procedureType,
      name: procedureName,
      notes: procedureNotes,
      riskClass: riskClass,
      durationMinutes: Number(duration)
    });

    // Reset Form
    setPatientId('');
    setProcedureDate('');
    setProcedureType('Consulta');
    setProcedureName('');
    setProcedureNotes('');
    setRiskClass('Baixo');
    setDuration(30);
    setShowAddProcedure(false);
  };

  const handleCreateDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    setDocError('');

    if (!canManageDoctors) return;
    if (!docName.trim() || !docCRM.trim() || !docEmail.trim() || !docPhone.trim() || !docPassword.trim()) {
      setDocError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    const parsedPrice = parseFloat(docPrice.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setDocError('Por favor, insira um preço de consulta válido.');
      return;
    }

    onAddDoctor({
      name: docName,
      crm: docCRM,
      specialty: docSpecialty,
      email: docEmail,
      phone: docPhone,
      consultationPrice: parsedPrice,
      avatar: '',
      password: docPassword
    });

    // Reset form
    setDocName('');
    setDocCRM('');
    setDocSpecialty('Cardiologia');
    setDocEmail('');
    setDocPhone('');
    setDocPrice('250,00');
    setDocPassword('123456');
    setShowAddDoctorModal(false);
  };

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setEmpError('');

    if (!isAdmin) return;
    if (!empName.trim() || !empEmail.trim() || !empPhone.trim() || !empPassword.trim()) {
      setEmpError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    onAddEmployee({
      name: empName,
      role: empRole,
      email: empEmail,
      phone: empPhone,
      avatar: '',
      password: empPassword
    });

    // Reset form
    setEmpName('');
    setEmpRole('receptionist');
    setEmpEmail('');
    setEmpPhone('');
    setEmpPassword('123456');
    setShowAddEmployeeModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Sub Tabs Selector & Admin Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        
        {/* Toggle sub-tab view */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('doctors')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'doctors' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="h-4 w-4" />
            Especialistas & Histórico
          </button>
          <button
            onClick={() => setActiveSubTab('employees')}
            className={`flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeSubTab === 'employees' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            Equipe da Clínica
          </button>
        </div>

        {/* Action buttons */}
        {canManageDoctors ? (
          <div className="flex gap-2 w-full md:w-auto">
            {activeSubTab === 'doctors' ? (
              <>
                <button
                  id="btn-add-doctor"
                  onClick={() => setShowAddDoctorModal(true)}
                  className="flex-1 md:flex-none bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Cadastrar Especialista
                </button>
                {isAdmin && (
                  <button
                    id="btn-toggle-add-procedure"
                    onClick={() => setShowAddProcedure(!showAddProcedure)}
                    className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Lançar Procedimento
                  </button>
                )}
              </>
            ) : isAdmin ? (
              <button
                id="btn-add-employee"
                onClick={() => setShowAddEmployeeModal(true)}
                className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Cadastrar Colaborador
              </button>
            ) : null}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200/50 py-2 px-3 rounded-xl flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
            <Shield className="h-4 w-4 text-teal-600 shrink-0" />
            <span>Painel Administrativo Restrito para Cadastro</span>
          </div>
        )}
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeSubTab === 'doctors' && (
        <>
          {/* Doctor selector bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5 text-teal-600" />
              Selecionar Especialista:
            </span>
            <div className="flex gap-2 flex-wrap">
              {doctors.map(d => (
                <button
                  id={`btn-select-doc-${d.id}`}
                  key={d.id}
                  onClick={() => {
                    setSelectedDoctorId(d.id);
                    setShowAddProcedure(false);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedDoctorId === d.id ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Dr(a). {d.name.split(' ')[1] || d.name} ({d.specialty})
                </button>
              ))}
            </div>
          </div>

          {activeDoctor ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Doctor Stats & Profile (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                  <div className="flex items-center gap-3.5">
                    <div className="h-14 w-14 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center text-teal-600 shrink-0 shadow-inner">
                      <User className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Dr(a). {activeDoctor.name}</h3>
                      <p className="text-xs text-teal-600 font-bold mt-0.5">{activeDoctor.specialty}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">CRM {activeDoctor.crm}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold uppercase text-[9px] tracking-wider">Valor de Consulta</span>
                      <span className="font-extrabold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100/40 font-mono">
                        R$ {(activeDoctor.consultationPrice || 250).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium leading-relaxed">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">{activeDoctor.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-500 text-[11px] font-medium leading-relaxed">
                      <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{activeDoctor.phone}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Produtividade</span>
                    
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Procedimentos</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{totalProcedures}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Tempo Médio</p>
                        <p className="text-lg font-black text-slate-800 mt-1 font-mono">{avgDuration}m</p>
                      </div>
                    </div>
                  </div>

                  {/* Graphical representation of procedure categories */}
                  <div className="space-y-3.5 border-t border-slate-100 pt-4">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Composição do Histórico</span>
                    
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Consultas</span>
                          <span className="font-bold">{consultCount}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalProcedures > 0 ? (consultCount/totalProcedures)*100 : 0}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Cirurgias</span>
                          <span className="font-bold">{surgeryCount}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalProcedures > 0 ? (surgeryCount/totalProcedures)*100 : 0}%` }}></div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Exames Clínicos</span>
                          <span className="font-bold">{examCount}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${totalProcedures > 0 ? (examCount/totalProcedures)*100 : 0}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 flex gap-2.5 text-xs text-indigo-900 leading-normal">
                    <Award className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
                    <div>
                      <p className="font-bold">Certificação de Integridade</p>
                      <p className="text-[10px] text-indigo-700 mt-0.5">Todos os procedimentos são salvos com data estrita e carimbo LGPD, não podendo ser editados sem justificativa de prontuário.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Procedures Timeline (8 Cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Form to Add Procedure if toggled */}
                {showAddProcedure && isAdmin && (
                  <form onSubmit={handleSubmitProcedure} id="add-procedure-form" className="bg-white rounded-2xl border-2 border-teal-500 p-6 shadow-lg space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Lançar Novo Procedimento Realizado</h4>
                      <button
                        type="button"
                        onClick={() => setShowAddProcedure(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                      >
                        Fechar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Paciente Atendido</label>
                        <select
                          id="proc-patient-select"
                          value={patientId}
                          onChange={(e) => setPatientId(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                        >
                          <option value="">Selecione o paciente...</option>
                          {patients.filter(p => !p.isAnonymized).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Data do Procedimento</label>
                        <input
                          id="proc-date"
                          type="date"
                          value={procedureDate}
                          onChange={(e) => setProcedureDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome do Procedimento</label>
                        <input
                          id="proc-name"
                          type="text"
                          placeholder="Ex: Colecistectomia por Videolaparoscopia"
                          value={procedureName}
                          onChange={(e) => setProcedureName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo</label>
                          <select
                            id="proc-type"
                            value={procedureType}
                            onChange={(e) => setProcedureType(e.target.value as Procedure['type'])}
                            className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                          >
                            <option value="Consulta">Consulta</option>
                            <option value="Cirurgia">Cirurgia</option>
                            <option value="Exame Clínico">Exame Clínico</option>
                            <option value="Laudo">Laudo</option>
                            <option value="Procedimento Estético">Procedimento Estético</option>
                            <option value="Terapia">Terapia</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Duração (min)</label>
                          <input
                            id="proc-duration"
                            type="number"
                            min={5}
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2 grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Classificação de Risco</label>
                          <select
                            id="proc-risk"
                            value={riskClass}
                            onChange={(e) => setRiskClass(e.target.value as Procedure['riskClass'])}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
                          >
                            <option value="Baixo">Baixo</option>
                            <option value="Médio">Médio</option>
                            <option value="Alto">Alto</option>
                          </select>
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notas Cirúrgicas / Laudo Resumido</label>
                        <textarea
                          id="proc-notes"
                          placeholder="Relatório de intercorrências, anestesia, técnicas e medicamentos utilizados..."
                          value={procedureNotes}
                          onChange={(e) => setProcedureNotes(e.target.value)}
                          rows={2.5}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none resize-none leading-normal"
                        />
                      </div>
                    </div>

                    {procedureError && (
                      <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg">{procedureError}</p>
                    )}

                    <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowAddProcedure(false)}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        id="submit-procedure-btn"
                        type="submit"
                        className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-md flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        Lançar Registro
                      </button>
                    </div>
                  </form>
                )}

                {/* List of completed procedures */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="h-4 w-4 text-teal-600" />
                    Histórico de Procedimentos Realizados
                  </h4>

                  <div className="space-y-3.5">
                    {doctorProcedures.length > 0 ? (
                      doctorProcedures.map((proc) => {
                        let typeBadge = 'bg-slate-50 text-slate-700 border-slate-200/60';
                        if (proc.type === 'Cirurgia') typeBadge = 'bg-rose-50 text-rose-700 border-rose-100';
                        if (proc.type === 'Exame Clínico') typeBadge = 'bg-cyan-50 text-cyan-700 border-cyan-100';
                        if (proc.type === 'Consulta') typeBadge = 'bg-teal-50 text-teal-700 border-teal-100';
                        if (proc.type === 'Laudo') typeBadge = 'bg-indigo-50 text-indigo-700 border-indigo-100';

                        let riskBadge = 'text-emerald-700 bg-emerald-50';
                        if (proc.riskClass === 'Médio') riskBadge = 'text-amber-700 bg-amber-50';
                        if (proc.riskClass === 'Alto') riskBadge = 'text-rose-700 bg-rose-50 animate-pulse';

                        return (
                          <div
                            id={`procedure-history-card-${proc.id}`}
                            key={proc.id}
                            className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl space-y-3 hover:border-slate-200 transition-all"
                          >
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${typeBadge}`}>
                                  {proc.type}
                                </span>
                                <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${riskBadge}`}>
                                  Risco {proc.riskClass}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {proc.date.split('-').reverse().join('/')}
                              </span>
                            </div>

                            <div>
                              <h5 className="text-xs font-bold text-slate-800">{proc.name}</h5>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Paciente: <strong className="text-slate-700">{proc.patientName}</strong>
                              </p>
                            </div>

                            {proc.notes && (
                              <div className="bg-white p-2.5 rounded-lg border border-slate-100 text-[10px] text-slate-600 leading-normal">
                                {proc.notes}
                              </div>
                            )}

                            <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                              <span className="flex items-center gap-1 font-mono">
                                <Clock className="h-3.5 w-3.5 text-teal-600" />
                                Duração: {proc.durationMinutes} min
                              </span>
                              <span className="font-mono text-[9px] bg-slate-200/50 px-1.5 py-0.5 rounded text-slate-500">
                                CRM-REGISTRY-HASH
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <FolderHeart className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">Nenhum procedimento médico registrado para este especialista.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <Activity className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs text-slate-500">Nenhum especialista cadastrado no sistema.</p>
            </div>
          )}
        </>
      )}

      {activeSubTab === 'employees' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <div>
            <h3 className="font-bold text-sm text-slate-800">Equipe de Apoio & Funcionários</h3>
            <p className="text-[10px] text-slate-400">Listagem de toda a equipe de suporte administrativo da clínica.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {employees.length > 0 ? (
              employees.map(emp => {
                let roleLabel = 'Funcionário';
                let roleColor = 'bg-slate-100 text-slate-700 border-slate-200';
                if (emp.role === 'receptionist') {
                  roleLabel = 'Recepção / Triagem';
                  roleColor = 'bg-teal-50 text-teal-700 border-teal-100';
                } else if (emp.role === 'admin') {
                  roleLabel = 'Administração';
                  roleColor = 'bg-rose-50 text-rose-700 border-rose-100';
                } else if (emp.role === 'nurse') {
                  roleLabel = 'Enfermagem';
                  roleColor = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                } else if (emp.role === 'finance') {
                  roleLabel = 'Financeiro';
                  roleColor = 'bg-amber-50 text-amber-700 border-amber-100';
                }

                return (
                  <div key={emp.id} className="p-4 bg-slate-50 border border-slate-200/50 rounded-2xl hover:border-slate-300 transition-all flex flex-col items-center text-center space-y-3">
                    <div className="h-14 w-14 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <User className="h-7 w-7" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{emp.name}</h4>
                      <span className={`inline-block px-2 py-0.5 font-bold text-[8px] uppercase rounded border ${roleColor} mt-1.5`}>
                        {roleLabel}
                      </span>
                    </div>

                    <div className="w-full pt-3 border-t border-slate-200/60 space-y-2 text-left text-[10px] text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{emp.phone}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Nenhum funcionário cadastrado no sistema.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL CADASTRO ESPECIALISTA (ADMIN ONLY) */}
      {showAddDoctorModal && canManageDoctors && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 bg-teal-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm">Cadastrar Novo Especialista</h3>
                <p className="text-[10px] text-teal-100 mt-0.5">Cadastre médicos e defina seus respectivos preços de consulta.</p>
              </div>
              <button
                onClick={() => {
                  setShowAddDoctorModal(false);
                  setDocError('');
                }}
                className="text-white hover:text-teal-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDoctor} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Dr(a). Amanda Silveira"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CRM</label>
                  <input
                    type="text"
                    placeholder="Ex: CRM-SP 123456"
                    value={docCRM}
                    onChange={(e) => setDocCRM(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Especialidade</label>
                  <select
                    value={docSpecialty}
                    onChange={(e) => setDocSpecialty(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 cursor-pointer font-sans"
                  >
                    <option value="Cardiologia">Cardiologia</option>
                    <option value="Pediatria">Pediatria</option>
                    <option value="Dermatologia">Dermatologia</option>
                    <option value="Ginecologia">Ginecologia</option>
                    <option value="Ortopedia">Ortopedia</option>
                    <option value="Oftalmologia">Oftalmologia</option>
                    <option value="Psiquiatria">Psiquiatria</option>
                    <option value="Clínica Geral">Clínica Geral</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="medico@drdiogogonzaga.com"
                    value={docEmail}
                    onChange={(e) => setDocEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={docPhone}
                    onChange={(e) => setDocPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor da Consulta (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                    <input
                      type="text"
                      placeholder="250,00"
                      value={docPrice}
                      onChange={(e) => setDocPrice(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Senha de Acesso</label>
                  <input
                    type="password"
                    placeholder="••••••"
                    value={docPassword}
                    onChange={(e) => setDocPassword(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-mono"
                    required
                  />
                </div>
              </div>

              {docError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg">{docError}</p>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDoctorModal(false);
                    setDocError('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  Salvar Especialista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CADASTRO FUNCIONÁRIO (ADMIN ONLY) */}
      {showAddEmployeeModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 bg-teal-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm">Cadastrar Novo Funcionário</h3>
                <p className="text-[10px] text-teal-100 mt-0.5">Cadastre o pessoal de recepção, enfermagem ou suporte.</p>
              </div>
              <button
                onClick={() => {
                  setShowAddEmployeeModal(false);
                  setEmpError('');
                }}
                className="text-white hover:text-teal-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Amanda Silveira"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cargo / Função</label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value as Employee['role'])}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 cursor-pointer font-sans"
                >
                  <option value="receptionist">Recepção / Triagem</option>
                  <option value="nurse">Enfermagem</option>
                  <option value="finance">Financeiro</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="email@drdiogogonzaga.com"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone</label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Foto URL removida */}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Senha de Acesso</label>
                <input
                  type="password"
                  placeholder="••••••"
                  value={empPassword}
                  onChange={(e) => setEmpPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-mono"
                  required
                />
              </div>

              {empError && (
                <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-2 rounded-lg">{empError}</p>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEmployeeModal(false);
                    setEmpError('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
                >
                  <Check className="h-4 w-4" />
                  Salvar Funcionário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
