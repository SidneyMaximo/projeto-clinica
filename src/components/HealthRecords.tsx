/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Lock, Unlock, Key, RefreshCw, Eye, Save, Search, User, FileText, Activity, AlertTriangle, Cpu, Terminal, History, Printer } from 'lucide-react';
import { Patient, DecryptedMedicalRecord, UserSession } from '../types';
import { encryptMedicalRecord, decryptMedicalRecord, anonymizeCPF } from '../utils/crypto';

interface HealthRecordsProps {
  patients: Patient[];
  currentSession: UserSession;
  onUpdatePatientMedicalRecord: (
    patientId: string, 
    encryptedMedicalRecords: string, 
    cryptoIv: string, 
    cryptoSalt: string,
    actionType: 'Leitura de Prontuário' | 'Edição de Prontuário' | 'Criação de Prontuário',
    details: string
  ) => void;
  onAddAuditLog: (
    action: 'Acesso ao Prontuário' | 'Criação de Prontuário' | 'Atualização de Prontuário',
    patientId: string,
    patientName: string,
    details: string,
    lgpdBasis: 'Consentimento (Art. 7, I)' | 'Tutela da Saúde (Art. 7, VIII)' | 'Cumprimento de Obrigação Legal (Art. 7, II)' | 'Legítimo Interesse (Art. 7, IX)' | 'Execução de Contrato (Art. 7, V)'
  ) => void;
}

export default function HealthRecords({
  patients,
  currentSession,
  onUpdatePatientMedicalRecord,
  onAddAuditLog
}: HealthRecordsProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // E2EE States
  const [decryptionPassphrase, setDecryptionPassphrase] = useState<string>('DrDiogoGonzagaMasterKey2026!');
  const [isDecrypted, setIsDecrypted] = useState<boolean>(false);
  const [decryptedRecord, setDecryptedRecord] = useState<DecryptedMedicalRecord | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [cryptoConsoleLogs, setCryptoConsoleLogs] = useState<string[]>([]);
  const [cryptoError, setCryptoError] = useState<string>('');

  // Editable fields (when decrypted)
  const [editAnamnese, setEditAnamnese] = useState<string>('');
  const [editDiagnostico, setEditDiagnostico] = useState<string>('');
  const [editPrescricao, setEditPrescricao] = useState<string>('');
  const [editAlergias, setEditAlergias] = useState<string>('');
  const [editPressao, setEditPressao] = useState<string>('');
  const [editPeso, setEditPeso] = useState<string>('');
  const [editTemperatura, setEditTemperatura] = useState<string>('');

  const activePatient = patients.find(p => p.id === selectedPatientId);

  // Clear states when active patient changes
  useEffect(() => {
    setIsDecrypted(false);
    setDecryptedRecord(null);
    setCryptoError('');
    setCryptoConsoleLogs([]);
  }, [selectedPatientId]);

  const addConsoleLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setCryptoConsoleLogs(prev => [`[${timestamp}] ${msg}`, ...prev]);
  };

  const handleDecrypt = async () => {
    if (!activePatient) return;
    setIsDecrypting(true);
    setCryptoError('');
    setCryptoConsoleLogs([]);

    addConsoleLog('Iniciando handshake criptográfico...');
    addConsoleLog(`CPF do Paciente: ${activePatient.cpf} (Identificador Sensível LGPD)`);
    addConsoleLog('Derivando chave simétrica com PBKDF2 (100.000 iterações)...');

    // Artificial tiny delay for premium cyber-security visualization
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // Perform actual decryption
      const record = await decryptMedicalRecord(
        activePatient.encryptedMedicalRecords,
        activePatient.cryptoIv,
        activePatient.cryptoSalt,
        decryptionPassphrase
      );

      setDecryptedRecord(record);
      setIsDecrypted(true);
      
      // Load into edit states
      setEditAnamnese(record.anamnese);
      setEditDiagnostico(record.diagnostico);
      setEditPrescricao(record.prescricao);
      setEditAlergias(record.alergias);
      setEditPressao(record.sinaisVitais.pressao);
      setEditPeso(record.sinaisVitais.peso);
      setEditTemperatura(record.sinaisVitais.temperatura);

      addConsoleLog('Chave PBKDF2 gerada com sucesso.');
      addConsoleLog('Executando descriptografia AES-GCM-256...');
      addConsoleLog('Autenticando tag GCM...');
      addConsoleLog('SUCESSO: Bloco de dados de saúde descriptografado no navegador do médico.');
      addConsoleLog('Nenhum dado legível passou pela rede do servidor.');

      // LGPD Audit Logging
      onAddAuditLog(
        'Acesso ao Prontuário',
        activePatient.id,
        activePatient.name,
        `Médico visualizou o prontuário eletrônico descriptografado de forma segura no dispositivo local.`,
        'Tutela da Saúde (Art. 7, VIII)'
      );

    } catch (err: any) {
      setCryptoError(err.message || 'Chave incorreta ou dados corrompidos.');
      addConsoleLog('ERRO: Falha na autenticação da chave GCM.');
      addConsoleLog('Operação abortada. Dados permanecem protegidos.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleEncryptAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient) return;
    setIsSaving(true);
    setCryptoError('');

    addConsoleLog('Preparando novos dados de saúde...');
    addConsoleLog('Serializando objeto JSON...');
    addConsoleLog('Gerando novo vetor de inicialização (IV) seguro e sal randômico...');

    await new Promise(resolve => setTimeout(resolve, 900));

    try {
      const updatedRecord: DecryptedMedicalRecord = {
        anamnese: editAnamnese,
        diagnostico: editDiagnostico,
        prescricao: editPrescricao,
        alergias: editAlergias,
        sinaisVitais: {
          pressao: editPressao,
          peso: editPeso,
          temperatura: editTemperatura
        },
        lastUpdated: new Date().toISOString()
      };

      // Perform actual encryption in client browser
      const { ciphertext, iv, salt } = await encryptMedicalRecord(
        updatedRecord,
        decryptionPassphrase
      );

      addConsoleLog('Derivando chave simétrica de criptografia com PBKDF2...');
      addConsoleLog('Executando criptografia simétrica AES-GCM-256...');
      addConsoleLog('Gerando tag de autenticação de integridade de dados...');
      addConsoleLog('Dados transformados com sucesso em bloco opaco (Ciphertext).');

      // Update parent state
      onUpdatePatientMedicalRecord(
        activePatient.id,
        ciphertext,
        iv,
        salt,
        'Edição de Prontuário',
        `Alteração de prontuário clínico criptografado ponta a ponta com base legal em Tutela da Saúde.`
      );

      setDecryptedRecord(updatedRecord);
      addConsoleLog('SUCESSO: Registro persistido na base de dados de forma criptografada.');

    } catch (err: any) {
      setCryptoError('Erro ao criptografar e salvar prontuário.');
      addConsoleLog('ERRO crítico na operação de cifragem.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter patients list
  const filteredPatients = patients.filter(p => {
    if (p.isAnonymized) return false; // Hide anonymized patients from the regular EHR search
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || p.cpf.includes(query);
  });

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6">
      {/* Patient Search Panel (4 Cols) */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex flex-col h-64 sm:h-72 lg:h-[calc(100vh-14rem)] min-h-[200px] lg:min-h-[480px]">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Pesquisa de Pacientes</h3>
        
        {/* Search Input */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            id="patient-ehr-search"
            type="text"
            placeholder="Nome ou CPF do paciente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 transition-all"
          />
        </div>

        {/* Patients List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {filteredPatients.length > 0 ? (
            filteredPatients.map(p => (
              <button
                id={`patient-item-${p.id}`}
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${selectedPatientId === p.id ? 'bg-teal-50/50 border-teal-200 shadow-xs' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}
              >
                <div className="space-y-1 pr-2">
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">CPF: {anonymizeCPF(p.cpf)}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded-full font-mono uppercase">LGPD</span>
                  <Lock className="h-3.5 w-3.5 text-teal-600" />
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-10">
              <User className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Nenhum paciente localizado</p>
            </div>
          )}
        </div>
      </div>

      {/* Main EHR Details & Decryption (8 Cols) */}
      <div className="lg:col-span-8 space-y-4 sm:space-y-6">
        {activePatient ? (
          <div className="space-y-6">
            {/* Header details */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">{activePatient.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
                    <span>Nasc: {activePatient.birthDate.split('-').reverse().join('/')}</span>
                    <span className="text-slate-200">|</span>
                    <span>CPF: {anonymizeCPF(activePatient.cpf)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                Consentimento Ativo (LGPD)
              </div>
            </div>

            {/* If patient is encrypted / needs decryption */}
            {!isDecrypted ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
                {/* Secure decryption prompt */}
                <div className="md:col-span-7 bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm flex flex-col justify-between space-y-4 sm:space-y-6">
                  <div className="space-y-3">
                    <div className="inline-flex p-3 bg-teal-50 text-teal-600 rounded-full">
                      <Lock className="h-7 w-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">Prontuário Bloqueado</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Este prontuário médico está protegido por criptografia simétrica AES-GCM de 256 bits ponta a ponta. Ele só pode ser aberto no navegador de um médico autorizado através da sua chave de descriptografia de prontuários.
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Chave Privada / Passphrase de Descriptografia
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <Key className="h-4 w-4 text-teal-600" />
                        </span>
                        <input
                          id="decryption-key-input"
                          type="password"
                          placeholder="Chave privada de criptografia..."
                          value={decryptionPassphrase}
                          onChange={(e) => setDecryptionPassphrase(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-slate-800"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 italic">
                        Dica de desenvolvimento: A chave padrão de criptografia está preenchida. Altere-a para testar o comportamento de bloqueio/erro.
                      </p>
                    </div>

                    {cryptoError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex gap-2 items-start text-xs text-rose-700 font-medium">
                        <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                        <span>{cryptoError}</span>
                      </div>
                    )}

                    {currentSession.role === 'doctor' && currentSession.is2FAVerified ? (
                      <button
                        id="decrypt-record-button"
                        onClick={handleDecrypt}
                        disabled={isDecrypting}
                        className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold text-xs py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isDecrypting ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Autenticando Chaves...
                          </>
                        ) : (
                          <>
                            <Unlock className="h-4 w-4" />
                            Descriptografar Registro Clínico
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl flex gap-2 text-xs text-amber-800 leading-normal">
                        <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-bold">Acesso Médico Requerido</p>
                          <p className="mt-0.5 text-[11px] text-amber-700">
                            Apenas médicos com autenticação ativa de dois fatores (2FA) podem descriptografar registros de saúde de pacientes de acordo com as diretrizes do CFM e da LGPD.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* E2EE Payload viewer on side */}
                <div className="md:col-span-5 bg-slate-900 rounded-2xl p-4 sm:p-5 text-slate-300 font-mono text-[10px] flex flex-col h-full min-h-[220px] sm:min-h-[320px] justify-between relative shadow-inner overflow-hidden border border-slate-800">
                  <div className="absolute right-3 top-3 text-slate-800">
                    <Cpu className="h-12 w-12" />
                  </div>
                  
                  <div className="space-y-4 relative z-10">
                    <span className="bg-teal-900/40 text-teal-400 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wider uppercase border border-teal-800/60 inline-block">
                      E2EE Raw Ciphertext
                    </span>
                    
                    <div className="space-y-2 text-slate-400 leading-normal">
                      <p className="font-semibold text-teal-400"># Payload do Banco de Dados</p>
                      <p className="break-all font-mono">
                        <span className="text-slate-500">"iv":</span> "{activePatient.cryptoIv.substring(0, 24)}..."
                      </p>
                      <p className="break-all font-mono">
                        <span className="text-slate-500">"salt":</span> "{activePatient.cryptoSalt.substring(0, 24)}..."
                      </p>
                      <p className="break-all font-mono text-[9px]">
                        <span className="text-slate-500">"ciphertext":</span>
                        <br />
                        <span className="text-amber-500/90">{activePatient.encryptedMedicalRecords.substring(0, 160)}...</span>
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/80 pt-3 mt-4 text-[9px] text-slate-500 flex items-center justify-between">
                    <span>Protocol: AES-GCM-256</span>
                    <span>Format: Base64</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Decrypted / Editing Area */
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
                {/* Form fields */}
                <form onSubmit={handleEncryptAndSave} className="md:col-span-8 bg-white rounded-2xl border border-slate-100 p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-teal-600" />
                      Ficha Clínica Criptografada
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md border border-emerald-100 font-bold font-mono">
                      <ShieldCheck className="h-3 w-3" />
                      DESCRIPTOGRAFADO
                    </div>
                  </div>

                  {/* Vitals row */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sinais Vitais (Última Medição)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Pressão Arterial</label>
                        <input
                          id="vital-pressure"
                          type="text"
                          value={editPressao}
                          onChange={(e) => setEditPressao(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Peso (kg)</label>
                        <input
                          id="vital-weight"
                          type="text"
                          value={editPeso}
                          onChange={(e) => setEditPeso(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 font-semibold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Temperatura</label>
                        <input
                          id="vital-temp"
                          type="text"
                          value={editTemperatura}
                          onChange={(e) => setEditTemperatura(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg text-xs px-2.5 py-1.5 font-semibold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Clinica details fields */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Alergias & Restrições Médicas</label>
                      <input
                        id="ehr-allergies"
                        type="text"
                        value={editAlergias}
                        onChange={(e) => setEditAlergias(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Anamnese / Histórico de Sintomas</label>
                      <textarea
                        id="ehr-anamnese"
                        value={editAnamnese}
                        onChange={(e) => setEditAnamnese(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-normal focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Diagnóstico Clínico Atual</label>
                      <textarea
                        id="ehr-diagnostico"
                        value={editDiagnostico}
                        onChange={(e) => setEditDiagnostico(e.target.value)}
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-normal focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Prescrição Médica & Dosagens</label>
                      <textarea
                        id="ehr-prescription"
                        value={editPrescricao}
                        onChange={(e) => setEditPrescricao(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-normal focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3 pt-4 border-t border-slate-100">
                    <button
                      id="close-ehr-edit"
                      type="button"
                      onClick={() => setIsDecrypted(false)}
                      className="w-1/3 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Fechar Registro
                    </button>
                    <button
                      id="print-ehr-button"
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="h-4 w-4" />
                      Imprimir / PDF
                    </button>
                    <button
                      id="save-ehr-button"
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Criptografando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Criptografar & Salvar Registro
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Crypto terminal inspector panel */}
                <div className="md:col-span-4 bg-slate-900 rounded-2xl p-4 text-slate-300 font-mono text-[9px] flex flex-col justify-between h-64 md:h-[calc(100vh-22rem)] min-h-[220px] md:min-h-[480px] border border-slate-800 shadow-inner">
                  <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 text-[10px] text-teal-400 font-bold shrink-0">
                      <Terminal className="h-4 w-4" />
                      <span>CONSOLE CRIPTOGRÁFICO</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar text-[8px] leading-relaxed">
                      {cryptoConsoleLogs.map((log, index) => (
                        <div key={index} className="text-slate-400 font-mono border-b border-slate-800/40 pb-1.5">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 text-[8px] text-slate-500 shrink-0">
                    <p className="flex justify-between">
                      <span>Encryption:</span>
                      <span className="text-teal-400 font-bold">AES-GCM-256</span>
                    </p>
                    <p className="flex justify-between mt-1">
                      <span>PBKDF2 Rounds:</span>
                      <span className="text-slate-400 font-bold">100.000</span>
                    </p>
                    <p className="flex justify-between mt-1 text-slate-600">
                      <span>Key: derived_on_client</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-16 text-center rounded-2xl border border-dashed border-slate-200">
            <Lock className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-slate-700 font-semibold text-sm">Selecione um paciente para visualizar o prontuário</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Utilize o menu de busca lateral para carregar um paciente da lista. Seus registros médicos estarão guardados sob chave forte criptográfica.
            </p>
          </div>
        )}
      </div>

      {/* Hidden printable medical record block (Visible only during window.print()) */}
      {activePatient && (
        <div className="hidden printable-medical-record p-8 font-sans text-slate-900 bg-white">
          {/* Professional Medical Header */}
          <div className="flex justify-between items-center border-b-2 border-teal-600 pb-4 mb-6">
            <div>
              <h1 className="text-base font-extrabold text-teal-800 uppercase tracking-wide">Centro Médico Dr. Diogo Gonzaga</h1>
              <p className="text-[8px] text-slate-400 font-mono mt-0.5">CFM Resolução nº 2.299/2021 • CNPJ 67.148.560/0001-69</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-700">PRONTUÁRIO CLÍNICO DIGITAL</p>
              <p className="text-[8px] text-slate-400 font-mono mt-0.5">Emissão: {new Date().toLocaleDateString('pt-BR')} — {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          {/* Patient Info */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mb-6 text-xs">
            <div>
              <p className="text-slate-400 uppercase text-[9px] font-bold">Paciente</p>
              <p className="font-extrabold text-slate-800">{activePatient.name}</p>
              <p className="text-slate-500 font-mono mt-0.5">CPF: {activePatient.cpf}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase text-[9px] font-bold">Nascimento</p>
              <p className="font-bold text-slate-800">{activePatient.birthDate.split('-').reverse().join('/')}</p>
            </div>
          </div>

          {/* Vitals */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">Sinais Vitais</h2>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Pressão Arterial:</span> <strong className="text-slate-800">{editPressao}</strong>
              </div>
              <div>
                <span className="text-slate-400">Peso:</span> <strong className="text-slate-800">{editPeso}</strong>
              </div>
              <div>
                <span className="text-slate-400">Temperatura:</span> <strong className="text-slate-800">{editTemperatura}</strong>
              </div>
            </div>
          </div>

          {/* Allergies */}
          {editAlergias && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs">
              <span className="text-rose-700 font-bold uppercase text-[9px] block mb-1">Alergias & Restrições</span>
              <p className="text-rose-950 font-semibold">{editAlergias}</p>
            </div>
          )}

          {/* Anamnese */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">Anamnese / Histórico de Sintomas</h2>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{editAnamnese}</p>
          </div>

          {/* Diagnostico */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">Diagnóstico Clínico</h2>
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{editDiagnostico}</p>
          </div>

          {/* Prescricao */}
          <div className="mb-8">
            <h2 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-2 pb-1 border-b border-slate-100">Prescrição Médica & Tratamento</h2>
            <p className="text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/60">{editPrescricao}</p>
          </div>

          {/* Doctor Signature */}
          <div className="mt-16 text-center text-xs">
            <div className="w-60 border-t border-slate-300 mx-auto pt-2">
              <p className="font-extrabold text-slate-800">Dr(a). {currentSession.name}</p>
              <p className="text-slate-400 font-mono mt-0.5">{currentSession.crm || 'CRM-REGISTRADO'}</p>
            </div>
          </div>

          {/* Footer details */}
          <div className="mt-16 border-t border-slate-100 pt-4 text-center text-[8px] text-slate-400 font-mono">
            Documento emitido digitalmente em conformidade com as exigências da LGPD e as normas éticas do CFM.
          </div>
        </div>
      )}
    </div>
  );
}

