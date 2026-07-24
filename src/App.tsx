/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Patient, Doctor, Appointment, Procedure, AuditLog, UserSession, DecryptedMedicalRecord, CashTransaction, Employee, UserPermissions, Exam, ExamBudget } from './types';
import { encryptMedicalRecord, calculateAuditHash, generateRandomSecret } from './utils/crypto';
import { supabase, isSupabaseConfigured } from './utils/supabaseClient';
import Layout from './components/Layout';
import Appointments from './components/Appointments';
import HealthRecords from './components/HealthRecords';
import ClinicalDocuments from './components/ClinicalDocuments';
import LGPDDashboard from './components/LGPDDashboard';
import Doctors2FA from './components/Doctors2FA';
import DoctorHistory from './components/DoctorHistory';
import CashRegister from './components/CashRegister';
import LoginScreen from './components/LoginScreen';
import AccessControl from './components/AccessControl';
import Exams from './components/Exams';
import ExamBudgets from './components/ExamBudgets';
import LabIntegration from './components/LabIntegration';
import { AlertTriangle, Lock, ShieldAlert } from 'lucide-react';

const DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  'doc_01': { viewAppointments: true, viewEHR: true, createClinicalDocs: true, viewCashRegister: false, viewLGPD: true, manageUsers: false, viewLabIntegration: true },
  'doc_02': { viewAppointments: true, viewEHR: true, createClinicalDocs: true, viewCashRegister: false, viewLGPD: true, manageUsers: false, viewLabIntegration: true },
  'doc_03': { viewAppointments: true, viewEHR: true, createClinicalDocs: true, viewCashRegister: false, viewLGPD: true, manageUsers: false, viewLabIntegration: true },
  'rec_10': { viewAppointments: true, viewEHR: false, createClinicalDocs: false, viewCashRegister: true, viewLGPD: true, manageUsers: false, viewLabIntegration: true },
  'admin_01': { viewAppointments: true, viewEHR: true, createClinicalDocs: true, viewCashRegister: true, viewLGPD: true, manageUsers: true, viewLabIntegration: true }
};

const getDefaultPermissionsForRole = (role: string): UserPermissions => {
  if (role === 'admin') {
    return { viewAppointments: true, viewEHR: true, createClinicalDocs: true, viewCashRegister: true, viewLGPD: true, manageUsers: true, viewLabIntegration: true };
  } else if (role === 'doctor') {
    return { viewAppointments: true, viewEHR: true, createClinicalDocs: true, viewCashRegister: false, viewLGPD: true, manageUsers: false, viewLabIntegration: true };
  } else if (role === 'receptionist') {
    return { viewAppointments: true, viewEHR: false, createClinicalDocs: false, viewCashRegister: true, viewLGPD: true, manageUsers: false, viewLabIntegration: true };
  } else if (role === 'finance') {
    return { viewAppointments: false, viewEHR: false, createClinicalDocs: false, viewCashRegister: true, viewLGPD: false, manageUsers: false, viewLabIntegration: false };
  } else {
    // nurse ou outros
    return { viewAppointments: true, viewEHR: true, createClinicalDocs: false, viewCashRegister: false, viewLGPD: false, manageUsers: false, viewLabIntegration: false };
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('clinic_active_tab') || 'appointments';
  });
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [examBudgets, setExamBudgets] = useState<ExamBudget[]>([]);
  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem('clinic_exams_catalog');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: 'ex_1', name: 'Ultrassonografia Obstétrica', description: 'Ultrassom obstétrica para acompanhamento gestacional.', durationMinutes: 30, price: 180.00 },
      { id: 'ex_2', name: 'Radiologia de Tórax', description: 'Raio-X digital de tórax, PA e Perfil.', durationMinutes: 15, price: 90.00 },
      { id: 'ex_3', name: 'Hemograma Completo (Coleta)', description: 'Coleta de sangue para hemograma completo.', durationMinutes: 10, price: 45.00 },
      { id: 'ex_4', name: 'Eletrocardiograma', description: 'ECG convencional de repouso com laudo.', durationMinutes: 20, price: 75.00 }
    ];
  });
  const [isDataInitialized, setIsDataInitialized] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('clinic_exams_catalog', JSON.stringify(exams));
  }, [exams]);

  // Mapeamento de Permissões
  const [permissionsMap, setPermissionsMap] = useState<Record<string, UserPermissions>>(() => {
    const saved = localStorage.getItem('clinic_permissions_map');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Falha ao ler permissões salvas", e);
      }
    }
    return DEFAULT_PERMISSIONS;
  });

  // Active Session state persistida
  const [currentSession, setCurrentSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem('clinic_current_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Ignorar erro
      }
    }
    return {
      loggedIn: false,
      role: 'receptionist',
      userId: '',
      name: 'Anônimo',
      is2FAVerified: false
    };
  });

  // Salvar estados na persistência local
  useEffect(() => {
    localStorage.setItem('clinic_permissions_map', JSON.stringify(permissionsMap));
  }, [permissionsMap]);

  useEffect(() => {
    localStorage.setItem('clinic_current_session', JSON.stringify(currentSession));
  }, [currentSession]);

  useEffect(() => {
    localStorage.setItem('clinic_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (isDataInitialized) {
      localStorage.setItem('clinic_patients', JSON.stringify(patients));
    }
  }, [patients, isDataInitialized]);

  useEffect(() => {
    if (isDataInitialized) {
      localStorage.setItem('clinic_doctors', JSON.stringify(doctors));
    }
  }, [doctors, isDataInitialized]);

  useEffect(() => {
    if (isDataInitialized) {
      localStorage.setItem('clinic_appointments', JSON.stringify(appointments));
    }
  }, [appointments, isDataInitialized]);

  useEffect(() => {
    if (isDataInitialized) {
      localStorage.setItem('clinic_procedures', JSON.stringify(procedures));
    }
  }, [procedures, isDataInitialized]);

  useEffect(() => {
    if (isDataInitialized) {
      localStorage.setItem('clinic_audit_logs', JSON.stringify(auditLogs));
    }
  }, [auditLogs, isDataInitialized]);

  useEffect(() => {
    if (isDataInitialized) {
      localStorage.setItem('clinic_cash_transactions', JSON.stringify(cashTransactions));
    }
  }, [cashTransactions, isDataInitialized]);

  useEffect(() => {
    if (isDataInitialized) {
      localStorage.setItem('clinic_employees', JSON.stringify(employees));
    }
  }, [employees, isDataInitialized]);

  useEffect(() => {
    if (isDataInitialized) {
      localStorage.setItem('clinic_exam_budgets', JSON.stringify(examBudgets));
    }
  }, [examBudgets, isDataInitialized]);

  // Master passphrase for seed encryption
  const masterCryptoPassphrase = 'DrDiogoGonzagaMasterKey2026!';

  // Step 1: Initialize metadata name and description on first run
  useEffect(() => {
    // Setting browser page title
    document.title = "Centro medico Dr.Diogo Gonzaga — Sistema Clínico Seguro e LGPD";
  }, []);

  // Step 2: Initialize or fetch data
  const mapPatientFromDb = (dbPat: any): Patient => ({
    id: dbPat.id,
    name: dbPat.name,
    cpf: dbPat.cpf,
    email: dbPat.email || '',
    phone: dbPat.phone || '',
    birthDate: dbPat.birth_date || '',
    encryptedMedicalRecords: dbPat.encrypted_medical_records || '',
    cryptoIv: dbPat.crypto_iv || '',
    cryptoSalt: dbPat.crypto_salt || '',
    consentGiven: !!dbPat.consent_given,
    consentDate: dbPat.consent_date || null,
    consentVersion: dbPat.consent_version || '',
    consentPurpose: dbPat.consent_purpose || '',
    isAnonymized: !!dbPat.is_anonymized
  });

  const mapPatientToDb = (pat: Patient) => ({
    id: pat.id,
    name: pat.name,
    cpf: pat.cpf,
    email: pat.email,
    phone: pat.phone,
    birth_date: pat.birthDate,
    encrypted_medical_records: pat.encryptedMedicalRecords,
    crypto_iv: pat.cryptoIv,
    crypto_salt: pat.cryptoSalt,
    consent_given: pat.consentGiven,
    consent_date: pat.consentDate,
    consent_version: pat.consentVersion,
    consent_purpose: pat.consentPurpose,
    is_anonymized: pat.isAnonymized
  });

  useEffect(() => {
    const initializeData = async () => {
      if (isSupabaseConfigured && supabase) {
        try {
          console.log("Supabase configurado. Buscando dados da nuvem...");
          const { data: dbDoctors, error: errDoctors } = await supabase.from('doctors').select('*');

          if (errDoctors) throw errDoctors;

          if (dbDoctors && dbDoctors.length > 0) {
            setDoctors(dbDoctors.map((d: any) => ({
              id: d.id,
              name: d.name,
              crm: d.crm,
              specialty: d.specialty,
              email: d.email,
              phone: d.phone,
              is2FAEnabled: !!d.is_2fa_enabled,
              twoFactorSecret: d.two_factor_secret,
              avatar: d.avatar,
              consultationPrice: Number(d.consultation_price),
              password: d.password
            })));

            const { data: dbPatients } = await supabase.from('patients').select('*');
            setPatients((dbPatients || []).map(mapPatientFromDb));

            const { data: dbApps } = await supabase.from('appointments').select('*');
            const loadedApps: Appointment[] = (dbApps || []).map((a: any) => ({
              id: a.id,
              patientId: a.patient_id,
              patientName: a.patient_name,
              doctorId: a.doctor_id,
              doctorName: a.doctor_name,
              specialty: a.specialty,
              date: a.date,
              time: a.time,
              status: a.status as any,
              notes: a.notes || '',
              paymentMethod: a.payment_method as any,
              price: a.price ? Number(a.price) : undefined,
              paymentStatus: a.payment_status || 'pendente'
            }));
            setAppointments(loadedApps);

            const { data: dbProcs } = await supabase.from('procedures').select('*');
            setProcedures((dbProcs || []).map((p: any) => ({
              id: p.id,
              patientId: p.patient_id,
              patientName: p.patient_name,
              doctorId: p.doctor_id,
              doctorName: p.doctor_name,
              specialty: p.specialty,
              date: p.date,
              type: p.type as any,
              name: p.name,
              notes: p.notes || '',
              riskClass: p.risk_class as any,
              durationMinutes: Number(p.duration_minutes)
            })));

            const { data: dbLogs } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
            setAuditLogs((dbLogs || []).map((l: any) => ({
              id: l.id,
              timestamp: l.timestamp,
              userId: l.user_id,
              userName: l.user_name,
              userRole: l.user_role as any,
              action: l.action as any,
              patientId: l.patient_id,
              patientName: l.patient_name,
              details: l.details,
              lgpdBasis: l.lgpd_basis as any,
              ipAddress: l.ip_address,
              deviceInfo: l.device_info,
              securityHash: l.security_hash
            })));

            const { data: dbTxs } = await supabase.from('cash_transactions').select('*');
            const loadedTxs = (dbTxs || []).map((t: any) => ({
              id: t.id,
              timestamp: t.timestamp,
              patientId: t.patient_id || undefined,
              patientName: t.patient_name || undefined,
              description: t.description,
              amount: Number(t.amount),
              paymentMethod: t.payment_method as any,
              operatorId: t.operator_id,
              operatorName: t.operator_name
            }));

            setCashTransactions(loadedTxs);

            const { data: dbEmployees } = await supabase.from('employees').select('*');
            setEmployees((dbEmployees || []).map((e: any) => ({
              id: e.id,
              name: e.name,
              role: e.role as any,
              email: e.email,
              phone: e.phone,
              avatar: e.avatar,
              password: e.password
            })));

            try {
              const { data: dbExams } = await supabase.from('exames_db').select('*');
              if (dbExams && dbExams.length > 0) {
                setExams(dbExams.map((e: any) => ({
                  id: e.id,
                  name: e.descricao, // mapeamento
                  description: `Código: ${e.codigo_exame_db} | Mnemônico: ${e.mnemonico}`,
                  durationMinutes: e.prazo || 15,
                  price: 0 // exames_db não tem preço por padrão
                })));
              }
            } catch (err) {
              console.error("Falha ao buscar exames do Supabase:", err);
            }

            try {
              const { data: dbBudgets } = await supabase.from('orcamentos_exames').select('*').order('created_at', { ascending: false });
              if (dbBudgets && dbBudgets.length > 0) {
                setExamBudgets(dbBudgets.map((b: any) => ({
                  id: b.id,
                  createdAt: b.created_at,
                  patientId: b.patient_id || undefined,
                  patientName: b.patient_name,
                  operatorId: b.operator_id,
                  operatorName: b.operator_name,
                  items: typeof b.items === 'string' ? JSON.parse(b.items) : b.items,
                  totalAmount: Number(b.total_amount),
                  notes: b.notes || '',
                  status: b.status as any
                })));
              }
            } catch (err) {
              console.error("Falha ao buscar or\u00e7amentos de exames do Supabase:", err);
            }

            setIsDataInitialized(true);
            return;
          } else {
            console.log("Supabase vazio. Alimentando banco de dados com as sementes iniciais...");
            await seedDatabase(true);
            return;
          }
        } catch (dbErr) {
          console.error("Erro ao carregar dados do Supabase. Carregando do LocalStorage...", dbErr);
          const savedPatients = localStorage.getItem('clinic_patients');
          const savedDoctors = localStorage.getItem('clinic_doctors');
          const savedAppointments = localStorage.getItem('clinic_appointments');
          const savedProcedures = localStorage.getItem('clinic_procedures');
          const savedLogs = localStorage.getItem('clinic_audit_logs');
          const savedCash = localStorage.getItem('clinic_cash_transactions');
          const savedEmployees = localStorage.getItem('clinic_employees');
          const savedBudgets = localStorage.getItem('clinic_exam_budgets');

          if (savedDoctors && savedPatients) {
            try {
              setPatients(JSON.parse(savedPatients));
              setDoctors(JSON.parse(savedDoctors));
              setAppointments(JSON.parse(savedAppointments || '[]'));
              setProcedures(JSON.parse(savedProcedures || '[]'));
              setAuditLogs(JSON.parse(savedLogs || '[]'));
              setCashTransactions(JSON.parse(savedCash || '[]'));
              setEmployees(JSON.parse(savedEmployees || '[]'));
              setExamBudgets(JSON.parse(savedBudgets || '[]'));
              setIsDataInitialized(true);
              return;
            } catch (e) {
              console.error("Erro ao parsear dados do LocalStorage, re-seeding...", e);
            }
          }
        }
      }

      // Offline Fallback
      const savedPatients = localStorage.getItem('clinic_patients');
      const savedDoctors = localStorage.getItem('clinic_doctors');
      const savedAppointments = localStorage.getItem('clinic_appointments');
      const savedProcedures = localStorage.getItem('clinic_procedures');
      const savedLogs = localStorage.getItem('clinic_audit_logs');
      const savedCash = localStorage.getItem('clinic_cash_transactions');
      const savedEmployees = localStorage.getItem('clinic_employees');
      const savedBudgets = localStorage.getItem('clinic_exam_budgets');

      if (savedDoctors && savedPatients) {
        try {
          setPatients(JSON.parse(savedPatients));
          setDoctors(JSON.parse(savedDoctors));
          setAppointments(JSON.parse(savedAppointments || '[]'));
          setProcedures(JSON.parse(savedProcedures || '[]'));
          setAuditLogs(JSON.parse(savedLogs || '[]'));
          setCashTransactions(JSON.parse(savedCash || '[]'));
          setEmployees(JSON.parse(savedEmployees || '[]'));
          setExamBudgets(JSON.parse(savedBudgets || '[]'));
          setIsDataInitialized(true);
          return;
        } catch (e) {
          console.error("Erro ao parsear dados do LocalStorage no fallback, re-seeding...", e);
        }
      }
      await seedDatabase(false);
    };

    const seedDatabase = async (writeToSupabase: boolean) => {
      // 1. Seed Doctors
      const seededDoctors: Doctor[] = [
        {
          id: 'doc_01',
          name: 'Dr. Roberto Vasconcellos',
          crm: 'CRM-SP 123456',
          specialty: 'Cardiologia',
          email: 'roberto.vasconcellos@drDiogogonzaga.com.br',
          phone: '(11) 98765-4321',
          is2FAEnabled: true,
          twoFactorSecret: 'DRDiogoGONZAGAROBERTO2026',
          avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150',
          consultationPrice: 300.00,
          password: '123456'
        },
        {
          id: 'doc_02',
          name: 'Dra. Amanda Guimarães',
          crm: 'CRM-RJ 654321',
          specialty: 'Pediatria',
          email: 'amanda.guimaraes@drDiogogonzaga.com.br',
          phone: '(21) 97777-6666',
          is2FAEnabled: false,
          twoFactorSecret: generateRandomSecret(),
          avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=150',
          consultationPrice: 250.00,
          password: '123456'
        },
        {
          id: 'doc_03',
          name: 'Dr. Felipe Albuquerque',
          crm: 'CRM-MG 987654',
          specialty: 'Dermatologia',
          email: 'felipe.albuquerque@drDiogogonzaga.com.br',
          phone: '(31) 99999-8888',
          is2FAEnabled: false,
          twoFactorSecret: generateRandomSecret(),
          avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150',
          consultationPrice: 200.00,
          password: '123456'
        }
      ];

      // 2. Cleartext records that will be client-side encrypted
      const recordCarlos: DecryptedMedicalRecord = {
        anamnese: 'Paciente queixa-se de fadiga muscular crônica, palpitações esporádicas e cefaleia frontal recorrente. Histórico de hipertensão diagnosticada há 3 anos.',
        diagnostico: 'Hipertensão arterial sistêmica descompensada. Suspeita de resistência insulínica precoce.',
        prescricao: '1. Losartana Potássica 50mg — Tomar 1 comprimido pela manhã.\n2. Atenolol 25mg — Tomar 1 comprimido às 20h.\n3. Dieta hipossódica e exercícios físicos leves.',
        alergias: 'Alergia severa a Sulfa (Apresentou rash cutâneo e dispneia leve no passado).',
        sinaisVitais: { pressao: '145/95 mmHg', peso: '82 kg', temperatura: '36.5 °C' },
        lastUpdated: new Date().toISOString(),
        documents: []
      };

      const recordMarieta: DecryptedMedicalRecord = {
        anamnese: 'Paciente relata episódios recorrentes de tontura rotatória com duração de 2 horas, associados a fotofobia intensa e náuseas. Quadro com piora em ambientes ruidosos.',
        diagnostico: 'Enxaqueca vestibular crônica. Necessário rastreamento metabólico.',
        prescricao: '1. Amitriptilina 25mg — 1 comprimido ao deitar por 30 dias.\n2. Flunarizina 10mg — 1 comprimido à noite se houver crise vertiginosa intensa.\n3. Reduzir ingesta de cafeína.',
        alergias: 'Sem alergias medicamentosas relatadas.',
        sinaisVitais: { pressao: '115/75 mmHg', peso: '64 kg', temperatura: '36.2 °C' },
        lastUpdated: new Date().toISOString(),
        documents: []
      };

      const recordAna: DecryptedMedicalRecord = {
        anamnese: 'Criança de 5 anos trazida pela mãe devido a lesões pruriginosas avermelhadas em áreas flexurais (fossa cubital e poplítea). Sono prejudicado pelo prurido.',
        diagnostico: 'Dermatite atópica moderada exacerbada por estresse térmico.',
        prescricao: '1. Hidratante fisiológico regenerador — Aplicar 3x ao dia após banhos mornos.\n2. Hidrocortisona creme 1% — Aplicar fina camada nas lesões ativas por no máximo 5 dias.\n3. Cetirizina xarope — 5ml à noite para controle do prurido.',
        alergias: 'Alergia alimentar a Corante Amarelo Tartrazina.',
        sinaisVitais: { pressao: '100/60 mmHg', peso: '18 kg', temperatura: '36.8 °C' },
        lastUpdated: new Date().toISOString(),
        documents: []
      };

      // Perform dynamic encryption using the master key (E2EE simulation on bootstrap)
      const cryptCarlos = await encryptMedicalRecord(recordCarlos, masterCryptoPassphrase);
      const cryptMarieta = await encryptMedicalRecord(recordMarieta, masterCryptoPassphrase);
      const cryptAna = await encryptMedicalRecord(recordAna, masterCryptoPassphrase);

      const seededPatients: Patient[] = [
        {
          id: 'pat_01',
          name: 'Carlos Eduardo Oliveira',
          cpf: '123.456.789-00',
          email: 'carloseduardo@outlook.com',
          phone: '(11) 98888-1111',
          birthDate: '1978-04-12',
          encryptedMedicalRecords: cryptCarlos.ciphertext,
          cryptoIv: cryptCarlos.iv,
          cryptoSalt: cryptCarlos.salt,
          consentGiven: true,
          consentDate: '2026-03-10T14:30:00Z',
          consentVersion: 'v1.2 (2026)',
          consentPurpose: 'Processamento de prontuário e dados sensíveis de saúde para fins terapêuticos (LGPD Art. 7, I e Art. 11, II, "a").',
          isAnonymized: false
        },
        {
          id: 'pat_02',
          name: 'Marieta Santos Silveira',
          cpf: '987.654.321-99',
          email: 'marieta.silveira@gmail.com',
          phone: '(21) 99111-2222',
          birthDate: '1965-08-22',
          encryptedMedicalRecords: cryptMarieta.ciphertext,
          cryptoIv: cryptMarieta.iv,
          cryptoSalt: cryptMarieta.salt,
          consentGiven: true,
          consentDate: '2026-04-15T11:15:00Z',
          consentVersion: 'v1.2 (2026)',
          consentPurpose: 'Processamento de prontuário e dados sensíveis de saúde para fins terapêuticos (LGPD Art. 7, I e Art. 11, II, "a").',
          isAnonymized: false
        },
        {
          id: 'pat_03',
          name: 'Ana Julia Mendonça',
          cpf: '456.123.789-55',
          email: 'julia.mendonca@terra.com.br',
          phone: '(31) 97777-5555',
          birthDate: '2021-11-05',
          encryptedMedicalRecords: cryptAna.ciphertext,
          cryptoIv: cryptAna.iv,
          cryptoSalt: cryptAna.salt,
          consentGiven: true,
          consentDate: '2026-05-18T09:00:00Z',
          consentVersion: 'v1.2 (2026)',
          consentPurpose: 'Processamento de prontuário e dados sensíveis de saúde para fins terapêuticos (LGPD Art. 7, I e Art. 11, II, "a").',
          isAnonymized: false
        }
      ];

      // 3. Seed Appointments
      const seededAppointments: Appointment[] = [
        {
          id: 'app_101',
          patientId: 'pat_01',
          patientName: 'Carlos Eduardo Oliveira',
          doctorId: 'doc_01',
          doctorName: 'Dr. Roberto Vasconcellos',
          specialty: 'Cardiologia',
          date: '2026-06-26',
          time: '09:00',
          status: 'Agendado',
          notes: 'Paciente relata dores esporádicas no peito após esforço moderado.',
          paymentMethod: 'Pix',
          price: 250.00,
          paymentStatus: 'pago'
        },
        {
          id: 'app_102',
          patientId: 'pat_02',
          patientName: 'Marieta Santos Silveira',
          doctorId: 'doc_01',
          doctorName: 'Dr. Roberto Vasconcellos',
          specialty: 'Cardiologia',
          date: '2026-06-26',
          time: '11:30',
          status: 'Agendado',
          notes: 'Checkup anual cardiológico.',
          paymentMethod: 'Cartão de Crédito',
          price: 450.00,
          paymentStatus: 'pago'
        },
        {
          id: 'app_103',
          patientId: 'pat_03',
          patientName: 'Ana Julia Mendonça',
          doctorId: 'doc_03',
          doctorName: 'Dr. Felipe Albuquerque',
          specialty: 'Dermatologia',
          date: '2026-06-27',
          time: '14:00',
          status: 'Agendado',
          notes: 'Retorno para avaliar cicatrização da dermatite atópica.',
          paymentMethod: 'Dinheiro',
          price: 200.00,
          paymentStatus: 'pago'
        }
      ];

      // 4. Seed Historical Procedures completed by specialists
      const seededProcedures: Procedure[] = [
        {
          id: 'proc_501',
          patientId: 'pat_01',
          patientName: 'Carlos Eduardo Oliveira',
          doctorId: 'doc_01',
          doctorName: 'Dr. Roberto Vasconcellos',
          specialty: 'Cardiologia',
          date: '2026-05-10',
          type: 'Exame Clínico',
          name: 'Eletrocardiograma de Repouso (ECG)',
          notes: 'Ritmo sinusal regular. Sem alterações de repolarização ventricular detectáveis. Frequência cardíaca: 72 bpm.',
          riskClass: 'Baixo',
          durationMinutes: 20
        },
        {
          id: 'proc_502',
          patientId: 'pat_02',
          patientName: 'Marieta Santos Silveira',
          doctorId: 'doc_01',
          doctorName: 'Dr. Roberto Vasconcellos',
          specialty: 'Cardiologia',
          date: '2026-04-12',
          type: 'Exame Clínico',
          name: 'Ecocardiograma Transtorácico',
          notes: 'Fração de ejeção: 65%. Diâmetros cavitários normais. Discreta disfunção diastólica de ventrículo esquerdo (grau 1).',
          riskClass: 'Baixo',
          durationMinutes: 40
        },
        {
          id: 'proc_503',
          patientId: 'pat_03',
          patientName: 'Ana Julia Mendonça',
          doctorId: 'doc_03',
          doctorName: 'Dr. Felipe Albuquerque',
          specialty: 'Dermatologia',
          date: '2026-05-18',
          type: 'Consulta',
          name: 'Mapeamento Corporal Dermatológico',
          notes: 'Paciente infantil apresentando dermatite atópica severa em articulações. Realizado teste de sensibilidade cutânea básico.',
          riskClass: 'Baixo',
          durationMinutes: 30
        }
      ];

      // 5. Seed Initial LGPD Audit Logs
      const initialLogs: AuditLog[] = [
        {
          id: 'log_01',
          timestamp: '2026-03-10T14:30:00Z',
          userId: 'rec_10',
          userName: 'Paula Souza (Recepção)',
          userRole: 'receptionist',
          action: 'Criação de Prontuário',
          patientId: 'pat_01',
          patientName: 'Carlos Eduardo Oliveira',
          details: 'Cadastro do paciente realizado com consentimento digital devidamente coletado no balcão físico.',
          lgpdBasis: 'Consentimento (Art. 7, I)',
          ipAddress: '192.168.1.100',
          deviceInfo: 'Chrome v120 / Windows 11',
          securityHash: await calculateAuditHash('Criação de Prontuário pat_01 Carlos Eduardo Oliveira 2026-03-10T14:30:00Z')
        },
        {
          id: 'log_02',
          timestamp: '2026-05-10T11:00:00Z',
          userId: 'doc_01',
          userName: 'Dr. Roberto Vasconcellos',
          userRole: 'doctor',
          action: 'Acesso ao Prontuário',
          patientId: 'pat_01',
          patientName: 'Carlos Eduardo Oliveira',
          details: 'Visualização de prontuário eletrônico descriptografado ponta-a-ponta para realização de consulta.',
          lgpdBasis: 'Tutela da Saúde (Art. 7, VIII)',
          ipAddress: '192.168.1.105',
          deviceInfo: 'Safari v17 / iPadOS',
          securityHash: await calculateAuditHash('Acesso ao Prontuário pat_01 Carlos Eduardo Oliveira 2026-05-10T11:00:00Z')
        },
        {
          id: 'log_03',
          timestamp: '2026-06-25T15:00:00Z',
          userId: 'rec_10',
          userName: 'Paula Souza (Recepção)',
          userRole: 'receptionist',
          action: 'Agendamento de Consulta',
          patientId: 'pat_02',
          patientName: 'Marieta Santos Silveira',
          details: 'Agendamento de nova consulta na especialidade Cardiologia.',
          lgpdBasis: 'Consentimento (Art. 7, I)',
          ipAddress: '192.168.1.100',
          deviceInfo: 'Chrome v120 / Windows 11',
          securityHash: await calculateAuditHash('Agendamento de Consulta pat_02 Marieta Santos Silveira 2026-06-25T15:00:00Z')
        }
      ];



      const seededCashTransactions: CashTransaction[] = [
        {
          id: 'tx_101',
          timestamp: '2026-06-26T09:00:00Z',
          patientId: 'pat_01',
          patientName: 'Carlos Eduardo Oliveira',
          description: 'Lançamento Automático via Agenda — Dr. Roberto Vasconcellos',
          amount: 250.00,
          paymentMethod: 'Pix',
          operatorId: 'rec_10',
          operatorName: 'Paula Souza (Recepção)'
        },
        {
          id: 'tx_102',
          timestamp: '2026-06-26T11:30:00Z',
          patientId: 'pat_02',
          patientName: 'Marieta Santos Silveira',
          description: 'Lançamento Automático via Agenda — Dr. Roberto Vasconcellos',
          amount: 450.00,
          paymentMethod: 'Cartão de Crédito',
          operatorId: 'rec_10',
          operatorName: 'Paula Souza (Recepção)'
        },
        {
          id: 'tx_103',
          timestamp: '2026-06-27T14:00:00Z',
          patientId: 'pat_03',
          patientName: 'Ana Julia Mendonça',
          description: 'Lançamento Automático via Agenda — Dr. Felipe Albuquerque',
          amount: 200.00,
          paymentMethod: 'Dinheiro',
          operatorId: 'rec_10',
          operatorName: 'Paula Souza (Recepção)'
        }
      ];

      const seededEmployees: Employee[] = [
        {
          id: 'rec_10',
          name: 'Paula Souza',
          role: 'receptionist',
          email: 'paula.souza@drdiogogonzaga.com.br',
          phone: '(11) 97777-1111',
          avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120',
          password: '123456'
        },
        {
          id: 'admin_01',
          name: 'Dr. Diogo Gonzaga',
          role: 'admin',
          email: 'diogo.gonzaga@drdiogogonzaga.com.br',
          phone: '(11) 98888-2222',
          avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150',
          password: '123456'
        }
      ];

      if (writeToSupabase && supabase) {
        try {
          console.log("Inserindo sementes no Supabase...");
          await supabase.from('doctors').insert(seededDoctors.map(d => ({
            id: d.id,
            name: d.name,
            crm: d.crm,
            specialty: d.specialty,
            email: d.email,
            phone: d.phone,
            is_2fa_enabled: d.is2FAEnabled,
            two_factor_secret: d.twoFactorSecret,
            avatar: d.avatar,
            consultation_price: d.consultationPrice,
            password: d.password
          })));

          await supabase.from('employees').insert(seededEmployees.map(e => ({
            id: e.id,
            name: e.name,
            role: e.role,
            email: e.email,
            phone: e.phone,
            avatar: e.avatar,
            password: e.password
          })));

          await supabase.from('patients').insert(seededPatients.map(mapPatientToDb));

          await supabase.from('appointments').insert(seededAppointments.map(a => ({
            id: a.id,
            patient_id: a.patientId,
            patient_name: a.patientName,
            doctor_id: a.doctorId,
            doctor_name: a.doctorName,
            specialty: a.specialty,
            date: a.date,
            time: a.time,
            status: a.status,
            notes: a.notes,
            payment_method: a.paymentMethod,
            price: a.price,
            payment_status: a.paymentStatus
          })));

          await supabase.from('procedures').insert(seededProcedures.map(p => ({
            id: p.id,
            patient_id: p.patientId,
            patient_name: p.patientName,
            doctor_id: p.doctorId,
            doctor_name: p.doctorName,
            specialty: p.specialty,
            date: p.date,
            type: p.type,
            name: p.name,
            notes: p.notes,
            risk_class: p.riskClass,
            duration_minutes: p.durationMinutes
          })));

          await supabase.from('audit_logs').insert(initialLogs.map(l => ({
            id: l.id,
            timestamp: l.timestamp,
            user_id: l.userId,
            user_name: l.userName,
            user_role: l.userRole,
            action: l.action,
            patient_id: l.patientId,
            patient_name: l.patientName,
            details: l.details,
            lgpd_basis: l.lgpdBasis,
            ip_address: l.ipAddress,
            device_info: l.deviceInfo,
            security_hash: l.securityHash
          })));

          await supabase.from('cash_transactions').insert(seededCashTransactions.map(t => ({
            id: t.id,
            timestamp: t.timestamp,
            patient_id: t.patientId || null,
            patient_name: t.patientName || null,
            description: t.description,
            amount: t.amount,
            payment_method: t.paymentMethod,
            operator_id: t.operatorId,
            operator_name: t.operatorName
          })));

          // Seed Exams
          await supabase.from('exams').insert(exams.map(e => ({
            id: e.id,
            name: e.name,
            description: e.description,
            duration_minutes: e.durationMinutes,
            price: e.price
          })));
        } catch (dbSeedErr) {
          console.error("Falha ao salvar sementes no Supabase:", dbSeedErr);
        }
      }

      setDoctors(seededDoctors);
      setPatients(seededPatients);
      setAppointments(seededAppointments);
      setProcedures(seededProcedures);
      setAuditLogs(initialLogs);
      setCashTransactions(seededCashTransactions);
      setEmployees(seededEmployees);
      setIsDataInitialized(true);
    };

    initializeData();
  }, []);

  // Helper to append a secure Audit Log
  const addAuditLogEntry = async (
    action: AuditLog['action'],
    patientId: string | null,
    patientName: string | null,
    details: string,
    lgpdBasis: AuditLog['lgpdBasis']
  ) => {
    const timestamp = new Date().toISOString();
    const logString = `${action} ${patientId || ''} ${patientName || ''} ${timestamp} ${currentSession.name}`;
    const securityHash = await calculateAuditHash(logString);

    const newLog: AuditLog = {
      id: `log_${Math.random().toString(36).substring(2, 9)}`,
      timestamp,
      userId: currentSession.userId,
      userName: currentSession.name,
      userRole: currentSession.role,
      action,
      patientId,
      patientName,
      details,
      lgpdBasis,
      ipAddress: '192.168.1.102', // Mock internal clinic routing IP
      deviceInfo: 'Chrome v124 (Antigravity Medical Terminal)',
      securityHash
    };

    setAuditLogs(prev => [newLog, ...prev]);

    if (isSupabaseConfigured && supabase) {
      await supabase.from('audit_logs').insert({
        id: newLog.id,
        timestamp: newLog.timestamp,
        user_id: newLog.userId,
        user_name: newLog.userName,
        user_role: newLog.userRole,
        action: newLog.action,
        patient_id: newLog.patientId,
        patient_name: newLog.patientName,
        details: newLog.details,
        lgpd_basis: newLog.lgpdBasis,
        ip_address: newLog.ipAddress,
        device_info: newLog.deviceInfo,
        security_hash: newLog.securityHash
      });
    }
  };

  // Handlers
  const handleRoleSwitch = (role: UserSession['role']) => {
    if (role === 'receptionist') {
      const perms = permissionsMap['rec_10'] || DEFAULT_PERMISSIONS['rec_10'];
      setCurrentSession({
        loggedIn: true,
        role: 'receptionist',
        userId: 'rec_10',
        name: 'Paula Souza (Recepção)',
        is2FAVerified: false,
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120',
        permissions: perms
      });
      if (activeTab === 'health_records' || activeTab === 'clinical_documents' || activeTab === 'access_control') {
        setActiveTab('appointments');
      }
    } else if (role === 'admin') {
      const perms = permissionsMap['admin_01'] || DEFAULT_PERMISSIONS['admin_01'];
      setCurrentSession({
        loggedIn: true,
        role: 'admin',
        userId: 'admin_01',
        name: 'Dr. Diogo Gonzaga (Diretor/Admin)',
        is2FAVerified: true,
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150',
        permissions: perms
      });
      if (activeTab === 'auth_2fa') {
        setActiveTab('appointments');
      }
    } else {
      // Switches to doctor, but needs to do 2FA verification to access EHR!
      const doctor = doctors.find(d => d.id === 'doc_01') || doctors[0] || {
        id: 'doc_01',
        name: 'Dr. Roberto Vasconcellos',
        crm: 'CRM-SP 123456',
        avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150'
      };

      const perms = permissionsMap[doctor.id] || DEFAULT_PERMISSIONS[doctor.id] || getDefaultPermissionsForRole('doctor');

      setCurrentSession({
        loggedIn: true,
        role: 'doctor',
        userId: doctor.id,
        name: doctor.name,
        crm: doctor.crm,
        is2FAVerified: false, // Must verify 2FA first in the 2FA Tab!
        avatar: doctor.avatar,
        permissions: perms
      });
      setActiveTab('auth_2fa');
    }
  };

  const handleLogin = (userId: string, userType: 'doctor' | 'employee') => {
    let sessionUser: any = null;
    let userRole: UserSession['role'] = 'receptionist';

    if (userType === 'doctor') {
      sessionUser = doctors.find(d => d.id === userId);
      userRole = 'doctor';
    } else {
      sessionUser = employees.find(e => e.id === userId);
      if (sessionUser) {
        userRole = sessionUser.role as UserSession['role'];
      }
    }

    if (sessionUser) {
      const userPermissions = permissionsMap[userId] || getDefaultPermissionsForRole(userRole);
      
      const newSession: UserSession = {
        loggedIn: true,
        role: userRole,
        userId: sessionUser.id,
        name: sessionUser.name,
        crm: userType === 'doctor' ? (sessionUser as Doctor).crm : undefined,
        is2FAVerified: userType === 'doctor' ? false : true, // Doctor needs 2FA verification
        avatar: sessionUser.avatar,
        permissions: userPermissions
      };

      setCurrentSession(newSession);

      // Determine initial tab based on permissions
      if (userPermissions.viewAppointments) {
        setActiveTab('appointments');
      } else if (userPermissions.viewEHR) {
        setActiveTab('health_records');
      } else if (userPermissions.viewCashRegister) {
        setActiveTab('cash_register');
      } else if (userPermissions.viewLGPD) {
        setActiveTab('lgpd');
      } else if (userRole === 'doctor') {
        setActiveTab('auth_2fa');
      } else {
        setActiveTab('appointments');
      }

      addAuditLogEntry(
        'Autenticação 2FA',
        null,
        null,
        `Usuário ${sessionUser.name} realizou login no sistema clínico (Papel: ${userRole}).`,
        'Execução de Contrato (Art. 7, V)'
      );
    }
  };

  const handleUpdatePermissions = (userId: string, permissions: UserPermissions, targetName: string) => {
    setPermissionsMap(prev => {
      const updated = {
        ...prev,
        [userId]: permissions
      };
      
      // Se atualizou as permissões do próprio usuário logado, atualiza a sessão ativa imediatamente
      if (currentSession.userId === userId) {
        setCurrentSession(curr => ({
          ...curr,
          permissions
        }));
      }
      return updated;
    });

    addAuditLogEntry(
      'Atualização de Prontuário', // Ação genérica registrada
      null,
      null,
      `Permissões de acesso do usuário ${targetName} foram modificadas por ${currentSession.name}.`,
      'Cumprimento de Obrigação Legal (Art. 7, II)'
    );
  };

  const handleDoctorLogin2FA = (doctor: Doctor) => {
    const userPermissions = permissionsMap[doctor.id] || getDefaultPermissionsForRole('doctor');
    setCurrentSession(prev => ({
      ...prev,
      role: 'doctor',
      userId: doctor.id,
      name: doctor.name,
      crm: doctor.crm,
      is2FAVerified: true, // Successfully authenticated with 2FA!
      avatar: doctor.avatar,
      permissions: userPermissions
    }));

    // Go to EHR tab immediately
    setActiveTab('health_records');

    addAuditLogEntry(
      'Autenticação 2FA',
      null,
      null,
      `Médico Dr(a). ${doctor.name} realizou a autenticação forte via token de dois fatores com sucesso.`,
      'Cumprimento de Obrigação Legal (Art. 7, II)'
    );
  };

  const handleLogout = () => {
    setCurrentSession({
      loggedIn: false,
      role: 'receptionist',
      userId: '',
      name: 'Anônimo',
      is2FAVerified: false
    });
    // Limpar o cache de tab ativa
    setActiveTab('appointments');
  };

  const handleAddAppointment = async (newApp: Omit<Appointment, 'id' | 'paymentStatus'>) => {
    const id = `app_${Math.random().toString(36).substring(2, 9)}`;
    const paymentStatus = 'pendente'; // Começa pendente até ser confirmado
    const appointment: Appointment = { id, paymentStatus, ...newApp };
    setAppointments(prev => [appointment, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('appointments').insert({
          id,
          patient_id: newApp.patientId,
          patient_name: newApp.patientName,
          doctor_id: newApp.doctorId,
          doctor_name: newApp.doctorName,
          specialty: newApp.specialty,
          date: newApp.date,
          time: newApp.time,
          status: newApp.status,
          notes: newApp.notes,
          payment_method: newApp.paymentMethod,
          price: newApp.price,
          payment_status: paymentStatus
        });
      } catch (err) {
        console.error("Falha ao salvar agendamento no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Agendamento de Consulta',
      newApp.patientId,
      newApp.patientName,
      `Nova consulta pré-agendada para Dr(a). ${newApp.doctorName} no dia ${newApp.date.split('-').reverse().join('/')} às ${newApp.time}. Aguardando confirmação do paciente.`,
      'Consentimento (Art. 7, I)'
    );
  };

  const handleAddPatient = async (newPatientData: Omit<Patient, 'id' | 'encryptedMedicalRecords' | 'cryptoIv' | 'cryptoSalt'>): Promise<Patient> => {
    const id = `pat_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create an empty encrypted health record block for the new patient on creation
    const emptyRecord: DecryptedMedicalRecord = {
      anamnese: 'Ficha clínica inicial em branco.',
      diagnostico: 'Aguardando avaliação clínica inicial.',
      prescricao: 'Nenhuma prescrição ativa.',
      alergias: 'Sem alergias conhecidas registradas.',
      sinaisVitais: { pressao: '0/0', peso: '0kg', temperatura: '0°C' },
      lastUpdated: new Date().toISOString(),
      documents: []
    };

    // We encrypt it with the default passphrase in memory
    const crypt = await encryptMedicalRecord(emptyRecord, masterCryptoPassphrase);

    const patient: Patient = {
      id,
      ...newPatientData,
      encryptedMedicalRecords: crypt.ciphertext,
      cryptoIv: crypt.iv,
      cryptoSalt: crypt.salt,
    };

    setPatients(prev => [patient, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('patients').insert(mapPatientToDb(patient));
      } catch (err) {
        console.error("Falha ao salvar paciente no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Criação de Prontuário',
      id,
      patient.name,
      `Ficha do paciente criada e termo de consentimento LGPD aceito sob a versão ${patient.consentVersion}.`,
      'Consentimento (Art. 7, I)'
    );

    return patient;
  };

  const handleUpdateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    setAppointments(prev => prev.map(app => app.id === id ? { ...app, status } : app));
    
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('appointments').update({ status }).eq('id', id);
      } catch (err) {
        console.error("Falha ao atualizar status no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Agendamento de Consulta',
      app.patientId,
      app.patientName,
      `Status da consulta alterado para [${status}].`,
      'Consentimento (Art. 7, I)'
    );
  };

  // Confirma consulta: muda status Pré-agendado -> Agendado e lança no caixa
  const handleConfirmAppointment = async (id: string) => {
    const app = appointments.find(a => a.id === id);
    if (!app) return;

    // 1. Atualiza status para Agendado
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'Agendado', paymentStatus: 'pago' } : a));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('appointments').update({ status: 'Agendado', payment_status: 'pago' }).eq('id', id);
      } catch (err) {
        console.error("Falha ao confirmar agendamento no Supabase:", err);
      }
    }

    // 2. Lança no caixa somente se tiver valor e forma de pagamento
    if (app.price !== undefined && app.paymentMethod) {
      const txTimestamp = new Date().toISOString();
      const txId = `tx_${Math.random().toString(36).substring(2, 9)}`;
      const transaction: CashTransaction = {
        id: txId,
        timestamp: txTimestamp,
        patientId: app.patientId,
        patientName: app.patientName,
        appointmentId: app.id,
        description: `Consulta Confirmada — Dr(a). ${app.doctorName.split(' ').slice(0, 2).join(' ')} (${app.date.split('-').reverse().join('/')})`,
        amount: app.price,
        paymentMethod: app.paymentMethod,
        operatorId: currentSession.userId,
        operatorName: currentSession.name
      };
      setCashTransactions(prev => [transaction, ...prev]);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('cash_transactions').insert({
            id: txId,
            timestamp: txTimestamp,
            patient_id: app.patientId || null,
            patient_name: app.patientName || null,
            appointment_id: app.id,
            description: transaction.description,
            amount: app.price,
            payment_method: app.paymentMethod,
            operator_id: currentSession.userId,
            operator_name: currentSession.name
          });
        } catch (err) {
          console.error("Falha ao registrar transação de confirmação no Supabase:", err);
        }
      }

      addAuditLogEntry(
        'Lançamento de Caixa',
        app.patientId,
        app.patientName,
        `Consulta confirmada pelo paciente. Valor R$ ${app.price.toFixed(2).replace('.', ',')} via ${app.paymentMethod} registrado no caixa. Consulta ID: ${app.id}.`,
        'Execução de Contrato (Art. 7, V)'
      );
    }

    addAuditLogEntry(
      'Agendamento de Consulta',
      app.patientId,
      app.patientName,
      `Consulta confirmada pelo paciente. Status atualizado para [Agendado]. Dr(a). ${app.doctorName}, dia ${app.date.split('-').reverse().join('/')} às ${app.time}.`,
      'Consentimento (Art. 7, I)'
    );
  };

  const handleEditAppointment = async (updatedApp: Appointment) => {
    // Busca os dados antigos para comparar
    const oldApp = appointments.find(a => a.id === updatedApp.id);
    
    // Atualiza o agendamento
    setAppointments(prev => prev.map(app => app.id === updatedApp.id ? updatedApp : app));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('appointments').update({
          patient_id: updatedApp.patientId,
          patient_name: updatedApp.patientName,
          doctor_id: updatedApp.doctorId,
          doctor_name: updatedApp.doctorName,
          specialty: updatedApp.specialty,
          date: updatedApp.date,
          time: updatedApp.time,
          status: updatedApp.status,
          notes: updatedApp.notes,
          payment_method: updatedApp.paymentMethod,
          price: updatedApp.price,
          payment_status: updatedApp.paymentStatus
        }).eq('id', updatedApp.id);
      } catch (err) {
        console.error("Falha ao atualizar agendamento no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Agendamento de Consulta',
      updatedApp.patientId,
      updatedApp.patientName,
      `Consulta editada. Novo valor/forma de pagamento ou informações atualizadas.`,
      'Consentimento (Art. 7, I)'
    );

    // Se o valor ou forma de pagamento mudou, tentamos atualizar a transação de caixa associada
    if (oldApp && (oldApp.price !== updatedApp.price || oldApp.paymentMethod !== updatedApp.paymentMethod)) {
      const updatedAmount = updatedApp.price || 0;
      const updatedMethod = updatedApp.paymentMethod || 'Pix';
      const updatedDescription = `Lançamento via Agenda Editado — Dr(a). ${updatedApp.doctorName.split(' ').slice(0, 2).join(' ')}`;

      setCashTransactions(prev => prev.map(tx => {
        if (tx.appointmentId === updatedApp.id || (tx.patientId === oldApp.patientId && Math.abs(tx.amount) === (oldApp.price || 0))) {
          return {
            ...tx,
            amount: updatedAmount,
            paymentMethod: updatedMethod,
            description: updatedDescription
          };
        }
        return tx;
      }));

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('cash_transactions')
            .update({
              amount: updatedAmount,
              payment_method: updatedMethod,
              description: updatedDescription
            })
            .or(`appointment_id.eq.${updatedApp.id},and(patient_id.eq.${oldApp.patientId},amount.eq.${oldApp.price})`);
        } catch (err) {
          console.error("Falha ao atualizar transação financeira correspondente no Supabase:", err);
        }
      }
    }
  };

  const handleUpdatePatientMedicalRecord = async (
    patientId: string,
    encryptedMedicalRecords: string,
    cryptoIv: string,
    cryptoSalt: string,
    actionType: 'Leitura de Prontuário' | 'Edição de Prontuário' | 'Criação de Prontuário',
    details: string
  ) => {
    setPatients(prev => prev.map(p => p.id === patientId ? {
      ...p,
      encryptedMedicalRecords,
      cryptoIv,
      cryptoSalt
    } : p));

    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('patients').update({
          encrypted_medical_records: encryptedMedicalRecords,
          crypto_iv: cryptoIv,
          crypto_salt: cryptoSalt
        }).eq('id', patientId);
      } catch (err) {
        console.error("Falha ao atualizar prontuário no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Atualização de Prontuário',
      patientId,
      patient.name,
      details,
      'Tutela da Saúde (Art. 7, VIII)'
    );
  };

  const handleAddProcedure = async (newProc: Omit<Procedure, 'id'>) => {
    const id = `proc_${Math.random().toString(36).substring(2, 9)}`;
    const procedure: Procedure = { id, ...newProc };
    setProcedures(prev => [procedure, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('procedures').insert({
          id,
          patient_id: newProc.patientId,
          patient_name: newProc.patientName,
          doctor_id: newProc.doctorId,
          doctor_name: newProc.doctorName,
          specialty: newProc.specialty,
          date: newProc.date,
          type: newProc.type,
          name: newProc.name,
          notes: newProc.notes,
          risk_class: newProc.riskClass,
          duration_minutes: newProc.durationMinutes
        });
      } catch (err) {
        console.error("Falha ao salvar procedimento no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Atualização de Prontuário',
      newProc.patientId,
      newProc.patientName,
      `Procedimento registrado pelo especialista Dr(a). ${newProc.doctorName}: ${newProc.name}.`,
      'Tutela da Saúde (Art. 7, VIII)'
    );
  };

  const handleAddCashTransaction = async (newTx: Omit<CashTransaction, 'id' | 'timestamp' | 'operatorId' | 'operatorName'>) => {
    const timestamp = new Date().toISOString();
    const id = `tx_${Math.random().toString(36).substring(2, 9)}`;
    const transaction: CashTransaction = {
      id,
      timestamp,
      operatorId: currentSession.userId,
      operatorName: currentSession.name,
      ...newTx
    };
    setCashTransactions(prev => [transaction, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('cash_transactions').insert({
          id,
          timestamp,
          patient_id: newTx.patientId || null,
          patient_name: newTx.patientName || null,
          appointment_id: newTx.appointmentId || null,
          description: newTx.description,
          amount: newTx.amount,
          payment_method: newTx.paymentMethod,
          operator_id: currentSession.userId,
          operator_name: currentSession.name
        });
      } catch (err) {
        console.error("Falha ao salvar transação no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Lançamento de Caixa',
      newTx.patientId || null,
      newTx.patientName || null,
      `Lançamento financeiro de entrada no valor de R$ ${newTx.amount.toFixed(2).replace('.', ',')} via ${newTx.paymentMethod} para: "${newTx.description}".`,
      'Execução de Contrato (Art. 7, V)'
    );
  };

  const handleAddCashWithdrawal = async (withdrawal: { description: string, amount: number }) => {
    const timestamp = new Date().toISOString();
    const id = `tx_${Math.random().toString(36).substring(2, 9)}`;
    const transaction: CashTransaction = {
      id,
      timestamp,
      operatorId: currentSession.userId,
      operatorName: currentSession.name,
      description: withdrawal.description,
      amount: -Math.abs(withdrawal.amount), // Ensure amount is negative
      paymentMethod: 'Dinheiro' // Withdrawals are typically in cash
    };
    setCashTransactions(prev => [transaction, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('cash_transactions').insert({
          id,
          timestamp,
          description: transaction.description,
          amount: transaction.amount,
          payment_method: transaction.paymentMethod,
          operator_id: currentSession.userId,
          operator_name: currentSession.name
        });
      } catch (err) {
        console.error("Falha ao salvar sangria no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Lançamento de Caixa', null, null, `Saída de caixa (sangria) no valor de R$ ${Math.abs(withdrawal.amount).toFixed(2).replace('.', ',')} para: "${withdrawal.description}".`, 'Legítimo Interesse (Art. 7, IX)'
    );
  };

  const handleAddDoctor = async (newDoc: Omit<Doctor, 'id' | 'twoFactorSecret' | 'is2FAEnabled'>) => {
    const id = `doc_${Math.random().toString(36).substring(2, 9)}`;
    const doctor: Doctor = {
      id,
      ...newDoc,
      is2FAEnabled: false,
      twoFactorSecret: generateRandomSecret()
    };
    setDoctors(prev => [...prev, doctor]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('doctors').insert({
          id,
          name: doctor.name,
          crm: doctor.crm,
          specialty: doctor.specialty,
          email: doctor.email,
          phone: doctor.phone,
          is_2fa_enabled: doctor.is2FAEnabled,
          two_factor_secret: doctor.twoFactorSecret,
          avatar: doctor.avatar,
          consultation_price: doctor.consultationPrice,
          password: doctor.password
        });
      } catch (err) {
        console.error("Falha ao salvar médico no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Atualização de Prontuário',
      null,
      null,
      `Novo especialista cadastrado: Dr(a). ${newDoc.name} (${newDoc.specialty}) com valor de consulta R$ ${newDoc.consultationPrice?.toFixed(2).replace('.', ',')}.`,
      'Cumprimento de Obrigação Legal (Art. 7, II)'
    );
  };

  const handleAddEmployee = async (newEmp: Omit<Employee, 'id'>) => {
    const id = `emp_${Math.random().toString(36).substring(2, 9)}`;
    const employee: Employee = { id, ...newEmp };
    setEmployees(prev => [...prev, employee]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('employees').insert({
          id,
          name: employee.name,
          role: employee.role,
          email: employee.email,
          phone: employee.phone,
          avatar: employee.avatar,
          password: employee.password
        });
      } catch (err) {
        console.error("Falha ao salvar funcionário no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Atualização de Prontuário',
      null,
      null,
      `Novo funcionário cadastrado: ${newEmp.name} (Cargo: ${newEmp.role === 'receptionist' ? 'Recepção' : newEmp.role === 'nurse' ? 'Enfermagem' : newEmp.role === 'finance' ? 'Financeiro' : 'Administrador'}).`,
      'Cumprimento de Obrigação Legal (Art. 7, II)'
    );
  };

  const handleUpdateDoctor = async (id: string, updatedDoc: Omit<Doctor, 'id' | 'twoFactorSecret' | 'is2FAEnabled'>) => {
    setDoctors(prev => prev.map(d => d.id === id ? { ...d, ...updatedDoc } : d));
    
    if (currentSession.userId === id) {
      setCurrentSession(prev => ({
        ...prev,
        name: updatedDoc.name,
        crm: updatedDoc.crm,
        avatar: updatedDoc.avatar
      }));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('doctors').update({
          name: updatedDoc.name,
          crm: updatedDoc.crm,
          specialty: updatedDoc.specialty,
          email: updatedDoc.email,
          phone: updatedDoc.phone,
          avatar: updatedDoc.avatar,
          consultation_price: updatedDoc.consultationPrice,
          password: updatedDoc.password
        }).eq('id', id);
      } catch (err) {
        console.error("Falha ao atualizar médico no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Atualização de Prontuário',
      null,
      null,
      `Dados cadastrais do médico Dr(a). ${updatedDoc.name} foram atualizados por ${currentSession.name}.`,
      'Cumprimento de Obrigação Legal (Art. 7, II)'
    );
  };

  const handleUpdateEmployee = async (id: string, updatedEmp: Omit<Employee, 'id'>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updatedEmp } : e));

    if (currentSession.userId === id) {
      setCurrentSession(prev => ({
        ...prev,
        name: updatedEmp.name,
        avatar: updatedEmp.avatar,
        role: updatedEmp.role as UserSession['role']
      }));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('employees').update({
          name: updatedEmp.name,
          role: updatedEmp.role,
          email: updatedEmp.email,
          phone: updatedEmp.phone,
          avatar: updatedEmp.avatar,
          password: updatedEmp.password
        }).eq('id', id);
      } catch (err) {
        console.error("Falha ao atualizar colaborador no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Atualização de Prontuário',
      null,
      null,
      `Dados cadastrais do funcionário ${updatedEmp.name} foram atualizados por ${currentSession.name}.`,
      'Cumprimento de Obrigação Legal (Art. 7, II)'
    );
  };

  const handleDeleteDoctor = async (id: string, name: string) => {
    if (currentSession.userId === id) {
      alert("Você não pode excluir o próprio usuário em sessão.");
      return;
    }
    setDoctors(prev => prev.filter(d => d.id !== id));
    
    setPermissionsMap(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('doctors').delete().eq('id', id);
      } catch (err) {
        console.error("Falha ao excluir médico no Supabase:", err);
      }
    }
    addAuditLogEntry(
      'Atualização de Prontuário',
      null,
      null,
      `Médico especialista ${name} foi excluído do sistema por ${currentSession.name}.`,
      'Cumprimento de Obrigação Legal (Art. 7, II)'
    );
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (currentSession.userId === id) {
      alert("Você não pode excluir o próprio usuário em sessão.");
      return;
    }
    setEmployees(prev => prev.filter(e => e.id !== id));

    setPermissionsMap(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('employees').delete().eq('id', id);
      } catch (err) {
        console.error("Falha ao excluir colaborador no Supabase:", err);
      }
    }
    addAuditLogEntry(
      'Atualização de Prontuário',
      null,
      null,
      `Funcionário ${name} foi excluído do sistema por ${currentSession.name}.`,
      'Cumprimento de Obrigação Legal (Art. 7, II)'
    );
  };

  const handleAddExam = async (newExam: Omit<Exam, 'id'>) => {
    const id = `exam_${Math.random().toString(36).substring(2, 9)}`;
    const exam: Exam = { id, ...newExam };
    setExams(prev => [...prev, exam]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('exames_db').insert({
          id,
          codigo_exame_db: `LOCAL-${id}`,
          mnemonico: exam.name.substring(0, 10).toUpperCase(),
          descricao: exam.name,
          setor: 'LOCAL',
          prazo: exam.durationMinutes
        });
      } catch (err) {
        console.error("Falha ao salvar exame no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Gestão de Exame',
      null,
      null,
      `Novo exame cadastrado no catálogo: ${exam.name} - R$ ${exam.price.toFixed(2)}`,
      'Legítimo Interesse (Art. 7, IX)'
    );
  };

  const handleUpdateExam = async (id: string, updatedExam: Omit<Exam, 'id'>) => {
    setExams(prev => prev.map(e => e.id === id ? { ...e, ...updatedExam } : e));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('exames_db').update({
          descricao: updatedExam.name,
          prazo: updatedExam.durationMinutes
        }).eq('id', id);
      } catch (err) {
        console.error("Falha ao atualizar exame no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Gestão de Exame',
      null,
      null,
      `Exame "${updatedExam.name}" atualizado no catálogo por ${currentSession.name}.`,
      'Legítimo Interesse (Art. 7, IX)'
    );
  };

  const handleDeleteExam = async (id: string) => {
    const examToDelete = exams.find(e => e.id === id);
    if (!examToDelete) return;

    setExams(prev => prev.filter(e => e.id !== id));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('exames_db').delete().eq('id', id);
      } catch (err) {
        console.error("Falha ao excluir exame no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Gestão de Exame',
      null,
      null,
      `Exame "${examToDelete.name}" removido do catálogo por ${currentSession.name}.`,
      'Legítimo Interesse (Art. 7, IX)'
    );
  };

  // Handler para criar orçamento de exames
  const handleAddExamBudget = async (newBudget: Omit<ExamBudget, 'id' | 'createdAt' | 'operatorId' | 'operatorName'>) => {
    const id = `bud_${Math.random().toString(36).substring(2, 9)}`;
    const createdAt = new Date().toISOString();
    const budget: ExamBudget = {
      id,
      createdAt,
      operatorId: currentSession.userId,
      operatorName: currentSession.name,
      ...newBudget
    };
    setExamBudgets(prev => [budget, ...prev]);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('orcamentos_exames').insert({
          id,
          created_at: createdAt,
          patient_id: newBudget.patientId || null,
          patient_name: newBudget.patientName,
          operator_id: currentSession.userId,
          operator_name: currentSession.name,
          items: newBudget.items, // Passa o array diretamente para JSONB
          total_amount: newBudget.totalAmount,
          notes: newBudget.notes || null,
          status: newBudget.status
        });
      } catch (err) {
        console.error("Falha ao salvar orçamento de exames no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Gestão de Exame',
      newBudget.patientId || null,
      newBudget.patientName,
      `Orçamento de exames gerado para ${newBudget.patientName}. Total: R$ ${newBudget.totalAmount.toFixed(2).replace('.', ',')}. Itens: ${newBudget.items.map(i => i.examName).join(', ')}.`,
      'Execução de Contrato (Art. 7, V)'
    );
  };

  // LGPD Art 18 - Right to be forgotten (Anonymization)
  const handleAnonymizePatient = async (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;

    const anonymizedRecord: DecryptedMedicalRecord = {
      anamnese: 'DADOS DO PACIENTE ANONIMIZADOS EM CONFORMIDADE COM A LGPD (ART. 18).',
      diagnostico: 'DADOS REMOVIDOS.',
      prescricao: 'DADOS REMOVIDOS.',
      alergias: 'DADOS REMOVIDOS.',
      sinaisVitais: { pressao: '0/0', peso: '0kg', temperatura: '0°C' },
      lastUpdated: new Date().toISOString(),
      documents: []
    };
    const crypt = await encryptMedicalRecord(anonymizedRecord, masterCryptoPassphrase);
    const anonymizedName = `Paciente Anonimizado #${Math.floor(Math.random() * 9000 + 1000)}`;

    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        return {
          ...p,
          name: anonymizedName,
          cpf: '***.***.***-**',
          email: 'anonimo@drDiogogonzaga.com.br',
          phone: '(00) 00000-0000',
          birthDate: '1900-01-01',
          consentGiven: false,
          consentDate: null,
          isAnonymized: true,
          encryptedMedicalRecords: crypt.ciphertext,
          cryptoIv: crypt.iv,
          cryptoSalt: crypt.salt
        };
      }
      return p;
    }));

    // Remove appointments of this patient to enforce right to be forgotten
    setAppointments(prev => prev.filter(app => app.patientId !== patientId));

    // Remove patient details from the procedures history
    setProcedures(prev => prev.map(p => p.patientId === patientId ? { ...p, patientName: 'Paciente Anonimizado' } : p));

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('patients').update({
          name: anonymizedName,
          cpf: `***.***.***-**-${patientId}`,
          email: 'anonimo@drDiogogonzaga.com.br',
          phone: '(00) 00000-0000',
          birth_date: '1900-01-01',
          consent_given: false,
          consent_date: null,
          is_anonymized: true,
          encrypted_medical_records: crypt.ciphertext,
          crypto_iv: crypt.iv,
          crypto_salt: crypt.salt
        }).eq('id', patientId);

        await supabase.from('appointments').delete().eq('patient_id', patientId);
        await supabase.from('procedures').update({ patient_name: 'Paciente Anonimizado' }).eq('patient_id', patientId);
      } catch (err) {
        console.error("Falha ao anonimizar no Supabase:", err);
      }
    }

    addAuditLogEntry(
      'Exclusão de Dados',
      patientId,
      'Cadastro Anonimizado',
      `Direito ao esquecimento exercido para o paciente. Dados identificáveis removidos permanentemente. Históricos desvinculados para fins estatísticos de saúde pública.`,
      'Cumprimento de Obrigação Legal (Art. 7, II)'
    );
  };

  // Wrapper to handle async function in a sync context if needed, and catch errors.
  const anonymizePatientHandler = (patientId: string) => {
    handleAnonymizePatient(patientId).catch(error => {
      console.error("Failed to anonymize patient:", error);
    });
  };

  if (!isDataInitialized) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-600 border-t-transparent"></div>
        <div className="text-slate-500 font-mono text-xs text-center animate-pulse">
          Estabelecendo tunelamento seguro de chaves clínicas...
        </div>
      </div>
    );
  }

  // Helper to render active tab screen
  const renderTabContent = () => {
    switch (activeTab) {
      case 'appointments':
        if (!currentSession.permissions?.viewAppointments) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4">
              <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Acesso Restrito à Agenda</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Você não possui permissão para visualizar ou gerenciar a agenda de consultas deste estabelecimento.
              </p>
            </div>
          );
        }
        return (
          <Appointments
            appointments={appointments}
            doctors={doctors}
            patients={patients}
            currentSession={currentSession}
            onAddAppointment={handleAddAppointment}
            onEditAppointment={handleEditAppointment}
            onAddPatient={handleAddPatient}
            onUpdateStatus={handleUpdateAppointmentStatus}
            onConfirmAppointment={handleConfirmAppointment}
          />
        );
      case 'health_records':
        // EHR is restricted if user does not have permission
        if (!currentSession.permissions?.viewEHR) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4">
              <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Acesso Restrito ao Prontuário</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Em estrita conformidade com as diretrizes de LGPD (Art. 46) e Conselho Federal de Medicina (CFM), os prontuários de pacientes são restritos a profissionais de saúde autorizados. Seu usuário atual não possui privilégios de descriptografia local de anamneses ou receitas.
              </p>
            </div>
          );
        }

        // EHR is restricted if Doctor is NOT verified by 2FA!
        if (currentSession.role === 'doctor' && !currentSession.is2FAVerified) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4">
              <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-full">
                <Lock className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Autenticação de Dois Fatores (2FA) Requerida</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Você está logado como médico, mas sua sessão não está validada com duplo fator de autenticação (MFA). Para descriptografar dados médicos, você deve validar seu token 2FA de segurança.
              </p>
              <div className="pt-4 border-t border-slate-50 flex gap-3 justify-center">
                <button
                  id="go-to-2fa-setup"
                  onClick={() => setActiveTab('auth_2fa')}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Configurar / Validar 2FA Agora
                </button>
              </div>
            </div>
          );
        }

        return (
          <HealthRecords
            patients={patients}
            currentSession={currentSession}
            onUpdatePatientMedicalRecord={handleUpdatePatientMedicalRecord}
            onAddAuditLog={addAuditLogEntry}
          />
        );
      case 'clinical_documents':
        if (!currentSession.permissions?.createClinicalDocs) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4">
              <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Acesso Restrito a Documentos Clínicos</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Em conformidade com a LGPD e diretrizes do CFM, a emissão de receitas, atestados e declarações é de uso restrito de profissionais autorizados.
              </p>
            </div>
          );
        }

        if (currentSession.role === 'doctor' && !currentSession.is2FAVerified) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4">
              <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-full">
                <Lock className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Autenticação de Dois Fatores (2FA) Requerida</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Para assinar receitas e atestados digitais com validade e segurança jurídica, você deve validar seu token 2FA de segurança.
              </p>
              <div className="pt-4 border-t border-slate-50 flex gap-3 justify-center">
                <button
                  id="go-to-2fa-setup-docs"
                  onClick={() => setActiveTab('auth_2fa')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Configurar / Validar 2FA Agora
                </button>
              </div>
            </div>
          );
        }

        return (
          <ClinicalDocuments
            patients={patients}
            currentSession={currentSession}
            onUpdatePatientMedicalRecord={handleUpdatePatientMedicalRecord}
            onAddAuditLog={addAuditLogEntry}
          />
        );
      case 'specialists':
        if (!currentSession.permissions?.viewAppointments) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4">
              <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Acesso Restrito</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Seu usuário não possui permissão para visualizar o histórico de especialistas e procedimentos.
              </p>
            </div>
          );
        }
        return (
          <DoctorHistory
            doctors={doctors}
            procedures={procedures}
            patients={patients}
            employees={employees}
            currentSession={currentSession}
            onAddProcedure={handleAddProcedure}
            onAddDoctor={handleAddDoctor}
            onAddEmployee={handleAddEmployee}
          />
        );
      case 'exams':
        if (!currentSession.permissions?.viewAppointments) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4 font-sans">
              <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Acesso Restrito</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                O gerenciamento de exames é restrito a funcionários autorizados da recepção e administração.
              </p>
            </div>
          );
        }
        return (
          <Exams
            patients={patients}
            doctors={doctors}
            currentSession={currentSession}
            exams={exams}
            onAddExam={handleAddExam}
            onUpdateExam={handleUpdateExam}
            onDeleteExam={handleDeleteExam}
            onAddProcedure={handleAddProcedure}
            onAddAppointment={handleAddAppointment}
          />
        );
      case 'exam_budgets':
        if (!currentSession.permissions?.viewAppointments) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4 font-sans">
              <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Acesso Restrito</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                A geração de orçamentos de exames é restrita a funcionários autorizados.
              </p>
            </div>
          );
        }
        return (
          <ExamBudgets
            patients={patients}
            exams={exams}
            doctors={doctors}
            budgets={examBudgets}
            currentSession={currentSession}
            onAddBudget={handleAddExamBudget}
          />
        );
      case 'lgpd':
        if (!currentSession.permissions?.viewLGPD) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4">
              <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Acesso Restrito aos Logs LGPD</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                A visualização de registros de auditoria e anonimização de dados pessoais é restrita a administradores e encarregados de dados (DPO).
              </p>
            </div>
          );
        }
        return (
          <LGPDDashboard
            auditLogs={auditLogs}
            patients={patients}
            doctors={doctors}
            onAnonymizePatient={anonymizePatientHandler}
          />
        );
      case 'cash_register':
        if (!currentSession.permissions?.viewCashRegister) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4">
              <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Acesso Restrito ao Caixa</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                O controle de caixa e transações financeiras é restrito a funcionários autorizados do financeiro e recepção.
              </p>
            </div>
          );
        }
        // Filtra as transações para o Caixa para remover testes/transações de pacientes excluídos ou agendamentos cancelados
        const activeCashTransactions = cashTransactions.filter(tx => {
          if (tx.amount < 0) return true; // Sempre mantém as sangrias / saídas reais

          if (tx.patientId) {
            const pt = patients.find(p => p.id === tx.patientId);
            if (!pt || pt.isAnonymized) return false;
          }

          // Busca agendamento correspondente por ID do paciente, por Nome completo ou descrição
          const matchingApp = appointments.find(app => {
            const matchId = !!(tx.patientId && app.patientId && tx.patientId === app.patientId);
            const matchName = !!(tx.patientName && app.patientName && 
              tx.patientName.toLowerCase().trim() === app.patientName.toLowerCase().trim());
            const nameInDescription = !!(tx.description && app.patientName &&
              tx.description.toLowerCase().includes(app.patientName.toLowerCase().trim()));

            return (matchId || matchName || nameInDescription) && app.price === Math.abs(tx.amount);
          });

          // Se achou o agendamento correspondente e ele foi cancelado, removemos a transação
          if (matchingApp && matchingApp.status === 'Cancelado') {
            return false;
          }

          return true;
        });

        return (
          <CashRegister
            appointments={appointments}
            patients={patients}
            employees={employees}
            currentSession={currentSession}
            transactions={activeCashTransactions}
            onAddTransaction={handleAddCashTransaction}
            onAddWithdrawal={handleAddCashWithdrawal}
          />
        );
      case 'lab_integration':
        if (!currentSession.permissions?.viewLabIntegration) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4">
              <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Acesso Restrito à Integração Laboratorial</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                O gerenciamento de integrações laboratoriais é restrito a perfis autorizados.
              </p>
            </div>
          );
        }
        return (
          <LabIntegration />
        );
      case 'access_control':
        if (!currentSession.permissions?.manageUsers) {
          return (
            <div className="bg-white max-w-xl mx-auto rounded-2xl border border-slate-100 p-8 shadow-md text-center space-y-4">
              <div className="inline-flex p-3 bg-rose-50 text-rose-600 rounded-full">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Acesso Restrito ao Painel de Acesso</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                O gerenciamento de acessos e permissões de usuários é restrito à administração da clínica.
              </p>
            </div>
          );
        }
        return (
          <AccessControl
            doctors={doctors}
            employees={employees}
            currentSession={currentSession}
            permissionsMap={permissionsMap}
            onUpdatePermissions={handleUpdatePermissions}
            onAddDoctor={handleAddDoctor}
            onAddEmployee={handleAddEmployee}
            onUpdateDoctor={handleUpdateDoctor}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteDoctor={handleDeleteDoctor}
            onDeleteEmployee={handleDeleteEmployee}
          />
        );
      case 'auth_2fa':
        return (
          <Doctors2FA
            doctors={doctors}
            currentSession={currentSession}
            onLoginSuccess={handleDoctorLogin2FA}
            onLogout={handleLogout}
          />
        );
      default:
        return null;
    }
  };

  if (!currentSession.loggedIn) {
    return (
      <LoginScreen
        doctors={doctors}
        employees={employees}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <Layout
      currentSession={currentSession}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onRoleSwitch={handleRoleSwitch}
      onLogout={handleLogout}
    >
      {renderTabContent()}
    </Layout>
  );
}
