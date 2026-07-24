/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldAlert, ShieldCheck, HeartPulse, Calendar, FileText,
  Users, Scale, KeyRound, LogOut, User, DollarSign, Shield,
  Activity, Menu, X, ChevronRight, FileSpreadsheet, TestTube
} from 'lucide-react';
import { UserSession, UserPermissions } from '../types';
import logo from '../../assets/logo.jpg';
import { isSupabaseConfigured } from '../utils/supabaseClient';
import SupportButton from './SupportButton';

interface LayoutProps {
  currentSession: UserSession;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRoleSwitch: (role: UserSession['role']) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({
  currentSession,
  activeTab,
  setActiveTab,
  onRoleSwitch,
  onLogout,
  children
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    { id: 'appointments',     label: 'Agenda de Consultas',       icon: Calendar,           permissionRequired: 'viewAppointments'   as keyof UserPermissions },
    { id: 'health_records',   label: 'Prontuários E2EE',           icon: FileText,           permissionRequired: 'viewEHR'            as keyof UserPermissions, requireDoctor: true },
    { id: 'clinical_documents',label: 'Documentos & Receituários', icon: HeartPulse,         permissionRequired: 'createClinicalDocs' as keyof UserPermissions, requireDoctor: true },
    { id: 'specialists',      label: 'Especialistas & Proc.',      icon: Users,              permissionRequired: 'viewAppointments'   as keyof UserPermissions },
    { id: 'exams',            label: 'Exames',                     icon: Activity,           permissionRequired: 'viewAppointments'   as keyof UserPermissions },
    { id: 'exam_budgets',     label: 'Orçamentos de Exames',      icon: FileSpreadsheet,    permissionRequired: 'viewAppointments'   as keyof UserPermissions },
    { id: 'lab_integration',  label: 'DB Diagnósticos',            icon: TestTube,           permissionRequired: 'viewLabIntegration' as keyof UserPermissions },
    { id: 'cash_register',    label: 'Controle de Caixa',          icon: DollarSign,         permissionRequired: 'viewCashRegister'   as keyof UserPermissions },
    { id: 'lgpd',             label: 'Painel LGPD & Logs',         icon: Scale,              permissionRequired: 'viewLGPD'           as keyof UserPermissions },
    { id: 'access_control',   label: 'Controle de Acesso',         icon: Shield,             permissionRequired: 'manageUsers'        as keyof UserPermissions },
    { id: 'auth_2fa',         label: 'Acesso Médico (2FA)',         icon: KeyRound,           rolesAllowed: ['doctor'] },
  ];

  const visibleTabs = tabs.filter(tab => {
    if (tab.permissionRequired) return !!currentSession.permissions?.[tab.permissionRequired];
    if (tab.rolesAllowed)       return tab.rolesAllowed.includes(currentSession.role);
    return true;
  });

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setSidebarOpen(false); // fecha no mobile ao navegar
  };

  const roleBadge =
    currentSession.role === 'doctor' ? 'Médico Especialista' :
    currentSession.role === 'admin'  ? 'Diretor / Admin' :
    'Recepção / Triagem';

  const roleBadgeColor =
    currentSession.role === 'doctor' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
    currentSession.role === 'admin'  ? 'bg-rose-50 text-rose-700 border-rose-100' :
    'bg-teal-50 text-teal-700 border-teal-100';

  return (
    <div id="app-layout" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-100 shadow-xs shrink-0 px-4 sm:px-6 py-3 flex items-center justify-between gap-3 sticky top-0 z-30">

        {/* Logo + Nome */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* Burger — só mobile/tablet */}
          <button
            id="sidebar-toggle"
            onClick={() => setSidebarOpen(v => !v)}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-all cursor-pointer shrink-0"
            aria-label="Abrir menu"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <img
            src={logo}
            alt="Centro Médico Dr. Diogo Gonzaga"
            className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl object-cover shadow-sm border border-slate-100 shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 truncate leading-tight">
              Centro Médico Dr. Diogo Gonzaga
            </h1>
            <p className="hidden sm:block text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              Medical Record &amp; Cryptography Shield
            </p>
          </div>
        </div>

        {/* User info + logout */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-2 justify-end flex-wrap">
              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full border ${roleBadgeColor}`}>
                {roleBadge}
              </span>
              {currentSession.role === 'doctor' && (
                currentSession.is2FAVerified ? (
                  <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                    <ShieldCheck className="h-3 w-3 text-emerald-600" /> 2FA Ativo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                    <ShieldAlert className="h-3 w-3 text-amber-600" /> 2FA Pendente
                  </span>
                )
              )}
            </div>
            <p className="text-xs font-bold text-slate-700 mt-1 truncate max-w-[160px]">{currentSession.name}</p>
          </div>

          {/* Avatar circle */}
          <div className="h-9 w-9 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 shadow-inner shrink-0">
            <User className="h-4 w-4" />
          </div>

          {currentSession.loggedIn && (
            <button
              id="logout-button"
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 transition-all cursor-pointer rounded-lg hover:bg-rose-50"
              title="Encerrar Sessão Segura"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex-1 flex relative overflow-hidden">

        {/* Overlay escuro no mobile quando sidebar aberta */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── SIDEBAR ── */}
        <aside
          className={`
            fixed md:relative top-0 left-0 h-full z-20
            w-72 md:w-56 lg:w-64 shrink-0
            bg-white border-r border-slate-100 shadow-xl md:shadow-none
            flex flex-col
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
          style={{ paddingTop: sidebarOpen ? '0' : undefined }}
        >
          {/* Header do sidebar no mobile */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100 md:hidden">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Menu</span>
            <button onClick={() => setSidebarOpen(false)} className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* User info inline no mobile */}
          <div className="px-4 py-3 border-b border-slate-100 md:hidden">
            <p className="text-xs font-bold text-slate-800 truncate">{currentSession.name}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded-full border ${roleBadgeColor}`}>
              {roleBadge}
            </span>
            {currentSession.role === 'doctor' && (
              <span className={`inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${currentSession.is2FAVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                {currentSession.is2FAVerified ? <ShieldCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
                {currentSession.is2FAVerified ? '2FA Ativo' : '2FA Pendente'}
              </span>
            )}
          </div>

          {/* Tabs nav */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              const isRestricted = tab.requireDoctor && (currentSession.role !== 'doctor' || !currentSession.is2FAVerified);

              return (
                <button
                  id={`tab-button-${tab.id}`}
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`
                    flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-left text-xs font-semibold
                    transition-all duration-150 cursor-pointer
                    ${isSelected
                      ? 'bg-gradient-to-r from-teal-50 to-teal-100/50 text-teal-800 border-l-4 border-teal-600 font-bold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }
                  `}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-teal-600' : 'text-slate-400'}`} />
                  <span className="flex-1 leading-tight">{tab.label}</span>
                  {isRestricted && (
                    <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 shrink-0">
                      Restrito
                    </span>
                  )}
                  {isSelected && (
                    <ChevronRight className="h-3 w-3 text-teal-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Security badge na sidebar */}
          <div className="hidden md:block m-3 bg-teal-950 text-teal-100 p-4 rounded-2xl relative overflow-hidden border border-teal-800/60 shadow-md">
            <div className="absolute right-0 bottom-0 opacity-10">
              <ShieldCheck className="h-20 w-20 text-white" />
            </div>
            <p className="text-[10px] font-bold text-teal-400 tracking-wider uppercase mb-1">E2EE Ativo</p>
            <p className="text-[10px] leading-relaxed text-teal-200">
              Prontuários criptografados localmente com AES-GCM-256. Servidor nunca acessa dados legíveis.
            </p>
          </div>
        </aside>

        {/* ── CONTEÚDO PRINCIPAL ── */}
        <main className="flex-1 min-w-0 p-4 sm:p-5 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-slate-100 px-4 sm:px-8 py-3 shrink-0 text-center text-[9px] sm:text-[10px] text-slate-400 font-mono">
        <p className="leading-relaxed">© 2026 Centro Médico Dr.Diogo Gonzaga • LGPD — Lei nº 13.709/2018</p>
        <p className="mt-0.5 text-[9px] text-slate-300 hidden sm:block">AES-GCM-256 &amp; 2FA TOTP • CFM Resolução nº 2.299/2021</p>
        <p className="mt-1 text-[9px] font-bold text-teal-600">Desenvolvido por MaximoSistemas</p>
      </footer>

      {/* ── SUPPORT BOT ── */}
      <SupportButton />
    </div>
  );
}
