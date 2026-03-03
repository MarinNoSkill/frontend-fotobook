import { useEffect, useState, useCallback } from 'react';

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
}

const DB_NAME = 'FotoBookDB';
const DB_VERSION = 1;
const STORE_NAME = 'pages';

export const usePageCache = () => {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Inicializar IndexedDB
  useEffect(() => {
    const initDB = async () => {
      return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
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
        setDb(database);
        setIsReady(true);
      })
      .catch((error) => {
        console.error('Error initializing IndexedDB:', error);
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
      stickers?: StickerElement[]
    ) => {
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
          lastEdited: Date.now(),
        };

        const request = store.put(pageData);

        request.onerror = () => resolve(false);
        request.onsuccess = () => resolve(true);
      });
    },
    [db]
  );

  const loadPage = useCallback(
    async (pageId: number) => {
      if (!db) return null;

      return new Promise<PageData | null>((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(pageId);

        request.onerror = () => resolve(null);
        request.onsuccess = () => resolve(request.result || null);
      });
    },
    [db]
  );

  const deletePage = useCallback(
    async (pageId: number) => {
      if (!db) return false;

      return new Promise<boolean>((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(pageId);

        request.onerror = () => resolve(false);
        request.onsuccess = () => resolve(true);
      });
    },
    [db]
  );

  const getAllPages = useCallback(async () => {
    if (!db) return [];

    return new Promise<PageData[]>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => resolve([]);
      request.onsuccess = () => resolve(request.result);
    });
  }, [db]);

  const clearAll = useCallback(async () => {
    if (!db) return false;

    return new Promise<boolean>((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => resolve(false);
      request.onsuccess = () => resolve(true);
    });
  }, [db]);

  return {
    isReady,
    savePage,
    loadPage,
    deletePage,
    getAllPages,
    clearAll,
  };
};
