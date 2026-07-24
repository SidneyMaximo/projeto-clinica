/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, UserPlus, Search, Check, AlertCircle, ToggleLeft, ToggleRight, User, Settings, Info, Edit2, Trash2 } from 'lucide-react';
import { Doctor, Employee, UserPermissions, UserSession } from '../types';

interface AccessControlProps {
  doctors: Doctor[];
  employees: Employee[];
  currentSession: UserSession;
  permissionsMap: Record<string, UserPermissions>;
  onUpdatePermissions: (userId: string, permissions: UserPermissions, targetName: string) => void;
  onAddDoctor: (doctor: Omit<Doctor, 'id' | 'twoFactorSecret' | 'is2FAEnabled'>) => Promise<void>;
  onAddEmployee: (employee: Omit<Employee, 'id'>) => Promise<void>;
  onUpdateDoctor: (id: string, doctor: Omit<Doctor, 'id' | 'twoFactorSecret' | 'is2FAEnabled'>) => Promise<void>;
  onUpdateEmployee: (id: string, employee: Omit<Employee, 'id'>) => Promise<void>;
  onDeleteDoctor: (id: string, name: string) => Promise<void>;
  onDeleteEmployee: (id: string, name: string) => Promise<void>;
}

export default function AccessControl({
  doctors,
  employees,
  currentSession,
  permissionsMap,
  onUpdatePermissions,
  onAddDoctor,
  onAddEmployee,
  onUpdateDoctor,
  onUpdateEmployee,
  onDeleteDoctor,
  onDeleteEmployee
}: AccessControlProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'doctors' | 'employees'>('all');
  
  // Form states for adding/editing user
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserType, setNewUserType] = useState<'doctor' | 'employee'>('employee');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('123456'); // Default password
  const [specialty, setSpecialty] = useState(''); // for doctors
  const [crm, setCrm] = useState(''); // for doctors
  const [employeeRole, setEmployeeRole] = useState<'receptionist' | 'nurse' | 'admin' | 'finance'>('receptionist');
  const [price, setPrice] = useState('200'); // doctor price
  const [avatar, setAvatar] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Check if current user actually has permission to view this panel
  const hasAccess = currentSession.permissions?.manageUsers || currentSession.permissions?.viewAppointments;
  const isReadOnly = !currentSession.permissions?.manageUsers;

  if (!hasAccess) {
    return (
      <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4">
        <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Acesso Negado</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Você não possui privilégios de acesso para visualizar este painel. Esta ação foi registrada para auditoria.
        </p>
      </div>
    );
  }

  // Helper lists
  const allUsers: { id: string; name: string; email: string; phone: string; roleDisplay: string; type: 'doctor' | 'employee'; role: string; avatar: string; password?: string; consultationPrice?: number }[] = [
    ...doctors.map(d => ({
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      roleDisplay: `Médico (${d.specialty})`,
      type: 'doctor' as const,
      role: 'doctor',
      avatar: d.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150',
      password: d.password,
      consultationPrice: d.consultationPrice
    })),
    ...employees.map(e => ({
      id: e.id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      roleDisplay: e.role === 'receptionist' ? 'Recepção' : e.role === 'nurse' ? 'Enfermagem' : e.role === 'finance' ? 'Financeiro' : 'Administrador',
      type: 'employee' as const,
      role: e.role,
      avatar: e.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120',
      password: e.password
    }))
  ];

  // Filtering
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || 
                        (filterType === 'doctors' && u.type === 'doctor') ||
                        (filterType === 'employees' && u.type === 'employee');
    return matchesSearch && matchesType;
  });

  const handlePermissionToggle = (userId: string, key: keyof UserPermissions, userName: string) => {
    const currentPerms = permissionsMap[userId] || {
      viewAppointments: false,
      viewEHR: false,
      createClinicalDocs: false,
      viewCashRegister: false,
      viewLGPD: false,
      manageUsers: false
    };

    const updated = {
      ...currentPerms,
      [key]: !currentPerms[key]
    };

    onUpdatePermissions(userId, updated, userName);
  };

  const startEdit = (user: any) => {
    setEditingUserId(user.id);
    setNewUserType(user.type);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone);
    setPassword(user.password || '123456');
    setAvatar(user.avatar || '');
    if (user.type === 'doctor') {
      const doc = doctors.find(d => d.id === user.id);
      if (doc) {
        setCrm(doc.crm);
        setSpecialty(doc.specialty);
        setPrice(String(doc.consultationPrice || 200));
      }
    } else {
      const emp = employees.find(e => e.id === user.id);
      if (emp) {
        setEmployeeRole(emp.role);
      }
    }
    setShowAddForm(true);
    
    // Rolar a visualização suavemente até o formulário
    const headerElement = document.getElementById('app-layout');
    if (headerElement) {
      headerElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancel = () => {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('123456');
    setSpecialty('');
    setCrm('');
    setAvatar('');
    setEditingUserId(null);
    setShowAddForm(false);
  };

  const handleDeleteClick = (user: any) => {
    const confirm = window.confirm(`Tem certeza de que deseja excluir permanentemente o acesso de ${user.name}? Esta ação é irreversível.`);
    if (confirm) {
      if (user.type === 'doctor') {
        onDeleteDoctor(user.id, user.name);
      } else {
        onDeleteEmployee(user.id, user.name);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/png' && file.type !== 'image/jpeg') {
        setFormError('Por favor, selecione apenas arquivos PNG ou JPEG.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setFormError('A imagem deve ter no máximo 2MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
        setFormError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!name || !email || !password) {
      setFormError('Por favor preencha os campos obrigatórios.');
      return;
    }

    try {
      if (editingUserId) {
        // Mode: Edit
        if (newUserType === 'doctor') {
          if (!crm || !specialty) {
            setFormError('CRM e Especialidade são obrigatórios para Médicos.');
            return;
          }
          await onUpdateDoctor(editingUserId, {
            name,
            email,
            phone,
            password,
            crm,
            specialty,
            avatar: avatar || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150',
            consultationPrice: parseFloat(price) || 0
          });
        } else {
          await onUpdateEmployee(editingUserId, {
            name,
            email,
            phone,
            password,
            role: employeeRole,
            avatar: avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120'
          });
        }
        setFormSuccess('Usuário atualizado com sucesso!');
      } else {
        // Mode: Add
        if (newUserType === 'doctor') {
          if (!crm || !specialty) {
            setFormError('CRM e Especialidade são obrigatórios para Médicos.');
            return;
          }
          await onAddDoctor({
            name,
            email,
            phone,
            password,
            crm,
            specialty,
            avatar: avatar || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150',
            consultationPrice: parseFloat(price) || 0
          });
        } else {
          await onAddEmployee({
            name,
            email,
            phone,
            password,
            role: employeeRole,
            avatar: avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120'
          });
        }
        setFormSuccess('Usuário cadastrado com sucesso! As permissões padrão foram aplicadas.');
      }

      // Reset form fields
      setName('');
      setEmail('');
      setPhone('');
      setPassword('123456');
      setSpecialty('');
      setCrm('');
      setAvatar('');
      setEditingUserId(null);
      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess('');
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao salvar usuário.');
    }
  };

  const permissionLabels: { key: keyof UserPermissions; label: string; desc: string }[] = [
    { key: 'viewAppointments', label: 'Agenda de Consultas', desc: 'Permite visualizar e agendar horários.' },
    { key: 'viewEHR', label: 'Prontuários Médicos (E2EE)', desc: 'Permite visualizar dados clínicos confidenciais.' },
    { key: 'createClinicalDocs', label: 'Documentos e Receitas', desc: 'Permite assinar e emitir atestados/receitas.' },
    { key: 'viewCashRegister', label: 'Controle de Caixa', desc: 'Permite visualizar dados financeiros da clínica.' },
    { key: 'viewLGPD', label: 'Logs e Painel LGPD', desc: 'Permite ver os registros e realizar anonimização.' },
    { key: 'viewLabIntegration', label: 'DB Diagnósticos (Lab)', desc: 'Permite acessar a integração com o laboratório DB Diagnósticos.' },
    { key: 'manageUsers', label: 'Gerenciar Acessos', desc: 'Permite alterar permissões e cadastrar novos usuários.' }
  ];

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Shield className="h-5.5 w-5.5 text-teal-600 animate-pulse" />
            Painel de Acesso & Controle de Permissões
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure direitos de acesso personalizados para médicos e colaboradores de forma independente. As alterações refletem imediatamente nos menus.
          </p>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => {
              if (showAddForm && editingUserId) {
                setEditingUserId(null);
                setName('');
                setEmail('');
                setPhone('');
                setPassword('123456');
                setSpecialty('');
                setCrm('');
                setAvatar('');
              } else {
                setShowAddForm(!showAddForm);
              }
            }}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shadow-teal-900/10 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Cadastrar Novo Colaborador
          </button>
        )}
      </div>

      {/* Add New User Collapsible Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-md animate-in fade-in slide-in-from-top-4 duration-200">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <UserPlus className="h-4.5 w-4.5 text-teal-600" />
            {editingUserId ? `Editar Usuário: ${name}` : 'Novo Registro de Usuário Clínico'}
          </h3>

          <form onSubmit={handleAddUserSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* User Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo de Acesso</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewUserType('employee')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      newUserType === 'employee'
                        ? 'bg-teal-50 border-teal-200 text-teal-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Funcionário / Colaborador
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserType('doctor')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      newUserType === 'doctor'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Médico Especialista
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nome do colaborador"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">E-mail de Login *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="exemplo@drdiogogonzaga.com.br"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Senha Provisória *</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 6 dígitos"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  required
                />
              </div>

              {/* Role or CRM/Specialty dependent fields */}
              {newUserType === 'employee' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Função / Cargo</label>
                  <select
                    value={employeeRole}
                    onChange={e => setEmployeeRole(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  >
                    <option value="receptionist">Recepção / Triagem</option>
                    <option value="nurse">Enfermagem / Assistente</option>
                    <option value="finance">Financeiro / Contabilidade</option>
                    <option value="admin">Administrador Geral</option>
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CRM *</label>
                    <input
                      type="text"
                      value={crm}
                      onChange={e => setCrm(e.target.value)}
                      placeholder="CRM-SP 000000"
                      className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                      required={newUserType === 'doctor'}
                    />
                  </div>
                </>
              )}
            </div>

            {newUserType === 'doctor' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Especialidade Médica *</label>
                  <input
                    type="text"
                    value={specialty}
                    onChange={e => setSpecialty(e.target.value)}
                    placeholder="Ex: Pediatria, Oftalmologia"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    required={newUserType === 'doctor'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Preço da Consulta (R$)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="300"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Foto de Avatar (PNG ou JPEG)</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer text-slate-500"
                  />
                  {avatar && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={avatar} alt="Preview" className="h-8 w-8 rounded-lg object-cover border border-slate-200" />
                      <span className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">Imagem carregada</span>
                      <button
                        type="button"
                        onClick={() => setAvatar('')}
                        className="text-[9px] font-bold text-rose-500 hover:underline ml-auto"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Foto de Avatar (PNG ou JPEG)</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleFileChange}
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer text-slate-500"
                  />
                  {avatar && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={avatar} alt="Preview" className="h-8 w-8 rounded-lg object-cover border border-slate-200" />
                      <span className="text-[9px] text-slate-400 font-mono truncate max-w-[120px]">Imagem carregada</span>
                      <button
                        type="button"
                        onClick={() => setAvatar('')}
                        className="text-[9px] font-bold text-rose-500 hover:underline ml-auto"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
                <div></div>
                <div></div>
              </div>
            )}

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

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {editingUserId ? 'Salvar Alterações' : 'Salvar Colaborador'}
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
            placeholder="Pesquisar por nome ou e-mail..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs w-full focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0 self-start md:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('doctors')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'doctors' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-indigo-50'
            }`}
          >
            Médicos
          </button>
          <button
            onClick={() => setFilterType('employees')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'employees' ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:bg-teal-50'
            }`}
          >
            Equipe Técnica
          </button>
        </div>
      </div>

      {/* Grid of Users */}
      <div className={isReadOnly ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "grid grid-cols-1 gap-6"}>
        {filteredUsers.length === 0 ? (
          <div className="bg-white p-12 text-center border border-slate-100 rounded-2xl">
            <p className="text-sm text-slate-400">Nenhum colaborador encontrado correspondente à pesquisa.</p>
          </div>
        ) : (
          filteredUsers.map(user => {
            const userPerms = permissionsMap[user.id] || {
              viewAppointments: false,
              viewEHR: false,
              createClinicalDocs: false,
              viewCashRegister: false,
              viewLGPD: false,
              manageUsers: false
            };

            const isSelf = user.id === currentSession.userId;

            return (
              <div
                key={user.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col lg:flex-row gap-6 ${
                  isSelf ? 'border-teal-500/40 ring-1 ring-teal-500/10' : 'border-slate-100'
                }`}
              >
                {/* User Info Column */}
                <div className="lg:w-72 shrink-0 flex items-start gap-4">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-12 w-12 rounded-2xl object-cover border-2 border-slate-100 shadow-sm shrink-0"
                  />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                      {user.name}
                      {isSelf && (
                        <span className="bg-teal-500/10 text-teal-700 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                          Você
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{user.roleDisplay}</p>
                    <div className="space-y-0.5 pt-1 text-[11px] text-slate-500 font-medium">
                      <p className="truncate max-w-[200px]" title={user.email}>{user.email}</p>
                      {user.phone && <p>{user.phone}</p>}
                      {user.type === 'doctor' && user.consultationPrice !== undefined && (
                        <p className="text-xs font-extrabold text-teal-700 mt-1 bg-teal-50 border border-teal-100/50 px-2 py-1 rounded-lg w-fit">
                          Consulta: R$ {user.consultationPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                    {!isReadOnly && (
                      <div className="flex gap-2 pt-3">
                        <button
                          onClick={() => startEdit(user)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100/50 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                          title="Editar cadastro" id={`edit-user-btn-${user.id}`}
                        >
                          <Edit2 className="h-3 w-3" />
                          Editar
                        </button>
                        {!isSelf && (
                          <button
                            onClick={() => handleDeleteClick(user)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/50 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                            title="Excluir usuário" id={`delete-user-btn-${user.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                            Excluir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Permissions Toggles Column */}
                {!isReadOnly && (
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 border-b border-slate-50 pb-2 mb-3">
                      <Settings className="h-4 w-4 text-teal-600" />
                      <span>Configurações de Acesso Permitido</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {permissionLabels.map(p => {
                        const isAllowed = userPerms[p.key];
                        
                        // Protect Admin from locking himself out of User Management
                        const isLocked = isSelf && p.key === 'manageUsers';

                        return (
                          <button
                            key={p.key}
                            type="button"
                            disabled={isLocked || isReadOnly}
                            onClick={() => handlePermissionToggle(user.id, p.key, user.name)}
                            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all group ${
                              isReadOnly ? 'cursor-default' : 'cursor-pointer'
                            } ${
                              isAllowed
                                ? 'bg-teal-500/[0.03] border-teal-500/20' + (isReadOnly ? '' : ' hover:bg-teal-500/[0.06]')
                                : 'bg-slate-50 border-slate-100' + (isReadOnly ? '' : ' hover:bg-slate-100/70')
                            } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <div className="shrink-0 mt-0.5">
                              {isAllowed ? (
                                <ToggleRight className="h-5 w-5 text-teal-600" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-slate-400 group-hover:text-slate-500" />
                              )}
                            </div>

                            <div className="space-y-0.5">
                              <span className={`text-[11px] font-bold block ${isAllowed ? 'text-teal-900' : 'text-slate-600'}`}>
                                {p.label}
                              </span>
                              <span className="text-[9px] text-slate-400 leading-tight block">
                                {p.desc}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Security note card at the bottom */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-5 relative overflow-hidden shadow-sm">
        <div className="absolute right-0 bottom-0 opacity-5 pointer-events-none">
          <Shield className="h-44 w-44 text-white" />
        </div>
        <div className="relative flex gap-4 items-start">
          <div className="bg-teal-500/10 p-2 rounded-xl text-teal-400 shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h5 className="text-xs font-bold text-teal-300">Conformidade e Responsabilidade (LGPD Art. 46)</h5>
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans max-w-4xl">
              De acordo com a Lei Geral de Proteção de Dados (LGPD) e as resoluções vigentes do CFM (Conselho Federal de Medicina), o acesso a prontuários eletrônicos sensíveis e a emissão de documentos com força diagnóstica devem seguir o princípio da minimização de privilégios. Certifique-se de conceder acesso aos prontuários criptografados (E2EE) apenas para profissionais médicos devidamente registrados e habilitados para a atividade assistencial de saúde.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
