import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect, Circle, Line, Text } from 'react-konva';
import Konva from 'konva';
import { X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageData: string;
  onCropComplete: (croppedImageData: string, cropInfo: CropInfo) => void;
  aspectRatio?: number; // width/height ratio, undefined for free crop
  initialCropArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface CropInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  canvasWidth: number;
  canvasHeight: number;
  sourceWidth: number;
  sourceHeight: number;
}

export type { CropInfo };

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

type CropShape = 'rectangle' | 'circle' | 'triangle';

const useImageLoader = (src: string): [HTMLImageElement | null] => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => setImage(img);
    img.crossOrigin = 'anonymous';
    img.src = src;
  }, [src]);

  return [image];
};

// Preset aspect ratios comunes para fotobooks
const ASPECT_RATIOS = [
  { name: 'Libre', value: undefined },
  { name: '1:1', value: 1 },
  { name: '4:3', value: 4/3 },
  { name: '3:2', value: 3/2 },
  { name: '16:9', value: 16/9 },
];

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageData,
  onCropComplete,
  aspectRatio: initialAspectRatio,
  initialCropArea,
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const imageRef = useRef<Konva.Image>(null);
  const [image] = useImageLoader(imageData);
  
  // Estados para el crop
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [aspectRatio, setAspectRatio] = useState<number | undefined>(initialAspectRatio);
  const [cropShape, setCropShape] = useState<CropShape>('rectangle');

  
  // Dimensiones del stage
  const STAGE_WIDTH = 600;
  const STAGE_HEIGHT = 400;

  // Inicializar cuando la imagen se carga
  useEffect(() => {
    if (!image) return;

    // Calcular scale inicial para que la imagen entre en el stage
    const scaleX = (STAGE_WIDTH * 0.8) / image.width;
    const scaleY = (STAGE_HEIGHT * 0.8) / image.height;
    const initialScale = Math.min(scaleX, scaleY);
    
    setImageScale(initialScale);
    
    // Centrar imagen
    const imageWidth = image.width * initialScale;
    const imageHeight = image.height * initialScale;
    setImagePosition({
      x: (STAGE_WIDTH - imageWidth) / 2,
      y: (STAGE_HEIGHT - imageHeight) / 2,
    });

    // Configurar área de crop inicial
    if (initialCropArea) {
      setCropArea(initialCropArea);
    } else {
      const cropWidth = Math.min(200, imageWidth * 0.6);
      const cropHeight = aspectRatio ? cropWidth / aspectRatio : Math.min(200, imageHeight * 0.6);
      
      setCropArea({
        x: (STAGE_WIDTH - cropWidth) / 2,
        y: (STAGE_HEIGHT - cropHeight) / 2,
        width: cropWidth,
        height: cropHeight,
      });
    }
  }, [image, aspectRatio, initialCropArea]);

  // Manejar zoom con rueda del mouse
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage || !image) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.02;
    const oldScale = imageScale;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    
    // Limitar zoom
    const minScale = 0.1;
    const maxScale = 5;
    const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
    
    setImageScale(clampedScale);

    // Ajustar posición para zoom hacia el cursor
    const mousePointTo = {
      x: (pointer.x - imagePosition.x) / oldScale,
      y: (pointer.y - imagePosition.y) / oldScale,
    };

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };
    
    setImagePosition(newPos);
  }, [imageScale, imagePosition, image]);

  // Rotar imagen
  const handleRotate = useCallback((degrees: number) => {
    setImageRotation((prev) => (prev + degrees + 360) % 360);
  }, []);

  // Obtener puntos del triángulo rectángulo
  const getTrianglePoints = useCallback((area: CropArea): number[] => {
    return [
      area.x, area.y,
      area.x + area.width, area.y,
      area.x, area.y + area.height,
    ];
  }, []);

  // Aplicar aspect ratio al crop area
  const applyCropAspectRatio = useCallback((newCropArea: CropArea, ratio?: number) => {
    if (!ratio) return newCropArea;

    const currentRatio = newCropArea.width / newCropArea.height;
    
    if (Math.abs(currentRatio - ratio) < 0.01) {
      return newCropArea; // Ya está en el ratio correcto
    }

    // Ajustar altura basada en ancho
    const newHeight = newCropArea.width / ratio;
    
    // Si la nueva altura excede límites, ajustar por ancho
    if (newCropArea.y + newHeight > STAGE_HEIGHT) {
      const maxHeight = STAGE_HEIGHT - newCropArea.y;
      const newWidth = maxHeight * ratio;
      
      return {
        ...newCropArea,
        width: newWidth,
        height: maxHeight,
      };
    }
    
    return {
      ...newCropArea,
      height: newHeight,
    };
  }, []);


  // Generar imagen recortada
  const handleCrop = useCallback(async () => {
    if (!image || !stageRef.current || !imageRef.current) return;

    try {
      // Crear canvas temporal para el crop
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Guardar estado del contexto antes de aplicar clip
      ctx.save();

      // Mapeo preciso del rectángulo de crop al espacio original de la imagen,
      // respetando traslación, escala y rotación del nodo Konva.
      const imageNode = imageRef.current;
      const inverse = imageNode.getAbsoluteTransform().copy().invert();

      const topLeft = inverse.point({ x: cropArea.x, y: cropArea.y });
      const topRight = inverse.point({ x: cropArea.x + cropArea.width, y: cropArea.y });
      const bottomLeft = inverse.point({ x: cropArea.x, y: cropArea.y + cropArea.height });
      const bottomRight = inverse.point({ x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height });

      const minX = Math.min(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
      const maxX = Math.max(topLeft.x, topRight.x, bottomLeft.x, bottomRight.x);
      const minY = Math.min(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);
      const maxY = Math.max(topLeft.y, topRight.y, bottomLeft.y, bottomRight.y);

      // Las coordenadas locales del nodo están en tamaño renderizado (image.width * imageScale),
      // por eso convertimos a píxeles reales de la imagen fuente.
      const scaleToSourceX = image.width / (image.width * imageScale);
      const scaleToSourceY = image.height / (image.height * imageScale);

      const sourceMinX = minX * scaleToSourceX;
      const sourceMaxX = maxX * scaleToSourceX;
      const sourceMinY = minY * scaleToSourceY;
      const sourceMaxY = maxY * scaleToSourceY;

      // Recortar contra límites reales de la imagen base
      const cropX = Math.max(0, Math.floor(sourceMinX));
      const cropY = Math.max(0, Math.floor(sourceMinY));
      const cropMaxX = Math.min(image.width, Math.ceil(sourceMaxX));
      const cropMaxY = Math.min(image.height, Math.ceil(sourceMaxY));
      const cropW = Math.max(1, cropMaxX - cropX);
      const cropH = Math.max(1, cropMaxY - cropY);

      if (cropW <= 1 || cropH <= 1) {
        console.warn('Área de crop inválida o fuera de la imagen');
        return;
      }
      
      // Configurar canvas con las dimensiones del área recortada
      canvas.width = cropW;
      canvas.height = cropH;
      
      // Limpiar canvas con transparencia
      ctx.clearRect(0, 0, cropW, cropH);
      
      // Aplicar clip path según la forma seleccionada
      if (cropShape === 'circle') {
        // Clip circular
        const centerX = cropW / 2;
        const centerY = cropH / 2;
        const radius = Math.min(cropW, cropH) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
      } else if (cropShape === 'triangle') {
        // Clip triangular rectángulo (ángulo recto en esquina superior izquierda)
        ctx.beginPath();
        ctx.moveTo(0, 0); // Esquina superior izquierda
        ctx.lineTo(cropW, 0); // Esquina superior derecha
        ctx.lineTo(0, cropH); // Esquina inferior izquierda
        ctx.closePath();
        ctx.clip();
      }
      // Para 'rectangle' no aplicamos clip, dibujamos normal
      
      // Dibujar la parte recortada de la imagen
      ctx.drawImage(
        image,
        cropX, cropY, cropW, cropH, // Área de la imagen original
        0, 0, cropW, cropH // Destino en el canvas
      );
      
      // Restaurar contexto
      ctx.restore();
      
      // Convertir a base64 con PNG para soportar transparencia
      const croppedDataUrl = canvas.toDataURL('image/png');
      
      // Información del crop
      const cropInfo: CropInfo = {
        x: cropX,
        y: cropY,
        width: cropW,
        height: cropH,
        scale: imageScale,
        rotation: imageRotation,
        canvasWidth: cropW,
        canvasHeight: cropH,
        sourceWidth: image.width,
        sourceHeight: image.height,
      };
      
      onCropComplete(croppedDataUrl, cropInfo);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  }, [image, cropArea, imageScale, imageRotation, cropShape, onCropComplete]);

  if (!image) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full max-h-[90vh] bg-white text-gray-800 overflow-hidden rounded-lg shadow-lg border border-gray-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            Recortar Imagen
            </h2>
            <p className="text-gray-600 text-sm">Selecciona área de recorte</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Controles */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-4">
          {/* Selector de forma */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700 min-w-[60px]">
              Forma:
            </span>
            <div className="flex gap-2">
              <Button
                variant={cropShape === 'rectangle' ? 'primary' : 'secondary'}
                onClick={() => setCropShape('rectangle')}
                className={`${cropShape === 'rectangle' 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'} 
                  px-3 py-2 rounded-lg transition-colors`}
              >
                ▢ Rectangular
              </Button>
              <Button
                variant={cropShape === 'circle' ? 'primary' : 'secondary'}
                onClick={() => {
                  setCropShape('circle');
                  setCropArea(prev => {
                    const size = Math.min(prev.width, prev.height);
                    return {
                      x: prev.x + (prev.width - size) / 2,
                      y: prev.y + (prev.height - size) / 2,
                      width: size,
                      height: size,
                    };
                  });
                  setAspectRatio(1);
                }}
                className={`${cropShape === 'circle' 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'} 
                  px-3 py-2 rounded-lg transition-colors`}
              >
                ● Circular
              </Button>
              <Button
                variant={cropShape === 'triangle' ? 'primary' : 'secondary'}
                onClick={() => setCropShape('triangle')}
                className={`${cropShape === 'triangle' 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'} 
                  px-3 py-2 rounded-lg transition-colors`}
              >
                ▲ Triangular
              </Button>
            </div>
          </div>


          
          {/* Controles de rotación */}
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700 min-w-[60px]">
              Rotar:
            </span>
            <div className="flex gap-2 items-center">
              <Button
                variant="secondary"
                onClick={() => handleRotate(-90)}
                title="Rotar 90° izq"
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-2 rounded-lg transition-colors"
              >
                ↺ 90°
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleRotate(90)}
                title="Rotar 90° der"
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 py-2 rounded-lg transition-colors"
              >
                ↻ 90°
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleRotate(45)}
                title="Rotar 45° der"
                className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-2 py-2 rounded-lg transition-colors"
              >
                45°
              </Button>
              <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-300">
                <input
                  type="number"
                  value={imageRotation}
                  onChange={(e) => setImageRotation(parseInt(e.target.value) || 0)}
                  min="0"
                  max="360"
                  className="w-16 px-2 py-1 bg-white border border-gray-200 rounded-md text-sm text-gray-700 focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all"
                  placeholder="0°"
                />
                <span className="text-xs text-gray-500">°</span>
              </div>
            </div>
          </div>
          
          {/* Selector de proporción - solo para rectangulares */}
          {cropShape === 'rectangle' && (
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700 min-w-[60px]">
                Proporción:
              </span>
              <div className="flex gap-2 flex-wrap">
                {ASPECT_RATIOS.map((ratio) => (
                  <Button
                    key={ratio.name}
                    variant={aspectRatio === ratio.value ? 'primary' : 'secondary'}
                    onClick={() => {
                      setAspectRatio(ratio.value);
                      setCropArea(prev => applyCropAspectRatio(prev, ratio.value));
                    }}
                    className={`${
                      aspectRatio === ratio.value 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
                    } transition-colors px-3 py-2 rounded-lg`}
                  >
                    {ratio.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Editor de crop */}
        <div className="flex-1 flex items-center justify-center p-6 bg-gray-100">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <Stage
                ref={stageRef}
                width={STAGE_WIDTH}
                height={STAGE_HEIGHT}
                onWheel={handleWheel}
                className="border border-gray-300 bg-white rounded-lg overflow-hidden"
              >
              <Layer>
                {/* Imagen de fondo */}
                <KonvaImage
                  ref={imageRef}
                  image={image}
                  x={imagePosition.x + (image.width * imageScale) / 2}
                  y={imagePosition.y + (image.height * imageScale) / 2}
                  width={image.width * imageScale}
                  height={image.height * imageScale}
                  offsetX={(image.width * imageScale) / 2}
                  offsetY={(image.height * imageScale) / 2}
                  rotation={imageRotation}
                  draggable
                  onDragEnd={(e) => {
                    setImagePosition({ 
                      x: e.target.x() - (image.width * imageScale) / 2, 
                      y: e.target.y() - (image.height * imageScale) / 2 
                    });
                  }}
                />
              </Layer>
              
              <Layer>
                {/* Overlay oscuro para toda el área */}
                <Rect
                  width={STAGE_WIDTH}
                  height={STAGE_HEIGHT}
                  fill="black"
                  opacity={0.6}
                />
                
                {/* Área transparente para mostrar la imagen debajo según la forma */}
                {cropShape === 'rectangle' && (
                  <Rect
                    x={cropArea.x}
                    y={cropArea.y}
                    width={cropArea.width}
                    height={cropArea.height}
                    fill="black"
                    opacity={1}
                    globalCompositeOperation="destination-out"
                  />
                )}
                {cropShape === 'circle' && (
                  <Circle
                    x={cropArea.x + cropArea.width / 2}
                    y={cropArea.y + cropArea.height / 2}
                    radius={Math.min(cropArea.width, cropArea.height) / 2}
                    fill="black"
                    opacity={1}
                    globalCompositeOperation="destination-out"
                  />
                )}
                {cropShape === 'triangle' && (
                  <Line
                    points={getTrianglePoints(cropArea)}
                    closed={true}
                    fill="black"
                    opacity={1}
                    globalCompositeOperation="destination-out"
                  />
                )}
                
                {/* Bordes del área de crop según la forma */}
                {cropShape === 'rectangle' && (
                  <Rect
                    x={cropArea.x}
                    y={cropArea.y}
                    width={cropArea.width}
                    height={cropArea.height}
                    stroke="#39FF14"
                    strokeWidth={2}
                    dash={[5, 5]}
                    fill="transparent"
                    draggable
                    onDragStart={(e) => {
                      e.target.setAttr('dragStartX', cropArea.x);
                      e.target.setAttr('dragStartY', cropArea.y);
                    }}
                    onDragMove={(e) => {
                      const dragStartX = e.target.getAttr('dragStartX');
                      const dragStartY = e.target.getAttr('dragStartY');
                      const deltaX = e.target.x() - dragStartX;
                      const deltaY = e.target.y() - dragStartY;
                      const newX = Math.max(0, Math.min(STAGE_WIDTH - cropArea.width, dragStartX + deltaX));
                      const newY = Math.max(0, Math.min(STAGE_HEIGHT - cropArea.height, dragStartY + deltaY));
                      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
                      e.target.x(newX);
                      e.target.y(newY);
                    }}
                  />
                )}
                {cropShape === 'circle' && (
                  <Circle
                    x={cropArea.x + cropArea.width / 2}
                    y={cropArea.y + cropArea.height / 2}
                    radius={Math.min(cropArea.width, cropArea.height) / 2}
                    stroke="#39FF14"
                    strokeWidth={2}
                    dash={[5, 5]}
                    fill="transparent"
                    draggable
                    onDragStart={(e) => {
                      e.target.setAttr('dragStartCenterX', cropArea.x + cropArea.width / 2);
                      e.target.setAttr('dragStartCenterY', cropArea.y + cropArea.height / 2);
                    }}
                    onDragMove={(e) => {
                      const dragStartCenterX = e.target.getAttr('dragStartCenterX');
                      const dragStartCenterY = e.target.getAttr('dragStartCenterY');
                      const radius = Math.min(cropArea.width, cropArea.height) / 2;
                      const deltaX = e.target.x() - dragStartCenterX;
                      const deltaY = e.target.y() - dragStartCenterY;
                      const newCenterX = dragStartCenterX + deltaX;
                      const newCenterY = dragStartCenterY + deltaY;
                      const newX = Math.max(0, Math.min(STAGE_WIDTH - radius * 2, newCenterX - radius));
                      const newY = Math.max(0, Math.min(STAGE_HEIGHT - radius * 2, newCenterY - radius));
                      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
                      e.target.x(newX + radius);
                      e.target.y(newY + radius);
                    }}
                  />
                )}
                {cropShape === 'triangle' && (
                  <Line
                    x={cropArea.x}
                    y={cropArea.y}
                    points={[0, 0, cropArea.width, 0, 0, cropArea.height]}
                    closed={true}
                    stroke="#39FF14"
                    strokeWidth={2}
                    dash={[5, 5]}
                    fill="transparent"
                    draggable
                    onDragMove={(e) => {
                      const currentX = e.target.x();
                      const currentY = e.target.y();
                      const newX = Math.max(0, Math.min(STAGE_WIDTH - cropArea.width, currentX));
                      const newY = Math.max(0, Math.min(STAGE_HEIGHT - cropArea.height, currentY));
                      setCropArea(prev => ({ ...prev, x: newX, y: newY }));
                      e.target.x(newX);
                      e.target.y(newY);
                    }}
                  />
                )}
                
                {/* Esquinas de resize para rectángulo */}
                {cropShape === 'rectangle' && [
                  { x: cropArea.x, y: cropArea.y, cursor: 'nw-resize', corner: 'tl' },
                  { x: cropArea.x + cropArea.width, y: cropArea.y, cursor: 'ne-resize', corner: 'tr' },
                  { x: cropArea.x, y: cropArea.y + cropArea.height, cursor: 'sw-resize', corner: 'bl' },
                  { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height, cursor: 'se-resize', corner: 'br' },
                ].map((handle, index) => {
                  const cornerType = handle.corner;
                  
                  return (
                    <Rect
                      key={index}
                      x={handle.x - 5}
                      y={handle.y - 5}
                      width={10}
                      height={10}
                      fill="#39FF14"
                      stroke="white"
                      strokeWidth={2}
                      draggable
                      onDragMove={(e) => {
                        const newX = e.target.x() + 5;
                        const newY = e.target.y() + 5;
                        let newCropArea = { ...cropArea };
                        
                        // Calcular nuevas dimensiones basadas en la esquina que se arrastra
                        if (cornerType === 'tl') {
                          newCropArea.width = Math.max(50, cropArea.x + cropArea.width - newX);
                          newCropArea.height = Math.max(50, cropArea.y + cropArea.height - newY);
                          newCropArea.x = Math.min(newX, cropArea.x + cropArea.width - 50);
                          newCropArea.y = Math.min(newY, cropArea.y + cropArea.height - 50);
                        } else if (cornerType === 'tr') {
                          newCropArea.width = Math.max(50, newX - cropArea.x);
                          newCropArea.height = Math.max(50, cropArea.y + cropArea.height - newY);
                          newCropArea.y = Math.min(newY, cropArea.y + cropArea.height - 50);
                        } else if (cornerType === 'bl') {
                          newCropArea.width = Math.max(50, cropArea.x + cropArea.width - newX);
                          newCropArea.height = Math.max(50, newY - cropArea.y);
                          newCropArea.x = Math.min(newX, cropArea.x + cropArea.width - 50);
                        } else if (cornerType === 'br') {
                          newCropArea.width = Math.max(50, newX - cropArea.x);
                          newCropArea.height = Math.max(50, newY - cropArea.y);
                        }
                        
                        // Limitar al área del stage
                        newCropArea.x = Math.max(0, Math.min(STAGE_WIDTH - newCropArea.width, newCropArea.x));
                        newCropArea.y = Math.max(0, Math.min(STAGE_HEIGHT - newCropArea.height, newCropArea.y));
                        newCropArea.width = Math.min(newCropArea.width, STAGE_WIDTH - newCropArea.x);
                        newCropArea.height = Math.min(newCropArea.height, STAGE_HEIGHT - newCropArea.y);
                        
                        // Aplicar aspect ratio si está definido
                        if (aspectRatio) {
                          const currentRatio = newCropArea.width / newCropArea.height;
                          if (Math.abs(currentRatio - aspectRatio) > 0.1) {
                            if (currentRatio > aspectRatio) {
                              newCropArea.height = newCropArea.width / aspectRatio;
                            } else {
                              newCropArea.width = newCropArea.height * aspectRatio;
                            }
                          }
                        }
                        
                        setCropArea(newCropArea);
                      }}
                      onDragEnd={() => {
                        // Resetear posición del handle para evitar acumulación
                      }}
                    />
                  );
                })}
                
                {/* Handles de resize para círculo */}
                {cropShape === 'circle' && [
                  { x: cropArea.x + cropArea.width / 2, y: cropArea.y, pos: 'top' }, // Top
                  { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height / 2, pos: 'right' }, // Right
                  { x: cropArea.x + cropArea.width / 2, y: cropArea.y + cropArea.height, pos: 'bottom' }, // Bottom
                  { x: cropArea.x, y: cropArea.y + cropArea.height / 2, pos: 'left' }, // Left
                ].map((handle, index) => {
                  const centerX = cropArea.x + cropArea.width / 2;
                  const centerY = cropArea.y + cropArea.height / 2;
                  
                  return (
                    <Rect
                      key={index}
                      x={handle.x - 5}
                      y={handle.y - 5}
                      width={10}
                      height={10}
                      fill="#39FF14"
                      stroke="white"
                      strokeWidth={2}
                      draggable
                      onDragMove={(e) => {
                        const node = e.target;
                        const handleX = node.x() + 5;
                        const handleY = node.y() + 5;
                        
                        // Calcular distancia desde el centro al nodo actual
                        const dx = handleX - centerX;
                        const dy = handleY - centerY;
                        const newRadius = Math.sqrt(dx * dx + dy * dy);
                        const newSize = Math.max(50, newRadius * 2);
                        
                        // Limitar al área visible del stage
                        const maxRadius = Math.min(
                          centerX,
                          centerY,
                          STAGE_WIDTH - centerX,
                          STAGE_HEIGHT - centerY
                        );
                        const clampedSize = Math.min(newSize, maxRadius * 2);
                        
                        const newCropArea = {
                          x: centerX - clampedSize / 2,
                          y: centerY - clampedSize / 2,
                          width: clampedSize,
                          height: clampedSize,
                        };
                        
                        // Repositionar el nodo en su punto cardinal correcto
                        const newCenterX = newCropArea.x + newCropArea.width / 2;
                        const newCenterY = newCropArea.y + newCropArea.height / 2;
                        
                        if (handle.pos === 'top') {
                          node.x(newCenterX - 5);
                          node.y(newCropArea.y - 5);
                        } else if (handle.pos === 'right') {
                          node.x(newCropArea.x + newCropArea.width - 5);
                          node.y(newCenterY - 5);
                        } else if (handle.pos === 'bottom') {
                          node.x(newCenterX - 5);
                          node.y(newCropArea.y + newCropArea.height - 5);
                        } else if (handle.pos === 'left') {
                          node.x(newCropArea.x - 5);
                          node.y(newCenterY - 5);
                        }
                        
                        setCropArea(newCropArea);
                      }}
                    />
                  );
                })}
                
                {/* Handles de resize para triángulo (en los 3 vértices) */}
                {cropShape === 'triangle' && [
                  { x: cropArea.x, y: cropArea.y, corner: 'tl' },
                  { x: cropArea.x + cropArea.width, y: cropArea.y, corner: 'tr' },
                  { x: cropArea.x, y: cropArea.y + cropArea.height, corner: 'bl' },
                ].map((handle, index) => {
                  const cornerType = handle.corner;
                  
                  return (
                    <Rect
                      key={index}
                      x={handle.x - 5}
                      y={handle.y - 5}
                      width={10}
                      height={10}
                      fill="#39FF14"
                      stroke="white"
                      strokeWidth={2}
                      draggable
                      onDragMove={(e) => {
                        const pointerX = e.target.x() + 5;
                        const pointerY = e.target.y() + 5;

                        setCropArea((prev) => {
                          const oldRight = prev.x + prev.width;
                          const oldBottom = prev.y + prev.height;
                          let next = { ...prev };

                          if (cornerType === 'tl') {
                            const clampedX = Math.max(0, Math.min(oldRight - 50, pointerX));
                            const clampedY = Math.max(0, Math.min(oldBottom - 50, pointerY));
                            next.x = clampedX;
                            next.y = clampedY;
                            next.width = oldRight - clampedX;
                            next.height = oldBottom - clampedY;
                          } else if (cornerType === 'tr') {
                            const clampedX = Math.max(prev.x + 50, Math.min(STAGE_WIDTH, pointerX));
                            const clampedY = Math.max(0, Math.min(oldBottom - 50, pointerY));
                            next.y = clampedY;
                            next.width = clampedX - prev.x;
                            next.height = oldBottom - clampedY;
                          } else if (cornerType === 'bl') {
                            const clampedX = Math.max(0, Math.min(oldRight - 50, pointerX));
                            const clampedY = Math.max(prev.y + 50, Math.min(STAGE_HEIGHT, pointerY));
                            next.x = clampedX;
                            next.width = oldRight - clampedX;
                            next.height = clampedY - prev.y;
                          }

                          // Guardas finales para mantener área válida dentro del stage.
                          next.x = Math.max(0, Math.min(STAGE_WIDTH - 50, next.x));
                          next.y = Math.max(0, Math.min(STAGE_HEIGHT - 50, next.y));
                          next.width = Math.max(50, Math.min(next.width, STAGE_WIDTH - next.x));
                          next.height = Math.max(50, Math.min(next.height, STAGE_HEIGHT - next.y));

                          return next;
                        });
                      }}
                    />
                  );
                })}
                
                {/* Instrucciones actualizadas */}
                <Rect
                  x={10}
                  y={STAGE_HEIGHT - 40}
                  width={STAGE_WIDTH - 20}
                  height={35}
                  fill="black"
                  opacity={0.8}
                  cornerRadius={12}
                  stroke="#4F46E5"
                  strokeWidth={1}
                />
                <Text
                  x={STAGE_WIDTH / 2}
                  y={STAGE_HEIGHT - 20}
                  text="🖱️ Arrastra para mover • 🔍 Rueda del mouse para zoom • ⬜ Nodos verdes para redimensionar • ✨ Disfruta creando"
                  fontSize={11}
                  fontFamily="Arial, sans-serif"
                  fontStyle="bold"
                  fill="white"
                  align="center"
                  offsetX={340}
                />
              </Layer>
            </Stage>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 bg-white">
          <Button 
            variant="secondary" 
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors border border-gray-300"
          >
            ✕ Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCrop}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ✓ Aplicar Recorte
          </Button>
        </div>
      </div>
    </Modal>
  );
};
