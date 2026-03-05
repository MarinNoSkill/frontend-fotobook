import React, { useEffect, useState } from 'react';
import { detectBrowserCapabilities } from '../utils/browserCompatibility';

interface BraveBlockerProps {
  children: React.ReactNode;
}

const BraveBlocker: React.FC<BraveBlockerProps> = ({ children }) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [capabilities, setCapabilities] = useState<any>(null);

  useEffect(() => {
    const checkBraveCompatibility = () => {
      const browserCaps = detectBrowserCapabilities();
      setCapabilities(browserCaps);
      
      // Si es Brave y tiene shields activos (IndexedDB bloqueado), bloquear completamente
      if (browserCaps.isBrave && !browserCaps.indexedDB) {
        console.log('🚫 BRAVE CON SHIELDS DETECTADO - BLOQUEANDO APLICACIÓN');
        setIsBlocked(true);
        return;
      }
      
      // Si es Brave y canvas está bloqueado, también bloquear
      if (browserCaps.isBrave && !browserCaps.canvas) {
        console.log('🚫 BRAVE CON CANVAS BLOQUEADO - BLOQUEANDO APLICACIÓN');
        setIsBlocked(true);
        return;
      }
      
      setIsBlocked(false);
    };

    checkBraveCompatibility();
  }, []);

  if (isBlocked && capabilities?.isBrave) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 to-red-100 flex items-center justify-center p-4">
        <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl shadow-2xl p-8 border-4 border-orange-500">
          {/* Icono de Brave */}
          <div className="text-8xl mb-6">🦁</div>
          
          <h1 className="text-4xl font-bebas text-orange-600 mb-4">
            BRAVE SHIELDS DETECTADO
          </h1>
          
          <p className="text-xl text-gray-700 mb-8">
            Tu configuración de privacidad está bloqueando funciones esenciales de la aplicación
          </p>
          
          <div className="bg-orange-50 rounded-lg p-6 mb-8 text-left">
            <h3 className="font-bebas text-2xl text-orange-700 mb-4">
              🛡️ PARA CONTINUAR, DESACTIVA LOS SHIELDS:
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <span className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</span>
                <div>
                  <p className="font-semibold">Haz clic en el icono del escudo 🛡️</p>
                  <p className="text-sm text-gray-600">En la barra de direcciones (junto a la URL)</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <span className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</span>
                <div>
                  <p className="font-semibold">Cambia "Shields Up" → "Shields Down"</p>
                  <p className="text-sm text-gray-600">Solo para este sitio</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <span className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</span>
                <div>
                  <p className="font-semibold">Recarga la página (F5)</p>
                  <p className="text-sm text-gray-600">La aplicación se cargará automáticamente</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-700">
              <strong>💡 ¿Por qué?</strong> La aplicación necesita IndexedDB y Canvas para guardar tus páginas y generar previews. 
              Brave los bloquea por defecto para proteger tu privacidad, pero son seguros para esta aplicación local.
            </p>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bebas text-xl px-8 py-3 rounded-lg transition-colors duration-200"
          >
            🔄 VERIFICAR CONFIGURACIÓN
          </button>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              ¿Problemas? Prueba en <strong>Chrome</strong> o <strong>Edge</strong> para la mejor experiencia
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default BraveBlocker;