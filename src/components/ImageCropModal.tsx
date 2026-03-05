import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';
import Konva from 'konva';
import { X, RotateCw, RotateCcw, Square, Maximize2 } from 'lucide-react';
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
}

export type { CropInfo };

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  { name: 'Libre', value: undefined, icon: Maximize2 },
  { name: '1:1', value: 1, icon: Square },
  { name: '4:3', value: 4/3, icon: Square },
  { name: '3:2', value: 3/2, icon: Square },
  { name: '16:9', value: 16/9, icon: Square },
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
    setImageRotation((prev) => prev + degrees);
  }, []);

  // Reset zoom y posición
  const handleReset = useCallback(() => {
    if (!image) return;
    
    const scaleX = (STAGE_WIDTH * 0.8) / image.width;
    const scaleY = (STAGE_HEIGHT * 0.8) / image.height;
    const resetScale = Math.min(scaleX, scaleY);
    
    setImageScale(resetScale);
    setImageRotation(0);
    
    const imageWidth = image.width * resetScale;
    const imageHeight = image.height * resetScale;
    setImagePosition({
      x: (STAGE_WIDTH - imageWidth) / 2,
      y: (STAGE_HEIGHT - imageHeight) / 2,
    });
  }, [image]);

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
      
      // Dibujar la parte recortada de la imagen
      ctx.drawImage(
        image,
        cropX, cropY, cropW, cropH, // Área de la imagen original
        0, 0, cropW, cropH // Destino en el canvas
      );
      
      // Convertir a base64
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
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
      };
      
      onCropComplete(croppedDataUrl, cropInfo);
    } catch (error) {
      console.error('Error cropping image:', error);
    }
  }, [image, cropArea, imageScale, imageRotation, onCropComplete]);

  if (!image) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col h-full max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Recortar Imagen</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Controles */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Proporción:</span>
            {ASPECT_RATIOS.map((ratio) => (
              <Button
                key={ratio.name}
                variant={aspectRatio === ratio.value ? 'primary' : 'secondary'}
                onClick={() => {
                  setAspectRatio(ratio.value);
                  setCropArea(prev => applyCropAspectRatio(prev, ratio.value));
                }}
              >
                {ratio.name}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              onClick={() => handleRotate(-90)}
            >
              <RotateCcw size={16} />
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleRotate(90)}
            >
              <RotateCw size={16} />
            </Button>
            <Button
              variant="secondary"
              onClick={handleReset}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Editor de crop */}
        <div className="flex-1 flex items-center justify-center p-4 bg-gray-900">
          <div className="relative">
            <Stage
              ref={stageRef}
              width={STAGE_WIDTH}
              height={STAGE_HEIGHT}
              onWheel={handleWheel}
              className="border border-gray-300 bg-white rounded"
            >
              <Layer>
                {/* Imagen de fondo */}
                <KonvaImage
                  ref={imageRef}
                  image={image}
                  x={imagePosition.x}
                  y={imagePosition.y}
                  width={image.width * imageScale}
                  height={image.height * imageScale}
                  rotation={imageRotation}
                  draggable
                  onDragEnd={(e) => {
                    setImagePosition({ x: e.target.x(), y: e.target.y() });
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
                
                {/* Área transparente para mostrar la imagen debajo */}
                <Rect
                  x={cropArea.x}
                  y={cropArea.y}
                  width={cropArea.width}
                  height={cropArea.height}
                  fill="black"
                  opacity={1}
                  globalCompositeOperation="destination-out"
                />
                
                {/* Bordes del área de crop */}
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
                  onDragMove={(e) => {
                    const newX = Math.max(0, Math.min(STAGE_WIDTH - cropArea.width, e.target.x()));
                    const newY = Math.max(0, Math.min(STAGE_HEIGHT - cropArea.height, e.target.y()));
                    setCropArea(prev => ({ ...prev, x: newX, y: newY }));
                  }}
                  onDragEnd={(e) => {
                    const newX = Math.max(0, Math.min(STAGE_WIDTH - cropArea.width, e.target.x()));
                    const newY = Math.max(0, Math.min(STAGE_HEIGHT - cropArea.height, e.target.y()));
                    setCropArea(prev => ({ ...prev, x: newX, y: newY }));
                  }}
                />
                
                {/* Esquinas de resize */}
                {[
                  { x: cropArea.x, y: cropArea.y, cursor: 'nw-resize', corner: 'tl' },
                  { x: cropArea.x + cropArea.width, y: cropArea.y, cursor: 'ne-resize', corner: 'tr' },
                  { x: cropArea.x, y: cropArea.y + cropArea.height, cursor: 'sw-resize', corner: 'bl' },
                  { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height, cursor: 'se-resize', corner: 'br' },
                ].map((handle, index) => (
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
                      if (handle.corner === 'tl') {
                        newCropArea.width = Math.max(50, cropArea.x + cropArea.width - newX);
                        newCropArea.height = Math.max(50, cropArea.y + cropArea.height - newY);
                        newCropArea.x = Math.min(newX, cropArea.x + cropArea.width - 50);
                        newCropArea.y = Math.min(newY, cropArea.y + cropArea.height - 50);
                      } else if (handle.corner === 'tr') {
                        newCropArea.width = Math.max(50, newX - cropArea.x);
                        newCropArea.height = Math.max(50, cropArea.y + cropArea.height - newY);
                        newCropArea.y = Math.min(newY, cropArea.y + cropArea.height - 50);
                      } else if (handle.corner === 'bl') {
                        newCropArea.width = Math.max(50, cropArea.x + cropArea.width - newX);
                        newCropArea.height = Math.max(50, newY - cropArea.y);
                        newCropArea.x = Math.min(newX, cropArea.x + cropArea.width - 50);
                      } else if (handle.corner === 'br') {
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
                ))}
                
              </Layer>
            </Stage>
            
            {/* Instrucciones */}
            <div className="absolute bottom-2 left-2 right-2 text-center">
              <p className="text-xs text-gray-400">
                Arrastra para mover • Rueda del mouse para zoom • Esquinas verdes para redimensionar
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-4 border-t">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleCrop}>
            Aplicar Recorte
          </Button>
        </div>
      </div>
    </Modal>
  );
};