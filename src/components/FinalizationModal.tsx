import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, CheckCircle2, MapPin, User, Phone } from 'lucide-react';

interface FinalizationModalProps {
  onClose: () => void;
  onGenerate: (userData: {cedula: string, celular: string, direccion: string}, onProgress: (step: string, progress: number) => void) => Promise<void>;
}

type ProcessStep = 'preparing' | 'admin-email' | 'downloading' | 'success';

export const FinalizationModal: React.FC<FinalizationModalProps> = ({ onClose, onGenerate }) => {
  const [direccion, setDireccion] = useState('');
  const [cedula, setCedula] = useState('');
  const [celular, setCelular] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessStep>('preparing');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const stepMessages = {
    preparing: 'Optimizando tu fotobook...',
    'admin-email': 'Enviando al administrador...',
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
    
    // Validaciones de campos obligatorios
    if (!direccion.trim()) {
      setError('La dirección es obligatoria');
      return;
    }
    
    if (!cedula.trim()) {
      setError('La cédula es obligatoria');
      return;
    }
    
    if (!celular.trim()) {
      setError('El número de celular es obligatorio');
      return;
    }
    
    // Validar cédula (8-11 dígitos)
    if (!/^\d{8,11}$/.test(cedula)) {
      setError('La cédula debe tener entre 8 y 11 dígitos');
      return;
    }
    
    // Validar celular (10 dígitos, puede empezar con +57)
    const celularClean = celular.replace(/[^\d]/g, '');
    if (!/^(57)?3\d{9}$|^3\d{9}$/.test(celularClean)) {
      setError('El celular debe tener 10 dígitos y empezar con 3 (ej: 3001234567)');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setProgress(0);

    try {
      await onGenerate(
        { cedula: cedula.trim(), celular: celular.trim(), direccion: direccion.trim() },
        (step: string, progressValue: number) => {
          setCurrentStep(step as ProcessStep);
          setProgress(progressValue);
        }
      );
      
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
      {/* Modal de entrada de datos */}
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
                  ¡Listo para Descargar!
                </h3>
                <p className="text-sm font-bebas text-[#6B7280]">
                  Completa tus datos para generar el fotobook
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bebas text-[#003300] mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Cédula *
                  </label>
                  <input
                    type="text"
                    value={cedula}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, ''); // Solo números
                      if (value.length <= 11) setCedula(value);
                    }}
                    placeholder="12345678"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#39FF14] focus:outline-none transition-colors"
                    disabled={isGenerating}
                    maxLength={11}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bebas text-[#003300] mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Celular *
                  </label>
                  <input
                    type="tel"
                    value={celular}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, ''); // Solo números
                      if (value.length <= 10) setCelular(value);
                    }}
                    placeholder="3001234567"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#39FF14] focus:outline-none transition-colors"
                    disabled={isGenerating}
                    maxLength={10}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bebas text-[#003300] mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Dirección Completa *
                  </label>
                  <textarea
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Calle 123 #45-67, Barrio Centro, Bogotá"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#39FF14] focus:outline-none transition-colors resize-none"
                    disabled={isGenerating}
                    rows={3}
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 font-bebas">
                    {error}
                  </div>
                )}

                <div className="bg-[#39FF14]/5 border border-[#39FF14]/20 rounded-lg p-3 text-xs text-[#003300] font-bebas">
                  ℹ️ Solo necesitamos estos datos para generar tu fotobook. El archivo se descargará automáticamente.
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
                    disabled={isGenerating || !direccion.trim() || !cedula.trim() || !celular.trim()}
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
                ¡Fotobook Procesado!
              </h3>
              <p className="text-sm font-bebas text-[#6B7280] mb-1">
                Tu fotobook optimizado se ha descargado correctamente
              </p>
              <p className="text-xs font-bebas text-[#9CA3AF] mb-6">
                El archivo ha sido procesado exitosamente
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
                {currentStep === 'admin-email' && 'Procesando en segundo plano...'}
                {currentStep === 'downloading' && 'Preparando descarga optimizada'}
                {currentStep === 'preparing' && 'Optimizando PDF de 6 páginas'}
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
