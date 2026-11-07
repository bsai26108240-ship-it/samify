const DB_NAME = 'samify_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'downloaded_tracks';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveTrackOffline = async (track) => {
  try {
    const response = await fetch(track.audioUrl);
    const blob = await response.blob();
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id: track.id,
        trackData: track,
        audioBlob: blob,
        downloadedAt: new Date().toISOString()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error('Failed to store track offline:', error);
    throw error;
  }
};

export const getOfflineTrackUrl = async (trackId) => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(trackId);
      req.onsuccess = () => {
        if (req.result && (req.result.audioBlob || req.result.blob)) {
          const blob = req.result.audioBlob || req.result.blob;
          const localUrl = URL.createObjectURL(blob);
          resolve(localUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (error) {
    console.error('Error fetching offline track blob:', error);
    return null;
  }
};

export const removeOfflineTrack = async (trackId) => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(trackId);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
};

export const isTrackDownloaded = async (trackId) => {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(trackId);
    req.onsuccess = () => resolve(!!req.result);
    req.onerror = () => resolve(false);
  });
};

export const downloadTrack = saveTrackOffline;
export const deleteOfflineTrack = removeOfflineTrack;
