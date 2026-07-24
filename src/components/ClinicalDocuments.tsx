/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, Search, User, ShieldCheck, Lock, Unlock, Key, RefreshCw, Printer, Plus, Trash2,
  ChevronRight, ClipboardCheck, Sparkles, Check, AlertTriangle, AlertCircle, FilePlus, Eye, BookOpen, Send
} from 'lucide-react';
import { Patient, ClinicalDocument, DecryptedMedicalRecord, UserSession } from '../types';
import { decryptMedicalRecord, encryptMedicalRecord, anonymizeCPF, calculateAuditHash } from '../utils/crypto';

interface ClinicalDocumentsProps {
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

const TEMPLATES = {
  receituario: [
    {
      id: 'rec_simples',
      name: 'Receituário Simples',
      title: 'RECEITUÁRIO SIMPLES',
      content: 'Uso Oral:\n\n1. Paracetamol 500mg ------------------- 1 Caixa\n   Tomar 1 comprimido de 6 em 6 horas em caso de dor ou febre (Máximo 4g/dia).\n\n2. Ibuprofeno 600mg -------------------- 1 Caixa\n   Tomar 1 comprimido de 12 em 12 horas por 5 dias, preferencialmente após as refeições.\n\n3. Medidas Gerais: Manter repouso hídrico, alimentação leve e repouso de 24h.'
    },
    {
      id: 'rec_especial',
      name: 'Receituário Especial (Portaria 344/98)',
      title: 'RECEITUÁRIO DE CONTROLE ESPECIAL',
      content: 'Receituário de Controle Especial (Portaria 344/98)\n\n1. Amitriptilina 25mg ------------------ 2 Caixas\n   Tomar 1 comprimido por via oral ao deitar (Uso Contínuo).\n\n2. Sertralina 50mg --------------------- 1 Caixa\n   Tomar 1 comprimido pela manhã após o café da manhã (Uso Contínuo).\n\nInstruções ao Paciente:\n- Apresentar esta receita acompanhada de documento de identificação na farmácia.\n- Tratamento de uso prolongado.'
    },
    {
      id: 'rec_hipertensao',
      name: 'Tratamento de Hipertensão',
      title: 'RECEITUÁRIO - HIPERTENSÃO',
      content: 'Tratamento de Hipertensão Arterial:\n\n1. Losartana Potássica 50mg ----------- 2 Caixas\n   Tomar 1 comprimido por via oral em jejum pela manhã (Uso Contínuo).\n\n2. Anlodipino 5mg --------------------- 1 Caixa\n   Tomar 1 comprimido por via oral às 20h (Uso Contínuo).\n\nOrientação:\n- Evitar alimentos ricos em sódio (sal).\n- Realizar caminhadas diárias de 30 minutos.'
    }
  ],
  atestado: [
    {
      id: 'atest_medico',
      name: 'Atestado Médico (Afastamento)',
      title: 'ATESTADO MÉDICO',
      content: 'Atesto para os devidos fins de direito que o(a) paciente [Nome do Paciente], portador(a) do CPF [CPF], foi submetido(a) a atendimento clínico nesta data e necessita de [Dias] dias de repouso absoluto, a partir de hoje, devendo afastar-se de suas atividades laborativas e escolares por motivos de saúde (CID-10: [CID]).'
    },
    {
      id: 'atest_aptidao',
      name: 'Atestado de Aptidão Física',
      title: 'ATESTADO DE APTIDÃO FÍSICA',
      content: 'Atesto, após avaliação clínica detalhada realizada nesta data, que o(a) paciente [Nome do Paciente], portador(a) do CPF [CPF], encontra-se em perfeitas condições de saúde física e mental, não apresentando contraindicações para a prática de atividades físicas, sports recreativos e exercícios de condicionamento físico geral.'
    }
  ],
  declaracao: [
    {
      id: 'dec_comparecimento',
      name: 'Declaração de Comparecimento',
      title: 'DECLARAÇÃO DE COMPARECIMENTO',
      content: 'Declaro para os devidos fins que o(a) paciente [Nome do Paciente], portador(a) do CPF [CPF], compareceu a atendimento médico neste Centro Clínico na data de hoje, no período das [Horário Inicial] às [Horário Final] horas, para fins de consulta e avaliação médica.'
    },
    {
      id: 'dec_acompanhante',
      name: 'Declaração de Acompanhante',
      title: 'DECLARAÇÃO DE ACOMPANHANTE',
      content: 'Declaro para os devidos fins que o(a) Sr(a). [Nome do Acompanhante], portador(a) do CPF [CPF do Acompanhante], esteve presente na data de hoje, das [Horário Inicial] às [Horário Final] horas, servindo como acompanhante de seu(sua) dependente/paciente [Nome do Paciente], portador(a) do CPF [CPF], durante a consulta médica realizada neste Centro Médico.'
    }
  ]
};

const MEDICATIONS = [
  { name: 'Paracetamol 500mg', dosage: 'Tomar 1 comprimido de 6/6h em caso de dor ou febre.' },
  { name: 'Ibuprofeno 600mg', dosage: 'Tomar 1 comprimido de 12/12h por 5 dias após refeições.' },
  { name: 'Amoxicilina 500mg', dosage: 'Tomar 1 cápsula de 8/8h por 7 dias (Antibiótico).' },
  { name: 'Losartana Potássica 50mg', dosage: 'Tomar 1 comprimido ao dia pela manhã (Uso contínuo).' },
  { name: 'Omeprazol 20mg', dosage: 'Tomar 1 cápsula em jejum pela manhã (Protetor gástrico).' },
  { name: 'Dipirona Sódica 1g', dosage: 'Tomar 1 comprimido de 6/6h se houver dor intensa ou febre.' },
  { name: 'Simeticona 75mg/mL', dosage: 'Tomar 20 gotas de 8/8h se houver gases/cólica.' },
  { name: 'Cetirizina 10mg', dosage: 'Tomar 1 comprimido à noite se houver prurido/alergia.' }
];

export default function ClinicalDocuments({
  patients,
  currentSession,
  onUpdatePatientMedicalRecord,
  onAddAuditLog
}: ClinicalDocumentsProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // E2EE Decryption States
  const [decryptionPassphrase, setDecryptionPassphrase] = useState<string>('DrDiogoGonzagaMasterKey2026!');
  const [isDecrypted, setIsDecrypted] = useState<boolean>(false);
  const [decryptedRecord, setDecryptedRecord] = useState<DecryptedMedicalRecord | null>(null);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [cryptoError, setCryptoError] = useState<string>('');

  // Editor States
  const [docType, setDocType] = useState<'receituario' | 'atestado' | 'declaracao'>('receituario');
  const [docTitle, setDocTitle] = useState<string>('RECEITUÁRIO SIMPLES');
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Active document for preview/print
  const [previewDoc, setPreviewDoc] = useState<{
    title: string;
    content: string;
    date: string;
    doctorName: string;
    doctorCrm: string;
    patientName: string;
    patientCpf: string;
    patientBirth: string;
    hash: string;
  } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activePatient = patients.find(p => p.id === selectedPatientId);

  // Clear decryption state on patient change
  useEffect(() => {
    setIsDecrypted(false);
    setDecryptedRecord(null);
    setCryptoError('');
    setDocumentContent('');
    setPreviewDoc(null);
  }, [selectedPatientId]);

  // Set default document template when docType changes
  useEffect(() => {
    if (isDecrypted && activePatient) {
      const templates = TEMPLATES[docType];
      if (templates && templates.length > 0) {
        loadTemplate(templates[0].id);
      }
    }
  }, [docType, isDecrypted]);

  const handleDecrypt = async () => {
    if (!activePatient) return;
    setIsDecrypting(true);
    setCryptoError('');

    try {
      const record = await decryptMedicalRecord(
        activePatient.encryptedMedicalRecords,
        activePatient.cryptoIv,
        activePatient.cryptoSalt,
        decryptionPassphrase
      );

      setDecryptedRecord(record);
      setIsDecrypted(true);

      // Load initial template for receituario
      const initialTemplate = TEMPLATES.receituario[0];
      setDocTitle(initialTemplate.title);
      setDocumentContent(replacePlaceholders(initialTemplate.content, activePatient));

      // Audit Log for access
      onAddAuditLog(
        'Acesso ao Prontuário',
        activePatient.id,
        activePatient.name,
        `Médico acessou o painel de documentos clínicos e descriptografou o prontuário.`,
        'Tutela da Saúde (Art. 7, VIII)'
      );
    } catch (err: any) {
      setCryptoError(err.message || 'Chave incorreta ou dados corrompidos.');
    } finally {
      setIsDecrypting(false);
    }
  };

  const replacePlaceholders = (text: string, patient: Patient): string => {
    const today = new Date().toLocaleDateString('pt-BR');
    return text
      .replace(/\[Nome do Paciente\]/g, patient.name)
      .replace(/\[CPF\]/g, patient.cpf)
      .replace(/\[Data de Hoje\]/g, today)
      .replace(/\[Nome do Médico\]/g, currentSession.name)
      .replace(/\[CRM\]/g, currentSession.crm || '')
      .replace(/\[Dias\]/g, '3')
      .replace(/\[CID\]/g, 'Z00.0')
      .replace(/\[Horário Inicial\]/g, '09:00')
      .replace(/\[Horário Final\]/g, '10:30')
      .replace(/\[Nome do Acompanhante\]/g, '____________________')
      .replace(/\[CPF do Acompanhante\]/g, '___.___.___-__');
  };

  const loadTemplate = (templateId: string) => {
    if (!activePatient) return;
    const allTemplates = [...TEMPLATES.receituario, ...TEMPLATES.atestado, ...TEMPLATES.declaracao];
    const template = allTemplates.find(t => t.id === templateId);
    if (template) {
      setDocTitle(template.title);
      setDocumentContent(replacePlaceholders(template.content, activePatient));
    }
  };

  const insertTextAtCursor = (textToInsert: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentText = documentContent;
    const newText = currentText.substring(0, start) + textToInsert + currentText.substring(end);
    setDocumentContent(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + textToInsert.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const insertMedication = (medName: string, dosage: string) => {
    const medText = `\n- ${medName} -----------\n  ${dosage}\n`;
    insertTextAtCursor(medText);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePatient || !decryptedRecord) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const today = new Date().toLocaleDateString('pt-BR');

      // Calculate validation hash representing secure digital signature
      const docString = `${docTitle} | ${activePatient.name} | ${activePatient.cpf} | ${documentContent} | ${currentSession.name} | ${today}`;
      const validationHash = await calculateAuditHash(docString);

      const newDoc: ClinicalDocument = {
        id: `doc_${Math.random().toString(36).substring(2, 9)}`,
        type: docType,
        title: docTitle,
        content: documentContent,
        date: today,
        doctorName: currentSession.name,
        doctorCrm: currentSession.crm || 'CRM-SP 000000'
      };

      const updatedDocuments = decryptedRecord.documents ? [...decryptedRecord.documents, newDoc] : [newDoc];

      const updatedRecord: DecryptedMedicalRecord = {
        ...decryptedRecord,
        documents: updatedDocuments,
        lastUpdated: new Date().toISOString()
      };

      // Perform local E2EE encryption
      const { ciphertext, iv, salt } = await encryptMedicalRecord(
        updatedRecord,
        decryptionPassphrase
      );

      // Save to parent state
      onUpdatePatientMedicalRecord(
        activePatient.id,
        ciphertext,
        iv,
        salt,
        'Edição de Prontuário',
        `Geração de documento clínico do tipo ${docType.toUpperCase()} para o paciente.`
      );

      setDecryptedRecord(updatedRecord);
      setSaveSuccess(true);

      // Update preview
      setPreviewDoc({
        title: newDoc.title,
        content: newDoc.content,
        date: newDoc.date,
        doctorName: newDoc.doctorName,
        doctorCrm: newDoc.doctorCrm,
        patientName: activePatient.name,
        patientCpf: activePatient.cpf,
        patientBirth: activePatient.birthDate.split('-').reverse().join('/'),
        hash: validationHash.substring(0, 32).toUpperCase()
      });

      // Audit log the creation
      onAddAuditLog(
        'Criação de Prontuário',
        activePatient.id,
        activePatient.name,
        `Médico gerou e assinou digitalmente um documento clínico (${newDoc.title}).`,
        'Tutela da Saúde (Art. 7, VIII)'
      );

      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Erro ao criptografar e salvar o documento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = (doc: ClinicalDocument) => {
    if (!activePatient) return;

    // Generate validation hash on the fly for old documents
    const docString = `${doc.title} | ${activePatient.name} | ${activePatient.cpf} | ${doc.content} | ${doc.doctorName} | ${doc.date}`;
    calculateAuditHash(docString).then(hash => {
      setPreviewDoc({
        title: doc.title,
        content: doc.content,
        date: doc.date,
        doctorName: doc.doctorName,
        doctorCrm: doc.doctorCrm,
        patientName: activePatient.name,
        patientCpf: activePatient.cpf,
        patientBirth: activePatient.birthDate.split('-').reverse().join('/'),
        hash: hash.substring(0, 32).toUpperCase()
      });

      // Quick timeout to let DOM render print structure
      setTimeout(() => {
        window.print();
      }, 150);
    });
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!activePatient || !decryptedRecord) return;
    if (!window.confirm('Tem certeza que deseja excluir esta cópia local do documento?')) return;

    try {
      const updatedDocuments = (decryptedRecord.documents || []).filter(d => d.id !== docId);
      const updatedRecord: DecryptedMedicalRecord = {
        ...decryptedRecord,
        documents: updatedDocuments,
        lastUpdated: new Date().toISOString()
      };

      const { ciphertext, iv, salt } = await encryptMedicalRecord(
        updatedRecord,
        decryptionPassphrase
      );

      onUpdatePatientMedicalRecord(
        activePatient.id,
        ciphertext,
        iv,
        salt,
        'Edição de Prontuário',
        `Exclusão de cópia de documento clínico do prontuário.`
      );

      setDecryptedRecord(updatedRecord);
      if (previewDoc && previewDoc.hash) {
        setPreviewDoc(null);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir documento.');
    }
  };

  const filteredPatients = patients.filter(p => {
    if (p.isAnonymized) return false;
    const query = searchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || p.cpf.includes(query);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* 1. Patient List Sidebar (3 cols) */}
      <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col h-[calc(100vh-14rem)] min-h-[460px]">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Pesquisa de Pacientes</h3>
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            id="doc-patient-search"
            type="text"
            placeholder="Buscar por nome ou CPF..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 transition-all font-sans"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {filteredPatients.length > 0 ? (
            filteredPatients.map(p => (
              <button
                id={`doc-patient-item-${p.id}`}
                key={p.id}
                onClick={() => setSelectedPatientId(p.id)}
                className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${selectedPatientId === p.id ? 'bg-indigo-50/50 border-indigo-200 shadow-xs' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 hover:border-slate-200'}`}
              >
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</h4>
                  <p className="text-[9px] text-slate-400 font-mono">CPF: {anonymizeCPF(p.cpf)}</p>
                </div>
                <ChevronRight className={`h-4 w-4 ${selectedPatientId === p.id ? 'text-indigo-600' : 'text-slate-300'}`} />
              </button>
            ))
          ) : (
            <div className="text-center py-8">
              <User className="h-7 w-7 text-slate-300 mx-auto mb-2" />
              <p className="text-[11px] text-slate-400">Nenhum paciente localizado</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Main Workstation (9 cols) */}
      <div className="lg:col-span-9 space-y-6">
        {activePatient ? (
          <div className="space-y-6">

            {/* Patient Header Summary */}
            <div className="bg-white px-5 py-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <User className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{activePatient.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Nasc: {activePatient.birthDate.split('-').reverse().join('/')} | CPF: {anonymizeCPF(activePatient.cpf)}
                  </p>
                </div>
              </div>

              {isDecrypted && (
                <div className="flex items-center gap-1.5 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-3 py-1.5 rounded-xl font-bold font-mono">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  PRONTUÁRIO E2EE LIBERADO
                </div>
              )}
            </div>

            {/* Blocked / Crypt Passphrase UI */}
            {!isDecrypted ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm text-center max-w-xl mx-auto space-y-5">
                <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-full">
                  <Lock className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-bold text-slate-800">Descriptografia E2EE Necessária</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                    Por razões de segurança e em observância à LGPD, as receitas e atestados médicos salvos do paciente estão criptografados de ponta a ponta no banco de dados. Insira a chave para liberar a edição.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="relative max-w-xs mx-auto">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Key className="h-4 w-4 text-indigo-500" />
                    </span>
                    <input
                      id="doc-decryption-key"
                      type="password"
                      placeholder="Chave do consultório..."
                      value={decryptionPassphrase}
                      onChange={(e) => setDecryptionPassphrase(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800 text-center"
                    />
                  </div>

                  {cryptoError && (
                    <div className="p-3 max-w-xs mx-auto bg-rose-50 border border-rose-100 rounded-xl flex gap-2 items-center text-xs text-rose-700 font-medium">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>{cryptoError}</span>
                    </div>
                  )}

                  <button
                    id="doc-decrypt-button"
                    onClick={handleDecrypt}
                    disabled={isDecrypting}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs py-2.5 px-6 rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                  >
                    {isDecrypting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Descriptografando...
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4" />
                        Descriptografar Ficha e Documentos
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (

              /* Editor & History Dashboard */
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

                {/* 2.1 Editor Workspace (7 cols) */}
                <form onSubmit={handleSaveDocument} className="xl:col-span-7 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gerador de Documentos</h3>

                    {/* Document Type buttons */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      {(['receituario', 'atestado', 'declaracao'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setDocType(type)}
                          className={`px-3 py-1.5 rounded-md text-[10px] font-bold capitalize transition-all cursor-pointer ${docType === type ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          {type === 'receituario' ? 'Receita' : type === 'atestado' ? 'Atestado' : 'Declaração'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template Picker */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Modelos Prontos para {docType === 'receituario' ? 'Receitas' : docType === 'atestado' ? 'Atestados' : 'Declarações'}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TEMPLATES[docType].map(template => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => loadTemplate(template.id)}
                          className="p-2 border border-slate-100 bg-slate-50 hover:bg-indigo-50/30 hover:border-indigo-200 text-left text-xs rounded-xl transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <span className="font-bold text-slate-700 line-clamp-1">{template.name}</span>
                          <Sparkles className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-500 transition-all shrink-0 ml-1.5" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Variables and Editor Inputs */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Título do Documento</label>
                        <input
                          type="text"
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Médico Responsável</label>
                        <input
                          type="text"
                          disabled
                          value={`${currentSession.name} (${currentSession.crm || 'Sem CRM'})`}
                          className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500"
                        />
                      </div>
                    </div>

                    {/* Content Editor */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Corpo do Documento</label>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => insertTextAtCursor('[Nome do Paciente]')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold border border-slate-200 transition-all cursor-pointer"
                            title="Injetar Nome do Paciente"
                          >
                            + Paciente
                          </button>
                          <button
                            type="button"
                            onClick={() => insertTextAtCursor('[CPF]')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold border border-slate-200 transition-all cursor-pointer"
                            title="Injetar CPF"
                          >
                            + CPF
                          </button>
                          <button
                            type="button"
                            onClick={() => insertTextAtCursor('[Data de Hoje]')}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold border border-slate-200 transition-all cursor-pointer"
                          >
                            + Data
                          </button>
                        </div>
                      </div>
                      <textarea
                        ref={textareaRef}
                        value={documentContent}
                        onChange={(e) => setDocumentContent(e.target.value)}
                        rows={11}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 font-mono shadow-inner custom-scrollbar"
                      />
                    </div>
                  </div>

                  {/* Quick Drug Injector (Only for Receituario) */}
                  {docType === 'receituario' && (
                    <div className="border border-slate-100 bg-slate-50/50 p-3 rounded-xl space-y-2">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Medicamentos de Consulta Rápida</span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                        {MEDICATIONS.map((med, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => insertMedication(med.name, med.dosage)}
                            className="bg-white hover:bg-indigo-50 border border-slate-200 text-[10px] text-slate-700 px-2 py-1 rounded-lg transition-all cursor-pointer hover:border-indigo-300 font-medium"
                          >
                            + {med.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (documentContent.trim() === '') return;
                        const today = new Date().toLocaleDateString('pt-BR');
                        setPreviewDoc({
                          title: docTitle,
                          content: documentContent,
                          date: today,
                          doctorName: currentSession.name,
                          doctorCrm: currentSession.crm || 'CRM-SP 000000',
                          patientName: activePatient.name,
                          patientCpf: activePatient.cpf,
                          patientBirth: activePatient.birthDate.split('-').reverse().join('/'),
                          hash: 'Aguardando Assinatura'
                        });
                      }}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="h-4 w-4" />
                      Visualizar
                    </button>

                    <button
                      type="submit"
                      disabled={isSaving || documentContent.trim() === ''}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <Check className="h-4 w-4" />
                          Documento Salvo & Criptografado!
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Salvar Cópia no Prontuário
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* 2.2 Right side: History & Preview (5 cols) */}
                <div className="xl:col-span-5 space-y-6">

                  {/* Historic Documents */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm h-64 flex flex-col">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-indigo-500" />
                      Histórico do Paciente ({decryptedRecord.documents?.length || 0})
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                      {decryptedRecord.documents && decryptedRecord.documents.length > 0 ? (
                        [...decryptedRecord.documents].reverse().map(doc => (
                          <div
                            key={doc.id}
                            className="p-2.5 bg-slate-50 hover:bg-indigo-50/20 border border-slate-150 rounded-xl text-left flex items-start justify-between gap-3 group transition-all"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-slate-800 truncate">{doc.title}</p>
                              <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-1">
                                <span className="bg-slate-200 text-slate-600 px-1 py-0.5 rounded text-[8px] font-bold uppercase">{doc.type}</span>
                                <span>•</span>
                                <span>{doc.date}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => handlePrint(doc)}
                          className="p-1 hover:text-indigo-600 text-slate-400 transition-all cursor-pointer rounded hover:bg-indigo-50" id={`print-doc-btn-${doc.id}`}
                                title="Imprimir / Salvar PDF"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(doc.id)}
                          className="p-1 hover:text-rose-600 text-slate-400 transition-all cursor-pointer rounded hover:bg-rose-50" id={`delete-doc-btn-${doc.id}`}
                                title="Excluir Cópia"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10">
                          <FilePlus className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                          <p className="text-[10px] text-slate-400">Nenhum documento emitido</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sheet Print Preview */}
                  <div className="bg-slate-200/60 rounded-2xl p-4 border border-slate-300/40 flex flex-col items-center">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2 self-start">Visualização da Folha Timbrada</span>

                    {previewDoc ? (
                      <div className="w-full bg-white border border-slate-300 shadow-lg p-5 text-slate-800 font-sans aspect-[1/1.41] flex flex-col justify-between text-[9px] relative overflow-hidden select-none">

                        {/* Letterhead Header */}
                        <div className="border-b border-indigo-200 pb-2 mb-3 text-center">
                          <h4 className="text-[11px] font-extrabold text-indigo-900 uppercase tracking-wide">Centro Médico Dr. Diogo Gonzaga</h4>
                          <p className="text-[7px] text-slate-400 font-mono mt-0.5">CFM Resolução nº 2.299/2021 • CRM-SP Jurídico 998877</p>
                        </div>

                        {/* Title & Body */}
                        <div className="flex-1 flex flex-col">
                          <h5 className="text-[9px] font-extrabold text-center text-indigo-950 uppercase tracking-wider mb-3 underline decoration-indigo-200">
                            {previewDoc.title}
                          </h5>

                          {/* Patient Block */}
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mb-3 text-[8px] leading-relaxed">
                            <p><strong>Paciente:</strong> {previewDoc.patientName}</p>
                            <p><strong>Nascimento:</strong> {previewDoc.patientBirth} | <strong>CPF:</strong> {anonymizeCPF(previewDoc.patientCpf)}</p>
                          </div>

                          {/* Main Text Content */}
                          <p className="whitespace-pre-wrap leading-relaxed text-slate-700 flex-1 font-mono text-[8px] bg-slate-50/20 p-2 rounded-md border border-dashed border-slate-200/50">
                            {previewDoc.content}
                          </p>
                        </div>

                        {/* Signature & Validation Footer */}
                        <div className="mt-4 space-y-3">
                          <div className="text-center pt-2 border-t border-slate-200/60 w-3/5 mx-auto">
                            <p className="font-bold text-slate-800">{previewDoc.doctorName}</p>
                            <p className="text-[7px] text-slate-400 font-mono">{previewDoc.doctorCrm}</p>
                          </div>

                          <div className="flex justify-between items-end border-t border-indigo-100 pt-2 text-[7px] text-slate-400 font-mono">
                            <div className="space-y-0.5">
                              <p className="font-bold text-[6px] text-indigo-800 uppercase tracking-wider">Assinatura Digital CFM Validador</p>
                              <p className="truncate w-36">Chave: {previewDoc.hash}</p>
                              <p>Data: {previewDoc.date} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>

                            {/* Simulated Micro QR Code */}
                            <div className="h-8 w-8 border border-slate-300 p-0.5 flex flex-col gap-0.5 bg-slate-50 shrink-0">
                              <div className="flex gap-0.5 justify-between flex-1">
                                <span className="w-1.5 h-1.5 bg-slate-900"></span>
                                <span className="w-1.5 h-1.5 bg-slate-900"></span>
                              </div>
                              <div className="bg-slate-900 h-1.5 w-1.5 mx-auto"></div>
                              <div className="flex gap-0.5 justify-between flex-1">
                                <span className="w-1.5 h-1.5 bg-slate-900"></span>
                                <span className="w-1.5 h-1.5 bg-slate-900"></span>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="w-full bg-white border border-slate-200/80 rounded-xl p-8 text-center text-slate-400 aspect-[1/1.41] flex flex-col justify-center items-center">
                        <FilePlus className="h-8 w-8 text-slate-200 mb-2" />
                        <p className="text-xs font-semibold">Sem Visualização</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[140px]">Digite o conteúdo e clique em visualizar ou salve o documento para ver a folha timbrada.</p>
                      </div>
                    )}

                    {previewDoc && (
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="mt-3 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs py-2 px-4 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="h-4 w-4" />
                        Imprimir / Exportar PDF
                      </button>
                    )}
                  </div>

                </div>

              </div>
            )}
          </div>
        ) : (
          <div className="bg-white p-16 text-center rounded-2xl border border-dashed border-slate-200 max-w-xl mx-auto mt-6">
            <Lock className="h-10 w-10 text-indigo-300 mx-auto mb-3" />
            <h4 className="text-slate-700 font-semibold text-sm">Selecione um paciente para redigir documentos</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              Utilize o menu lateral de busca para carregar um prontuário ativo. Você poderá gerar receitas, atestados e declarações com modelos prontos.
            </p>
          </div>
        )}
      </div>

      {/* 3. Invisible printable layout designed exclusively for window.print() */}
      {previewDoc && activePatient && (
        <div className="hidden printable-clinical-document p-10 font-sans text-slate-900 bg-white">
          {/* Paper Letterhead Header */}
          <div className="flex justify-between items-center border-b-2 border-indigo-700 pb-4 mb-6">
            <div>
              <h1 className="text-lg font-extrabold text-indigo-900 uppercase tracking-wide">Centro Médico Dr. Diogo Gonzaga</h1>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">CFM Resolução nº 2.299/2021 • CRM-SP Jurídico 998877</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-slate-700 uppercase">{previewDoc.title}</p>
              <p className="text-[8px] text-slate-400 font-mono mt-0.5">Emissão: {previewDoc.date} — {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>

          {/* Patient Details Block */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-xs leading-relaxed">
            <div>
              <p className="text-slate-400 uppercase text-[9px] font-bold">Paciente</p>
              <p className="font-extrabold text-slate-800">{previewDoc.patientName}</p>
              <p className="text-slate-500 font-mono mt-0.5 font-semibold">CPF: {previewDoc.patientCpf}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase text-[9px] font-bold">Nascimento</p>
              <p className="font-bold text-slate-800">{previewDoc.patientBirth}</p>
            </div>
          </div>

          {/* Main Body of Document */}
          <div className="mb-12 min-h-[350px]">
            <h2 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Prescrição e Recomendações</h2>
            <p className="text-xs text-slate-800 font-mono whitespace-pre-wrap leading-loose bg-slate-50/50 p-6 rounded-xl border border-slate-200">{previewDoc.content}</p>
          </div>

          {/* Signature block */}
          <div className="mt-16 text-center text-xs">
            <div className="w-64 border-t border-slate-350 mx-auto pt-2">
              <p className="font-extrabold text-slate-800">{previewDoc.doctorName}</p>
              <p className="text-slate-400 font-mono mt-0.5">{previewDoc.doctorCrm}</p>
            </div>
          </div>

          {/* Authentic validation footer with QR mockup */}
          <div className="mt-20 border-t border-indigo-100 pt-4 flex justify-between items-center text-[8px] text-slate-400 font-mono">
            <div>
              <p className="font-bold text-[9px] text-indigo-800 uppercase tracking-wide">Documento Assinado Digitalmente</p>
              <p className="mt-1">Código de Autenticidade: <strong className="text-slate-700 font-mono uppercase">{previewDoc.hash}</strong></p>
              <p className="mt-0.5">Para validação, acesse: <span className="underline">https://drdiogogonzaga.com.br/validar</span></p>
            </div>

            {/* QR Mockup */}
            <div className="h-12 w-12 border-2 border-slate-300 p-0.5 flex flex-col gap-0.5 bg-slate-50 shrink-0">
              <div className="flex gap-0.5 justify-between flex-1">
                <span className="w-2.5 h-2.5 bg-slate-900"></span>
                <span className="w-2.5 h-2.5 bg-slate-900"></span>
              </div>
              <div className="bg-slate-900 h-2.5 w-2.5 mx-auto"></div>
              <div className="flex gap-0.5 justify-between flex-1">
                <span className="w-2.5 h-2.5 bg-slate-900"></span>
                <span className="w-2.5 h-2.5 bg-slate-900"></span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
