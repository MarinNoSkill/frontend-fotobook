import React, { useState, useEffect } from 'react';
import { PhotoCountSelector } from './PhotoCountSelector';
import { FinalizationModal } from './FinalizationModal';
import { usePageCache } from '../hooks/usePageCache';
import { CheckCircle2 } from 'lucide-react';
import JSZip from 'jszip';
import { API_ENDPOINTS } from '../config/api';

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
  nombre?: string;
  direccion?: string; // Opcional hasta que se complete
  otpVerified: boolean;
}

interface SheetSource {
  sheetNumber: number;
  leftPageId: number;
  rightPageId: number;
  leftMarginColor: string;
  rightMarginColor: string;
  leftPreviewImage: string;
  rightPreviewImage: string;
}

interface LoadedSheetSource {
  sheetNumber: number;
  leftMarginColor: string;
  rightMarginColor: string;
  leftImage: HTMLImageElement;
  rightImage: HTMLImageElement;
}

interface ZipBuildResult {
  zipBlob: Blob;
  zipSizeBytes: number;
  dpi: number;
  quality: number;
}

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

  // Formato final de impresión: hoja doble de 45cm x 30cm
  const SHEET_WIDTH_MM = 450;
  const SHEET_HEIGHT_MM = 300;
  const CONTENT_WIDTH_MM = 430; // 43 cm útiles
  const CONTENT_HEIGHT_MM = 280; // 28 cm útiles
  const TARGET_ZIP_SIZE_BYTES = 4 * 1024 * 1024;
  const DEFAULT_SHEET_MARGIN_COLOR = '#D4AF37';
  const JPEG_MIN_QUALITY = 0.35;
  const JPEG_MAX_QUALITY = 1;
  const JPEG_QUALITY_SEARCH_STEPS = 8;
  // Exportación: intentar máxima nitidez manteniendo tamaño físico y peso razonable.
  // Primero se prueba con 450 dpi; si el ZIP se pasa del objetivo, el algoritmo
  // ajusta solo la calidad JPEG sin tocar resolución, y si aun así es demasiado,
  // cae de vuelta a 300 dpi conservando el tamaño (45x30 cm).
  const EXPORT_DPI_CANDIDATES = [450, 300];
  const SHEET_PAGE_PAIRS: Array<[number, number]> = [
    [6, 1],
    [2, 3],
    [4, 5],
  ];

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

  const normalizeFileToken = (value: string): string => {
    const normalized = value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();

    return normalized || 'sin_nombre';
  };

  const getFilePrefix = (): string => {
    const cedulaToken = normalizeFileToken(userData.cedula || 'sin_cedula');
    const rawName = userData.nombre?.trim() || userData.email.split('@')[0] || 'sin_nombre';
    const nameToken = normalizeFileToken(rawName);

    return `${cedulaToken}_${nameToken}`;
  };

  // Generar y descargar ZIP con 3 hojas JPG (45cm x 30cm cada hoja)
  const handleGeneratePDF = async (
    exportData: {direccion: string}, 
    onProgress: (step: string, progress: number) => void
  ) => {
    try {
      onProgress('preparing', 10);

      const sheetSources: SheetSource[] = [];

      for (let pairIndex = 0; pairIndex < SHEET_PAGE_PAIRS.length; pairIndex++) {
        const [leftPageId, rightPageId] = SHEET_PAGE_PAIRS[pairIndex];
        const leftPage = cachedPages.get(leftPageId);
        const rightPage = cachedPages.get(rightPageId);

        if (!leftPage?.previewImage) {
          throw new Error(`No se pudo generar el archivo: falta la vista previa de la página ${leftPageId}.`);
        }

        if (!rightPage?.previewImage) {
          throw new Error(`No se pudo generar el archivo: falta la vista previa de la página ${rightPageId}.`);
        }

        sheetSources.push({
          sheetNumber: pairIndex + 1,
          leftPageId,
          rightPageId,
          leftMarginColor: leftPage.backgroundColor || DEFAULT_SHEET_MARGIN_COLOR,
          rightMarginColor: rightPage.backgroundColor || DEFAULT_SHEET_MARGIN_COLOR,
          leftPreviewImage: leftPage.previewImage,
          rightPreviewImage: rightPage.previewImage,
        });

        // Actualizar progreso de preparación por hoja compuesta
        onProgress('preparing', 10 + ((pairIndex + 1) / SHEET_PAGE_PAIRS.length) * 30);
      }

      onProgress('preparing', 45);

      const filePrefix = getFilePrefix();
      const optimizedZip = await createOptimizedZipForTarget(sheetSources, filePrefix);
      const zipBlob = optimizedZip.zipBlob;

      console.log(
        `ZIP optimizado: ${(optimizedZip.zipSizeBytes / (1024 * 1024)).toFixed(2)} MB | DPI ${optimizedZip.dpi} | calidad ${optimizedZip.quality.toFixed(3)}`
      );

      onProgress('preparing', 60);
      const fileName = `${filePrefix}_${new Date().getTime()}.zip`;

      onProgress('admin-email', 65);
      try {
        await sendZipByEmail(zipBlob, exportData, fileName);
      } catch (emailError) {
        console.warn('No se pudo enviar el link por email, continuando con descarga local.', emailError);
      }

      onProgress('admin-email', 75);

      const downloadUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);

      onProgress('downloading', 80);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      onProgress('downloading', 100);

    } catch (error) {
      throw error;
    }
  };

  const sendZipByEmail = async (
    zipBlob: Blob,
    exportData: {direccion: string},
    fileName: string
  ) => {
    const zipSizeMB = zipBlob.size / (1024 * 1024);
    if (zipSizeMB > 200) {
      throw new Error(`El ZIP es demasiado grande (${zipSizeMB.toFixed(2)}MB). Máximo permitido: 200MB`);
    }

    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(zipBlob);
    });

    const zipBase64 = await base64Promise;

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
          zipBase64,
          fileName,
          mimeType: 'application/zip',
          userData: {
            cedula: userData.cedula,
            celular: userData.celular,
            email: userData.email,
            nombre: userData.nombre,
            direccion: exportData.direccion,
          },
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al enviar ZIP por correo');
      }
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Tiempo de espera agotado al enviar ZIP por correo.');
      }
      throw error;
    }
  };

  const loadImageForJPG = async (
    imageDataUrl: string
  ): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo cargar la imagen para exportar JPG.'));
      image.src = imageDataUrl;
    });
  };

  const canvasToJpegBlob = async (canvas: HTMLCanvasElement, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('No se pudo convertir el canvas a JPG.'));
            return;
          }

          resolve(blob);
        },
        'image/jpeg',
        quality
      );
    });
  };

  const renderSpreadCanvas = (
    leftImage: HTMLImageElement,
    rightImage: HTMLImageElement,
    leftMarginColor: string,
    rightMarginColor: string,
    dpi: number
  ): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No se pudo crear el canvas de exportación.');
    }

    const outputWidth = Math.round((SHEET_WIDTH_MM / 25.4) * dpi);
    const outputHeight = Math.round((SHEET_HEIGHT_MM / 25.4) * dpi);
    const contentWidth = Math.round((CONTENT_WIDTH_MM / 25.4) * dpi);
    const contentHeight = Math.round((CONTENT_HEIGHT_MM / 25.4) * dpi);
    const contentX = Math.round((outputWidth - contentWidth) / 2);
    const contentY = Math.round((outputHeight - contentHeight) / 2);
    const leftAspectRatio = leftImage.width / leftImage.height;
    const rightAspectRatio = rightImage.width / rightImage.height;

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Conserva la proporción original del lienzo y deja la diferencia solo en la unión central.
    const pageHeight = contentHeight;
    const leftPageWidth = Math.round(pageHeight * leftAspectRatio);
    const rightPageWidth = Math.round(pageHeight * rightAspectRatio);
    const remainingGap = Math.max(0, contentWidth - leftPageWidth - rightPageWidth);
    const leftGapWidth = Math.floor(remainingGap / 2);
    const rightPageX = contentX + contentWidth - rightPageWidth;
    const seamX = contentX + leftPageWidth + leftGapWidth;
    const splitX = Math.min(outputWidth, Math.max(0, seamX));

    // El margen exterior se reparte por lado, respetando el color de cada página.
    ctx.fillStyle = leftMarginColor;
    ctx.fillRect(0, 0, splitX, outputHeight);
    ctx.fillStyle = rightMarginColor;
    ctx.fillRect(splitX, 0, outputWidth - splitX, outputHeight);

    ctx.drawImage(leftImage, contentX, contentY, leftPageWidth, pageHeight);

    ctx.drawImage(rightImage, rightPageX, contentY, rightPageWidth, pageHeight);

    return canvas;
  };

  const buildZipFromRenderedSheets = async (
    renderedSheets: Array<{ sheetNumber: number; canvas: HTMLCanvasElement }>,
    filePrefix: string,
    quality: number,
    dpi: number
  ): Promise<ZipBuildResult> => {
    const zip = new JSZip();

    for (const sheet of renderedSheets) {
      const jpgBlob = await canvasToJpegBlob(sheet.canvas, quality);
      zip.file(`${filePrefix}_hoja${sheet.sheetNumber}.jpg`, jpgBlob);
    }

    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return {
      zipBlob,
      zipSizeBytes: zipBlob.size,
      dpi,
      quality,
    };
  };

  const createOptimizedZipForTarget = async (
    sheetSources: SheetSource[],
    filePrefix: string
  ): Promise<ZipBuildResult> => {
    const loadedSheets: LoadedSheetSource[] = await Promise.all(
      sheetSources.map(async (sheet) => ({
        sheetNumber: sheet.sheetNumber,
        leftMarginColor: sheet.leftMarginColor,
        rightMarginColor: sheet.rightMarginColor,
        leftImage: await loadImageForJPG(sheet.leftPreviewImage),
        rightImage: await loadImageForJPG(sheet.rightPreviewImage),
      }))
    );

    for (const dpi of EXPORT_DPI_CANDIDATES) {
      const renderedSheets = loadedSheets.map((sheet) => ({
        sheetNumber: sheet.sheetNumber,
        canvas: renderSpreadCanvas(
          sheet.leftImage,
          sheet.rightImage,
          sheet.leftMarginColor,
          sheet.rightMarginColor,
          dpi
        ),
      }));

      const fixedQualityZip = await buildZipFromRenderedSheets(
        renderedSheets,
        filePrefix,
        JPEG_MAX_QUALITY,
        dpi
      );

      if (fixedQualityZip.zipSizeBytes <= TARGET_ZIP_SIZE_BYTES) {
        return fixedQualityZip;
      }

      const minQualityZip = await buildZipFromRenderedSheets(
        renderedSheets,
        filePrefix,
        JPEG_MIN_QUALITY,
        dpi
      );

      // Si ni con la compresión mínima configurable baja de 4MB,
      // se exporta igualmente con el menor peso posible sin tocar resolución.
      if (minQualityZip.zipSizeBytes > TARGET_ZIP_SIZE_BYTES) {
        return minQualityZip;
      }

      let low = JPEG_MIN_QUALITY;
      let high = JPEG_MAX_QUALITY;
      let bestFit = minQualityZip;

      for (let i = 0; i < JPEG_QUALITY_SEARCH_STEPS; i++) {
        const midQuality = (low + high) / 2;
        const candidateZip = await buildZipFromRenderedSheets(
          renderedSheets,
          filePrefix,
          midQuality,
          dpi
        );

        if (candidateZip.zipSizeBytes <= TARGET_ZIP_SIZE_BYTES) {
          bestFit = candidateZip;
          low = midQuality;
        } else {
          high = midQuality;
        }
      }

      return bestFit;
    }

    throw new Error('No fue posible generar el ZIP final. Intenta de nuevo.');
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
                title={areAllPagesComplete() ? 'Generar ZIP final' : 'Completa todas las páginas primero'}
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
          <p>Total: 6 páginas | Máximo 42 fotos por página</p>
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
