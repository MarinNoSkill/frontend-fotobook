import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: (memory: string) => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({
  isOpen,
  onClose,
  onContinue,
}) => {
  const [memory, setMemory] = useState('');

  const handleContinue = () => {
    if (memory.trim()) {
      onContinue(memory);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white border-2 border-[#39FF14] rounded-lg shadow-subtle overflow-hidden">
        <div className="bg-[#39FF14] px-6 py-6">
          <div className="text-center">
            <h2 className="text-2xl font-bebas text-[#003300] mb-1">
              Tu Recuerdo Especial
            </h2>
            <p className="text-[#003300] text-sm font-bebas">
              Cuéntanos sobre el momento que quieres preservar
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bebas text-[#003300] mb-2">
              Describe tu Recuerdo
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border-2 border-[#39FF14] bg-white text-[#003300]
                focus:border-[#00AA00] focus:ring-2 focus:ring-[#39FF14]/30 focus:outline-none
                placeholder-[#6B7280] font-bebas resize-none transition-all"
              rows={4}
              placeholder="Describe tu momento especial..."
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 py-2"
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleContinue}
              disabled={!memory.trim()}
              className="flex-1 py-2"
            >
              Continuar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
