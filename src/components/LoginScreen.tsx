/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Doctor, Employee } from '../types';
import logo from '../../assets/logo.jpg';

interface LoginScreenProps {
  doctors: Doctor[];
  employees: Employee[];
  onLogin: (userId: string, userType: 'doctor' | 'employee') => void;
}

export default function LoginScreen({ doctors, employees, onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      // Check doctors
      const doctor = doctors.find(d => d.email.toLowerCase() === email.toLowerCase() && d.password === password);
      if (doctor) {
        setIsLoading(false);
        onLogin(doctor.id, 'doctor');
        return;
      }

      // Check employees
      const employee = employees.find(emp => emp.email.toLowerCase() === email.toLowerCase() && emp.password === password);
      if (employee) {
        setIsLoading(false);
        onLogin(employee.id, 'employee');
        return;
      }

      setIsLoading(false);
      setError('E-mail ou senha incorretos. Verifique suas credenciais.');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="relative">
              <img
                src={logo}
                alt="Centro Médico Dr. Diogo Gonzaga"
                className="h-20 sm:h-24 w-auto max-w-full object-contain rounded-xl bg-white p-1"
              />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 shadow-lg">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
            Centro Médico Dr. Diogo Gonzaga
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-semibold uppercase tracking-widest">
            Sistema Clínico Seguro &bull; LGPD Compliant
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/[0.07] backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-white">Acesso ao Sistema</h2>
            <p className="text-xs text-slate-400 mt-1">
              Insira suas credenciais para acessar o painel clínico
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="seu.email@drdiogogonzaga.com.br"
                className="w-full px-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all"
                required
                autoComplete="email"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-white/10 border border-white/15 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all pr-12"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 bg-rose-500/15 border border-rose-500/30 rounded-xl px-4 py-2.5 text-rose-300 text-xs">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Button */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${isLoading
                ? 'bg-teal-700 text-teal-300 cursor-wait'
                : 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-900/30 hover:shadow-teal-900/50'
                }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-teal-300 border-t-transparent"></div>
                  Verificando credenciais...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar no Sistema
                </>
              )}
            </button>
          </form>

          {/* Security Badge */}
          <div className="mt-6 pt-5 border-t border-white/10 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-500" />
              <span>Sessão protegida por criptografia E2EE &bull; LGPD Art. 46</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center select-none">
          <p className="text-[11px] text-slate-500 font-medium tracking-wide">
            Desenvolvido por <span className="text-teal-400/80 hover:text-teal-400 transition-colors font-bold">SidneyMaximo</span>
          </p>
        </div>

      </div>
    </div>
  );
}
