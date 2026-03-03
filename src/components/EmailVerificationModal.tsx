import React, { useState } from 'react';
import { Modal } from './Modal';
import { API_ENDPOINTS } from '../config/api';
import { CheckCircle } from 'lucide-react';

interface EmailVerificationModalProps {
  isOpen: boolean;
  userId: string;
  hiddenEmail: string;
  onSuccess: (user: any) => void;
  onClose: () => void;
}

export const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  userId,
  hiddenEmail,
  onSuccess,
  onClose
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Por favor ingresa el código');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.verifyOtp, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Código inválido');
      }

      setVerified(true);

      // Guardar token en localStorage
      if (data.data.token) {
        localStorage.setItem('authToken', data.data.token);
      }

      setTimeout(() => {
        onSuccess(data.data.user || data.data);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en verificación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white border-2 border-[#39FF14] rounded-lg shadow-subtle overflow-hidden">
        {verified ? (
          <div className="text-center py-12 px-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#39FF14]/10 mb-4 border-2 border-[#39FF14]">
              <CheckCircle className="w-8 h-8 text-[#39FF14]" />
            </div>
            <h2 className="text-2xl font-bebas text-[#003300] mb-1">
              Verificado
            </h2>
            <p className="text-[#6B7280] text-sm font-bebas">
              Tu correo ha sido validado
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bebas text-[#003300]">
                Verifica tu correo
              </h2>
              <p className="text-[#6B7280] text-xs font-bebas mt-1">
                {hiddenEmail}
              </p>
            </div>

            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
              maxLength={6}
              disabled={loading}
              required
              className="w-full px-4 py-3 rounded-lg border-2 border-[#E5E7EB] bg-white text-[#003300] text-center text-2xl font-bebas
                focus:border-[#39FF14] focus:ring-2 focus:ring-[#39FF14]/20 focus:outline-none
                placeholder-[#D1D5DB]"
            />

            {error && (
              <p className="text-red-500 text-sm font-bebas text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full px-4 py-3 rounded-lg font-bebas uppercase text-sm text-[#003300] bg-[#39FF14] border-2 border-[#39FF14] hover:bg-[#66FF44] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-subtle"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>

            <p className="text-center text-[#6B7280] text-xs font-bebas">
              ¿No recibiste el código?{' '}
              <button
                type="button"
                className="text-[#39FF14] font-bebas hover:underline"
                disabled={loading}
              >
                Reenviar
              </button>
            </p>
          </form>
        )}
      </div>
    </Modal>
  );
};
