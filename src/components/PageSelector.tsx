import React, { useState, useEffect } from 'react';
import { PhotoCountSelector } from './PhotoCountSelector';
import { FinalizationModal } from './FinalizationModal';
import { usePageCache } from '../hooks/usePageCache';
import { CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';

interface Page {
  id: number;
  label: string;
  pageRange: string;
}

interface Photo {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

interface EditedPage {
  pageId: number;
  photos: Photo[];
}

interface UserData {
  id: string;
  cedula: string;
  celular: string;
  email: string;
  direccion?: string; // Opcional hasta que se complete
  otpVerified: boolean;
}

import { API_ENDPOINTS } from '../config/api';

interface PageSelectorProps {
  onSelectPage: (pageId: number, photoCount?: number, layoutId?: string) => void;
  editedPages: Map<number, EditedPage>;
  userData: UserData;
  onLogout: () => void;
}

export const PageSelector: React.FC<PageSelectorProps> = ({ onSelectPage, editedPages, userData, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPhotoSelector, setShowPhotoSelector] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [showFinalizationModal, setShowFinalizationModal] = useState(false);
  const { isReady, loadPage } = usePageCache();
  const [cachedPages, setCachedPages] = useState<Map<number, any>>(new Map());

  const pages: Page[] = [
    { id: 1, label: 'Página 1', pageRange: 'Portada' },
    { id: 2, label: 'Página 2', pageRange: 'Interior' },
    { id: 3, label: 'Página 3', pageRange: 'Contenido' },
    { id: 4, label: 'Página 4', pageRange: 'Contenido' },
    { id: 5, label: 'Página 5', pageRange: 'Final' },
    { id: 6, label: 'Página 6', pageRange: 'Contraportada' },
  ];

  // Medidas de la página
  const PAGE_WIDTH = 831; // 22 cm
  const PAGE_HEIGHT = 1141; // 30.2 cm
  const BORDER_SIZE = 37.8; // ~1cm

  // Cargar páginas del caché al montarse y cuando cambia editedPages
  useEffect(() => {
    const loadCachedPages = async () => {
      if (!isReady) return;

      const cached = new Map();
      for (const page of pages) {
        // Siempre cargar primero desde IndexedDB (tiene la preview más reciente)
        const data = await loadPage(page.id);
        
        if (data) {
          cached.set(page.id, data);
        } else {
          // Si no está en IndexedDB, verificar editedPages
          const editedData = editedPages.get(page.id);
          if (editedData) {
            cached.set(page.id, editedData);
          }
        }
      }
      setCachedPages(cached);
    };

    loadCachedPages();
  }, [isReady, editedPages, loadPage]);

  const handleSelectPage = (pageId: number) => {
    setSelectedPageId(pageId);
    const cached = cachedPages.get(pageId);
    // Si la página ya tiene contenido (fotos, textos o stickers), ir directo al editor
    if (cached && (cached.photos?.length > 0 || cached.texts?.length > 0 || cached.stickers?.length > 0)) {
      onSelectPage(pageId, cached.photoCount || cached.photos?.length || 0, cached.layoutId || '');
    } else {
      setShowPhotoSelector(true);
    }
  };

  const handlePhotoCountSelect = (count: number, layoutId: string) => {
    if (selectedPageId) {
      onSelectPage(selectedPageId, count, layoutId);
    }
  };

  // Verificar si todas las páginas están completas (tienen preview)
  const areAllPagesComplete = () => {
    for (let i = 1; i <= 6; i++) {
      const cachedPage = cachedPages.get(i);
      if (!cachedPage || !cachedPage.previewImage) {
        return false;
      }
    }
    return true;
  };

  // Generar y descargar PDF con las 6 páginas
  const handleGeneratePDF = async (
    userData: {cedula: string, celular: string, direccion: string}, 
    onProgress: (step: string, progress: number) => void
  ) => {
    try {
      onProgress('preparing', 10);

      // Crear PDF optimizado (22cm x 30.2cm) - CALIDAD BALANCEADA
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [220, 302],
        compress: true // Activar compresión para reducir tamaño
      });

      // Dimensiones personalizadas en mm (22cm x 30.2cm)
      const pageWidth = 220;
      const pageHeight = 302;

      // Agregar cada página del fotobook al PDF - MÁXIMA CALIDAD
      for (let i = 1; i <= 6; i++) {
        const cachedPage = cachedPages.get(i);
        
        if (cachedPage && cachedPage.previewImage) {
          // Si no es la primera página, agregar nueva página al PDF
          if (i > 1) {
            pdf.addPage();
          }

          // Agregar imagen directamente sin comprimir
          try {
            // Optimizar imagen antes de agregarla al PDF
            const optimizedImage = await optimizeImageForPDF(cachedPage.previewImage);
            pdf.addImage(
              optimizedImage,
              'JPEG', // Usar JPEG para mejor compresión
              0,
              0,
              pageWidth,
              pageHeight,
              undefined,
              'FAST' // Compresión rápida pero efectiva
            );
          } catch (error) {
            // Error silencioso
          }
        }
        
        // Actualizar progreso de preparación (10% a 25%)
        onProgress('preparing', 10 + (i * 2.5));
      }

      // Generar el PDF como blob
      const pdfBlob = pdf.output('blob');
      const fileName = `Fotobook_${userData.cedula}_${new Date().getTime()}.pdf`;

      onProgress('preparing', 40);

      // Solo enviar a administrador en segundo plano (invisible para usuario)
      onProgress('admin-email', 50);
      try {
        await sendPDFByEmail(pdfBlob, userData, fileName);
        onProgress('admin-email', 70);
      } catch (adminError) {
        // No bloquear descarga si falla envío admin
      }

      // Descargar PDF localmente (acción principal)
      onProgress('downloading', 80);
      await new Promise(resolve => setTimeout(resolve, 300)); // Pausa visual más corta
      
      pdf.save(fileName);
      onProgress('downloading', 100);

    } catch (error) {
      throw error;
    }
  };

  // Optimizar imagen para PDF (reducir tamaño manteniendo calidad)
  const optimizeImageForPDF = async (imageDataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      img.onload = () => {
        // Mantener resolución alta pero optimizar compresión
        const maxWidth = 1654; // ~220mm a 190 DPI
        const maxHeight = 2268; // ~302mm a 190 DPI
        
        let { width, height } = img;
        
        // Escalar solo si es necesario (mantener calidad visual)
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Mejorar calidad de renderizado
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Comprimir a JPEG con 85% calidad (balance perfecto tamaño/calidad)
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      
      img.src = imageDataUrl;
    });
  };

  // Enviar PDF por correo (solo administrador en segundo plano)
  const sendPDFByEmail = async (
    pdfBlob: Blob, 
    userData: {cedula: string, celular: string, direccion: string}, 
    fileName: string
  ) => {
    // Validar tamaño del PDF (máximo 200MB - Pixeldrain soporta hasta 5GB)
    const pdfSizeMB = pdfBlob.size / (1024 * 1024);
    if (pdfSizeMB > 200) {
      throw new Error(`El PDF es demasiado grande (${pdfSizeMB.toFixed(2)}MB). Máximo permitido: 200MB`);
    }

    // Convertir blob a base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remover el prefijo "data:..."
      };
      reader.onerror = reject;
      reader.readAsDataURL(pdfBlob);
    });

    const base64PDF = await base64Promise;

    // Enviar al backend con timeout de 5 minutos para archivos muy grandes
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 minutos

    try {
      const response = await fetch(API_ENDPOINTS.sendPDF, {
        signal: controller.signal,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64: base64PDF,
          fileName: fileName,
          userData: {
            cedula: userData.cedula,
            celular: userData.celular,
            email: 'admin@fotobook.com', // Email dummy para admin
            direccion: userData.direccion
          }
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Error al procesar el fotobook`);
      }

    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado. El archivo es muy grande o la conexión es lenta. Inténtalo de nuevo.');
      }
      throw error;
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <div className="mb-12 relative">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bausch text-[#39FF14] mb-2">PARTY CLASS</h1>
              <p className="text-[#6B7280] font-bebas text-sm">Selecciona una página para comenzar</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Botón Finalizar */}
              <button
                onClick={() => setShowFinalizationModal(true)}
                disabled={!areAllPagesComplete()}
                className={`px-6 py-2 rounded-lg font-bebas transition-all flex items-center gap-2 ${
                  areAllPagesComplete()
                    ? 'bg-[#39FF14] text-[#003300] hover:bg-[#66FF44] shadow-md hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                title={areAllPagesComplete() ? 'Generar PDF final' : 'Completa todas las páginas primero'}
              >
                {areAllPagesComplete() && <CheckCircle2 className="w-5 h-5" />}
                Finalizar
              </button>

              {/* Botón de usuario */}
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="px-4 py-2 border-2 border-[#39FF14] text-[#39FF14] rounded-lg font-bebas hover:bg-[#39FF14]/10 transition-all max-w-[18rem] truncate"
                title={userData.email}
              >
                {userData.email}
              </button>
            </div>
          </div>

          {menuOpen && (
            <div className="absolute top-16 right-0 w-80 bg-white border-2 border-[#39FF14] rounded-lg shadow-subtle z-20 p-4">
              <div className="mb-3">
                <p className="text-[0.7rem] font-bebas text-[#6B7280]">CÉDULA</p>
                <p className="text-sm font-bebas text-[#003300]">{userData.cedula}</p>
              </div>
              <div className="mb-3">
                <p className="text-[0.7rem] font-bebas text-[#6B7280]">CELULAR</p>
                <p className="text-sm font-bebas text-[#003300]">{userData.celular}</p>
              </div>
              <div className="mb-3">
                <p className="text-[0.7rem] font-bebas text-[#6B7280]">EMAIL</p>
                <p className="text-sm font-bebas text-[#003300] break-all">{userData.email}</p>
              </div>
              <div className="mb-4">
                <p className="text-[0.7rem] font-bebas text-[#6B7280]">DIRECCIÓN</p>
                <p className="text-sm font-bebas text-[#003300]">{userData.direccion || 'No especificada'}</p>
              </div>
              <button
                onClick={onLogout}
                className="w-full px-4 py-2 border-2 border-[#FF6B6B] text-[#FF6B6B] rounded-lg font-bebas hover:bg-[#FF6B6B]/10 transition-all"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>

        {/* Grid de páginas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {pages.map((page) => {
            const cachedPage = cachedPages.get(page.id);
            const editedPage = editedPages.get(page.id);
            // Priorizar editedPages sobre cachedPages (datos más recientes)
            const photos = editedPage?.photos || cachedPage?.photos || [];

            return (
              <button
                key={page.id}
                onClick={() => handleSelectPage(page.id)}
                className="group relative w-full rounded-lg border-4 border-[#39FF14] bg-white shadow-subtle overflow-hidden hover:shadow-subtle-hover transition-all hover:scale-105"
                style={{
                  aspectRatio: `${PAGE_WIDTH + BORDER_SIZE * 2}/${PAGE_HEIGHT + BORDER_SIZE * 2}`,
                }}
              >
                {/* Contenedor de previsualización pequeña y centrada */}
                <div
                  className="absolute inset-0 bg-white group-hover:bg-[#F9FAFB] flex items-center justify-center overflow-hidden"
                >
                  {/* Si hay preview capturado, mostrarlo directamente */}
                  {cachedPage?.previewImage ? (
                    <img
                      src={cachedPage.previewImage}
                      alt={`Página ${page.id}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  ) : (
                    /* Si NO hay preview, renderizar estructura manualmente con mismo ajuste */
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {/* Borde dorado (elemento de diseño) */}
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          backgroundColor: '#D4AF37',
                          border: '1px solid #DAA520',
                          position: 'relative',
                        }}
                      >
                        {/* Canvas azul oscuro */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${(BORDER_SIZE / (PAGE_WIDTH + BORDER_SIZE * 2)) * 100}%`,
                            top: `${(BORDER_SIZE / (PAGE_HEIGHT + BORDER_SIZE * 2)) * 100}%`,
                            width: `${(PAGE_WIDTH / (PAGE_WIDTH + BORDER_SIZE * 2)) * 100}%`,
                            height: `${(PAGE_HEIGHT / (PAGE_HEIGHT + BORDER_SIZE * 2)) * 100}%`,
                            backgroundColor: '#1A3A52',
                            border: '2px solid #000000',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Fotos de previsualización */}
                          {photos.map((photo: Photo) => (
                            <div
                              key={photo.id}
                              style={{
                                position: 'absolute',
                                left: `${(photo.x / PAGE_WIDTH) * 100}%`,
                                top: `${(photo.y / PAGE_HEIGHT) * 100}%`,
                                width: `${(photo.width / PAGE_WIDTH) * 100}%`,
                                height: `${(photo.height / PAGE_HEIGHT) * 100}%`,
                                transform: `rotate(${photo.rotation}deg)`,
                                zIndex: photo.zIndex,
                                overflow: 'hidden',
                              }}
                            >
                              <img
                                src={photo.src}
                                alt="preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}

                          {/* Mensaje si no hay fotos */}
                          {photos.length === 0 && (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <div className="text-center">
                                <div className="text-[#39FF14] text-sm font-bebas mb-2">PÁGINA {page.id}</div>
                                <div className="text-[#D1D5DB] text-xs font-bebas">No editada</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Label */}
                <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
                  <div className="text-center">
                    <div className="text-lg font-bausch text-[#39FF14]">{page.label}</div>
                    <div className="text-xs font-bebas text-[#6B7280]">{page.pageRange}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Info */}
        <div className="text-center text-[#6B7280] font-bebas text-sm">
          <p>Total: 6 páginas | Máximo 40 fotos por página</p>
        </div>
      </div>

      {/* Modal de selección de cantidad de fotos */}
      {showPhotoSelector && selectedPageId && (
        <PhotoCountSelector
          onSelect={handlePhotoCountSelect}
          onClose={() => {
            setShowPhotoSelector(false);
            setSelectedPageId(null);
          }}
        />
      )}

      {/* Modal de finalización */}
      {showFinalizationModal && (
        <FinalizationModal
          onClose={() => setShowFinalizationModal(false)}
          onGenerate={handleGeneratePDF}
        />
      )}
    </div>
  );
};
