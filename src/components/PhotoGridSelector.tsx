import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

interface PhotoGridSelectorProps {
  pageId: number;
  onSelectPhotos: (count: number) => void;
  onBack: () => void;
  exitAnimation?: boolean;
}

export const PhotoGridSelector: React.FC<PhotoGridSelectorProps> = ({
  pageId,
  onSelectPhotos,
  onBack,
  exitAnimation = false,
}) => {
  const [selectedCount, setSelectedCount] = useState<number | null>(null);
  const photoOptions = [1, 2, 4, 6, 9, 12, 16, 20, 24, 30, 40];

  const getGridLayout = (count: number) => {
    const layouts: Record<number, string> = {
      1: 'grid-cols-1 grid-rows-1',
      2: 'grid-cols-2 grid-rows-1',
      4: 'grid-cols-2 grid-rows-2',
      6: 'grid-cols-3 grid-rows-2',
      9: 'grid-cols-3 grid-rows-3',
      12: 'grid-cols-4 grid-rows-3',
      16: 'grid-cols-4 grid-rows-4',
      20: 'grid-cols-5 grid-rows-4',
      24: 'grid-cols-4 grid-rows-6',
      30: 'grid-cols-5 grid-rows-6',
      40: 'grid-cols-5 grid-rows-8',
    };
    return layouts[count] || 'grid-cols-2 grid-rows-2';
  };

  const handleSelectCount = (count: number) => {
    setSelectedCount(count);
  };

  const handleConfirm = () => {
    if (selectedCount) {
      onSelectPhotos(selectedCount);
    }
  };

  return (
    <div className={`min-h-screen bg-white flex flex-col items-center justify-center p-4 ${exitAnimation ? 'animate-zoomOut' : selectedCount ? 'animate-zoomIn' : ''}`}>
      <div className="w-full max-w-2xl">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#39FF14] font-bebas text-sm mb-8 hover:text-[#66FF44] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Atrás
        </button>

        <div className="text-center mb-12">
          <h1 className="text-3xl font-bausch text-[#39FF14] mb-2">PÁGINA {pageId}</h1>
          <p className="text-[#6B7280] font-bebas text-sm">¿Cuántas fotos deseas añadir?</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {photoOptions.map((count) => (
            <button
              key={count}
              onClick={() => handleSelectCount(count)}
              className={`aspect-square rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2 group p-2 ${
                selectedCount === count
                  ? 'border-[#39FF14] bg-[#39FF14]/10 shadow-subtle'
                  : 'border-[#39FF14] bg-white hover:bg-[#39FF14]/5 hover:shadow-subtle'
              }`}
            >
              {/* Canvas Preview */}
              <div className="w-full h-20 bg-white border-2 border-[#E5E7EB] rounded relative overflow-hidden">
                {/* Grid Layout con marcos visuales */}
                <div className={`w-full h-full grid gap-0.5 p-1 ${getGridLayout(count)}`}>
                  {Array.from({ length: count }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-gradient-to-br from-[#39FF14]/5 to-[#39FF14]/1 border border-[#39FF14]/30 rounded-sm flex items-center justify-center overflow-hidden"
                    >
                      {/* Placeholder image icon */}
                      <div className="text-[0.45rem] font-bebas text-[#6B7280] text-center">📷</div>
                    </div>
                  ))}
                </div>
              </div>

              <span className={`font-bebas text-sm font-bold transition-all ${
                selectedCount === count ? 'text-[#39FF14]' : 'text-[#6B7280] group-hover:text-[#39FF14]'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {selectedCount && (
          <div className="flex gap-4 animate-fadeInUp">
            <button
              onClick={() => setSelectedCount(null)}
              className="flex-1 px-6 py-3 rounded-lg border-2 border-[#39FF14] text-[#39FF14] font-bebas hover:bg-[#39FF14]/10 transition-all"
            >
              Cambiar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 px-6 py-3 rounded-lg bg-[#39FF14] text-[#003300] font-bebas hover:bg-[#66FF44] transition-all shadow-subtle"
            >
              Editar
            </button>
          </div>
        )}

        {!selectedCount && (
          <div className="text-center text-[#6B7280] font-bebas text-xs">
            <p>Selecciona una cantidad para ver el grid</p>
          </div>
        )}
      </div>
    </div>
  );
};
