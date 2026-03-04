import { useState, useEffect } from 'react';
import { LoginScreen } from './screens/LoginScreen';
import { PageSelector, PageEditor, MemoryModal, EmailVerificationModal } from './components';
import { API_ENDPOINTS } from './config/api';

type AppState = 'login' | 'email-verify' | 'memory' | 'editor-pages' | 'editor-edit';

interface UserData {
  id: string;
  cedula: string;
  celular: string;
  email: string;
  otpVerified: boolean;
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

function App() {
  const [appState, setAppState] = useState<AppState>('login');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [emailUserId, setEmailUserId] = useState('');
  const [hiddenEmail, setHiddenEmail] = useState('');
  const [memory, setMemory] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [selectedPhotoCount, setSelectedPhotoCount] = useState<number>(0);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [exitAnimation, setExitAnimation] = useState(false);
  const [editedPages, setEditedPages] = useState<Map<number, EditedPage>>(new Map());

  // Verificar si el token sigue siendo válido al cargar la página
  useEffect(() => {
    const validateUserSession = async () => {
      const token = localStorage.getItem('authToken');
      
      if (token) {
        try {
          const response = await fetch(API_ENDPOINTS.validateToken, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Sesión válida, userData:', data.data);
            setUserData(data.data);
            setAppState('editor-pages');
          } else {
            // Token inválido, borrar y mostrar login
            console.warn('❌ Token inválido, borrando...');
            localStorage.removeItem('authToken');
            setAppState('login');
          }
        } catch (error) {
          console.error('Error al validar token:', error);
          localStorage.removeItem('authToken');
          setAppState('login');
        }
      } else {
        setAppState('login');
      }
      
      setLoading(false);
    };

    validateUserSession();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-[#6B7280] text-lg font-bebas">Cargando...</p>
      </div>
    );
  }

  const handleLoginRequest = (_cedula: string, _celular: string, _email: string, userId: string, hiddenEmailParam: string) => {
    setEmailUserId(userId);
    setHiddenEmail(hiddenEmailParam);
    setAppState('email-verify');
  };

  const handleEmailVerifySuccess = (user: UserData) => {
    setUserData(user);
    setAppState('editor-pages');
  };

  const handleMemoryContinue = (userMemory: string) => {
    setMemory(userMemory);
    setAppState('editor-pages');
  };

  const handleSelectPage = (pageId: number, photoCount?: number, layoutId?: string) => {
    console.log('🚀 App: handleSelectPage recibió', { pageId, photoCount, layoutId });
    setSelectedPageId(pageId);
    setSelectedPhotoCount(photoCount || 0);
    setSelectedLayoutId(layoutId || '');
    console.log('🚀 App: Estados actualizados', { 
      selectedPhotoCount: photoCount || 0, 
      selectedLayoutId: layoutId || '' 
    });
    setAppState('editor-edit');
  };

  const handleSavePagePhotos = (pageId: number, photos: Photo[]) => {
    setEditedPages((prev) => {
      const current = prev.get(pageId);
      const currentSerialized = JSON.stringify(current?.photos || []);
      const nextSerialized = JSON.stringify(photos);

      if (currentSerialized === nextSerialized) {
        return prev;
      }

      const next = new Map(prev);
      next.set(pageId, { pageId, photos });
      return next;
    });
  };

  const handleRemovePage = (pageId: number) => {
    setEditedPages((prev) => {
      const next = new Map(prev);
      next.delete(pageId);
      return next;
    });
  };

  const handleBackFromPhotos = () => {
    setExitAnimation(true);
    setTimeout(() => {
      setSelectedPageId(null);
      setAppState('editor-pages');
      setExitAnimation(false);
    }, 600);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAppState('login');
    setUserData(null);
    setEmailUserId('');
    setMemory('');
    setSelectedPageId(null);
  };

  return (
    <>
      {appState === 'login' && <LoginScreen onLoginRequest={handleLoginRequest} />}

      {appState === 'email-verify' && userData === null && (
        <EmailVerificationModal
          isOpen={true}
          userId={emailUserId}
          hiddenEmail={hiddenEmail}
          onSuccess={handleEmailVerifySuccess}
          onClose={handleLogout}
        />
      )}

      {appState === 'memory' && userData && (
        <MemoryModal
          isOpen={true}
          onClose={handleLogout}
          onContinue={handleMemoryContinue}
        />
      )}

      {appState === 'editor-pages' && userData && (
        <PageSelector 
          onSelectPage={handleSelectPage}
          editedPages={editedPages}
          userData={userData}
          onLogout={handleLogout}
        />
      )}

      {appState === 'editor-edit' && userData && selectedPageId && (
        <PageEditor
          pageId={selectedPageId}
          onBack={handleBackFromPhotos}
          memory={memory}
          exitAnimation={exitAnimation}
          onSavePhotos={handleSavePagePhotos}
          onRemovePage={handleRemovePage}
          initialPhotos={editedPages.get(selectedPageId)?.photos || []}
          initialPhotoCount={selectedPhotoCount}
          layoutId={selectedLayoutId}
        />
      )}
    </>
  );
}

export default App;
