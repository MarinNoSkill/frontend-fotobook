import React, { useState } from 'react';
import { Button } from '../components';
import { Book, Phone, Mail } from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

interface LoginScreenProps {
  onLoginRequest: (cedula: string, celular: string, email: string, userId: string, hiddenEmail: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginRequest }) => {
  const [cedula, setCedula] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cedula.trim() || !celular.trim() || !email.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.requestLogin, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cedula, celular, email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al solicitar login');
      }

      onLoginRequest(cedula, celular, email, data.data.userId, data.data.hiddenEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-scaleIn">
        <div className="text-center mb-8">
          <img src="/images/LOGOPAC.png" alt="Logo PAC" className="w-24 h-24 mx-auto -mb-4 object-contain" />
          <h1 className="text-5xl md:text-6xl font-bausch tracking-wider text-[#39FF14] mb-0 leading-tight">
            Party Class
          </h1>
          <p className="text-sm font-bebas text-[#6B7280] tracking-widest mt-4">
            FOTOBOOK
          </p>
        </div>

        <div className="bg-white border-2 border-[#39FF14] rounded-lg shadow-subtle p-8 md:p-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bebas text-[#003300]">
                Ingresa tus datos
              </h2>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bebas text-[#003300] mb-2">
                <Book className="w-5 h-5 text-[#39FF14]" />
                Número de Cédula
              </label>
              <input
                type="text"
                placeholder="1021923084"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-3 rounded-lg border-2 border-[#39FF14] bg-white text-[#003300]
                  focus:border-[#00AA00] focus:ring-2 focus:ring-[#39FF14]/30 focus:outline-none
                  placeholder-[#6B7280] font-bebas transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bebas text-[#003300] mb-2">
                <Phone className="w-5 h-5 text-[#39FF14]" />
                Número de Celular
              </label>
              <input
                type="text"
                placeholder="3053239293"
                value={celular}
                onChange={(e) => setCelular(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-3 rounded-lg border-2 border-[#39FF14] bg-white text-[#003300]
                  focus:border-[#00AA00] focus:ring-2 focus:ring-[#39FF14]/30 focus:outline-none
                  placeholder-[#6B7280] font-bebas transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-bebas text-[#003300] mb-2">
                <Mail className="w-5 h-5 text-[#39FF14]" />
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="w-full px-4 py-3 rounded-lg border-2 border-[#39FF14] bg-white text-[#003300]
                  focus:border-[#00AA00] focus:ring-2 focus:ring-[#39FF14]/30 focus:outline-none
                  placeholder-[#6B7280] font-bebas transition-all"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center font-bebas">{error}</p>}

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 text-lg"
              disabled={loading}
            >
              {loading ? 'Enviando código...' : 'Recibir código'}
            </Button>
          </form>
        </div>

        <p className="text-center text-[#6B7280] text-xs mt-6 font-bebas">
          Al continuar aceptas nuestros Términos y Privacidad
        </p>
      </div>
    </div>
  );
};
