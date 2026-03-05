        import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Trash2, Copy, RotateCw, Type, Smile, ArrowUp, ArrowDown, Crop } from 'lucide-react';
import { Stage, Layer, Image as KonvaImage, Rect, Transformer, Group, Text as KonvaText } from 'react-konva';
import Konva from 'konva';
import { usePageCache } from '../hooks/usePageCache';
import { getLayoutById } from '../utils/photoLayouts';
import { detectBrowserCapabilities, showBraveCompatibilityWarning, setupBraveFallbacks } from '../utils/browserCompatibility';
import { ImageCropModal } from './ImageCropModal';
import type { CropInfo } from './ImageCropModal';
import './BorderControls.css';

interface PageEditorProps {
  pageId: number;
  onBack: () => void;
  memory: string;
  exitAnimation?: boolean;
  onSavePhotos: (pageId: number, photos: Photo[]) => void;
  onRemovePage: (pageId: number) => void;
  initialPhotos: Photo[];
  initialPhotoCount?: number;
  layoutId?: string;
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

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  rotation: number;
  zIndex: number;
}

interface StickerElement {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

// Cargar stickers con sintaxis actualizada para evitar warnings de Vite
const stickerModules = import.meta.glob('/public/stickers/*.{svg,png,jpg,jpeg}', { query: '?url', import: 'default', eager: true });
const stickerPaths = Object.keys(stickerModules)
  .filter(path => !path.includes('README'))
  .map(path => path.replace('/public', ''));

// Componente para cada imagen
const PhotoImage: React.FC<{
  photo: Photo;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: Partial<Photo>) => void;
  onDragEnd: () => void;
  onTransformEnd: () => void;
}> = ({ photo, isSelected, onSelect, onChange, onDragEnd, onTransformEnd }) => {
  const imageRef = useRef<Konva.Image>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [image] = useImageLoader(photo.src);

  useEffect(() => {
    if (isSelected && transformerRef.current && imageRef.current) {
      transformerRef.current.nodes([imageRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <KonvaImage
        ref={imageRef}
        image={image}
        x={photo.x}
        y={photo.y}
        width={photo.width}
        height={photo.height}
        rotation={photo.rotation}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onMouseEnter={() => {
          if (imageRef.current?.getStage()) {
            imageRef.current.getStage()!.container().style.cursor = 'move';
          }
        }}
        onMouseLeave={() => {
          if (imageRef.current?.getStage()) {
            imageRef.current.getStage()!.container().style.cursor = 'default';
          }
        }}
        onDragEnd={(e) => {
          const node = e.target;
          onChange({
            x: node.x(),
            y: node.y(),
          });
          onDragEnd();
        }}
        onTransformEnd={(e) => {
          const node = e.target as Konva.Image;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale
          node.scaleX(1);
          node.scaleY(1);

          onChange({
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
          onTransformEnd();
        }}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limitar tamaño mínimo
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          borderStroke="#39FF14"
          borderStrokeWidth={2}
          anchorStroke="#39FF14"
          anchorFill="#FFFFFF"
          anchorSize={8}
          rotateAnchorOffset={30}
          ignoreStroke={true}
          shouldOverdrawWholeArea={true}
          onMouseEnter={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              // Por defecto, es cursor de movimiento
              stage.container().style.cursor = 'move';
            }
          }}
          onMouseMove={(e) => {
            const stage = e.target.getStage();
            if (!stage) return;

            const pos = stage.getPointerPosition();
            if (!pos || !transformerRef.current) return;

            if (transformerRef.current.getNodes().length > 0) {
              const node = transformerRef.current.getNodes()[0];
              if (!node) return;

              const nodePos = { x: node.x(), y: node.y() };
              const scaleX = node.scaleX ? node.scaleX() : 1;
              const scaleY = node.scaleY ? node.scaleY() : 1;
              const nodeSize = {
                w: node.width() * scaleX,
                h: node.height() * scaleY,
              };

              const HANDLE_SIZE = 15;

              // Check corners (resize)
              const corners = [
                { x: nodePos.x, y: nodePos.y, cursor: 'nwse-resize' },
                { x: nodePos.x + nodeSize.w, y: nodePos.y, cursor: 'nesw-resize' },
                { x: nodePos.x, y: nodePos.y + nodeSize.h, cursor: 'nesw-resize' },
                { x: nodePos.x + nodeSize.w, y: nodePos.y + nodeSize.h, cursor: 'nwse-resize' },
              ];

              for (const corner of corners) {
                if (
                  Math.abs(pos.x - corner.x) < HANDLE_SIZE &&
                  Math.abs(pos.y - corner.y) < HANDLE_SIZE
                ) {
                  stage.container().style.cursor = corner.cursor;
                  return;
                }
              }

              // Check middle edges
              const edges = [
                { x: nodePos.x + nodeSize.w / 2, y: nodePos.y, cursor: 'ns-resize' },
                { x: nodePos.x + nodeSize.w / 2, y: nodePos.y + nodeSize.h, cursor: 'ns-resize' },
                { x: nodePos.x, y: nodePos.y + nodeSize.h / 2, cursor: 'ew-resize' },
                { x: nodePos.x + nodeSize.w, y: nodePos.y + nodeSize.h / 2, cursor: 'ew-resize' },
              ];

              for (const edge of edges) {
                if (
                  Math.abs(pos.x - edge.x) < HANDLE_SIZE &&
                  Math.abs(pos.y - edge.y) < HANDLE_SIZE
                ) {
                  stage.container().style.cursor = edge.cursor;
                  return;
                }
              }

              // Default to move cursor for body
              stage.container().style.cursor = 'move';
            }
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) {
              stage.container().style.cursor = 'default';
            }
          }}
        />
      )}
    </>
  );
};

// Hook para cargar imágenes
function useImageLoader(src: string) {
  const [image, setImage] = useState<HTMLImageElement | undefined>();

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.src = src;
    img.onload = () => {
      setImage(img);
    };
  }, [src]);

  return [image];
}

// Componente para elementos de texto
const TextElementComponent: React.FC<{
  text: TextElement;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onChange: (attrs: Partial<TextElement>) => void;
  onDragEnd: () => void;
  onTransformEnd: () => void;
  borderSize: number;
  pageWidth: number;
  pageHeight: number;
}> = ({ text, isSelected, onSelect, onDoubleClick, onChange, onDragEnd, onTransformEnd, borderSize, pageWidth, pageHeight }) => {
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const textWidth = node.width() * node.scaleX();
    const textHeight = node.height() * node.scaleY();
    
    // Restricciones de bordes - permitir acercarse mucho más al borde
    const margin = borderSize / 4; // Margen reducido para texto
    const minX = margin;
    const minY = margin;
    const maxX = pageWidth - margin - textWidth;
    const maxY = pageHeight - margin - textHeight;

    node.x(Math.max(minX, Math.min(node.x(), maxX)));
    node.y(Math.max(minY, Math.min(node.y(), maxY)));
  };

  return (
    <>
      <KonvaText
        ref={textRef}
        text={text.text}
        x={text.x}
        y={text.y}
        fontSize={text.fontSize}
        fontFamily={text.fontFamily}
        fill={text.fill}
        rotation={text.rotation}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onDoubleClick}
        onDblTap={onDoubleClick}
        onDragMove={handleDragMove}
        onDragEnd={(e) => {
          const node = e.target;
          onChange({
            x: node.x(),
            y: node.y(),
          });
          onDragEnd();
        }}
        onTransformEnd={(e) => {
          const node = e.target as Konva.Text;
          const scaleX = node.scaleX();
          
          onChange({
            fontSize: text.fontSize * scaleX,
            rotation: node.rotation(),
          });
          
          node.scaleX(1);
          node.scaleY(1);
          onTransformEnd();
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
          borderStroke="#39FF14"
          borderStrokeWidth={2}
          anchorStroke="#39FF14"
          anchorFill="#FFFFFF"
          anchorSize={8}
          rotateAnchorOffset={30}
          ignoreStroke={true}
          shouldOverdrawWholeArea={true}
        />
      )}
    </>
  );
};

// Componente para stickers
const StickerElementComponent: React.FC<{
  sticker: StickerElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (attrs: Partial<StickerElement>) => void;
  onDragEnd: () => void;
  onTransformEnd: () => void;
}> = ({ sticker, isSelected, onSelect, onChange, onDragEnd, onTransformEnd }) => {
  const [image] = useImageLoader(sticker.src);
  const imageRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && imageRef.current) {
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleDragMove = () => {
    // Sin restricciones - stickers pueden salirse del marco completamente
    // Si se salen, se recortan automáticamente por el canvas
  };

  return (
    <>
      {image && (
        <KonvaImage
          ref={imageRef}
          image={image}
          x={sticker.x}
          y={sticker.y}
          width={sticker.width}
          height={sticker.height}
          rotation={sticker.rotation}
          draggable
          onClick={onSelect}
          onTap={onSelect}
          onMouseEnter={() => {
            if (imageRef.current?.getStage()) {
              imageRef.current.getStage()!.container().style.cursor = 'move';
            }
          }}
          onMouseLeave={() => {
            if (imageRef.current?.getStage()) {
              imageRef.current.getStage()!.container().style.cursor = 'default';
            }
          }}
          onDragMove={handleDragMove}
          onDragEnd={(e) => {
            const node = e.target;
            onChange({
              x: node.x(),
              y: node.y(),
            });
            onDragEnd();
          }}
          onTransformEnd={(e) => {
            const node = e.target;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            onChange({
              x: node.x(),
              y: node.y(),
              width: Math.max(node.width() * scaleX, 20),
              height: Math.max(node.height() * scaleY, 20),
              rotation: node.rotation(),
            });

            node.scaleX(1);
            node.scaleY(1);
            onTransformEnd();
          }}
        />
      )}
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
          borderStroke="#39FF14"
          borderStrokeWidth={2}
          anchorStroke="#39FF14"
          anchorFill="#FFFFFF"
          anchorSize={8}
          rotateAnchorOffset={30}
          ignoreStroke={true}
          shouldOverdrawWholeArea={true}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
            'top-center',
            'bottom-center',
            'middle-left',
            'middle-right'
          ]}
        />
      )}
    </>
  );
};

// Función para distribuir fotos automáticamente en una cuadrícula
// Se usará cuando el usuario cargue fotos en una página con número predefinido
export function distributePhotosInGrid(photoCount: number, canvasWidth: number, canvasHeight: number): Array<{ x: number; y: number; width: number; height: number }> {
  const spacing = 20; // Espaciado entre fotos
  const padding = 20; // Padding desde los bordes
  const positions: Array<{ x: number; y: number; width: number; height: number }> = [];

  // Calcular cuadrícula
  let cols = Math.ceil(Math.sqrt(photoCount));
  let rows = Math.ceil(photoCount / cols);

  // Área disponible después del padding
  const availableWidth = canvasWidth - (padding * 2);
  const availableHeight = canvasHeight - (padding * 2);

  // Espacio para spacings
  const totalSpacingX = (cols - 1) * spacing;
  const totalSpacingY = (rows - 1) * spacing;

  const photoWidth = (availableWidth - totalSpacingX) / cols;
  const photoHeight = (availableHeight - totalSpacingY) / rows;

  let index = 0;
  for (let row = 0; row < rows && index < photoCount; row++) {
    for (let col = 0; col < cols && index < photoCount; col++) {
      const x = padding + col * (photoWidth + spacing);
      const y = padding + row * (photoHeight + spacing);
      positions.push({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(photoWidth),
        height: Math.round(photoHeight),
      });
      index++;
    }
  }

  return positions;
}

export const PageEditor: React.FC<PageEditorProps> = ({
  pageId,
  onBack,
  exitAnimation = false,
  onSavePhotos,
  onRemovePage,
  initialPhotos,
  initialPhotoCount = 0,
  layoutId: initialLayoutId = '',
}) => {
  console.log('🎨 PageEditor: Props recibidos', { 
    pageId, 
    initialPhotoCount, 
    initialLayoutId 
  });
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isReady: cacheReady, savePage, loadPage, deletePage } = usePageCache();
  
  // Estados
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [photoCount, setPhotoCount] = useState(initialPhotoCount);
  const [layoutId, setLayoutId] = useState(initialLayoutId);
  
  console.log('🎨 PageEditor: Estados inicializados', { 
    photoCount, 
    layoutId,
    initialPhotoCount,
    initialLayoutId
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [stageSize, setStageSize] = useState({ width: 1000, height: 800 });
  const [history, setHistory] = useState<Photo[][]>([initialPhotos]);
  const [stagePosition, setStagePosition] = useState<{ x: number; y: number } | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);
  const [clipboard, setClipboard] = useState<Photo | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState('#D4AF37'); // Marco exterior y fondo del canvas
  const [borderColor, setBorderColor] = useState('#1A3A52'); // BORDES: Marcos/compartimentos entre fotos (donde van las fotos)
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Estados para textos y stickers
  const [texts, setTexts] = useState<TextElement[]>([]);
  const [stickers, setStickers] = useState<StickerElement[]>([]);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [newText, setNewText] = useState('');
  const [selectedFont, setSelectedFont] = useState('Arial');
  const [selectedFontSize, setSelectedFontSize] = useState(32);
  const [selectedTextColor, setSelectedTextColor] = useState('#000000');
  
  // Estados para editar texto existente
  const [showEditTextModal, setShowEditTextModal] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editFont, setEditFont] = useState('Arial');
  const [editFontSize, setEditFontSize] = useState(32);
  const [editTextColor, setEditTextColor] = useState('#000000');
  
  // Estados para modal de recorte de imágenes
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageData, setCropImageData] = useState<string>('');
  const [cropImageId, setCropImageId] = useState<string>('');
  const [originalPhotoState, setOriginalPhotoState] = useState<Photo | null>(null);

  // Requerimiento: no persistir cambios automáticamente.
  const AUTO_SAVE_ENABLED = false;
  
  // Estados para controles de borde personalizables
  const [noBorders, setNoBorders] = useState(false); // Sin bordes (invertido)
  const [customBorderSize, setCustomBorderSize] = useState(20); // Grosor personalizable (0-100px)

  // TAMAÑO FIJO DEL CANVAS TOTAL (siempre igual con o sin borde)
  const TOTAL_CANVAS_WIDTH = 871; // 22cm + borde máximo
  const TOTAL_CANVAS_HEIGHT = 1181; // 30.2cm + borde máximo
  
  // BORDER_SIZE: Marco que va ENCIMA del lienzo
  // Para múltiples compartimentos, usar valor fijo optimizado
  // Para página individual, usar valor personalizable del usuario
  const BORDER_SIZE = noBorders ? 0 : (photoCount > 1 ? 20 : customBorderSize);
  
  // Área disponible para fotos (cambia según el borde)
  const PAGE_WIDTH = TOTAL_CANVAS_WIDTH - (BORDER_SIZE * 2);
  const PAGE_HEIGHT = TOTAL_CANVAS_HEIGHT - (BORDER_SIZE * 2);
  
  // Obtener el layout seleccionado con el BORDER_SIZE actual
  const selectedLayout = useMemo(() => {
    if (photoCount > 0 && layoutId) {
      const layout = getLayoutById(layoutId, photoCount, BORDER_SIZE);
      console.log('🔄 Layout recalculado:', {
        photoCount,
        layoutId,
        BORDER_SIZE,
        layoutName: layout ? layout.id + ' - ' + layout.name : 'null'
      });
      return layout;
    }
    return null;
  }, [layoutId, photoCount, BORDER_SIZE]);
  
  const layoutPositions = selectedLayout ? selectedLayout.positions : [];

  console.log('📊 PageEditor: Layout calculado', {
    photoCount,
    layoutId,
    BORDER_SIZE,
    selectedLayout: selectedLayout ? selectedLayout.id + ' - ' + selectedLayout.name : 'null',
    layoutPositionsCount: layoutPositions.length
  });

  // 🦁 INICIALIZACION DE COMPATIBILIDAD CON BRAVE
  useEffect(() => {
    const initBraveCompatibility = async () => {
      const capabilities = detectBrowserCapabilities();
      
      // Configurar fallbacks para Brave
      setupBraveFallbacks(capabilities);
      
      // Mostrar advertencia específica si es necesario
      showBraveCompatibilityWarning(capabilities);
      
      if (capabilities.isBrave) {
        console.log('🦁 Brave Browser detectado - fallbacks activados');
      }
    };
    
    initBraveCompatibility();
  }, []); // Solo ejecutar una vez al montar

  // Cargar datos del caché cuando el componente se monta
  // IndexedDB es LOCAL en el navegador, así que si se cae el wifi,
  // siempre carga el último estado guardado (no se pierde nada)
  useEffect(() => {
    const loadFromCache = async () => {
      if (!cacheReady) return;

      // Cargando último estado guardado desde IndexedDB (local)
      const cached = await loadPage(pageId);
      // Verificar si el usuario seleccionó explícitamente nuevos valores
      const hasNewPhotoCount = initialPhotoCount > 0;
      const hasNewLayoutId = initialLayoutId !== '';
      
      // Verificar si los valores iniciales son DIFERENTES del caché (indica cambio intencional)  
      const photoCountChanged = cached && cached.photoCount !== initialPhotoCount && hasNewPhotoCount;
      const layoutIdChanged = cached && cached.layoutId !== initialLayoutId && hasNewLayoutId;
      const hasChanges = photoCountChanged || layoutIdChanged;
      
      // Si ya hay contenido guardado (textos o stickers), NO pedir nueva configuración
      const hasExistingContent = cached && (cached.texts?.length > 0 || cached.stickers?.length > 0);
      
      console.log('🔍 Análisis de cache vs props:', {
        cached: cached ? {
          photoCount: cached.photoCount,
          layoutId: cached.layoutId,
          photosLength: cached.photos?.length,
          textsLength: cached.texts?.length || 0,
          stickersLength: cached.stickers?.length || 0
        } : null,
        props: {
          initialPhotoCount,
          initialLayoutId
        },
        checks: {
          hasNewPhotoCount,
          hasNewLayoutId,
          photoCountChanged,
          layoutIdChanged,
          hasChanges,
          hasExistingContent
        }
      });
      
      // REVISED: Si hay contenido (fotos, textos, stickers), cargar desde cache sin pedir nueva config
      if (cached && (cached.photos.length > 0 || cached.texts?.length > 0 || cached.stickers?.length > 0)) {
        // Si hay contenido existente, SIEMPRE cargar desde caché sin pedir nueva configuración
        console.log('🎯 HAY CONTENIDO EXISTENTE: Cargando desde caché sin pedir nueva configuración');
        
        // Restaurando desde caché (sin cambios del usuario)
        // Si hay stickers o textos, SIEMPRE cargar desde caché
        console.log('🎭 CACHE COMPLETO cargado:', {
          photos: cached.photos.length,
          texts: cached.texts?.length || 0,
          stickers: cached.stickers?.length || 0,
          backgroundColor: cached.backgroundColor,
          borderColor: cached.borderColor
        });
        
        // Primero restaurar colores ANTES de fotos para que ya estén seteados
        if (cached.backgroundColor !== undefined) {
          console.log('Restaurando backgroundColor:', cached.backgroundColor);
          setBackgroundColor(cached.backgroundColor);
        }
        if (cached.borderColor !== undefined) {
          console.log('Restaurando borderColor:', cached.borderColor);
          setBorderColor(cached.borderColor);
        }
        
        // Restaurar configuración de bordes con valores por defecto
        if (cached.showBorders !== undefined) {
          console.log('Restaurando noBorders:', !cached.showBorders);
          setNoBorders(!cached.showBorders); // Invertir para el nuevo control
        } else {
          setNoBorders(false); // Por defecto CON bordes
        }
        if (cached.customBorderSize !== undefined) {
          console.log('Restaurando customBorderSize:', cached.customBorderSize);
          setCustomBorderSize(cached.customBorderSize);
        } else {
          setCustomBorderSize(20); // Por defecto grosor normal
        }
        
        // Restaurar layoutId ANTES de las fotos
        if (cached.layoutId !== undefined) {
          console.log('Restaurando layoutId:', cached.layoutId);
          setLayoutId(cached.layoutId);
        }
        
        setPhotos(cached.photos);
        setPhotoCount(cached.photoCount);
        setHistory([cached.photos]);
        
        // Restaurar textos y stickers si existen
        if (cached.texts) {
          console.log('🔥 Restaurando textos desde caché:', cached.texts);
          setTexts(cached.texts);
        }
        if (cached.stickers) {
          console.log('🔥 Restaurando stickers desde caché:', cached.stickers);
          setStickers(cached.stickers);
        }
        
        // Restaurar posición del Stage y zoom
        if (cached.stageX !== undefined && cached.stageY !== undefined) {
          setStagePosition({ x: cached.stageX, y: cached.stageY });
        }
        if (cached.zoom !== undefined) {
          setZoom(cached.zoom);
        }
      } else if (hasChanges) {
        console.log('✅ RAMA 2: Usuario cambió valores - usando nuevos y limpiando fotos');
        // El usuario cambió los valores - usar nuevos valores y limpiar fotos
        console.log('Usuario cambió valores:', { 
          nuevo: { photoCount: initialPhotoCount, layoutId: initialLayoutId },
          anterior: { photoCount: cached?.photoCount, layoutId: cached?.layoutId }
        });
        if (hasNewPhotoCount) {
          setPhotoCount(initialPhotoCount);
        }
        if (hasNewLayoutId) {
          setLayoutId(initialLayoutId);
        }
        // Limpiar fotos anteriores del caché cuando se cambia el layout
        setPhotos([]);
        setHistory([[]]);
      } else if (hasNewPhotoCount || hasNewLayoutId) {
        console.log('✅ RAMA 3: Nueva página sin caché - usando valores iniciales');
        // Nueva página sin caché - usar valores iniciales
        console.log('Nueva página con valores:', { 
          photoCount: initialPhotoCount, 
          layoutId: initialLayoutId 
        });
        if (hasNewPhotoCount) {
          setPhotoCount(initialPhotoCount);
        }
        if (hasNewLayoutId) {
          setLayoutId(initialLayoutId);
        }
      } else {
        console.log('⚠️ RAMA 4: No se cumplió ninguna condición (caso inesperado)');
      }
      
      // Esperar más tiempo antes de permitir auto-save para que los estados se estabilicen
      setTimeout(() => {
        console.log('isLoadingCache -> false');
        setIsLoadingCache(false);
        setHasUnsavedChanges(false); // Marcar como limpio después de cargar desde caché
      }, 1000);
    };

    loadFromCache();
  }, [cacheReady, pageId, initialPhotoCount, initialLayoutId]);

  // AUTO-SAVE: Solo guardar automáticamente cuando hay imágenes (lógica original)
  useEffect(() => {
    if (!AUTO_SAVE_ENABLED) {
      return;
    }

    // No guardar si estamos haciendo reset o cargando la caché inicial
    if (!cacheReady || !stageRef.current || isLoadingCache) {
      console.log('Auto-save bloqueado:', { cacheReady, hasStage: !!stageRef.current, isLoadingCache });
      return;
    }

    // No guardar si el modal de crop está abierto para evitar guardar cambios no aplicados
    if (showCropModal) {
      console.log('Auto-save bloqueado: Modal de crop abierto');
      return;
    }
    
    // No guardar si hay cambios temporales de recorte sin aplicar
    if (originalPhotoState) {
      console.log('Auto-save bloqueado: Cambios de recorte sin aplicar');
      return;
    }

    // Solo guardar automáticamente si hay imágenes
    if (photos.length === 0) {
      console.log('Auto-save saltado: No hay imágenes cargadas');
      return;
    }

    console.log('Auto-save disparado: hay', photos.length, 'imágenes');

    // Esperar 500ms para que todo se renderice completamente
    const timer = setTimeout(async () => {
      try {
        const stage = stageRef.current;
        const layer = layerRef.current;
        
        if (!stage || !layer) return;

        // Forzar actualización del layer
        layer.batchDraw();

        // Guardar zoom/posición actual
        const originalZoom = zoom;
        const originalX = stage.x();
        const originalY = stage.y();

        // Resetear zoom y posición a (0,0) para captura limpia
        stage.scaleX(1);
        stage.scaleY(1);
        stage.x(0);
        stage.y(0);
        layer.batchDraw();

        // Capturar el Stage sin zoom - TODA LA IMAGEN DEL LIENZO - MÁXIMA CALIDAD
        const dataUrl = stage.toDataURL({
          x: 0,
          y: 0,
          width: TOTAL_CANVAS_WIDTH,
          height: TOTAL_CANVAS_HEIGHT,
          pixelRatio: 3,  // Máxima resolución posible
        });

        // Restaurar zoom y posición
        stage.scaleX(originalZoom);
        stage.scaleY(originalZoom);
        stage.x(originalX);
        stage.y(originalY);
        stage.draw();

        console.log('Guardando automáticamente página con:', { 
          photos: photos.length, 
          texts: texts.length, 
          stickers: stickers.length 
        });

        if (dataUrl && dataUrl.length > 100) {
          savePage(pageId, photos, photoCount, dataUrl, originalX, originalY, originalZoom, layoutId, backgroundColor, borderColor, texts, stickers, !noBorders, customBorderSize);
        } else {
          savePage(pageId, photos, photoCount, undefined, originalX, originalY, originalZoom, layoutId, backgroundColor, borderColor, texts, stickers, !noBorders, customBorderSize);
        }

        // IMPORTANTE: También actualizar editedPages para que el selector sepa que está editada
        onSavePhotos(pageId, photos);
      } catch (error) {
        console.error('Error en auto-save:', error);
        const stage = stageRef.current;
        const currentX = stage?.x() || 0;
        const currentY = stage?.y() || 0;
        savePage(pageId, photos, photoCount, undefined, currentX, currentY, zoom, layoutId, backgroundColor, borderColor, texts, stickers, !noBorders, customBorderSize);
        
        // IMPORTANTE: Aunque haya error, actualizar editedPages
        onSavePhotos(pageId, photos);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [AUTO_SAVE_ENABLED, photos, texts, stickers, photoCount, cacheReady, pageId, savePage, zoom, layoutId, backgroundColor, borderColor, isLoadingCache, noBorders, customBorderSize, showCropModal, originalPhotoState]);

  // Ajustar tamaño del stage al contenedor
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Centrar el canvas solo cuando se monta (si no hay posición guardada)
  useEffect(() => {
    if (stageRef.current && !isLoadingCache) {
      const stage = stageRef.current;
      
      // Si hay posición guardada, restaurarla
      if (stagePosition) {
        stage.x(stagePosition.x);
        stage.y(stagePosition.y);
        setStagePosition(null); // Solo restaurar una vez
      } else if (photos.length === 0) {
        // Solo centrar si no hay fotos (página nueva)
        const offsetX = (stageSize.width - TOTAL_CANVAS_WIDTH * zoom) / 2;
        const offsetY = (stageSize.height - TOTAL_CANVAS_HEIGHT * zoom) / 2;
        stage.x(Math.max(0, offsetX));
        stage.y(Math.max(0, offsetY));
      }
    }
  }, [stagePosition, photos.length, TOTAL_CANVAS_WIDTH, zoom, stageSize, isLoadingCache]);

  // Efecto para mantener el canvas centrado cuando cambia el tamaño del borde
  useEffect(() => {
    if (stageRef.current && !isLoadingCache) {
      const stage = stageRef.current;
      
      // Mantener centrado cuando cambia el tamaño del borde
      const offsetX = (stageSize.width - TOTAL_CANVAS_WIDTH * zoom) / 2;
      const offsetY = (stageSize.height - TOTAL_CANVAS_HEIGHT * zoom) / 2;
      
      // Solo ajustar si el canvas cabe en la pantalla
      if (TOTAL_CANVAS_WIDTH * zoom <= stageSize.width && TOTAL_CANVAS_HEIGHT * zoom <= stageSize.height) {
        stage.x(Math.max(0, offsetX));
        stage.y(Math.max(0, offsetY));
      }
    }
  }, [TOTAL_CANVAS_WIDTH, TOTAL_CANVAS_HEIGHT, zoom, stageSize, isLoadingCache]);

  const pushHistory = useCallback((nextPhotos: Photo[]) => {
    setHistory((prev) => [...prev.slice(-19), nextPhotos]);
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Limitar cantidad de imágenes según photoCount
    const remainingSlots = photoCount - photos.length;
    if (remainingSlots <= 0) {
      alert(`Ya has alcanzado el límite de ${photoCount} imagen(es) para esta página.`);
      e.target.value = ''; // Limpiar input
      return;
    }

    // Si hay photoCount y layoutId definidos, obtener el layout
    const hasPhotoCount = photoCount > 0 && layoutId;
    const layout = hasPhotoCount ? getLayoutById(layoutId, photoCount, BORDER_SIZE) : null;
    const gridPositions = layout ? layout.positions : [];

    const filesToLoad = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      alert(`Solo puedes cargar ${remainingSlots} imagen(es) más. Se cargarán las primeras ${remainingSlots}.`);
    }

    filesToLoad.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgElement = new Image();
        imgElement.src = event.target?.result as string;

        imgElement.onload = () => {
          let posX: number;
          let posY: number;
          let width: number;
          let height: number;

          if (hasPhotoCount && gridPositions[photos.length + index]) {
            // Usar posición del layout seleccionado
            const pos = gridPositions[photos.length + index];
            posX = pos.x;
            posY = pos.y;
            width = pos.width;
            height = pos.height;
          } else {
            // Usar posición centrada por defecto
            const defaultSize = Math.min(PAGE_WIDTH / 3, PAGE_HEIGHT / 3);
            posX = (PAGE_WIDTH - defaultSize) / 2;
            posY = (PAGE_HEIGHT - defaultSize) / 2;
            width = defaultSize;
            height = defaultSize;
          }

          const nextPhoto: Photo = {
            id: Math.random().toString(36).slice(2, 11),
            src: imgElement.src,
            x: posX,
            y: posY,
            width: width,
            height: height,
            rotation: 0,
            zIndex: photos.length + index,
          };

          setPhotos((prev) => {
            const next = [...prev, nextPhoto];
            pushHistory(next);
            return next;
          });
          setSelectedId(nextPhoto.id);
          setHasUnsavedChanges(true); // Marcar cambios al cargar imagen
        };
      };
      reader.readAsDataURL(file as Blob);
    });

    // Limpiar input para permitir cargar las mismas imágenes
    e.target.value = '';
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const confirmReset = async () => {
    setPhotos([]);
    setTexts([]);
    setStickers([]);
    setHistory([[]]);
    setSelectedId(null);
    setClipboard(null);
    setBackgroundColor('#D4AF37'); // Resetear marco exterior (borde para el usuario)
    setBorderColor('#1A3A52'); // Resetear compartimentos (fondo para el usuario)
    setNoBorders(false); // Resetear a CON bordes
    setCustomBorderSize(20); // Resetear grosor a normal
    setShowResetModal(false);
    
    // Primero limpiar IndexedDB (await para asegurar que complete)
    await deletePage(pageId);
    
    // Luego remover del estado de React (esto dispara useEffect en PageSelector)
    onRemovePage(pageId);
    
    // Pequeño delay para que React procese el cambio de estado
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Finalmente regresar al selector
    onBack();
  };

  const cancelReset = () => {
    setShowResetModal(false);
  };

  // Funciones para agregar texto
  const handleAddText = () => {
    if (!newText.trim()) return;
    
    const newTextElement: TextElement = {
      id: Math.random().toString(36).slice(2, 11),
      text: newText.trim(),
      x: TOTAL_CANVAS_WIDTH / 2 - 50,
      y: TOTAL_CANVAS_HEIGHT / 2 - 20,
      fontSize: selectedFontSize,
      fontFamily: selectedFont,
      fill: selectedTextColor,
      rotation: 0,
      zIndex: photos.length + texts.length + stickers.length,
    };
    
    setTexts((prev) => [...prev, newTextElement]);
    setSelectedId(newTextElement.id); // Seleccionar automáticamente el texto recién agregado
    setNewText('');
    setShowTextModal(false);
    setHasUnsavedChanges(true);
  };
  
  // Funciones para editar texto existente
  const handleOpenEditText = (textId: string) => {
    const textToEdit = texts.find(t => t.id === textId);
    if (!textToEdit) return;
    
    setEditingTextId(textId);
    setEditText(textToEdit.text);
    setEditFont(textToEdit.fontFamily);
    setEditFontSize(textToEdit.fontSize);
    setEditTextColor(textToEdit.fill);
    setShowEditTextModal(true);
  };
  
  const handleSaveEditText = () => {
    if (!editingTextId || !editText.trim()) return;
    
    setTexts((prev) =>
      prev.map((t) =>
        t.id === editingTextId
          ? { ...t, text: editText.trim(), fontFamily: editFont, fontSize: editFontSize, fill: editTextColor }
          : t
      )
    );
    
    setShowEditTextModal(false);
    setEditingTextId(null);
    setHasUnsavedChanges(true);
  };

  // Funciones para agregar stickers
  const handleAddSticker = (stickerPath: string) => {
    const newSticker: StickerElement = {
      id: Math.random().toString(36).slice(2, 11),
      src: stickerPath,
      x: TOTAL_CANVAS_WIDTH / 2 - 50,
      y: TOTAL_CANVAS_HEIGHT / 2 - 50,
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: photos.length + texts.length + stickers.length,
    };
    
    setStickers((prev) => [...prev, newSticker]);
    setSelectedId(newSticker.id); // Seleccionar automáticamente el sticker recién agregado
    setShowStickerModal(false);
    setHasUnsavedChanges(true);
  };

  const handleDuplicate = () => {
    if (!selectedId) return;

    setPhotos((prev) => {
      const selected = prev.find((p) => p.id === selectedId);
      if (!selected) return prev;

      const copy: Photo = {
        ...selected,
        id: Math.random().toString(36).slice(2, 11),
        x: Math.min(PAGE_WIDTH - selected.width, selected.x + 20),
        y: Math.min(PAGE_HEIGHT - selected.height, selected.y + 20),
        zIndex: prev.length,
      };

      const next = [...prev, copy];
      pushHistory(next);
      setSelectedId(copy.id);
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleCopy = () => {
    if (!selectedId) return;
    const selected = photos.find((p) => p.id === selectedId);
    if (selected) {
      setClipboard(selected);
    }
  };

  const handlePaste = () => {
    if (!clipboard) return;

    const copy: Photo = {
      ...clipboard,
      id: Math.random().toString(36).slice(2, 11),
      x: Math.min(PAGE_WIDTH - clipboard.width, clipboard.x + 20),
      y: Math.min(PAGE_HEIGHT - clipboard.height, clipboard.y + 20),
      zIndex: photos.length,
    };

    setPhotos((prev) => {
      const next = [...prev, copy];
      pushHistory(next);
      setSelectedId(copy.id);
      return next;
    });
  };

  const handleDelete = () => {
    if (!selectedId) return;

    // Verificar si es foto, texto o sticker
    const isPhoto = photos.some((p) => p.id === selectedId);
    const isText = texts.some((t) => t.id === selectedId);
    const isSticker = stickers.some((s) => s.id === selectedId);

    if (isPhoto) {
      setPhotos((prev) => {
        const next = prev.filter((p) => p.id !== selectedId);
        pushHistory(next);
        setHasUnsavedChanges(true);
        return next;
      });
    } else if (isText) {
      setTexts((prev) => prev.filter((t) => t.id !== selectedId));
      setHasUnsavedChanges(true);
    } else if (isSticker) {
      setStickers((prev) => prev.filter((s) => s.id !== selectedId));
      setHasUnsavedChanges(true);
    }
    
    setSelectedId(null);
  };

  // Función para abrir el modal de recorte
  const handleCropImage = () => {
    if (!selectedId) return;
    
    const selectedPhoto = photos.find(p => p.id === selectedId);
    if (!selectedPhoto) return;
    
    // Guardar estado original para poder restaurar si se cancela
    setOriginalPhotoState({ ...selectedPhoto });
    setCropImageData(selectedPhoto.src);
    setCropImageId(selectedPhoto.id);
    setShowCropModal(true);
  };

  // Función para aplicar el recorte
  const handleCropComplete = (croppedImageData: string, cropInfo: CropInfo) => {
    if (!cropImageId) return;
    
    setPhotos((prev) => {
      const next = prev.map((photo) => {
        if (photo.id === cropImageId) {
          return {
            ...photo,
            src: croppedImageData,
            width: cropInfo.canvasWidth,
            height: cropInfo.canvasHeight,
          };
        }
        return photo;
      });
      
      pushHistory(next);
      setHasUnsavedChanges(true);
      return next;
    });
    
    // Cerrar el modal y limpiar estados
    setShowCropModal(false);
    setCropImageData('');
    setCropImageId('');
    setOriginalPhotoState(null);
  };

  // Función para cerrar el modal de recorte
  const handleCropCancel = () => {
    // Restaurar estado original si había cambios
    if (originalPhotoState && cropImageId) {
      setPhotos((prev) => 
        prev.map((photo) => 
          photo.id === cropImageId ? originalPhotoState : photo
        )
      );
    }
    
    setShowCropModal(false);
    setCropImageData('');
    setCropImageId('');
    setOriginalPhotoState(null);
  };
  
  // Funciones para mover elementos con flechas
  const handleMoveSelected = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedId) return;
    
    const moveAmount = 10;
    
    const isPhoto = photos.some((p) => p.id === selectedId);
    const isText = texts.some((t) => t.id === selectedId);
    const isSticker = stickers.some((s) => s.id === selectedId);
    
    if (isPhoto) {
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.id !== selectedId) return p;
          
          let newX = p.x;
          let newY = p.y;
          
          if (direction === 'left') newX -= moveAmount;
          if (direction === 'right') newX += moveAmount;
          if (direction === 'up') newY -= moveAmount;
          if (direction === 'down') newY += moveAmount;
          
          return { ...p, x: newX, y: newY };
        })
      );
      setHasUnsavedChanges(true);
    } else if (isText) {
      setTexts((prev) =>
        prev.map((t) => {
          if (t.id !== selectedId) return t;
          
          let newX = t.x;
          let newY = t.y;
          
          if (direction === 'left') newX -= moveAmount;
          if (direction === 'right') newX += moveAmount;
          if (direction === 'up') newY -= moveAmount;
          if (direction === 'down') newY += moveAmount;
          
          return { ...t, x: newX, y: newY };
        })
      );
      setHasUnsavedChanges(true);
    } else if (isSticker) {
      setStickers((prev) =>
        prev.map((s) => {
          if (s.id !== selectedId) return s;
          
          let newX = s.x;
          let newY = s.y;
          
          if (direction === 'left') newX -= moveAmount;
          if (direction === 'right') newX += moveAmount;
          if (direction === 'up') newY -= moveAmount;
          if (direction === 'down') newY += moveAmount;
          
          return { ...s, x: newX, y: newY };
        })
      );
      setHasUnsavedChanges(true);
    }
  };

  // Funciones para controlar el orden de capas (z-index)
  const handleBringToFront = () => {
    if (!selectedId) return;
    
    const isPhoto = photos.some((p) => p.id === selectedId);
    const isText = texts.some((t) => t.id === selectedId);
    const isSticker = stickers.some((s) => s.id === selectedId);
    
    if (isPhoto) {
      setPhotos((prev) => {
        const maxZIndex = Math.max(...prev.map(p => p.zIndex), 0);
        return prev.map((p) => 
          p.id === selectedId ? { ...p, zIndex: maxZIndex + 1 } : p
        );
      });
      setHasUnsavedChanges(true);
    } else if (isText) {
      setTexts((prev) => {
        const maxZIndex = Math.max(...prev.map(t => t.zIndex), 0);
        return prev.map((t) => 
          t.id === selectedId ? { ...t, zIndex: maxZIndex + 1 } : t
        );
      });
      setHasUnsavedChanges(true);
    } else if (isSticker) {
      setStickers((prev) => {
        const maxZIndex = Math.max(...prev.map(s => s.zIndex), 0);
        return prev.map((s) => 
          s.id === selectedId ? { ...s, zIndex: maxZIndex + 1 } : s
        );
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleSendToBack = () => {
    if (!selectedId) return;
    
    const isPhoto = photos.some((p) => p.id === selectedId);
    const isText = texts.some((t) => t.id === selectedId);
    const isSticker = stickers.some((s) => s.id === selectedId);
    
    if (isPhoto) {
      setPhotos((prev) => {
        const minZIndex = Math.min(...prev.map(p => p.zIndex), 0);
        return prev.map((p) => 
          p.id === selectedId ? { ...p, zIndex: minZIndex - 1 } : p
        );
      });
      setHasUnsavedChanges(true);
    } else if (isText) {
      setTexts((prev) => {
        const minZIndex = Math.min(...prev.map(t => t.zIndex), 0);
        return prev.map((t) => 
          t.id === selectedId ? { ...t, zIndex: minZIndex - 1 } : t
        );
      });
      setHasUnsavedChanges(true);
    } else if (isSticker) {
      setStickers((prev) => {
        const minZIndex = Math.min(...prev.map(s => s.zIndex), 0);
        return prev.map((s) => 
          s.id === selectedId ? { ...s, zIndex: minZIndex - 1 } : s
        );
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const nextHistory = history.slice(0, -1);
    setHistory(nextHistory);
    setPhotos(nextHistory[nextHistory.length - 1] || []);
    setSelectedId(null);
  };

  // Función para guardar manualmente la preview
  const handleSavePreview = async (): Promise<boolean> => {
    if (showCropModal || originalPhotoState) {
      setSaveMessage('⚠️ Aplica o cancela recorte');
      setTimeout(() => setSaveMessage(null), 2000);
      return false;
    }

    if (!stageRef.current || !layerRef.current || !containerRef.current) {
      console.log('Stage o Layer no disponible para guardar');
      setSaveMessage('❌ Error al guardar');
      setTimeout(() => setSaveMessage(null), 2000);
      return false;
    }

    // Deseleccionar cualquier elemento antes de capturar
    setSelectedId(null);
    
    setIsSaving(true);
    setSaveMessage(null);
    
    // Esperar a que React actualice y quite el transformer
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const stage = stageRef.current;
      const layer = layerRef.current;

      console.log('🎨 Iniciando captura de preview...', {
        photos: photos.length,
        texts: texts.length,
        stickers: stickers.length,
        backgroundColor,
        borderColor,
        layoutId,
        layoutPositions: layoutPositions.length
      });

      // Guardar estado actual
      const originalZoom = zoom;
      const originalX = stage.x();
      const originalY = stage.y();

      // Crear overlay blanco para cubrir TODA la pantalla (no solo el canvas)
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.backgroundColor = 'white';
      overlay.style.zIndex = '9999';
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.innerHTML = '<div style="font-family: Bebas Neue, sans-serif; font-size: 24px; color: #39FF14;">⏳ Guardando...</div>';
      document.body.appendChild(overlay);

      // Pequeña espera para que el overlay se renderice
      await new Promise(resolve => setTimeout(resolve, 50));

      // Resetear para captura limpia
      stage.scaleX(1);
      stage.scaleY(1);
      stage.x(0);
      stage.y(0);
      
      // Forzar render completo múltiples veces
      layer.batchDraw();
      stage.draw();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      layer.batchDraw();
      stage.draw();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      layer.batchDraw();
      stage.draw();
      
      // Esperar 1 segundo para asegurar renderizado completo
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Debug: verificar qué hay en el layer
      const allNodes = layer.getChildren();
      console.log('📦 Elementos en layer:', {
        totalChildren: allNodes.length,
        rects: layer.find('Rect').length,
        images: layer.find('Image').length,
        texts: layer.find('Text').length,
        groups: layer.find('Group').length
      });

      // Capturar con máxima calidad - con detección de bloqueo en Brave
      let dataUrl = '';
      let canvasBlocked = false;
      
      try {
        dataUrl = stage.toDataURL({
          x: 0,
          y: 0,
          width: TOTAL_CANVAS_WIDTH,
          height: TOTAL_CANVAS_HEIGHT,
          pixelRatio: 3,  // Máxima resolución posible
        });
        
        // Verificar si el dataURL es válido o si Brave lo bloqueó
        if (!dataUrl || dataUrl.length < 100 || dataUrl === 'data:,') {
          canvasBlocked = true;
        }
      } catch (error) {
        console.error('🚫 Canvas bloqueado por el navegador (probablemente Brave):', error);
        canvasBlocked = true;
      }

      const capabilities = detectBrowserCapabilities();
      
      if (canvasBlocked && capabilities.isBrave) {
        console.log('🦁 Canvas bloqueado en Brave - guardando sin preview');
        setSaveMessage('⚠️ Brave: Guardado sin preview');
      } else if (canvasBlocked) {
        console.log('🚫 Canvas bloqueado por configuraciones de privacidad');
        setSaveMessage('⚠️ Guardado sin preview');
      } else {
        console.log('📸 Preview capturada exitosamente:', {
          length: dataUrl.length,
          starts: dataUrl.substring(0, 50)
        });
        setSaveMessage('✅ Guardado');
      }

      // Restaurar estado
      stage.scaleX(originalZoom);
      stage.scaleY(originalZoom);
      stage.x(originalX);
      stage.y(originalY);
      stage.draw();

      // Quitar el overlay
      overlay.remove();

      // Guardar en caché - con o sin preview dependiendo de las capacidades del navegador
      const finalDataUrl = canvasBlocked ? undefined : dataUrl;
      
      console.log('💾 GUARDANDO EN CACHE:', {
        pageId,
        photos: photos.length,
        texts: texts.length,
        stickers: stickers.length,
        layoutId,
        backgroundColor,
        borderColor,
        customBorderSize,
        noBorders: !noBorders
      });
      
      await savePage(pageId, photos, photoCount, finalDataUrl, originalX, originalY, originalZoom, layoutId, backgroundColor, borderColor, texts, stickers, !noBorders, customBorderSize);
      
      if (capabilities.isBrave && canvasBlocked) {
        console.log('🦁 Página guardada en Brave sin preview (canvas bloqueado)');
      } else if (canvasBlocked) {
        console.log('⚠️ Página guardada sin preview (canvas bloqueado por configuraciones de privacidad)');
      } else {
        console.log('✅ Página y preview guardadas exitosamente');
      }
      
      onSavePhotos(pageId, photos); // Guardar en estado del padre
      setHasUnsavedChanges(false); // Marcar como guardado
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
      return true;
    } catch (error) {
      console.error('❌ Error al guardar preview:', error);
      // Quitar overlay si existe
      const overlay = document.querySelector('div[style*="position: fixed"][style*="z-index: 9999"]');
      if (overlay) overlay.remove();
      
      setSaveMessage('❌ Error al guardar');
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
      return false;
    }
  };

  // Mostrar modal de confirmación al intentar salir (solo si hay cambios sin guardar)
  const handleBack = () => {
    console.log('🔙 Intentando volver. Cambios sin guardar:', hasUnsavedChanges);
    if (hasUnsavedChanges) {
      console.log('⚠️ Hay cambios sin guardar, mostrando modal...');
      setShowExitModal(true);
    } else {
      // Si ya guardó (o no hay cambios), salir directamente sin guardar de nuevo
      console.log('✅ Sin cambios sin guardar, saliendo sin guardar...');
      onBack();
    }
  };

  // Guardar y salir
  const handleSaveAndExit = async () => {
    // Deseleccionar antes de guardar
    setSelectedId(null);
    
    // Esperar a que React actualice y quite el transformer
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('💾 Guardando cambios antes de salir...');
    const saved = await handleSavePreview();
    
    if (saved) {
      // Esperar un poquito para que IndexedDB termine de escribir
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log('✅ Guardado completado, regresando al selector...');
    }
    
    // handleSavePreview ya llamó a onSavePhotos, no es necesario llamarlo de nuevo
    onBack();
  };

  // Salir sin guardar
  const handleExitWithoutSave = () => {
    // Deseleccionar antes de salir
    setSelectedId(null);
    
    console.log('🚪 Saliendo sin guardar cambios - descartando cambios');
    // NO llamar a onSavePhotos ni guardar preview
    // Simplemente regresar y descartar los cambios
    setHasUnsavedChanges(false);
    onBack();
  };

  // Cancelar salida
  const handleCancelExit = () => {
    console.log('❌ Cancelando salida');
    setShowExitModal(false);
  };

  // DESHABILITADO: Auto-save automático - ahora solo se guarda manualmente
  // useEffect(() => {
  //   onSavePhotos(pageId, photos);
  // }, [pageId, photos, onSavePhotos]);

  // Protección contra recarga/cierre de pestaña con cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Mensaje estándar del navegador
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || 
                            document.activeElement?.tagName === 'TEXTAREA' ||
                            document.activeElement?.getAttribute('contenteditable') === 'true';
      
      // Si estamos en un input/textarea, NO interceptar Ctrl+C/V/Z para que funcionen normalmente
      if (isInputFocused) {
        // Solo bloquear Delete/Backspace/Flechas en inputs para no eliminar/mover elementos
        if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey) {
          // Dejar que funcione normalmente en inputs
          return;
        }
        if (e.key.startsWith('Arrow')) {
          // Dejar que funcione normalmente en inputs
          return;
        }
        // Para zoom, permitir que funcione incluso en inputs
        if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
          e.preventDefault();
          setZoom((prev) => Math.min(3, prev + 0.1));
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
          e.preventDefault();
          setZoom((prev) => Math.max(0.4, prev - 0.1));
          return;
        }
        // Dejar pasar todos los demás shortcuts (Ctrl+C/V/Z funcionarán nativamente)
        return;
      }
      
      // A partir de aquí, NO estamos en un input, manejar shortcuts del canvas
      
      // Ctrl+C - Copiar elemento seleccionado
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId) {
        e.preventDefault();
        handleCopy();
        return;
      }

      // Ctrl+V - Pegar elemento copiado
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
        e.preventDefault();
        handlePaste();
        return;
      }

      // Ctrl+Z - Deshacer
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Zoom
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setZoom((prev) => Math.min(3, prev + 0.1));
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoom((prev) => Math.max(0.4, prev - 0.1));
        return;
      }

      // Delete/Backspace - Eliminar elemento seleccionado
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
        return;
      }
      
      // Flechas - Mover elemento seleccionado
      if (selectedId) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleMoveSelected('up');
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleMoveSelected('down');
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleMoveSelected('left');
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleMoveSelected('right');
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, history, clipboard]);

  // Handle wheel zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.05;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const bounded = Math.max(0.4, Math.min(3, newScale));

    setZoom(bounded);
    stage.scale({ x: bounded, y: bounded });

    const newPos = {
      x: pointer.x - mousePointTo.x * bounded,
      y: pointer.y - mousePointTo.y * bounded,
    };

    stage.position(newPos);
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Si hace click en el canvas (no en una foto, texto o sticker), deseleccionar
    const clickedOnEmpty = e.target === e.target.getStage() || e.target.name() === 'background';
    if (clickedOnEmpty) {
      setSelectedId(null);
      if (e.target.getStage()) {
        e.target.getStage()!.container().style.cursor = 'grab';
      }
    }
  };

  const handleStageMouseUp = () => {
    const stage = stageRef.current;
    if (stage) {
      stage.container().style.cursor = 'default';
    }
  };

  return (
    <div className={`h-screen bg-white flex flex-col ${exitAnimation ? 'animate-zoomOut' : 'animate-zoomIn'}`}>
      {/* Header */}
      <header className="bg-white border-b-2 border-[#39FF14] shadow-subtle p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-[#39FF14] font-bebas hover:text-[#66FF44] transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              Atrás
            </button>
            <div className="flex flex-col items-start gap-1">
              <button
                onClick={handleSavePreview}
                disabled={isSaving || showCropModal || !!originalPhotoState}
                className={`flex items-center gap-2 px-4 py-2 font-bebas rounded-lg transition-all shadow-md ${
                  isSaving || showCropModal || !!originalPhotoState
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                    : saveMessage?.includes('✅')
                    ? 'bg-green-500 text-white'
                    : 'bg-[#39FF14] text-[#003300] hover:bg-[#66FF44]'
                }`}
              >
                {isSaving ? '⏳ Guardando...' : saveMessage || '💾 Guardar'}
              </button>
              {hasUnsavedChanges && !isSaving && (
                <p className="text-xs font-bebas text-orange-500 animate-pulse">
                  ⚠️ Cambios sin guardar
                </p>
              )}
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bausch text-[#39FF14]">PARTY CLASS</h1>
            <p className="text-xs font-bebas text-[#6B7280]">Página {pageId}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2 mb-1">
              <button
                onClick={() => setZoom((prev) => Math.max(0.4, +(prev - 0.1).toFixed(2)))}
                className="w-6 h-6 rounded border border-[#39FF14] text-[#39FF14] font-bebas leading-none"
              >
                -
              </button>
              <p className="text-sm font-bebas text-[#39FF14] min-w-[58px] text-center">{Math.round(zoom * 100)}%</p>
              <button
                onClick={() => setZoom((prev) => Math.min(3, +(prev + 0.1).toFixed(2)))}
                className="w-6 h-6 rounded border border-[#39FF14] text-[#39FF14] font-bebas leading-none"
              >
                +
              </button>
            </div>
            <p className="text-xs font-bebas text-[#6B7280]">Rueda para zoom</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 md:p-6 overflow-hidden min-h-0">
        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 bg-[#F9FAFB] rounded-lg border-2 border-[#E5E7EB] overflow-hidden"
        >
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            draggable
            onWheel={handleWheel}
            onMouseDown={handleStageMouseDown}
            onMouseUp={handleStageMouseUp}
            scaleX={zoom}
            scaleY={zoom}
          >
            <Layer ref={layerRef}>
              {/* FONDO AZUL completo */}
              <Rect
                name="background"
                x={0}
                y={0}
                width={TOTAL_CANVAS_WIDTH}
                height={TOTAL_CANVAS_HEIGHT}
                fill={borderColor}
              />

              {/* FOTOS encima del fondo azul - CLIPEADAS */}
              <Group
                x={BORDER_SIZE}
                y={BORDER_SIZE}
                clipX={0}
                clipY={0}
                clipWidth={PAGE_WIDTH}
                clipHeight={PAGE_HEIGHT}
              >
                {photos
                  .slice()
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map((photo) => (
                    <PhotoImage
                      key={photo.id}
                      photo={photo}
                      isSelected={photo.id === selectedId}
                      onSelect={() => setSelectedId(photo.id)}
                      onChange={(attrs) => {
                        setPhotos((prev) =>
                          prev.map((p) =>
                            p.id === photo.id ? { ...p, ...attrs } : p
                          )
                        );
                        setHasUnsavedChanges(true);
                      }}
                      onDragEnd={() => {
                        pushHistory(photos);
                        setHasUnsavedChanges(true);
                      }}
                      onTransformEnd={() => {
                        pushHistory(photos);
                        setHasUnsavedChanges(true);
                      }}
                    />
                  ))}
              </Group>

              {/* LÍNEAS DORADAS que dividen según layout */}
              {layoutPositions.length > 1 && (() => {
                // Algoritmo simplificado: generar líneas directamente del layout
                const lines: Array<{type: 'v' | 'h', x: number, y: number, width: number, height: number}> = [];
                
                console.log('🎯 Calculando líneas divisorias:', {
                  BORDER_SIZE,
                  layoutPositions: layoutPositions.map(p => ({x: p.x, y: p.y, w: p.width, h: p.height}))
                });
                
                // Encontrar todas las líneas verticales únicas
                const verticalLines = new Set<number>();
                layoutPositions.forEach(pos => {
                  // Línea a la derecha de cada compartimento (si no está en el borde derecho)
                  const rightEdge = pos.x + pos.width;
                  if (rightEdge < PAGE_WIDTH) {
                    verticalLines.add(rightEdge);
                  }
                });
                
                // Encontrar todas las líneas horizontales únicas
                const horizontalLines = new Set<number>();
                layoutPositions.forEach(pos => {
                  // Línea abajo de cada compartimento (si no está en el borde inferior)
                  const bottomEdge = pos.y + pos.height;
                  if (bottomEdge < PAGE_HEIGHT) {
                    horizontalLines.add(bottomEdge);
                  }
                });
                
                // Crear líneas verticales
                verticalLines.forEach(x => {
                  // Encontrar el rango Y que esta línea debe cubrir
                  let minY = PAGE_HEIGHT;
                  let maxY = 0;
                  
                  layoutPositions.forEach(pos => {
                    // Si esta posición está a la izquierda o derecha de la línea
                    if ((pos.x + pos.width === x) || (pos.x === x + BORDER_SIZE)) {
                      minY = Math.min(minY, pos.y);
                      maxY = Math.max(maxY, pos.y + pos.height);
                    }
                  });
                  
                  if (minY < maxY) {
                    lines.push({
                      type: 'v',
                      x: x,
                      y: minY,
                      width: BORDER_SIZE,
                      height: maxY - minY
                    });
                  }
                });
                
                // Crear líneas horizontales
                horizontalLines.forEach(y => {
                  // Encontrar el rango X que esta línea debe cubrir
                  let minX = PAGE_WIDTH;
                  let maxX = 0;
                  
                  layoutPositions.forEach(pos => {
                    // Si esta posición está arriba o abajo de la línea
                    if ((pos.y + pos.height === y) || (pos.y === y + BORDER_SIZE)) {
                      minX = Math.min(minX, pos.x);
                      maxX = Math.max(maxX, pos.x + pos.width);
                    }
                  });
                  
                  if (minX < maxX) {
                    lines.push({
                      type: 'h',
                      x: minX,
                      y: y,
                      width: maxX - minX,
                      height: BORDER_SIZE
                    });
                  }
                });
                
                console.log('🎯 Líneas generadas:', {
                  verticalLines: Array.from(verticalLines),
                  horizontalLines: Array.from(horizontalLines),
                  totalLines: lines.length,
                  lines: lines.map(l => ({type: l.type, x: l.x, y: l.y, w: l.width, h: l.height}))
                });
                
                return (
                  <Group x={BORDER_SIZE} y={BORDER_SIZE} listening={false}>
                    {lines.map((line, idx) => (
                      <Rect
                        key={`divider-${line.type}-${idx}-${BORDER_SIZE}`}
                        x={line.x}
                        y={line.y}
                        width={line.width}
                        height={line.height}
                        fill={backgroundColor}
                        listening={false}
                      />
                    ))}
                  </Group>
                );
              })()}

              {/* Marco exterior (solo si no es noBorders) */}
              {!noBorders && (
                <Group listening={false}>
                  {/* Borde superior */}
                  <Rect x={0} y={0} width={TOTAL_CANVAS_WIDTH} height={BORDER_SIZE} fill={backgroundColor} />
                  {/* Borde inferior */}
                  <Rect x={0} y={BORDER_SIZE + PAGE_HEIGHT} width={TOTAL_CANVAS_WIDTH} height={BORDER_SIZE} fill={backgroundColor} />
                  {/* Borde izquierdo */}
                  <Rect x={0} y={0} width={BORDER_SIZE} height={TOTAL_CANVAS_HEIGHT} fill={backgroundColor} />
                  {/* Borde derecho */}
                  <Rect x={BORDER_SIZE + PAGE_WIDTH} y={0} width={BORDER_SIZE} height={TOTAL_CANVAS_HEIGHT} fill={backgroundColor} />
                </Group>
              )}
              
              {/* Textos (sin clipping, pueden estar en todo el lienzo) */}
              {texts
                .slice()
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((text) => (
                  <TextElementComponent
                    key={text.id}
                    text={text}
                    isSelected={text.id === selectedId}
                    onSelect={() => setSelectedId(text.id)}
                    onDoubleClick={() => handleOpenEditText(text.id)}
                    onChange={(attrs) => {
                      setTexts((prev) =>
                        prev.map((t) =>
                          t.id === text.id ? { ...t, ...attrs } : t
                        )
                      );
                      setHasUnsavedChanges(true);
                    }}
                    onDragEnd={() => setHasUnsavedChanges(true)}
                    onTransformEnd={() => setHasUnsavedChanges(true)}
                    borderSize={BORDER_SIZE}
                    pageWidth={PAGE_WIDTH}
                    pageHeight={PAGE_HEIGHT}
                  />
                ))}
              
              {/* Stickers (sin clipping, pueden estar en todo el lienzo) */}
              {stickers
                .slice()
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((sticker) => (
                  <StickerElementComponent
                    key={sticker.id}
                    sticker={sticker}
                    isSelected={sticker.id === selectedId}
                    onSelect={() => setSelectedId(sticker.id)}
                    onChange={(attrs) => {
                      setStickers((prev) =>
                        prev.map((s) =>
                          s.id === sticker.id ? { ...s, ...attrs } : s
                        )
                      );
                      setHasUnsavedChanges(true);
                    }}
                    onDragEnd={() => setHasUnsavedChanges(true)}
                    onTransformEnd={() => setHasUnsavedChanges(true)}
                  />
                ))}

              {/* Transformers de FOTOS - fuera del clipping para que siempre sean visibles */}
              {selectedId && photos.map((photo) => 
                photo.id === selectedId ? (
                  <Transformer
                    key={`photo-transformer-${photo.id}`}
                    x={photo.x + BORDER_SIZE}
                    y={photo.y + BORDER_SIZE}
                    width={photo.width}
                    height={photo.height}
                    rotation={photo.rotation}
                    borderStroke="#39FF14"
                    borderStrokeWidth={2}
                    anchorStroke="#39FF14"
                    anchorFill="#FFFFFF"
                    anchorSize={8}
                    rotateAnchorOffset={30}
                    ignoreStroke={true}
                    shouldOverdrawWholeArea={true}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (newBox.width < 5 || newBox.height < 5) {
                        return oldBox;
                      }
                      return newBox;
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      const scaleX = node.scaleX();
                      const scaleY = node.scaleY();

                      // Reset scale
                      node.scaleX(1);
                      node.scaleY(1);

                      const newAttrs = {
                        x: node.x() - BORDER_SIZE,
                        y: node.y() - BORDER_SIZE,
                        width: Math.max(5, photo.width * scaleX),
                        height: Math.max(5, photo.height * scaleY),
                        rotation: node.rotation(),
                      };

                      setPhotos((prev) =>
                        prev.map((p) =>
                          p.id === photo.id ? { ...p, ...newAttrs } : p
                        )
                      );
                      pushHistory(photos);
                      setHasUnsavedChanges(true);
                    }}
                    onDragEnd={(e) => {
                      const newAttrs = {
                        x: e.target.x() - BORDER_SIZE,
                        y: e.target.y() - BORDER_SIZE,
                      };

                      setPhotos((prev) =>
                        prev.map((p) =>
                          p.id === photo.id ? { ...p, ...newAttrs } : p
                        )
                      );
                      pushHistory(photos);
                      setHasUnsavedChanges(true);
                    }}
                  />
                ) : null
              )}
            </Layer>
          </Stage>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 flex flex-col gap-4 max-h-screen overflow-y-auto">
          {/* Upload */}
          <div className="bg-white border-2 border-[#39FF14] rounded-lg p-4">
            <label className="block text-sm font-bebas text-[#003300] mb-3">
              Cargar Imagen
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-600 mt-2">
              {photos.length}/{photoCount} imágenes cargadas
            </p>
          </div>

          {/* Color Customization */}
          <div className="bg-white border-2 border-[#39FF14] rounded-lg p-4">
            <label className="block text-sm font-bebas text-[#003300] mb-3">
              Colores del Canvas
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bebas text-gray-600 mb-1">
                  Color de Bordes (Marcos entre fotos)
                </label>
                <input
                  type="color"
                  value={borderColor}
                  onChange={(e) => {
                    setBorderColor(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-bebas text-gray-600 mb-1">
                  Color de Fondo (Marco exterior)
                </label>
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => {
                    setBackgroundColor(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Controles de Borde */}
          <div className="bg-white border-2 border-[#39FF14] rounded-lg p-4">
            <label className="block text-sm font-bebas text-[#003300] mb-3">
              Configuración de Bordes
            </label>
            <div className="space-y-4">
              {/* Toggle para sin bordes - SIEMPRE DISPONIBLE */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-bebas text-gray-600">
                  Sin Bordes
                </label>
                <button
                  onClick={() => {
                    setNoBorders(!noBorders);
                    setHasUnsavedChanges(true);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    noBorders ? 'bg-[#FF6B6B]' : 'bg-[#39FF14]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      noBorders ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Información para múltiples compartimentos */}
              {photoCount > 1 && !noBorders && (
                <div className="bg-amber-50 border border-amber-200 rounded p-3">
                  <p className="text-xs text-amber-700 font-bebas">
                    ℹ️ MODO MÚLTIPLE ({photoCount} compartimentos)
                  </p>
                  <p className="text-xs text-amber-600">
                    El grosor del borde está optimizado automáticamente para layouts múltiples.
                    Solo puedes quitar bordes completamente o usar el grosor estándar.
                  </p>
                </div>
              )}

              {/* Control de grosor de borde - SOLO PARA PÁGINA INDIVIDUAL */}
              {!noBorders && photoCount === 1 && (
                <div>
                  <label className="block text-xs font-bebas text-gray-600 mb-2">
                    Grosor del Marco: {customBorderSize}px
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={customBorderSize}
                    onChange={(e) => {
                      const newSize = parseInt(e.target.value);
                      setCustomBorderSize(newSize);
                      setHasUnsavedChanges(true);
                    }}
                    style={{
                      background: `linear-gradient(to right, #39FF14 0%, #39FF14 ${(customBorderSize - 5) / 95 * 100}%, #E5E7EB ${(customBorderSize - 5) / 95 * 100}%, #E5E7EB 100%)`
                    }}
                    className="slider w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Fino (5px)</span>
                    <span>Grueso (100px)</span>
                  </div>
                </div>
              )}

              {/* Presets rápidos - SOLO PARA PÁGINA INDIVIDUAL */}
              {!noBorders && photoCount === 1 && (
                <div>
                  <label className="block text-xs font-bebas text-gray-600 mb-2">
                    Presets Rápidos
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => {
                        setCustomBorderSize(10);
                        setNoBorders(false);
                        setHasUnsavedChanges(true);
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-xs font-bebas hover:bg-gray-200 transition-all"
                    >
                      Delgado
                    </button>
                    <button
                      onClick={() => {
                        setCustomBorderSize(30);
                        setNoBorders(false);
                        setHasUnsavedChanges(true);
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-xs font-bebas hover:bg-gray-200 transition-all"
                    >
                      Normal
                    </button>
                    <button
                      onClick={() => {
                        setCustomBorderSize(60);
                        setNoBorders(false);
                        setHasUnsavedChanges(true);
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-xs font-bebas hover:bg-gray-200 transition-all"
                    >
                      Grueso
                    </button>
                  </div>
                </div>
              )}

              {/* Información del lienzo */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-blue-700 font-bebas">
                  📏 LIENZO: {PAGE_WIDTH} × {PAGE_HEIGHT}px (22×30.2cm)
                </p>
                <p className="text-xs text-blue-600">
                  {noBorders ? '⬜ Sin marco exterior' : photoCount > 1 ? `🔲 Marco automático` : `🔲 Con marco: ${customBorderSize}px`}
                </p>
                <p className="text-xs text-blue-500">
                  📐 Total: {TOTAL_CANVAS_WIDTH} × {TOTAL_CANVAS_HEIGHT}px
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border-2 border-[#39FF14] rounded-lg p-4 space-y-2">
            <button
              onClick={handleReset}
              className="w-full flex items-center gap-2 px-4 py-2 bg-[#FF6B6B] text-white rounded-lg font-bebas hover:bg-[#FF5252] transition-all"
            >
              <RotateCw className="w-4 h-4" />
              Reiniciar Lienzo
            </button>

            <button
              onClick={handleDuplicate}
              disabled={!selectedId}
              className="w-full flex items-center gap-2 px-4 py-2 bg-[#39FF14] text-[#003300] rounded-lg font-bebas hover:bg-[#66FF44] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Copy className="w-4 h-4" />
              Duplicar
            </button>

            <button
              onClick={handleCropImage}
              disabled={!selectedId || !photos.find(p => p.id === selectedId)}
              className="w-full flex items-center gap-2 px-4 py-2 bg-[#FFD700] text-[#003300] rounded-lg font-bebas hover:bg-[#FFC107] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Crop className="w-4 h-4" />
              Recortar Imagen
            </button>

            <button
              onClick={handleUndo}
              className="w-full flex items-center gap-2 px-4 py-2 border-2 border-[#39FF14] text-[#39FF14] rounded-lg font-bebas hover:bg-[#39FF14]/10 transition-all"
            >
              <RotateCw className="w-4 h-4" />
              Deshacer
            </button>

            <button
              onClick={handleDelete}
              disabled={!selectedId}
              className="w-full flex items-center gap-2 px-4 py-2 border-2 border-[#FF6B6B] text-[#FF6B6B] rounded-lg font-bebas hover:bg-[#FF6B6B]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
            
            {/* Botones de movimiento con flechas */}
            <div className="flex flex-col gap-1 mt-4">
              <label className="text-xs font-bebas text-[#003300] mb-1">
                Mover Selección
              </label>
              <div className="grid grid-cols-3 gap-1">
                <div></div>
                <button
                  onClick={() => handleMoveSelected('up')}
                  disabled={!selectedId}
                  className="px-2 py-1 bg-[#39FF14] text-[#003300] rounded font-bebas hover:bg-[#66FF44] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ↑
                </button>
                <div></div>
                <button
                  onClick={() => handleMoveSelected('left')}
                  disabled={!selectedId}
                  className="px-2 py-1 bg-[#39FF14] text-[#003300] rounded font-bebas hover:bg-[#66FF44] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ←
                </button>
                <button
                  onClick={() => handleMoveSelected('down')}
                  disabled={!selectedId}
                  className="px-2 py-1 bg-[#39FF14] text-[#003300] rounded font-bebas hover:bg-[#66FF44] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ↓
                </button>
                <button
                  onClick={() => handleMoveSelected('right')}
                  disabled={!selectedId}
                  className="px-2 py-1 bg-[#39FF14] text-[#003300] rounded font-bebas hover:bg-[#66FF44] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  →
                </button>
              </div>
            </div>
            
            {/* Control de Capas (Z-Index) */}
            <div className="flex flex-col gap-1 mt-4">
              <label className="text-xs font-bebas text-[#003300] mb-1">
                Orden de Capas
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleBringToFront}
                  disabled={!selectedId}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-[#39FF14] text-[#003300] rounded font-bebas hover:bg-[#66FF44] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowUp className="w-4 h-4" />
                  Al Frente
                </button>
                <button
                  onClick={handleSendToBack}
                  disabled={!selectedId}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-[#39FF14] text-[#003300] rounded font-bebas hover:bg-[#66FF44] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <ArrowDown className="w-4 h-4" />
                  Al Fondo
                </button>
              </div>
            </div>
          </div>

          {/* Stickers & Text */}
          <div className="bg-white border-2 border-[#39FF14] rounded-lg p-4">
            <label className="block text-sm font-bebas text-[#003300] mb-3">
              Elementos Decorativos
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setShowTextModal(true)}
                className="w-full flex items-center gap-2 px-4 py-2 bg-[#003300] text-white rounded-lg font-bebas hover:bg-[#004400] transition-all"
              >
                <Type className="w-4 h-4" />
                Agregar Texto
              </button>
              <button
                onClick={() => setShowStickerModal(true)}
                className="w-full flex items-center gap-2 px-4 py-2 bg-[#003300] text-white rounded-lg font-bebas hover:bg-[#004400] transition-all"
              >
                <Smile className="w-4 h-4" />
                Agregar Sticker
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-[#F9FAFB] border-2 border-[#E5E7EB] rounded-lg p-4 text-xs font-bebas text-[#6B7280]">
            <p className="mb-2">
              <strong>Página:</strong> {pageId}
            </p>
            <p className="mb-2">
              <strong>Fotos:</strong> {photos.length} | <strong>Textos:</strong> {texts.length} | <strong>Stickers:</strong> {stickers.length}
            </p>
            <p className="mb-2">
              <strong>Tip:</strong> Click para seleccionar, arrastra para mover. Zoom con rueda.
            </p>
            <p>
              <strong>Texto:</strong> Doble click en texto para editar. Usa flechas ↑↓←→ para mover.
            </p>
          </div>
        </div>
      </div>

      {/* Modal de confirmación para salir */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl animate-scaleIn">
            <h3 className="text-xl font-bebas text-[#39FF14] mb-4">
              ¿Deseas guardar los cambios?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Tienes cambios sin guardar. ¿Qué deseas hacer antes de salir?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSaveAndExit}
                className="w-full px-4 py-3 bg-[#39FF14] text-[#003300] rounded-lg font-bebas hover:bg-[#66FF44] transition-all text-lg"
              >
                💾 Guardar y Salir
              </button>
              <button
                onClick={handleExitWithoutSave}
                className="w-full px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-bebas hover:bg-gray-50 transition-all"
              >
                Salir sin Guardar
              </button>
              <button
                onClick={handleCancelExit}
                className="w-full px-4 py-2 border-2 border-[#39FF14] text-[#39FF14] rounded-lg font-bebas hover:bg-[#39FF14] hover:text-[#003300] transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de guardado - Mensaje flotante visible */}
      {saveMessage && (
        <div className="fixed top-24 right-6 z-50 animate-slideInRight">
          <div className={`px-6 py-3 rounded-lg shadow-2xl font-bebas text-lg flex items-center gap-2 ${
            saveMessage?.includes('✅') 
              ? 'bg-green-500 text-white' 
              : saveMessage?.includes('⚠️')
              ? 'bg-yellow-500 text-white'
              : 'bg-red-500 text-white'
          }`}>
            {saveMessage}
          </div>
        </div>
      )}

      {/* Modal de confirmación para reiniciar */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl animate-scaleIn">
            <h3 className="text-xl font-bebas text-[#003300] mb-4">
              ¿Reiniciar Lienzo?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Se perderán todas las imágenes y cambios realizados en esta página. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelReset}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-bebas hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReset}
                className="flex-1 px-4 py-2 bg-[#FF6B6B] text-white rounded-lg font-bebas hover:bg-[#FF5252] transition-all"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar texto */}
      {showTextModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl animate-scaleIn">
            <h3 className="text-xl font-bebas text-[#003300] mb-4">
              Agregar Texto
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bebas text-[#003300] mb-2">
                  Fuente
                </label>
                <select
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                  <option value="Impact">Impact</option>
                  <option value="Bebas Neue">Bebas Neue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bebas text-[#003300] mb-2">
                  Tamaño: {selectedFontSize}px
                </label>
                <input
                  type="range"
                  min="16"
                  max="120"
                  value={selectedFontSize}
                  onChange={(e) => setSelectedFontSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-bebas text-[#003300] mb-2">
                  Color
                </label>
                <input
                  type="color"
                  value={selectedTextColor}
                  onChange={(e) => setSelectedTextColor(e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-bebas text-[#003300] mb-2">
                  Texto
                </label>
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Escribe tu texto aquí..."
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  style={{
                    fontFamily: selectedFont,
                    fontSize: `${Math.min(selectedFontSize, 32)}px`,
                    color: selectedTextColor
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowTextModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-bebas hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddText}
                className="flex-1 px-4 py-2 bg-[#003300] text-white rounded-lg font-bebas hover:bg-[#004400] transition-all"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar texto existente */}
      {showEditTextModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl animate-scaleIn">
            <h3 className="text-xl font-bebas text-[#003300] mb-4">
              Editar Texto
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bebas text-[#003300] mb-2">
                  Fuente
                </label>
                <select
                  value={editFont}
                  onChange={(e) => setEditFont(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Comic Sans MS">Comic Sans MS</option>
                  <option value="Impact">Impact</option>
                  <option value="Bebas Neue">Bebas Neue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bebas text-[#003300] mb-2">
                  Tamaño: {editFontSize}px
                </label>
                <input
                  type="range"
                  min="16"
                  max="120"
                  value={editFontSize}
                  onChange={(e) => setEditFontSize(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-bebas text-[#003300] mb-2">
                  Color
                </label>
                <input
                  type="color"
                  value={editTextColor}
                  onChange={(e) => setEditTextColor(e.target.value)}
                  className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-bebas text-[#003300] mb-2">
                  Texto
                </label>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Escribe tu texto aquí..."
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  style={{
                    fontFamily: editFont,
                    fontSize: `${Math.min(editFontSize, 32)}px`,
                    color: editTextColor
                  }}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditTextModal(false)}
                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-bebas hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditText}
                className="flex-1 px-4 py-2 bg-[#003300] text-white rounded-lg font-bebas hover:bg-[#004400] transition-all"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para agregar stickers */}
      {showStickerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-6 max-w-2xl mx-4 shadow-xl animate-scaleIn">
            <h3 className="text-xl font-bebas text-[#003300] mb-4">
              Seleccionar Sticker
            </h3>
            <div className="grid grid-cols-4 gap-4 mb-6 max-h-96 overflow-y-auto">
              {stickerPaths.map((stickerPath) => (
                <button
                  key={stickerPath}
                  onClick={() => handleAddSticker(stickerPath)}
                  className="flex flex-col items-center gap-2 p-4 border-2 border-gray-200 rounded-lg hover:border-[#39FF14] hover:bg-gray-50 transition-all"
                >
                  <img
                    src={stickerPath}
                    alt="Sticker"
                    className="w-16 h-16 object-contain"
                  />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowStickerModal(false)}
              className="w-full px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-bebas hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de recorte de imagen */}
      {showCropModal && (
        <ImageCropModal
          isOpen={showCropModal}
          onClose={handleCropCancel}
          imageData={cropImageData}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
};
