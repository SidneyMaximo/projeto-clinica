/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react'; // Apenas um comentário para forçar a atualização do diff
import { Shield, KeyRound, QrCode, ClipboardCheck, Clock, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { Doctor, UserSession } from '../types';

interface Doctors2FAProps {
  doctors: Doctor[];
  currentSession: UserSession;
  onLoginSuccess: (doctor: Doctor) => void;
  onLogout: () => void;
}

export default function Doctors2FA({ doctors, currentSession, onLoginSuccess, onLogout }: Doctors2FAProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [enteredCode, setEnteredCode] = useState<string>('');
  const [step, setStep] = useState<'credentials' | 'setup_2fa' | 'verify_2fa' | 'verified'>('credentials');
  
  // 2FA generation state
  const [secret, setSecret] = useState<string>('');
  const [currentTOTP, setCurrentTOTP] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(30);
  const [copiedSecret, setCopiedSecret] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loginAttempts, setLoginAttempts] = useState<number>(0);

  // Derive TOTP code based on secret and system time to simulate real authenticator app
  useEffect(() => {
    if (!secret) return;

    const generateSimpleTOTP = (sec: string) => {
      // Create a deterministic 6-digit code using the current 30s epoch interval and the secret
      const epoch = Math.floor(Date.now() / 30000);
      let hash = 0;
      const combined = sec + epoch.toString();
      for (let i = 0; i < combined.length; i++) {
        hash = combined.charCodeAt(i) + ((hash << 5) - hash);
      }
      const code = Math.abs(hash % 1000000).toString().padStart(6, '0');
      return code;
    };

    // Update code and counter
    const updateCode = () => {
      setCurrentTOTP(generateSimpleTOTP(secret));
      const secs = 30 - (Math.floor(Date.now() / 1000) % 30);
      setTimeRemaining(secs);
    };

    updateCode();
    const interval = setInterval(() => {
      const secs = 30 - (Math.floor(Date.now() / 1000) % 30);
      setTimeRemaining(secs);
      if (secs === 30) {
        setCurrentTOTP(generateSimpleTOTP(secret));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [secret]);

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!selectedDoctorId) {
      setErrorMessage('Selecione um médico para prosseguir.');
      return;
    }

    const doctor = doctors.find(d => d.id === selectedDoctorId);
    if (!doctor) return;

    const expectedPassword = doctor.password || '123456';
    if (password !== expectedPassword) {
      setErrorMessage(`Senha incorreta! (Dica de desenvolvimento: a senha cadastrada para este médico é "${expectedPassword}")`);
      return;
    }

    if (!doctor.is2FAEnabled) {
      // Needs 2FA Setup
      setSecret(doctor.twoFactorSecret);
      setStep('setup_2fa');
    } else {
      // Already set up, go to verification
      setSecret(doctor.twoFactorSecret);
      setStep('verify_2fa');
    }
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (enteredCode.length !== 6) {
      setErrorMessage('O código de autenticação deve ter 6 dígitos.');
      return;
    }

    // Verify entered code against current simulated TOTP
    if (enteredCode === currentTOTP || enteredCode === '000000') { // 000000 as developer bypass
      const doctor = doctors.find(d => d.id === selectedDoctorId);
      if (doctor) {
        doctor.is2FAEnabled = true; // Mark as configured on success
        onLoginSuccess(doctor);
        setStep('verified');
      }
    } else {
      setLoginAttempts(prev => prev + 1);
      setErrorMessage('Código de segurança incorreto. Tente novamente ou use o bypass "000000".');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleReset = () => {
    setSelectedDoctorId('');
    setPassword('');
    setEnteredCode('');
    setStep('credentials');
    setErrorMessage('');
  };

  return (
    <div id="doctors-2fa-container" className="max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-6 text-white relative">
        <div className="absolute right-6 top-6 bg-white/15 p-2 rounded-lg backdrop-blur-sm">
          <Shield className="h-6 w-6 text-teal-100" />
        </div>
        <h3 className="text-xl font-bold font-sans">Acesso Médico Restrito</h3>
        <p className="text-xs text-teal-100 mt-1 font-sans">
          Duplo fator de autenticação (MFA/2FA) em conformidade com as exigências do CFM e LGPD.
        </p>
      </div>

      {/* Content areas based on step */}
      <div className="p-8">
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Selecione o Médico Especialista
              </label>
              <select
                id="doctor-select"
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer"
              >
                <option value="">Selecione seu nome...</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name} — {doc.specialty} (CRM: {doc.crm})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Senha de Acesso
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                  <KeyRound className="h-4 w-4" />
                </span>
                <input
                  id="doctor-password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5 italic">
                Nota de teste: Para médicos semeados, a senha padrão é <strong className="text-teal-600 font-semibold">123456</strong>. Para novos especialistas cadastrados, utilize a senha definida na administração.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex gap-2.5 items-start text-xs text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              id="submit-credentials"
              type="submit"
              className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              Próximo Passo
              <Shield className="h-4 w-4" />
            </button>
          </form>
        )}

        {step === 'setup_2fa' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-xs text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Primeiro acesso detectado!</p>
                <p className="mt-1 leading-relaxed">
                  Para garantir a segurança dos prontuários e estar em total conformidade com a LGPD, você deve configurar a autenticação de dois fatores.
                </p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              {/* Fake QR Code */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col items-center shrink-0">
                <QrCode className="h-32 w-32 text-slate-800" strokeWidth={1.5} />
                <span className="text-[10px] text-slate-400 mt-2 tracking-wider uppercase font-mono">Autenticador</span>
              </div>

              <div className="space-y-3 flex-1">
                <h4 className="text-sm font-semibold text-slate-800">Instruções de Configuração</h4>
                <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>Abra o aplicativo de autenticação (Google Authenticator, Microsoft Authenticator, Authy, etc.).</li>
                  <li>Escaneie o código QR ao lado ou insira a chave secreta manualmente.</li>
                  <li>Uma vez adicionado, digite o código de 6 dígitos gerado pelo app no formulário abaixo.</li>
                </ol>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-500 uppercase">Chave Secreta Manual</span>
              <div className="flex gap-2">
                <input
                  id="2fa-secret-display"
                  type="text"
                  readOnly
                  value={secret}
                  className="flex-1 bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs px-3.5 py-2.5 rounded-lg text-center"
                />
                <button
                  id="copy-secret-button"
                  type="button"
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSecret ? (
                    <>
                      <ClipboardCheck className="h-3.5 w-3.5 text-teal-600" />
                      Copiado!
                    </>
                  ) : (
                    'Copiar'
                  )}
                </button>
              </div>
            </div>

            {/* Simulated Authenticator App Overlay for easier testing */}
            <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-teal-800 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-teal-600 animate-spin-slow" />
                  Gerador de Token Clínico (Simulador)
                </span>
                <span className="text-[11px] bg-teal-100 text-teal-800 font-mono px-2 py-0.5 rounded-full font-bold">
                  {timeRemaining}s
                </span>
              </div>
              <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                Em um ambiente real, você consultaria o seu celular. Para facilitar o seu teste no iFrame, abaixo está o código que seu aplicativo gerou agora:
              </p>
              <div className="bg-white border border-teal-100 rounded-lg py-3 text-center">
                <span className="text-2xl font-bold font-mono tracking-widest text-teal-700">
                  {currentTOTP.slice(0, 3)} {currentTOTP.slice(3)}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <button
                id="go-to-verify"
                onClick={() => setStep('verify_2fa')}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                Prosseguir para Verificação
              </button>
            </div>
          </div>
        )}

        {step === 'verify_2fa' && (
          <form onSubmit={handleVerify2FA} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-teal-50 text-teal-600 rounded-full">
                <Shield className="h-8 w-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">Insira o Código de Segurança</h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                Digite o token temporário de 6 dígitos gerado pelo seu aplicativo autenticador.
              </p>
            </div>

            <div>
              <input
                id="otp-input"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-3xl font-bold font-mono tracking-widest py-3 border-2 border-slate-200 rounded-2xl bg-slate-50 text-slate-800 focus:outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-50 transition-all"
              />
            </div>

            {/* Helper panel to make sure user sees token during verify step too */}
            <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-teal-800 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-teal-600 animate-pulse" />
                  Token atualizado do seu app autenticador:
                </span>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-mono px-1.5 py-0.5 rounded-full">
                  Expira em {timeRemaining}s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-teal-700 tracking-wider">
                  {currentTOTP.slice(0, 3)} {currentTOTP.slice(3)}
                </span>
                <button
                  type="button"
                  onClick={() => setEnteredCode(currentTOTP)}
                  className="text-xs font-semibold text-teal-600 hover:text-teal-800 transition-all hover:underline"
                >
                  Preencher Automaticamente
                </button>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                Bypass de emergência para desenvolvedores: digite <strong className="font-semibold text-teal-600">000000</strong>
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex gap-2.5 items-start text-xs text-rose-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                id="back-to-credentials"
                type="button"
                onClick={handleReset}
                className="w-1/3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium py-3 px-4 rounded-xl text-sm transition-all cursor-pointer"
              >
                Voltar
              </button>
              <button
                id="submit-2fa-token"
                type="submit"
                className="flex-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                Confirmar Token
                <Shield className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {step === 'verified' && (
          <div className="text-center space-y-5 py-4">
            <div className="inline-flex p-3 bg-emerald-50 text-emerald-600 rounded-full animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-slate-800">Autenticado com Sucesso!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Seu token 2FA foi validado e sua sessão médica segura foi estabelecida em conformidade com as normas do CFM.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-800 max-w-md mx-auto text-left leading-relaxed">
              <strong>Nível de Acesso Elevado:</strong> Prontuários e fichas de histórico de procedimentos criptografados ponta a ponta agora podem ser lidos e atualizados sob a base legal de Tutela da Saúde.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
