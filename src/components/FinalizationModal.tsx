import React, { useState, useEffect } from 'react';
import { X, Mail, Download, Loader2, CheckCircle2 } from 'lucide-react';

interface FinalizationModalProps {
  onClose: () => void;
  onGenerate: (email: string, onProgress: (step: string, progress: number) => void) => Promise<void>;
}

type ProcessStep = 'preparing' | 'admin-email' | 'user-email' | 'downloading' | 'success';

export const FinalizationModal: React.FC<FinalizationModalProps> = ({ onClose, onGenerate }) => {
  const [email, setEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessStep>('preparing');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stepMessages = {
    preparing: 'Preparando tu fotobook...',
    'admin-email': 'Procesando envío...',
    'user-email': 'Enviando a tu correo...',
    downloading: 'Descargando PDF...',
    success: '¡Completado!'
  };

  // Recargar página cuando se complete al 100%
  useEffect(() => {
    if (currentStep === 'success' && progress === 100) {
      setTimeout(() => {
        window.location.reload();
      }, 2500); // Esperar 2.5 segundos para que vea el éxito
    }
  }, [currentStep, progress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Por favor ingresa tu correo para continuar');
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un correo válido');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setProgress(0);

    try {
      await onGenerate(email.trim(), (step: string, progressValue: number) => {
        setCurrentStep(step as ProcessStep);
        setProgress(progressValue);
      });
      
      setCurrentStep('success');
      setProgress(100);
    } catch (err: any) {
      setError(err.message || 'Error al generar el PDF. Intenta nuevamente.');
      setIsGenerating(false);
      setProgress(0);
    }
  };

  return (
    <>
      {/* Modal de entrada de email */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl animate-scaleIn relative">
          {currentStep !== 'success' ? (
            <>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isGenerating}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#39FF14]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-[#39FF14]" />
                </div>
                <h3 className="text-2xl font-bausch text-[#003300] mb-2">
                  ¡Listo para Finalizar!
                </h3>
                <p className="text-sm font-bebas text-[#6B7280]">
                  Ingresa tu correo para recibir una copia del PDF
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bebas text-[#003300] mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#39FF14] focus:outline-none transition-colors"
                    disabled={isGenerating}
                    autoFocus
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 font-bebas">
                    {error}
                  </div>
                )}

                <div className="bg-[#39FF14]/5 border border-[#39FF14]/20 rounded-lg p-3 text-xs text-[#003300] font-bebas">
                  ⚠️ El correo es obligatorio. No se podrá descargar el PDF sin ingresar un correo válido.
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bebas hover:bg-gray-50 transition-all"
                    disabled={isGenerating}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating || !email.trim()}
                    className="flex-1 px-4 py-3 bg-[#39FF14] text-[#003300] rounded-lg font-bebas hover:bg-[#66FF44] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Generar PDF
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="text-center py-8">
              {/* Checkmark animado */}
              <div className="relative mx-auto w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-green-500 rounded-full w-20 h-20 flex items-center justify-center animate-scaleIn">
                  <CheckCircle2 className="w-12 h-12 text-white animate-bounce" />
                </div>
              </div>

              <h3 className="text-2xl font-bausch text-[#003300] mb-2">
                ¡Descarga Exitosa!
              </h3>
              <p className="text-sm font-bebas text-[#6B7280] mb-1">
                El PDF se ha descargado correctamente
              </p>
              <p className="text-xs font-bebas text-[#9CA3AF] mb-6">
                Recibirás una copia en tu correo en unos momentos
              </p>

              <button
                onClick={onClose}
                className="px-6 py-3 bg-[#39FF14] text-[#003300] rounded-lg font-bebas hover:bg-[#66FF44] transition-all shadow-md hover:shadow-lg"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loader de pantalla completa con barra de progreso */}
      {isGenerating && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] animate-fadeIn">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              {/* Spinner animado */}
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 border-4 border-[#39FF14]/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-[#39FF14] rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-[#39FF14] animate-pulse" />
                </div>
              </div>

              {/* Mensaje del paso actual */}
              <h3 className="text-2xl font-bausch text-[#003300] mb-2">
                {stepMessages[currentStep]}
              </h3>
              <p className="text-sm font-bebas text-[#6B7280] mb-6">
                {currentStep === 'admin-email' && 'Procesando y validando tu fotobook'}
                {currentStep === 'user-email' && 'Enviando a tu correo personal'}
                {currentStep === 'downloading' && 'Preparando descarga automática'}
                {currentStep === 'preparing' && 'Generando PDF de 6 páginas'}
              </p>

              {/* Barra de progreso */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#39FF14] to-[#66FF44] h-full rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>

              {/* Porcentaje */}
              <p className="text-xs font-bebas text-[#9CA3AF]">
                {Math.round(progress)}% completado
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
