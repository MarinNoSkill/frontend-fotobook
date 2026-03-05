import { useEffect, useState, useCallback } from 'react';
import { detectBrowserCapabilities } from '../utils/browserCompatibility';

export interface Photo {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface TextElement {
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

export interface StickerElement {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
}

export interface PageData {
  pageId: number;
  photos: Photo[];
  texts?: TextElement[];
  stickers?: StickerElement[];
  photoCount: number;
  lastEdited: number;
  previewImage?: string; // Data URL de la imagen del lienzo
  stageX?: number; // Posición X del Stage
  stageY?: number; // Posición Y del Stage
  zoom?: number; // Nivel de zoom
  layoutId?: string; // ID del layout seleccionado
  backgroundColor?: string; // Color del fondo del canvas
  borderColor?: string; // Color de los bordes/compartimentos
  showBorders?: boolean; // Mostrar/ocultar bordes
  customBorderSize?: number; // Grosor personalizable del borde
}

const DB_NAME = 'FotoBookDB';
const DB_VERSION = 1;
const STORE_NAME = 'pages';

export const usePageCache = () => {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // Inicializar IndexedDB con fallback para Brave
  useEffect(() => {
    const initDB = async () => {
      const capabilities = detectBrowserCapabilities();
      
      // Si es Brave y IndexedDB está bloqueado, usar localStorage como fallback
      if (capabilities.isBrave && !capabilities.indexedDB) {
        console.log('🦁 Brave detectado con IndexedDB bloqueado - usando localStorage fallback');
        setUseFallback(true);
        setIsReady(true);
        return;
      }
      
      return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('IndexedDB failed, falling back to localStorage');
          setUseFallback(true);
          setIsReady(true);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          const database = request.result;
          resolve(database);
        };

        request.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'pageId' });
          }
        };
      });
    };

    initDB()
      .then((database) => {
        if (database) {
          setDb(database);
          setIsReady(true);
        }
      })
      .catch((error) => {
        console.error('Error initializing IndexedDB, using fallback:', error);
        setUseFallback(true);
        setIsReady(true);
      });
  }, []);

  const savePage = useCallback(
    async (
      pageId: number, 
      photos: Photo[], 
      photoCount: number, 
      previewImage?: string, 
      stageX?: number, 
      stageY?: number, 
      zoom?: number, 
      layoutId?: string, 
      backgroundColor?: string, 
      borderColor?: string,
      texts?: TextElement[],
      stickers?: StickerElement[],
      showBorders?: boolean,
      customBorderSize?: number
    ) => {
      // Fallback para localStorage cuando IndexedDB esté bloqueado (Brave)
      if (useFallback) {
        try {
          const pageData: PageData = {
            pageId,
            photos,
            texts,
            stickers,
            photoCount,
            previewImage,
            stageX,
            stageY,
            zoom,
            layoutId,
            backgroundColor,
            borderColor,
            showBorders,
            customBorderSize,
            lastEdited: Date.now(),
          };
          
          localStorage.setItem(`fotobook_page_${pageId}`, JSON.stringify(pageData));
          console.log(`💾 Página ${pageId} guardada en localStorage (fallback)`);
          return true;
        } catch (error) {
          console.error('Error saving to localStorage fallback:', error);
          return false;
        }
      }
      
      // Funcionamiento normal con IndexedDB
      if (!db) return false;

      return new Promise<boolean>((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        const pageData: PageData = {
          pageId,
          photos,
          texts,
          stickers,
          photoCount,
          previewImage,
          stageX,
          stageY,
          zoom,
          layoutId,
          backgroundColor,
          borderColor,
          showBorders,
          customBorderSize,
          lastEdited: Date.now(),
        };

        const request = store.put(pageData);

        request.onerror = () => resolve(false);
        request.onsuccess = () => resolve(true);
      });
    },
    [db, useFallback]
  );

  const loadPage = useCallback(
    async (pageId: number) => {
      // Fallback para localStorage cuando IndexedDB esté bloqueado (Brave)
      if (useFallback) {
        try {
          const stored = localStorage.getItem(`fotobook_page_${pageId}`);
          if (stored) {
            console.log(`📖 Página ${pageId} cargada desde localStorage (fallback)`);
            return JSON.parse(stored);
          }
          return null;
        } catch (error) {
          console.error('Error loading from localStorage fallback:', error);
          return null;
        }
      }
      
      // Funcionamiento normal con IndexedDB
      if (!db) return null;

      return new Promise<PageData | null>((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(pageId);

        request.onerror = () => resolve(null);
        request.onsuccess = () => resolve(request.result || null);
      });
    },
    [db, useFallback]
  );

  const deletePage = useCallback(
    async (pageId: number) => {
      // Fallback para localStorage cuando IndexedDB esté bloqueado (Brave)
      if (useFallback) {
        try {
          localStorage.removeItem(`fotobook_page_${pageId}`);
          console.log(`🗑️ Página ${pageId} eliminada de localStorage (fallback)`);
          return true;
        } catch (error) {
          console.error('Error deleting from localStorage fallback:', error);
          return false;
        }
      }
      
      // Funcionamiento normal con IndexedDB
      if (!db) return false;

      return new Promise<boolean>((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(pageId);

        request.onerror = () => resolve(false);
        request.onsuccess = () => resolve(true);
      });
    },
    [db, useFallback]
  );

  const getAllPages = useCallback(async () => {
    // Fallback para localStorage cuando IndexedDB esté bloqueado (Brave)
    if (useFallback) {
      try {
        const pages: PageData[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('fotobook_page_')) {
            const stored = localStorage.getItem(key);
            if (stored) {
              pages.push(JSON.parse(stored));
            }
          }
        }
        console.log(`📚 ${pages.length} páginas cargadas desde localStorage (fallback)`);
        return pages;
      } catch (error) {
        console.error('Error getting all pages from localStorage fallback:', error);
        return [];
      }
    }
    
    // Funcionamiento normal con IndexedDB
    if (!db) return [];

    return new Promise<PageData[]>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => resolve([]);
      request.onsuccess = () => resolve(request.result);
    });
  }, [db, useFallback]);

  const clearAll = useCallback(async () => {
    // Fallback para localStorage cuando IndexedDB esté bloqueado (Brave)
    if (useFallback) {
      try {
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('fotobook_page_')) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 ${keysToDelete.length} páginas limpiadas de localStorage (fallback)`);
        return true;
      } catch (error) {
        console.error('Error clearing localStorage fallback:', error);
        return false;
      }
    }
    
    // Funcionamiento normal con IndexedDB
    if (!db) return false;

    return new Promise<boolean>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => resolve(false);
      request.onsuccess = () => resolve(true);
    });
  }, [db, useFallback]);

  return {
    isReady,
    savePage,
    loadPage,
    deletePage,
    getAllPages,
    clearAll,
  };
};
