// Detección y manejo de compatibilidad para diferentes navegadores (especialmente Brave)

interface BrowserCapabilities {
  indexedDB: boolean;
  canvas: boolean;
  localStorage: boolean;
  fileAPI: boolean;
  webGL: boolean;
  isBrave: boolean;
  isChrome: boolean;
  isEdge: boolean;
  isFirefox: boolean;
}

// Función para detectar Brave específicamente
function detectBrave(): boolean {
  // Brave se identifica como Chrome pero tiene características específicas
  return (navigator as any).brave !== undefined && (navigator as any).brave.isBrave !== undefined;
}

// Función para detectar capacidades del navegador
export function detectBrowserCapabilities(): BrowserCapabilities {
  const capabilities: BrowserCapabilities = {
    indexedDB: false,
    canvas: false,
    localStorage: false,
    fileAPI: false,
    webGL: false,
    isBrave: false,
    isChrome: false,
    isEdge: false,
    isFirefox: false,
  };

  // Detectar tipo de navegador
  capabilities.isBrave = detectBrave();
  capabilities.isChrome = /Chrome/.test(navigator.userAgent) && !capabilities.isBrave;
  capabilities.isEdge = /Edg/.test(navigator.userAgent);
  capabilities.isFirefox = /Firefox/.test(navigator.userAgent);

  // Detectar IndexedDB
  try {
    capabilities.indexedDB = 'indexedDB' in window && indexedDB !== null;
  } catch (e) {
    capabilities.indexedDB = false;
  }

  // Detectar Canvas (importante para toDataURL)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Intentar capturar datos del canvas (Brave puede bloquear esto)
      canvas.toDataURL();
      capabilities.canvas = true;
    }
  } catch (e) {
    capabilities.canvas = false;
  }

  // Detectar localStorage
  try {
    capabilities.localStorage = 'localStorage' in window && localStorage !== null;
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
  } catch (e) {
    capabilities.localStorage = false;
  }

  // Detectar File API
  capabilities.fileAPI = 'FileReader' in window;

  // Detectar WebGL
  try {
    const canvas = document.createElement('canvas');
    capabilities.webGL = !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch (e) {
    capabilities.webGL = false;
  }

  return capabilities;
}

// Función para mostrar advertencias específicas de Brave
export function showBraveCompatibilityWarning(capabilities: BrowserCapabilities): void {
  if (!capabilities.isBrave) return;

  const warnings: string[] = [];

  if (!capabilities.indexedDB) {
    warnings.push('• IndexedDB está bloqueado - las páginas no se guardarán automáticamente');
  }

  if (!capabilities.canvas) {
    warnings.push('• Canvas está restringido - las previews pueden no funcionar correctamente');
  }

  if (warnings.length > 0) {
    const message = `⚠️ BRAVE DETECTADO - Algunas funcionalidades pueden estar limitadas:\n\n${warnings.join('\n')}\n\n🛠️ SOLUCIONES:\n• Desactiva los "Shields" para este sitio\n• Ve a brave://settings/privacy y permite IndexedDB\n• O usa Chrome/Edge para la mejor experiencia`;
    
    console.warn('Brave compatibility issues detected:', warnings);
    
    // Mostrar un toast amigable en lugar de alert
    setTimeout(() => {
      const toast = document.createElement('div');
      toast.className = 'brave-warning-toast';
      toast.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #ff6b35;
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 16px;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          max-width: 90vw;
          text-align: center;
          animation: slideDown 0.3s ease;
        ">
          <div style="font-size: 18px; margin-bottom: 8px;">🦁 BRAVE DETECTADO</div>
          <div style="font-size: 14px; font-family: Arial, sans-serif;">
            Algunas funciones pueden estar bloqueadas.<br>
            <strong>Desactiva los "Shields" para este sitio</strong>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="
                    margin-top: 12px;
                    background: white;
                    color: #ff6b35;
                    border: none;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-weight: bold;
                  ">
            Entendido
          </button>
        </div>
      `;
      
      // Añadir estilos CSS para la animación
      if (!document.querySelector('#brave-toast-styles')) {
        const style = document.createElement('style');
        style.id = 'brave-toast-styles';
        style.textContent = `
          @keyframes slideDown {
            from { transform: translate(-50%, -100%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
        `;
        document.head.appendChild(style);
      }
      
      document.body.appendChild(toast);
      
      // Auto-remover después de 10 segundos
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 10000);
    }, 1000);
  }
}

// Función para configurar fallbacks
export function setupBraveFallbacks(capabilities: BrowserCapabilities): void {
  if (!capabilities.isBrave) return;

  // Si IndexedDB no está disponible, usar localStorage como fallback
  if (!capabilities.indexedDB && capabilities.localStorage) {
    console.log('🔄 Configurando localStorage como fallback para IndexedDB en Brave');
    
    // Crear un polyfill básico para IndexedDB usando localStorage
    (window as any).fallbackStorage = {
      setItem: (key: string, value: any) => {
        try {
          localStorage.setItem(`fotobook_${key}`, JSON.stringify(value));
          return true;
        } catch (e) {
          console.error('Error saving to localStorage fallback:', e);
          return false;
        }
      },
      getItem: (key: string) => {
        try {
          const item = localStorage.getItem(`fotobook_${key}`);
          return item ? JSON.parse(item) : null;
        } catch (e) {
          console.error('Error reading from localStorage fallback:', e);
          return null;
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(`fotobook_${key}`);
          return true;
        } catch (e) {
          console.error('Error removing from localStorage fallback:', e);
          return false;
        }
      }
    };
  }

  // Si canvas está bloqueado, deshabilitar previews
  if (!capabilities.canvas) {
    console.log('🔄 Canvas bloqueado en Brave - deshabilitando previews');
    (window as any).canvasBlocked = true;
  }
}

export default {
  detectBrowserCapabilities,
  showBraveCompatibilityWarning,
  setupBraveFallbacks,
};