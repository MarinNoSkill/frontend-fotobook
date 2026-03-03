import React from 'react';
import { LogOut, User, Book, Phone, Mail, X } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  cedula: string;
  celular: string;
  email: string;
  onLogout: () => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  cedula,
  celular,
  email,
  onLogout,
  onClose
}) => {
  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <>
      {/* Backdrop con blur intenso */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-md transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Menu hamburguesa con gradiente vibrante */}
      <div className={`fixed top-16 right-3 md:right-4 z-40 origin-top-right transition-all duration-300 ${
        isOpen 
          ? 'opacity-100 scale-100' 
          : 'opacity-0 scale-0 pointer-events-none'
      }`}>
        <div className="bg-white rounded-lg shadow-subtle border-2 border-[#39FF14] overflow-hidden w-72 md:w-80">
          {/* Header con borde verde */}
          <div className="bg-white border-b-2 border-[#39FF14] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#39FF14]/10 flex items-center justify-center border-2 border-[#39FF14]">
                <User className="w-5 h-5 text-[#003300]" />
              </div>
              <div>
                <h3 className="font-bebas text-[#003300] text-sm">MI PERFIL</h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#39FF14]/10 rounded-lg transition-all"
            >
              <X className="w-5 h-5 text-[#003300]" />
            </button>
          </div>

          {/* Info items */}
          <div className="divide-y divide-[#39FF14]/20 p-4 space-y-4">
            {/* Documento */}
            <div className="flex items-start gap-3 pb-4">
              <Book className="w-5 h-5 text-[#39FF14] mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs font-bebas text-[#6B7280] uppercase">Documento</p>
                <p className="text-lg font-bebas text-[#003300]">{cedula}</p>
              </div>
            </div>

            {/* Celular */}
            <div className="flex items-start gap-3 pt-4 pb-4">
              <Phone className="w-5 h-5 text-[#39FF14] mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs font-bebas text-[#6B7280] uppercase">Celular</p>
                <p className="text-lg font-bebas text-[#003300]">{celular}</p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3 pt-4">
              <Mail className="w-5 h-5 text-[#39FF14] mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs font-bebas text-[#6B7280] uppercase">Email</p>
                <p className="text-sm font-bebas text-[#003300] truncate">{email}</p>
              </div>
            </div>
          </div>

          {/* Botón logout */}
          <div className="p-4 border-t-2 border-[#39FF14] bg-[#F9FAFB]">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 rounded-lg font-bebas uppercase text-sm text-white bg-red-500 border-2 border-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-subtle"
            >
              <LogOut className="w-4 h-4" />
              CERRAR SESIÓN
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
