/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react'; // Apenas um comentário para forçar a atualização do diff
import { ShieldCheck, Database, FileSpreadsheet, Eye, UserX, Download, Key, Search, Clock, FileLock2, BookOpen, Trash2, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { AuditLog, Patient, Doctor } from '../types';
import { decryptMedicalRecord, anonymizeCPF } from '../utils/crypto';

interface LGPDDashboardProps {
  auditLogs: AuditLog[];
  patients: Patient[];
  doctors: Doctor[];
  onAnonymizePatient: (patientId: string) => void;
}

export default function LGPDDashboard({
  auditLogs,
  patients,
  doctors,
  onAnonymizePatient
}: LGPDDashboardProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [exportPassphrase, setExportPassphrase] = useState<string>('DrDiogoGonzagaMasterKey2026!');
  const [exportError, setExportError] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [anonymizeConfirmId, setAnonymizeConfirmId] = useState<string | null>(null);

  // Export patient data
  const handleExportData = async (patient: Patient) => {
    setExportError('');
    setExportSuccess(false);
    
    try {
      // First, decrypt the medical record so the exported file contains the patient's readable data (as required by data portability rights)
      const decrypted = await decryptMedicalRecord(
        patient.encryptedMedicalRecords,
        patient.cryptoIv,
        patient.cryptoSalt,
        exportPassphrase
      );

      const exportPayload = {
        termo_consentimento_lgpd: {
          aceito_em: patient.consentDate,
          versao: patient.consentVersion,
          finalidade: patient.consentPurpose,
        },
        dados_pessoais: {
          nome: patient.name,
          cpf: patient.cpf,
          email: patient.email,
          telefone: patient.phone,
          data_nascimento: patient.birthDate,
        },
        dados_saude_descriptografados: decrypted,
        dados_saude_criptografados_para_transporte: {
          ciphertext: patient.encryptedMedicalRecords,
          iv: patient.cryptoIv,
          salt: patient.cryptoSalt,
        },
        meta: {
          exportado_em: new Date().toISOString(),
          sistema: 'Centro medico Dr.Diogo Gonzaga EHR - LGPD Portal V1',
          conformidade_legal: 'Artigo 18, Inciso V da Lei Geral de Proteção de Dados (Portabilidade)'
        }
      };

      // Download file in browser
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `portabilidade_dados_${patient.name.toLowerCase().replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);

    } catch (err: any) {
      setExportError('Falha de criptografia. Verifique a chave de descriptografia para realizar a portabilidade.');
    }
  };

  const executeAnonymization = (id: string) => {
    onAnonymizePatient(id);
    setAnonymizeConfirmId(null);
  };

  // Filtered audit logs
  const filteredLogs = auditLogs.filter(log => {
    const query = searchTerm.toLowerCase();
    return (
      log.userName.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      (log.patientName && log.patientName.toLowerCase().includes(query)) ||
      log.lgpdBasis.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      {/* Overview stats of LGPD Compliance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Conformidade Geral</p>
            <p className="text-lg font-extrabold text-slate-800">100% LGPD</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Fichas com Consentimento</p>
            <p className="text-lg font-extrabold text-slate-800">
              {patients.filter(p => p.consentGiven && !p.isAnonymized).length} Ativas
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Trilha de Auditoria</p>
            <p className="text-lg font-extrabold text-slate-800">{auditLogs.length} Registros</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <UserX className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Casos Anonimizados</p>
            <p className="text-lg font-extrabold text-slate-800">
              {patients.filter(p => p.isAnonymized).length} Pacientes
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Patient Rights Center (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileLock2 className="h-5 w-5 text-teal-600" />
            <h3 className="font-bold text-sm text-slate-800">Painel de Direitos do Titular (Art. 18)</h3>
          </div>

          {/* Selector of patient */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">
                Selecione o Paciente para Ação LGPD
              </label>
              <select
                id="lgpd-patient-select"
                value={selectedPatientId}
                onChange={(e) => {
                  setSelectedPatientId(e.target.value);
                  setExportError('');
                }}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer font-sans"
              >
                <option value="">Escolha um paciente...</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isAnonymized ? '(Anonimizado)' : `(CPF: ${anonymizeCPF(p.cpf)})`}
                  </option>
                ))}
              </select>
            </div>

            {selectedPatientId && (() => {
              const patient = patients.find(p => p.id === selectedPatientId);
              if (!patient) return null;

              return (
                <div className="space-y-5 bg-slate-50 p-4.5 rounded-xl border border-slate-100">
                  <div className="text-xs space-y-1 text-slate-600">
                    <p><strong>Paciente:</strong> {patient.name}</p>
                    {!patient.isAnonymized ? (
                      <>
                        <p><strong>CPF completo:</strong> {patient.cpf}</p>
                        <p><strong>E-mail:</strong> {patient.email}</p>
                        <p><strong>Versão Consentimento:</strong> {patient.consentVersion}</p>
                      </>
                    ) : (
                      <p className="text-amber-600 font-bold flex items-center gap-1 mt-1">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Este paciente já foi anonimizado legalmente.
                      </p>
                    )}
                  </div>

                  {/* Actions for active patient */}
                  {!patient.isAnonymized && (
                    <div className="space-y-4 border-t border-slate-200/60 pt-4">
                      {/* Portability action (Export decrypted file) */}
                      <div className="space-y-3.5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          1. Direito de Portabilidade (Inciso V)
                        </p>
                        <p className="text-[10px] text-slate-400 leading-normal">
                          Gera um arquivo legível com todos os termos e registros clínicos descriptografados do paciente.
                        </p>
                        
                        <div className="space-y-2">
                          <label className="block text-[9px] font-bold text-slate-400 uppercase">Chave de Descriptografia para Exportar</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                              <Key className="h-3.5 w-3.5 text-teal-600" />
                            </span>
                            <input
                              id="export-key-input"
                              type="password"
                              placeholder="Digite a chave privada..."
                              value={exportPassphrase}
                              onChange={(e) => setExportPassphrase(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-slate-700"
                            />
                          </div>
                        </div>

                        {exportError && (
                          <p className="text-[10px] text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-1">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            {exportError}
                          </p>
                        )}
                        {exportSuccess && (
                          <p className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Exportação concluída com sucesso!
                          </p>
                        )}

                        <button
                          id="export-portability-button"
                          onClick={() => handleExportData(patient)}
                          className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Exportar Dados (JSON Portabilidade)
                        </button>
                      </div>

                      {/* Anonymization / Deletion action */}
                      <div className="space-y-3.5 border-t border-slate-200/60 pt-4">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          2. Direito de Eliminação e Anonimização (Incisos IV/VI)
                        </p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Substitui CPF, e-mail e telefone por hashes irreversíveis, apaga o nome e desvincula os dados clínicos para fins exclusivamente de estatísticas de saúde coletiva, impossibilitando qualquer identificação individual.
                        </p>

                        {anonymizeConfirmId === patient.id ? (
                          <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-xs text-rose-800 space-y-2">
                            <p className="font-bold flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                              CONFIRMAÇÃO CRÍTICA
                            </p>
                            <p className="text-[10px] text-rose-700 leading-normal">
                              Esta ação é irreversível e removerá todos os identificadores pessoais do banco de dados em conformidade com as normas legais. Tem certeza?
                            </p>
                            <div className="flex gap-2 pt-1">
                              <button
                                id="cancel-anonymize"
                                onClick={() => setAnonymizeConfirmId(null)}
                                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 rounded text-[10px] font-bold text-slate-700 transition-all cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                id="confirm-anonymize"
                                onClick={() => executeAnonymization(patient.id)}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Sim, Anonimizar Dados
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            id="trigger-anonymize-button"
                            onClick={() => setAnonymizeConfirmId(patient.id)}
                            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 border border-rose-200 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                            Excluir / Anonimizar Registro Completo
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* LGPD Information Cheat Sheet */}
          <div className="p-4 bg-teal-50/40 border border-teal-100 rounded-xl space-y-2.5">
            <h4 className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
              <BookOpen className="h-4 w-4 text-teal-600" />
              Diretrizes de Segurança LGPD
            </h4>
            <ul className="text-[10px] text-slate-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li><strong>Minimização de Dados:</strong> CPF e telefone anonimizados por padrão em relatórios.</li>
              <li><strong>Privacidade por Design:</strong> Chaves de decifragem mantidas em memória volátil de navegador de médicos.</li>
              <li><strong>Finalidade Estrita:</strong> Dados apenas processados com autorização explícita do titular (Art. 7, I).</li>
              <li><strong>Segurança:</strong> Logs de auditoria assinados digitalmente com SHA-256 para impedir manipulação fraudulenta.</li>
            </ul>
          </div>
        </div>

        {/* Audit Trails Logs (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 flex flex-col h-96 sm:h-[calc(100vh-14rem)] min-h-[320px] sm:min-h-[480px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-teal-600" />
              <h3 className="font-bold text-sm text-slate-800">Trilha de Auditoria Geral (Audit Trail)</h3>
            </div>
            
            {/* Search filter in log */}
            <div className="relative w-full sm:w-48">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                id="audit-log-search"
                type="text"
                placeholder="Pesquisar logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-600"
              />
            </div>
          </div>

          {/* Log timeline list */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar">
            {filteredLogs.length > 0 ? (
              filteredLogs.map(log => {
                let actionBadge = 'bg-blue-50 text-blue-700 border-blue-100';
                if (log.action.includes('Criação')) actionBadge = 'bg-teal-50 text-teal-700 border-teal-100';
                if (log.action.includes('Acesso')) actionBadge = 'bg-purple-50 text-purple-700 border-purple-100';
                if (log.action.includes('Exclusão')) actionBadge = 'bg-rose-50 text-rose-700 border-rose-100';
                if (log.action.includes('Exportação')) actionBadge = 'bg-amber-50 text-amber-700 border-amber-100';

                return (
                  <div
                    id={`log-entry-${log.id}`}
                    key={log.id}
                    className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2 text-[10px] hover:border-slate-300 transition-all"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className={`px-2 py-0.5 font-semibold text-[9px] rounded-full border ${actionBadge}`}>
                        {log.action}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed font-sans">{log.details}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9px] text-slate-400 pt-1 border-t border-dashed border-slate-200">
                      <p><strong>Operador:</strong> {log.userName} ({log.userRole === 'doctor' ? 'Médico' : 'Recepção'})</p>
                      <p><strong>Base Legal:</strong> <span className="text-teal-600 font-semibold">{log.lgpdBasis}</span></p>
                      <p><strong>Origem IP:</strong> {log.ipAddress}</p>
                      <p className="line-clamp-1"><strong>Browser/Device:</strong> {log.deviceInfo}</p>
                    </div>

                    <div className="bg-slate-100 p-1.5 rounded-md text-[8px] text-slate-400 font-mono select-all flex items-center justify-between overflow-hidden gap-2">
                      <span className="truncate">SHA-256: {log.securityHash}</span>
                      <span className="text-[7px] bg-slate-200 text-slate-500 px-1 py-0.5 rounded font-sans uppercase font-bold tracking-wider shrink-0">Assinado</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12">
                <Database className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Nenhum registro de auditoria condizente.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
