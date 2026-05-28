import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

// Initialize core Firebase App only for authentication
const firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
export const auth = getAuth(firebaseApp);

// Custom Database Reference Mock Client
export const db = { type: 'database', name: 'mongodb' };

export async function getFirebase() {
  return { auth, db };
}

// ----------------------------------------------------
// Firestore API Primitives mapped to MongoDB Gateway
// ----------------------------------------------------

export function collection(dbRef: any, name: string) {
  return { type: 'collection', name };
}

export function doc(dbRef: any, collectionName: string, id: string) {
  return { type: 'doc', collection: collectionName, id };
}

export function query(collectionRef: any, ...constraints: any[]) {
  return {
    type: 'query',
    collection: collectionRef.name,
    constraints: constraints
  };
}

export function where(field: string, operator: string, value: any) {
  return { type: 'constraint', kind: 'where', field, operator, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
  return { type: 'constraint', kind: 'orderBy', field, direction };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

// REST Client functions hitting our node/express backend
export async function addDoc(collectionRef: any, data: any) {
  const url = `/api/db/${collectionRef.name}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Gagal menambah dokumen di ${collectionRef.name}`);
  }
  const result = await response.json();
  return { id: result.id, ...result };
}

export async function setDoc(docRef: any, data: any, options?: { merge?: boolean }) {
  // If we merge, we can first query current data or let PUT do an update/upsert
  const url = `/api/db/${docRef.collection}/${docRef.id}?upsert=true`;
  // For standard user creation/claim profile, setDoc works as a complete upsert on backends
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Gagal set doc di ${docRef.collection}/${docRef.id}`);
  }
  const result = await response.json();
  return result;
}

export async function updateDoc(docRef: any, data: any) {
  const url = `/api/db/${docRef.collection}/${docRef.id}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Gagal update doc di ${docRef.collection}/${docRef.id}`);
  }
  const result = await response.json();
  return result;
}

export async function deleteDoc(docRef: any) {
  const url = `/api/db/${docRef.collection}/${docRef.id}`;
  const response = await fetch(url, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Gagal menghapus dokumen di ${docRef.collection}/${docRef.id}`);
  }
  return await response.json();
}

export async function getDoc(docRef: any) {
  const url = `/api/db/${docRef.collection}/${docRef.id}`;
  const response = await fetch(url);
  if (response.status === 404) {
    return {
      id: docRef.id,
      exists: () => false,
      data: () => null
    };
  }
  if (!response.ok) {
    throw new Error(`Gagal memuat dokumen ${docRef.collection}/${docRef.id}`);
  }
  const data = await response.json();
  return {
    id: data.id,
    exists: () => true,
    data: () => data
  };
}

export async function getDocs(queryOrCollectionRef: any) {
  const colName = queryOrCollectionRef.type === 'collection' ? queryOrCollectionRef.name : queryOrCollectionRef.collection;
  const params = new URLSearchParams();

  if (queryOrCollectionRef.type === 'query' && queryOrCollectionRef.constraints) {
    for (const c of queryOrCollectionRef.constraints) {
      if (c.kind === 'where' && (c.operator === '==' || c.operator === '===') && c.value !== undefined) {
        params.append(c.field, String(c.value));
      } else if (c.kind === 'orderBy') {
        params.append('sortBy', c.field);
        params.append('sortDir', c.direction || 'asc');
      }
    }
  }

  const url = `/api/db/${colName}${params.toString() ? '?' + params.toString() : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal memuat data koleksi ${colName}`);
  }
  const docs = await response.json();
  
  const mappedDocs = docs.map((docData: any) => ({
    id: docData.id,
    exists: () => true,
    data: () => docData
  }));

  return {
    docs: mappedDocs,
    empty: mappedDocs.length === 0
  };
}

// Polling Snapshot listener with high-efficiency fallback
export function onSnapshot(
  queryOrCollectionRef: any, 
  onNext: (snapshot: any) => void, 
  onError?: (error: any) => void
) {
  let active = true;
  const pollTime = 3000; // Poll database state every 3 seconds for fast updates

  const fetchLoop = async () => {
    try {
      const snap = await getDocs(queryOrCollectionRef);
      if (active) {
        onNext(snap);
      }
    } catch (err) {
      if (active && onError) {
        onError(err);
      }
    }
  };

  fetchLoop();
  const intervalId = setInterval(fetchLoop, pollTime);

  return () => {
    active = false;
    clearInterval(intervalId);
  };
}

// Bulk Batch Transactions Support (Backups/Bulk mark as read)
export function writeBatch(dbRef?: any) {
  const ops: Array<{ type: 'update' | 'delete' | 'set', ref: any, data?: any, options?: any }> = [];
  return {
    set(docRef: any, data: any, options?: any) {
      ops.push({ type: 'set', ref: docRef, data, options });
    },
    update(docRef: any, data: any) {
      ops.push({ type: 'update', ref: docRef, data });
    },
    delete(docRef: any) {
      ops.push({ type: 'delete', ref: docRef });
    },
    async commit() {
      // Execute queued operations concurrently
      await Promise.all(ops.map(async (op) => {
        if (op.type === 'set') {
          await setDoc(op.ref, op.data, op.options);
        } else if (op.type === 'update') {
          await updateDoc(op.ref, op.data);
        } else if (op.type === 'delete') {
          await deleteDoc(op.ref);
        }
      }));
    }
  };
}
