/**
 * Client-Side IndexedDB Offline Download Manager
 *
 * Stores raw audio Blobs, high-res artwork, metadata, and LRC lyrics
 * locally in IndexedDB for 100% offline, zero-latency playback.
 */

const DB_NAME = 'samify_offline_db';
const DB_VERSION = 3;
const STORE_NAME = 'samify_downloaded_tracks';
const LEGACY_STORES = ['tracks', 'downloaded_tracks'];

const objectUrlCache = new Map();
let dbPromise = null;

const isIndexedDBAvailable = () =>
  typeof indexedDB !== 'undefined' && indexedDB !== null;

const openDB = () => {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this browser'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const transaction = event.target.transaction;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }

      // Migrate from any legacy stores if upgrading
      for (const legacy of LEGACY_STORES) {
        if (db.objectStoreNames.contains(legacy)) {
          try {
            const legacyStore = transaction.objectStore(legacy);
            const targetStore = transaction.objectStore(STORE_NAME);
            const cursorRequest = legacyStore.openCursor();

            cursorRequest.onsuccess = (e) => {
              const cursor = e.target.result;
              if (cursor) {
                const val = cursor.value || {};
                const blob = val.blob || val.audioBlob;
                if (val.id && blob) {
                  targetStore.put({
                    id: String(val.id),
                    title: val.title || 'Unknown Track',
                    artist: val.artist || 'Unknown Artist',
                    album: val.album || 'Samify',
                    coverArt: val.coverArt || val.coverUrl || '',
                    coverUrl: val.coverUrl || val.coverArt || '',
                    duration: val.duration || 0,
                    lyrics: val.lyrics || '',
                    blob,
                    mimeType: blob.type || 'audio/mpeg',
                    size: blob.size || 0,
                    downloadedAt: val.downloadedAt || new Date().toISOString(),
                  });
                }
                cursor.continue();
              }
            };
          } catch {
            // Keep safe
          }
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('Offline database upgrade is blocked by another tab'));
  }).catch((error) => {
    dbPromise = null;
    throw error;
  });

  return dbPromise;
};

const getRecord = async (trackId) => {
  if (!trackId) return null;
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(String(trackId));

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const revokeCachedUrl = (trackId) => {
  const id = String(trackId);
  const cachedUrl = objectUrlCache.get(id);

  if (cachedUrl && typeof URL !== 'undefined' && URL.revokeObjectURL) {
    URL.revokeObjectURL(cachedUrl);
  }

  objectUrlCache.delete(id);
};

/**
 * Downloads a track and saves its binary audio Blob + metadata into IndexedDB.
 */
export const saveTrackOffline = async (trackObject) => {
  if (!trackObject || !trackObject.id) {
    throw new Error('A valid track is required for offline download');
  }

  const streamUrl =
    trackObject.audioUrl ||
    trackObject.streamUrl ||
    trackObject.downloadUrl ||
    trackObject.url;

  if (!streamUrl) {
    throw new Error('This track has no playable stream URL');
  }

  // Fetch raw binary audio Blob
  const response = await fetch(streamUrl);
  if (!response.ok) {
    throw new Error(`Download failed with HTTP ${response.status}`);
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    throw new Error('Downloaded audio binary is empty');
  }

  const record = {
    id: String(trackObject.id),
    title: trackObject.title || 'Unknown Track',
    artist: trackObject.artist || 'Unknown Artist',
    album: trackObject.album || 'Samify',
    duration: trackObject.duration || 0,
    coverArt: trackObject.coverArt || trackObject.coverUrl || '',
    coverUrl: trackObject.coverUrl || trackObject.coverArt || '',
    lyrics: trackObject.lyrics || '',
    blob,
    mimeType: blob.type || 'audio/mpeg',
    size: blob.size,
    downloadedAt: new Date().toISOString(),
  };

  const db = await openDB();

  await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const request = transaction.objectStore(STORE_NAME).put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  revokeCachedUrl(record.id);
  const { blob: _blob, ...metadata } = record;
  return metadata;
};

export const downloadTrack = saveTrackOffline;

/**
 * Returns a playable blob: object URL for a downloaded track, or null.
 */
export const getOfflineTrack = async (trackId) => {
  if (!trackId) return null;

  const id = String(trackId);
  if (objectUrlCache.has(id)) return objectUrlCache.get(id);

  try {
    const record = await getRecord(id);
    const blob = record?.blob || record?.audioBlob;
    if (!blob) return null;

    const objectUrl = URL.createObjectURL(blob);
    objectUrlCache.set(id, objectUrl);
    return objectUrl;
  } catch (error) {
    console.error('Failed to retrieve offline track blob:', error);
    return null;
  }
};

export const getOfflineTrackUrl = getOfflineTrack;

/**
 * Lists all offline downloaded tracks.
 */
export const getAllOfflineTracks = async () => {
  try {
    const db = await openDB();

    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).getAll();

      request.onsuccess = () => {
        const records = Array.isArray(request.result) ? request.result : [];
        resolve(
          records.map((record) => ({
            id: record.id,
            title: record.title || 'Unknown Track',
            artist: record.artist || 'Unknown Artist',
            album: record.album || 'Samify',
            duration: record.duration || 0,
            coverArt: record.coverArt || record.coverUrl || '',
            coverUrl: record.coverUrl || record.coverArt || '',
            lyrics: record.lyrics || '',
            size: record.size || record.blob?.size || 0,
            mimeType: record.mimeType || record.blob?.type || 'audio/mpeg',
            downloadedAt: record.downloadedAt || '',
            source: 'offline',
          }))
        );
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to list offline tracks:', error);
    return [];
  }
};

/**
 * Deletes an offline track from IndexedDB and revokes its Blob URL.
 */
export const deleteOfflineTrack = async (trackId) => {
  if (!trackId) return false;

  const id = String(trackId);
  revokeCachedUrl(id);

  try {
    const db = await openDB();

    await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const request = transaction.objectStore(STORE_NAME).delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    return true;
  } catch (error) {
    console.error('Failed to delete offline track:', error);
    return false;
  }
};

export const removeOfflineTrack = deleteOfflineTrack;

export const isTrackDownloaded = async (trackId) => {
  if (!trackId) return false;

  try {
    const record = await getRecord(trackId);
    return Boolean(record);
  } catch {
    return false;
  }
};

export const revokeAllOfflineUrls = () => {
  if (typeof URL === 'undefined' || !URL.revokeObjectURL) return;

  for (const objectUrl of objectUrlCache.values()) {
    URL.revokeObjectURL(objectUrl);
  }

  objectUrlCache.clear();
};
