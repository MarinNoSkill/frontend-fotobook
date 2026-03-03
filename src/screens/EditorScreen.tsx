import React, { useState } from 'react';
import {
  Layout,
  Image,
  Type,
  Sticker,
  Palette,
  Grid3x3,
  Layers,
  Settings,
  User
} from 'lucide-react';
import { ProfileModal } from '../components';

interface UserData {
  id: string;
  cedula: string;
  celular: string;
  email: string;
  otpVerified: boolean;
}

interface EditorScreenProps {
  memory: string;
  userData: UserData;
  onLogout: () => void;
}

interface SidebarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

export const EditorScreen: React.FC<EditorScreenProps> = ({ memory, userData, onLogout }) => {
  const [activeTab, setActiveTab] = useState('templates');
  const [showProfile, setShowProfile] = useState(false);

  const sidebarItems: SidebarItem[] = [
    { id: 'templates', icon: <Layout className="w-5 h-5" />, label: 'Templates' },
    { id: 'photos', icon: <Image className="w-5 h-5" />, label: 'Photos' },
    { id: 'text', icon: <Type className="w-5 h-5" />, label: 'Text' },
    { id: 'stickers', icon: <Sticker className="w-5 h-5" />, label: 'Stickers' },
    { id: 'backgrounds', icon: <Palette className="w-5 h-5" />, label: 'Backgrounds' },
    { id: 'layouts', icon: <Grid3x3 className="w-5 h-5" />, label: 'Layouts' },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b-2 border-[#39FF14] shadow-subtle">
        <div className="max-w-full px-3 md:px-6 py-3 md:py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-10 md:w-12 h-10 md:h-12 rounded-lg bg-[#39FF14]/10 flex items-center justify-center border-2 border-[#39FF14] flex-shrink-0">
              <Layout className="w-5 md:w-6 h-5 md:h-6 text-[#003300]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bausch text-[#39FF14]">PARTY CLASS</h1>
              <p className="text-xs md:text-sm text-[#6B7280] truncate font-bebas">{memory}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <button className="p-2 hover:bg-[#39FF14]/10 rounded-lg transition-all border-2 border-[#39FF14]" title="Configuración">
              <Settings className="w-5 md:w-6 h-5 md:h-6 text-[#003300]" />
            </button>
            <button 
              onClick={() => setShowProfile(true)}
              className="p-2 hover:bg-[#39FF14]/10 rounded-lg transition-all border-2 border-[#39FF14]"
              title="Ver perfil"
            >
              <User className="w-5 md:w-6 h-5 md:h-6 text-[#003300]" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden gap-2 md:gap-0 p-2 md:p-0">
        <aside className="w-16 md:w-20 lg:w-72 bg-white border-r-2 border-[#39FF14] rounded-lg md:rounded-none p-2 md:p-4 space-y-2 overflow-y-auto shadow-subtle md:shadow-none">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full p-2 md:p-3 rounded-lg md:rounded-lg flex items-center gap-2 md:gap-3 transition-all text-sm md:text-base font-bebas uppercase ${
                activeTab === item.id
                  ? 'bg-[#39FF14] text-[#003300] border-2 border-[#39FF14] shadow-subtle'
                  : 'bg-white text-[#003300] border-2 border-[#39FF14] hover:bg-[#F9FAFB]'
                }`}
              title={item.label}
            >
              <span className="flex-shrink-0">
                {item.icon}
              </span>
              <span className="hidden lg:block truncate">
                {item.label}
              </span>
            </button>
          ))}
        </aside>

        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden gap-2 md:gap-0">
          <div className="flex-1 p-2 md:p-4 lg:p-8 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <div className="aspect-[3/4] lg:aspect-[4/3] rounded-lg flex items-center justify-center border-4 border-dashed border-[#39FF14] bg-white shadow-subtle hover:shadow-subtle-hover transition-all duration-300">
                <div className="text-center space-y-4 px-4">
                  <div className="w-20 md:w-28 h-20 md:h-28 mx-auto rounded-lg bg-[#39FF14]/10 flex items-center justify-center border-2 border-[#39FF14] shadow-subtle hover:bg-[#39FF14]/20 transition-all">
                    <Layers className="w-10 md:w-14 h-10 md:h-14 text-[#39FF14]" />
                  </div>
                  <div>
                    <h3 className="text-2xl md:text-4xl font-bebas text-[#003300]">
                      Tu Canvas
                    </h3>
                    <p className="text-sm md:text-base text-[#6B7280] font-bebas">
                      Selecciona un template o sube tus fotos
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="w-full lg:w-72 bg-white border-t-2 lg:border-t-0 lg:border-l-2 border-[#39FF14] p-3 md:p-4 overflow-auto rounded-lg lg:rounded-none shadow-subtle lg:shadow-none">
            <div className="space-y-4">
              <div className="bg-white border-2 border-[#39FF14] rounded-lg p-4 shadow-subtle">
                <h3 className="text-base md:text-lg font-bebas text-[#003300] mb-4">Propiedades</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bebas text-[#003300] mb-2">
                      Tamaño
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="w-full accent-[#39FF14]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bebas text-[#003300] mb-2">
                      Rotación
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      className="w-full accent-[#39FF14]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bebas text-[#003300] mb-2">
                      Opacidad
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="w-full accent-[#39FF14]"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bebas text-[#003300]">Bloquear Aspecto</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#39FF14]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E5E7EB] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#39FF14]"></div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-2 border-[#39FF14] rounded-lg p-4 bg-white shadow-subtle">
                <h3 className="text-lg font-bebas text-[#003300] mb-4">Capas</h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-[#39FF14]/10 border-2 border-[#39FF14] shadow-subtle">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4 text-[#39FF14]" />
                      <span className="text-sm font-bebas text-[#003300]">Fondo</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white border-2 border-[#39FF14] hover:shadow-subtle transition-all cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-[#39FF14]" />
                      <span className="text-sm font-bebas text-[#003300]">Texto 1</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>

      <ProfileModal
        isOpen={showProfile}
        cedula={userData.cedula}
        celular={userData.celular}
        email={userData.email}
        onLogout={onLogout}
        onClose={() => setShowProfile(false)}
      />
    </div>
  );
};
