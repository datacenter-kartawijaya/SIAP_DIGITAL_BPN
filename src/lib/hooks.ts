import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { Archive, ArchiveType } from '../types';
import { handleFirestoreError, OperationType } from './error-handler';

export function useArchives(type?: ArchiveType) {
  const [archives, setArchives] = useState<Archive[]>([]);
  const [archivesLoading, setArchivesLoading] = useState(true);
  const [archivesError, setArchivesError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    if (!auth) {
      setIsAuthenticated(false);
      return;
    }
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setArchives([]);
      setArchivesLoading(true);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const initDocs = async () => {
      if (!db) {
        setArchivesLoading(false);
        return;
      }

      const collectionPath = 'archives';
      const archiveRef = collection(db, collectionPath);
      let q = query(archiveRef, orderBy('createdAt', 'desc'));
      
      if (type) {
        q = query(archiveRef, where('type', '==', type), orderBy('createdAt', 'desc'));
      }

      unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Archive[];
          setArchives(items);
          setArchivesLoading(false);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, collectionPath);
          setArchivesError(err.message);
          setArchivesLoading(false);
        }
      );
    };

    initDocs();
    return () => unsubscribe?.();
  }, [type, isAuthenticated]);

  const addArchive = async (data: any) => {
    if (!db) throw new Error("Database not initialized");
    const collectionPath = 'archives';
    try {
      return await addDoc(collection(db, collectionPath), {
        ...data,
        status: 'Available',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth?.currentUser?.uid || 'anonymous'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, collectionPath);
    }
  };

  const updateArchive = async (id: string, data: any) => {
    if (!db) throw new Error("Database not initialized");
    const collectionPath = 'archives';
    try {
      const arcRef = doc(db, collectionPath, id);
      return await updateDoc(arcRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${collectionPath}/${id}`);
    }
  };

  const removeArchive = async (id: string) => {
    if (!db) throw new Error("Database not initialized");
    const collectionPath = 'archives';
    try {
      const arcRef = doc(db, collectionPath, id);
      return await deleteDoc(arcRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionPath}/${id}`);
    }
  };

  return { 
    archives, 
    loading: archivesLoading, 
    error: archivesError, 
    addArchive, 
    updateArchive, 
    removeArchive 
  };
}
