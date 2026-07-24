/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'doctor' | 'receptionist' | 'patient' | 'admin' | 'finance' | 'nurse';

export interface UserSession {
  loggedIn: boolean;
  role: UserRole;
  userId: string;
  name: string;
  crm?: string;
  is2FAVerified: boolean;
  avatar?: string;
  permissions?: UserPermissions;
}

export interface Patient {
  id: string;
  name: string;
  cpf: string; // LGPD requires secure handling of sensitive identifiers
  email: string;
  phone: string;
  birthDate: string;
  // End-to-End Encrypted block (base64 of ciphertext)
  encryptedMedicalRecords: string;
  // Crytographic parameters for AES-GCM
  cryptoIv: string;
  cryptoSalt: string;
  // LGPD Consent fields
  consentGiven: boolean;
  consentDate: string | null;
  consentVersion: string;
  consentPurpose: string;
  isAnonymized: boolean;
}

export interface ClinicalDocument {
  id: string;
  type: 'receituario' | 'atestado' | 'declaracao';
  title: string;
  content: string;
  date: string;
  doctorName: string;
  doctorCrm: string;
}

export interface DecryptedMedicalRecord {
  anamnese: string;
  diagnostico: string;
  prescricao: string;
  alergias: string;
  sinaisVitais: {
    pressao: string;
    peso: string;
    temperatura: string;
  };
  lastUpdated: string;
  documents?: ClinicalDocument[];
}

export interface Doctor {
  id: string;
  name: string;
  crm: string;
  specialty: string;
  email: string;
  phone: string;
  is2FAEnabled: boolean;
  twoFactorSecret: string; // Base32 or key text
  avatar: string;
  consultationPrice?: number;
  password?: string;
}

export interface Procedure {
  id: string;
  patientName: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  type: 'Consulta' | 'Cirurgia' | 'Exame Clínico' | 'Laudo' | 'Procedimento Estético' | 'Terapia';
  name: string;
  notes: string;
  riskClass: 'Baixo' | 'Médio' | 'Alto';
  durationMinutes: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: 'Pré-agendado' | 'Agendado' | 'Concluído' | 'Cancelado' | 'Em Andamento';
  notes: string;
  paymentMethod?: 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Pix' | 'Convênio';
  price?: number;
  paymentStatus?: 'pendente' | 'pago' | 'isento';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'Acesso ao Prontuário' | 'Criação de Prontuário' | 'Atualização de Prontuário' | 'Exclusão de Dados' | 'Exportação de Dados (Portabilidade)' | 'Alteração de Consentimento' | 'Autenticação 2FA' | 'Agendamento de Consulta' | 'Lançamento de Caixa' | 'Gestão de Exame' | 'Vinculação de Exame';
  patientId: string | null;
  patientName: string | null;
  details: string;
  lgpdBasis: 'Consentimento (Art. 7, I)' | 'Tutela da Saúde (Art. 7, VIII)' | 'Cumprimento de Obrigação Legal (Art. 7, II)' | 'Legítimo Interesse (Art. 7, IX)' | 'Execução de Contrato (Art. 7, V)';
  ipAddress: string;
  deviceInfo: string;
  securityHash: string; // Simulated SHA-256 integrity hash of the log entry
}

export interface CashTransaction {
  id: string;
  timestamp: string;
  patientId?: string;
  patientName?: string;
  appointmentId?: string; // Rastreamento da consulta associada
  description: string;
  amount: number;
  paymentMethod: 'Dinheiro' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Pix' | 'Convênio';
  operatorId: string;
  operatorName: string;
}

export interface Employee {
  id: string;
  name: string;
  role: 'receptionist' | 'nurse' | 'admin' | 'finance';
  email: string;
  phone: string;
  avatar: string;
  password?: string;
}

export interface UserPermissions {
  viewAppointments: boolean;
  viewEHR: boolean;
  createClinicalDocs: boolean;
  viewCashRegister: boolean;
  viewLGPD: boolean;
  manageUsers: boolean;
  viewLabIntegration?: boolean;
}

export interface Exam {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
}

export interface ExamBudgetItem {
  examId: string;
  examName: string;
  quantity: number;
  unitPrice: number;
}

export interface ExamBudget {
  id: string;
  createdAt: string;
  patientId?: string;
  patientName: string;
  operatorId: string;
  operatorName: string;
  items: ExamBudgetItem[];
  totalAmount: number;
  notes: string;
  status: 'pendente' | 'aprovado' | 'expirado';
}



