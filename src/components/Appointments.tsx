/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Calendar, Clock, User, Filter, Plus, Check, Search, CalendarDays, Clipboard, Eye, UserPlus, Info, AlertTriangle, Pencil } from 'lucide-react';
import { Appointment, Doctor, Patient, UserSession } from '../types';

interface AppointmentsProps {
  appointments: Appointment[];
  doctors: Doctor[];
  patients: Patient[];
  currentSession: UserSession;
  onAddAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onAddPatient: (patient: Omit<Patient, 'id' | 'encryptedMedicalRecords' | 'cryptoIv' | 'cryptoSalt'>) => Promise<Patient>;
  onUpdateStatus: (id: string, status: Appointment['status']) => void;
  onConfirmAppointment: (id: string) => void;
}

export default function Appointments({
  appointments,
  doctors,
  patients,
  currentSession,
  onAddAppointment,
  onEditAppointment,
  onAddPatient,
  onUpdateStatus,
  onConfirmAppointment
}: AppointmentsProps) {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing');
  
  // Filtering states
  const [filterDoctor, setFilterDoctor] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // New appointment form state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [newPatientName, setNewPatientName] = useState<string>('');
  const [newPatientCPF, setNewPatientCPF] = useState<string>('');
  const [newPatientEmail, setNewPatientEmail] = useState<string>('');
  const [newPatientPhone, setNewPatientPhone] = useState<string>('');
  const [newPatientBirthDate, setNewPatientBirthDate] = useState<string>('');
  const [lgpdConsent, setLgpdConsent] = useState<boolean>(false);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [appointmentDate, setAppointmentDate] = useState<string>('');
  const [appointmentTime, setAppointmentTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [appointmentPaymentMethod, setAppointmentPaymentMethod] = useState<'Pix' | 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Convênio'>('Pix');
  const [appointmentPrice, setAppointmentPrice] = useState<string>('250,00');

  const handleDoctorChange = (docId: string) => {
    setSelectedDoctorId(docId);
    const doctor = doctors.find(d => d.id === docId);
    if (doctor) {
      if (doctor.consultationPrice !== undefined) {
        setAppointmentPrice(doctor.consultationPrice.toFixed(2).replace('.', ','));
      } else if (doctor.specialty === 'Cardiologia') {
        setAppointmentPrice('300,00');
      } else if (doctor.specialty === 'Pediatria') {
        setAppointmentPrice('250,00');
      } else if (doctor.specialty === 'Dermatologia') {
        setAppointmentPrice('200,00');
      } else {
        setAppointmentPrice('250,00');
      }
    }
  };

  const handleOpenEditModal = (app: Appointment) => {
    setEditingAppointmentId(app.id);
    setSelectedPatientId(app.patientId);
    setSelectedDoctorId(app.doctorId);
    setAppointmentDate(app.date);
    setAppointmentTime(app.time);
    setNotes(app.notes);
    setAppointmentPaymentMethod(app.paymentMethod || 'Pix');
    setAppointmentPrice(app.price !== undefined ? app.price.toFixed(2).replace('.', ',') : '');
    setPatientMode('existing');
    setShowAddModal(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedDoctorId) {
      setErrorMessage('Por favor, selecione um especialista.');
      return;
    }
    if (!appointmentDate || !appointmentTime) {
      setErrorMessage('Por favor, defina a data e hora do agendamento.');
      return;
    }

    let finalPatientId = '';
    let finalPatientName = '';

    if (patientMode === 'new') {
      if (!newPatientName || !newPatientCPF || !newPatientEmail || !newPatientPhone || !newPatientBirthDate) {
        setErrorMessage('Por favor, preencha todos os dados do novo paciente.');
        return;
      }
      if (!lgpdConsent) {
        setErrorMessage('O paciente deve aceitar expressamente o Termo de Consentimento LGPD para salvarmos seus dados.');
        return;
      }

      // Add patient
      const addedPatient = await onAddPatient({
        name: newPatientName,
        cpf: newPatientCPF,
        email: newPatientEmail,
        phone: newPatientPhone,
        birthDate: newPatientBirthDate,
        consentGiven: true,
        consentDate: new Date().toISOString(),
        consentVersion: 'v1.2 (2026)',
        consentPurpose: 'Tratamento de dados pessoais sensíveis para fins de agendamento de consultas e manutenção de prontuário de saúde, em conformidade com o Art. 7, I e Art. 11, I da LGPD.',
        isAnonymized: false
      });

      finalPatientId = addedPatient.id;
      finalPatientName = addedPatient.name;
    } else {
      if (!selectedPatientId) {
        setErrorMessage('Por favor, selecione um paciente cadastrado.');
        return;
      }
      const existingPatient = patients.find(p => p.id === selectedPatientId);
      if (!existingPatient) return;
      finalPatientId = existingPatient.id;
      finalPatientName = existingPatient.name;
    }

    const doctor = doctors.find(d => d.id === selectedDoctorId);
    if (!doctor) return;

    const parsedPrice = parseFloat(appointmentPrice.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('Por favor, informe um valor de consulta válido.');
      return;
    }

    if (editingAppointmentId) {
      // Edit mode
      const oldApp = appointments.find(a => a.id === editingAppointmentId);
      if (!oldApp) return;

      onEditAppointment({
        ...oldApp,
        patientId: finalPatientId,
        patientName: finalPatientName,
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        date: appointmentDate,
        time: appointmentTime,
        notes: notes,
        paymentMethod: appointmentPaymentMethod,
        price: parsedPrice
      });
    } else {
      // Create mode
      onAddAppointment({
        patientId: finalPatientId,
        patientName: finalPatientName,
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        date: appointmentDate,
        time: appointmentTime,
        status: 'Pré-agendado',
        notes: notes,
        paymentMethod: appointmentPaymentMethod,
        price: parsedPrice
      });
    }

    // Reset form
    setSelectedPatientId('');
    setNewPatientName('');
    setNewPatientCPF('');
    setNewPatientEmail('');
    setNewPatientPhone('');
    setNewPatientBirthDate('');
    setLgpdConsent(false);
    setSelectedDoctorId('');
    setAppointmentDate('');
    setAppointmentTime('');
    setNotes('');
    setAppointmentPaymentMethod('Pix');
    setAppointmentPrice('250,00');
    setEditingAppointmentId(null);
    setShowAddModal(false);
  };

  // Filtered appointments
  const filteredAppointments = appointments.filter(app => {
    const matchesDoctor = filterDoctor ? app.doctorId === filterDoctor : true;
    
    // Se o filtro de status estiver vazio (Todos os Status), ocultamos os Cancelados.
    // Se estiver selecionado explicitamente, mostramos o selecionado.
    const matchesStatus = filterStatus 
      ? app.status === filterStatus 
      : app.status !== 'Cancelado';

    const matchesSearch = searchTerm 
      ? app.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        app.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        app.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesDoctor && matchesStatus && matchesSearch;
  });

  // Status color mapping
  const getStatusColor = (status: Appointment['status']) => {
    switch(status) {
      case 'Pré-agendado': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'Agendado':     return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'Concluído':    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Cancelado':   return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Em Andamento': return 'bg-amber-50 text-amber-700 border-amber-100';
      default:            return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            id="appointment-search"
            type="text"
            placeholder="Buscar por paciente ou médico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 transition-all"
          />
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto justify-start sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="h-4 w-4" />
            <span>Filtrar:</span>
          </div>

          <select
            id="filter-doctor-select"
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 cursor-pointer"
          >
            <option value="">Todos Especialistas</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>{d.name} ({d.specialty})</option>
            ))}
          </select>

          <select
            id="filter-status-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 cursor-pointer"
          >
            <option value="">Todos (Ativos)</option>
            <option value="Pré-agendado">Pré-agendado</option>
            <option value="Agendado">Agendado</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Concluído">Concluído</option>
            <option value="Cancelado">Cancelados</option>
          </select>

          <button
            id="open-add-appointment-modal"
            onClick={() => {
              setEditingAppointmentId(null);
              setSelectedPatientId('');
              setNewPatientName('');
              setNewPatientCPF('');
              setNewPatientEmail('');
              setNewPatientPhone('');
              setNewPatientBirthDate('');
              setLgpdConsent(false);
              setSelectedDoctorId('');
              setAppointmentDate('');
              setAppointmentTime('');
              setNotes('');
              setAppointmentPaymentMethod('Pix');
              setAppointmentPrice('250,00');
              setPatientMode('existing');
              setShowAddModal(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Appointments List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((app) => {
            const statusColor = getStatusColor(app.status);

            return (
              <div
                id={`appointment-card-${app.id}`}
                key={app.id}
                className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3.5">
                    <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full border ${statusColor}`}>
                      {app.status}
                    </span>
                    <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                      <Calendar className="h-3.5 w-3.5" />
                      {app.date.split('-').reverse().join('/')}
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <User className="h-4 w-4 text-teal-600" />
                    {app.patientName}
                  </h4>
                  <div className="space-y-1.5 pl-5.5 text-xs text-slate-500">
                    <p className="font-medium text-slate-700">Dr(a). {app.doctorName}</p>
                    <p className="text-[11px] text-slate-400 font-sans italic">{app.specialty}</p>
                    {app.price !== undefined && app.paymentMethod && (
                      <p className="text-[11px] text-teal-700 font-bold flex items-center gap-1.5 mt-1 bg-teal-50/50 py-0.5 px-1.5 rounded border border-teal-100/40 w-fit">
                        <span>Valor: R$ {app.price.toFixed(2).replace('.', ',')}</span>
                        <span className="text-slate-300">|</span>
                        <span>{app.paymentMethod}</span>
                      </p>
                    )}
                    {app.notes && (
                      <div className="mt-3 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-1.5 text-[11px]">
                        <Clipboard className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-slate-600 leading-normal line-clamp-2">{app.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3.5 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-slate-600 font-mono text-xs font-semibold">
                    <Clock className="h-3.5 w-3.5 text-teal-600" />
                    {app.time}
                  </div>

                  {/* Status transitions and actions based on role */}
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleOpenEditModal(app)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-slate-200 flex items-center gap-1"
                    >
                      <Pencil className="h-3 w-3" />
                      Editar
                    </button>
                    {/* Pré-agendado: Confirmar ou Cancelar */}
                    {app.status === 'Pré-agendado' && (
                      <>
                        <button
                          id={`cancel-btn-${app.id}`}
                          onClick={() => onUpdateStatus(app.id, 'Cancelado')}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-rose-100"
                        >
                          Cancelar
                        </button>
                        <button
                          id={`confirm-btn-${app.id}`}
                          onClick={() => onConfirmAppointment(app.id)}
                          className="px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                          title="Confirmar consulta e lançar no caixa"
                        >
                          <Check className="h-3 w-3" />
                          Confirmar
                        </button>
                      </>
                    )}
                    {app.status === 'Agendado' && (
                      <>
                        <button
                          id={`cancel-btn-${app.id}`}
                          onClick={() => onUpdateStatus(app.id, 'Cancelado')}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-rose-100"
                        >
                          Cancelar
                        </button>
                        {currentSession.role === 'doctor' && (
                          <button
                            id={`start-btn-${app.id}`}
                            onClick={() => onUpdateStatus(app.id, 'Em Andamento')}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-amber-100"
                          >
                            Atender
                          </button>
                        )}
                        <button
                          id={`complete-btn-${app.id}`}
                          onClick={() => onUpdateStatus(app.id, 'Concluído')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-emerald-100 flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Concluir
                        </button>
                      </>
                    )}
                    {app.status === 'Em Andamento' && (
                      <button
                        id={`complete-btn-${app.id}`}
                        onClick={() => onUpdateStatus(app.id, 'Concluído')}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Check className="h-3 w-3" />
                        Concluir
                      </button>
                    )}
                    {(app.status === 'Concluído' || app.status === 'Cancelado') && (currentSession.role === 'admin' || currentSession.role === 'receptionist') && (
                      <button
                        id={`reopen-btn-${app.id}`}
                        onClick={() => onUpdateStatus(app.id, 'Agendado')}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-slate-200"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-dashed border-slate-200">
            <CalendarDays className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-slate-700 font-semibold text-sm">Nenhum agendamento localizado</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Utilize o botão acima para agendar uma consulta médica ou revise os filtros de pesquisa selecionados.
            </p>
          </div>
        )}
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div id="add-appointment-modal" className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-100 w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-5 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-white">
                  {editingAppointmentId ? 'Editar Agendamento' : 'Novo Agendamento'}
                </h2>
                <p className="text-xs text-teal-100 mt-0.5">
                  {editingAppointmentId ? 'Altere as informações da consulta.' : 'Preencha os dados abaixo para marcar a consulta.'}
                </p>
              </div>
              <button
                id="close-add-modal"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingAppointmentId(null);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-teal-100 font-bold transition-all text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateAppointment} className="p-6 space-y-5">
              
              <div className="p-6 overflow-y-auto max-h-[70vh]">
              {errorMessage && (
                <div className="mb-6 p-4 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl flex items-center gap-3 text-xs font-medium shadow-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />
                  {errorMessage}
                </div>
              )}

              {/* Se estamos editando, não permitimos alterar se é um paciente novo ou não */}
              {!editingAppointmentId && (
                <div className="flex gap-4 mb-6 pb-6 border-b border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" checked={patientMode === 'existing'} onChange={() => setPatientMode('existing')} className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-slate-300" />
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-teal-700 transition-colors">Paciente Cadastrado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" checked={patientMode === 'new'} onChange={() => setPatientMode('new')} className="w-4 h-4 text-teal-600 focus:ring-teal-500 border-slate-300" />
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-teal-700 transition-colors">Novo Paciente</span>
                  </label>
                </div>
              )}

              {/* Patient Fields */}
              {patientMode === 'existing' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Selecione o Paciente
                  </label>
                  <select
                    id="patient-id-select"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 cursor-pointer"
                  >
                    <option value="">Escolha o paciente cadastrado...</option>
                    {patients.filter(p => !p.isAnonymized).map(p => (
                      <option key={p.id} value={p.id}>{p.name} (CPF: {p.cpf})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3.5 border-l-2 border-teal-500 pl-4 bg-teal-50/20 p-3.5 rounded-r-xl">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800">
                    <UserPlus className="h-4 w-4" />
                    <span>Dados do Novo Paciente (LGPD)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Completo</label>
                      <input
                        id="new-patient-name"
                        type="text"
                        placeholder="Nome do Paciente"
                        value={newPatientName}
                        onChange={(e) => setNewPatientName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CPF</label>
                      <input
                        id="new-patient-cpf"
                        type="text"
                        placeholder="000.000.000-00"
                        value={newPatientCPF}
                        onChange={(e) => setNewPatientCPF(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data de Nascimento</label>
                      <input
                        id="new-patient-birthdate"
                        type="date"
                        value={newPatientBirthDate}
                        onChange={(e) => setNewPatientBirthDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">E-mail</label>
                      <input
                        id="new-patient-email"
                        type="email"
                        placeholder="paciente@provedor.com"
                        value={newPatientEmail}
                        onChange={(e) => setNewPatientEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone / Celular</label>
                      <input
                        id="new-patient-phone"
                        type="text"
                        placeholder="(11) 98888-7777"
                        value={newPatientPhone}
                        onChange={(e) => setNewPatientPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* LGPD Consent Section */}
                  <div className="bg-white p-3 rounded-lg border border-teal-100 flex gap-2.5 items-start mt-2">
                    <input
                      id="new-patient-consent"
                      type="checkbox"
                      checked={lgpdConsent}
                      onChange={(e) => setLgpdConsent(e.target.checked)}
                      className="h-4 w-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 shrink-0 mt-0.5 cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-600 leading-normal">
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        Termo de Consentimento LGPD (Art. 7, I)
                        <Info className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                      </p>
                      <p className="mt-1">
                        O paciente declara concordar expressamente com o tratamento e armazenamento de seus dados pessoais sensíveis necessários para fins de agendamento de consultas e manutenção de prontuário eletrônico. Os prontuários de saúde serão protegidos por criptografia de ponta a ponta e auditados de acordo com as leis brasileiras vigentes.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Doctor, Date & Time */}
              <div className="space-y-4 pt-2.5 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Selecione o Médico Especialista
                  </label>
                  <select
                    id="appointment-doctor-select"
                    value={selectedDoctorId}
                    onChange={(e) => handleDoctorChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 cursor-pointer"
                  >
                    <option value="">Selecione o especialista...</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr(a). {d.name} — {d.specialty} (CRM: {d.crm})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Data da Consulta
                    </label>
                    <input
                      id="appointment-date"
                      type="date"
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Horário
                    </label>
                    <input
                      id="appointment-time"
                      type="time"
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Forma de Pagamento
                    </label>
                    <select
                      id="appointment-payment-method"
                      value={appointmentPaymentMethod}
                      onChange={(e) => setAppointmentPaymentMethod(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 cursor-pointer font-sans"
                    >
                      <option value="Pix">⚡ Pix</option>
                      <option value="Dinheiro">💵 Dinheiro</option>
                      <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                      <option value="Cartão de Débito">💳 Cartão de Débito</option>
                      <option value="Convênio">🏥 Convênio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                      Valor da Consulta (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
                      <input
                        id="appointment-price"
                        type="text"
                        value={appointmentPrice}
                        onChange={(e) => setAppointmentPrice(e.target.value)}
                        className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Sintomas Relatados / Observações
                  </label>
                  <textarea
                    id="appointment-notes"
                    placeholder="Ex: Paciente relata dor de cabeça crônica e cansaço recorrente..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 resize-none leading-normal"
                  />
                </div>
              </div>
              </div> {/* Close overflow-y-auto div */}

              {/* Form buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 px-6 pb-6 pt-4 border-t border-slate-100 rounded-b-2xl bg-slate-50">
                <button
                  id="cancel-add-appointment"
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingAppointmentId(null);
                  }}
                  className="w-1/3 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="confirm-add-appointment"
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {editingAppointmentId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                  <Check className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

