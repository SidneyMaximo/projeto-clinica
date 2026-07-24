import React from 'react';
import { MessageCircle } from 'lucide-react';

export default function SupportButton() {
  const whatsappNumber = "5582920009519";
  const message = encodeURIComponent("Olá! Preciso de suporte no sistema da Clínica.");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center p-3 sm:p-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all cursor-pointer hover:scale-105 group"
      title="Suporte via WhatsApp"
    >
      <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
      <span className="absolute right-full mr-3 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
        Suporte
      </span>
      {/* Indicador de notificação (opcional) */}
      <span className="absolute top-0 right-0 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
      </span>
    </a>
  );
}
