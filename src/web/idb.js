const DB_NAME = "imprint-desk";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("graph")) {
        db.createObjectStore("graph");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Cache key is the host vault path — never reuse graph from another project. */
export async function getCachedGraph(vaultKey) {
  if (!vaultKey) return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("graph", "readonly");
    const req = tx.objectStore("graph").get(vaultKey);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function putCachedGraph(vaultKey, data) {
  if (!vaultKey) return;
  const db = await openDB();
  const payload = { ...data, cached_at: new Date().toISOString(), vault: vaultKey };
  return new Promise((resolve, reject) => {
    const tx = db.transaction("graph", "readwrite");
    tx.objectStore("graph").put(payload, vaultKey);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
