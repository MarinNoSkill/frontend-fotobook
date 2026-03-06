import React, { useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { getLayoutsForCount, getBorderWidth } from '../utils/photoLayouts';

interface PhotoCountSelectorProps {
  onSelect: (count: number, layoutId: string) => void;
  onClose: () => void;
}

export { type LayoutOption } from '../utils/photoLayouts';

export const PhotoCountSelector: React.FC<PhotoCountSelectorProps> = ({ onSelect, onClose }) => {
  const [selectedCount, setSelectedCount] = useState<number | null>(null);

  const presetCounts = [1, 2, 3, 4, 6, 8, 9, 12, 16, 18, 20, 25, 30, 42];
  
  const PAGE_WIDTH = 831;
  const PAGE_HEIGHT = 1141;

  const handleCountSelect = (count: number) => {
    setSelectedCount(count);
    const borderWidth = getBorderWidth(count);
    const layouts = getLayoutsForCount(count, borderWidth);
    if (layouts.length === 1) {
      // Si solo hay un layout, seleccionarlo automáticamente
      onSelect(count, layouts[0].id);
      onClose();
    }
  };

  const handleLayoutSelect = (layoutId: string) => {
    if (selectedCount) {
      onSelect(selectedCount, layoutId);
      onClose();
    }
  };

  const handleBack = () => {
    setSelectedCount(null);
  };

  const BORDER_SIZE = selectedCount ? getBorderWidth(selectedCount) : 37.8;
  const currentLayouts = selectedCount ? getLayoutsForCount(selectedCount, BORDER_SIZE) : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 border-2 border-[#39FF14]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {selectedCount && (
              <button
                onClick={handleBack}
                className="p-1 hover:bg-[#F9FAFB] rounded-lg transition-all"
              >
                <ChevronLeft className="w-5 h-5 text-[#39FF14]" />
              </button>
            )}
            <h2 className="text-2xl font-bausch text-[#39FF14]">
              {selectedCount ? `${selectedCount} Fotos - Elige diseño` : 'Fotos por Página'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F9FAFB] rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-[#6B7280]" />
          </button>
        </div>

        {!selectedCount ? (
          /* Paso 1: Seleccionar cantidad */
          <div>
            <p className="text-sm text-[#6B7280] font-bebas mb-6">
              Selecciona cuántas fotos quieres en esta página (1-42)
            </p>

            <div className="grid grid-cols-4 gap-3">
              {presetCounts.map((count) => (
                <button
                  key={count}
                  onClick={() => handleCountSelect(count)}
                  className="py-3 px-4 rounded-lg font-bebas text-lg transition-all border-2 border-[#39FF14] bg-[#39FF14]/10 text-[#39FF14] hover:bg-[#39FF14] hover:text-[#003300]"
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Paso 2: Seleccionar layout */
          <div>
            <p className="text-sm text-[#6B7280] font-bebas mb-6">
              Selecciona cómo deseas distribuir las fotos
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {currentLayouts.map((layout) => (
                <button
                  key={layout.id}
                  onClick={() => handleLayoutSelect(layout.id)}
                  className="group relative rounded-lg border-2 border-[#39FF14] bg-white hover:bg-[#39FF14]/5 transition-all p-3"
                >
                  {/* Vista previa del layout */}
                  <div 
                    className="w-full bg-white rounded overflow-hidden mb-2"
                    style={{
                      aspectRatio: `${PAGE_WIDTH + BORDER_SIZE * 2}/${PAGE_HEIGHT + BORDER_SIZE * 2}`,
                    }}
                  >
                    <div className="w-full h-full p-1">
                      {/* Borde dorado */}
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          backgroundColor: '#D4AF37',
                          position: 'relative',
                        }}
                      >
                        {/* Canvas con fotos */}
                        <div
                          style={{
                            position: 'absolute',
                            left: `${(BORDER_SIZE / (PAGE_WIDTH + BORDER_SIZE * 2)) * 100}%`,
                            top: `${(BORDER_SIZE / (PAGE_HEIGHT + BORDER_SIZE * 2)) * 100}%`,
                            width: `${(PAGE_WIDTH / (PAGE_WIDTH + BORDER_SIZE * 2)) * 100}%`,
                            height: `${(PAGE_HEIGHT / (PAGE_HEIGHT + BORDER_SIZE * 2)) * 100}%`,
                            backgroundColor: '#D4AF37',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Placeholders de fotos */}
                          {layout.positions.map((pos, idx) => (
                            <div
                              key={idx}
                              style={{
                                position: 'absolute',
                                left: `${(pos.x / PAGE_WIDTH) * 100}%`,
                                top: `${(pos.y / PAGE_HEIGHT) * 100}%`,
                                width: `${(pos.width / PAGE_WIDTH) * 100}%`,
                                height: `${(pos.height / PAGE_HEIGHT) * 100}%`,
                                backgroundColor: '#1A3A52',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <span style={{ fontSize: '10px', color: '#39FF14', fontWeight: 'bold' }}>
                                {idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm font-bebas text-[#39FF14] text-center">
                    {layout.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
