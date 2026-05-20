import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { SystemNotification, Loan, Archive } from '../types';
import { handleFirestoreError, OperationType } from './error-handler';

export function useNotifications(loans: Loan[] = [], archives: Archive[] = []) {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const checkedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initNotifications = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      const collectionPath = 'notifications';
      const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data();
          let createdAt = new Date().toISOString();
          if (data.createdAt) {
            createdAt = typeof data.createdAt.toDate === 'function' 
              ? data.createdAt.toDate().toISOString() 
              : data.createdAt;
          }
          return {
            id: doc.id,
            ...data,
            createdAt
          };
        }) as SystemNotification[];
        setNotifications(items);
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, collectionPath);
        setLoading(false);
      });
    };

    initNotifications();
    return () => unsubscribe?.();
  }, []);

  // Proactive Overdue & Completeness Checkers
  useEffect(() => {
    if (loading || !db || loans.length === 0 || archives.length === 0) return;

    const runProactiveChecks = async () => {
      const now = new Date();
      const batchToCreate: Omit<SystemNotification, 'id' | 'createdAt'>[] = [];

      // Check active loans for overdue status
      loans.forEach((loan) => {
        if (loan.status === 'Active') {
          const dueDate = new Date(loan.expectedReturnDate);
          if (dueDate < now) {
            const cacheKey = `overdue-${loan.id}`;
            if (checkedRef.current[cacheKey]) return;
            checkedRef.current[cacheKey] = true;

            const notificationExists = notifications.some(
              n => n.referenceId === loan.id && n.category === 'LOAN_OVERDUE'
            );

            if (!notificationExists) {
              const arc = archives.find(a => a.id === loan.archiveId);
              const docNo = arc 
                ? (arc.type === 'BUKU_TANAH' ? `Buku Tanah No. ${arc.noHak || '-'}` : arc.type === 'SURAT_UKUR' ? `Surat Ukur No. ${arc.noSU || '-'}` : `Warkah No. ${arc.noDI208 || '-'}`)
                : 'Dokumen';
              
              batchToCreate.push({
                title: "Tenggat Peminjaman Terlewati",
                body: `Arsip ${docNo} dipinjam oleh ${loan.borrowerName} telah melewati tenggat waktu pengembalian (${new Date(loan.expectedReturnDate).toLocaleDateString('id-ID')}).`,
                type: 'ALERT',
                category: 'LOAN_OVERDUE',
                isRead: false,
                referenceId: loan.id
              });
            }
          }
        }
      });

      // Check archives for any incomplete files registered in inventory
      archives.forEach((arc) => {
        if (arc.type === 'BUKU_TANAH' && (arc.hasBukuTanah === false || arc.hasSuratUkur === false)) {
          const cacheKey = `completeness-${arc.id}`;
          if (checkedRef.current[cacheKey]) return;
          checkedRef.current[cacheKey] = true;

          const notificationExists = notifications.some(
            n => n.referenceId === arc.id && n.category === 'INVENTORY_COMPLETENESS'
          );

          if (!notificationExists) {
            const docNo = `Buku Tanah No. ${arc.noHak || '-'}`;
            const missingParts = [];
            if (arc.hasBukuTanah === false) missingParts.push("Fisik Buku Tanah");
            if (arc.hasSuratUkur === false) missingParts.push("Fisik Surat Ukur");

            batchToCreate.push({
              title: "Fisik Berkas Belum Lengkap",
              body: `${missingParts.join(" & ")} untuk ${docNo} dinyatakan TIDAK ADA pada saat entri arsip.`,
              type: 'WARNING',
              category: 'INVENTORY_COMPLETENESS',
              isRead: false,
              referenceId: arc.id
            });
          }
        }
      });

      if (batchToCreate.length > 0) {
        const collectionRef = collection(db, 'notifications');
        for (const item of batchToCreate) {
          try {
            await addDoc(collectionRef, {
              ...item,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            console.error("Failed to add systemic notification:", err);
          }
        }
      }
    };

    const timeoutId = setTimeout(runProactiveChecks, 1500);
    return () => clearTimeout(timeoutId);
  }, [loading, loans, archives, notifications]);

  const addNotification = async (notif: Omit<SystemNotification, 'id' | 'isRead' | 'createdAt'>) => {
    if (!db) return;
    try {
      await addDoc(collection(db, 'notifications'), {
        ...notif,
        isRead: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'notifications');
    }
  };

  const markAsRead = async (id: string) => {
    if (!db) return;
    try {
      const docRef = doc(db, 'notifications', id);
      await updateDoc(docRef, { isRead: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllAsRead = async () => {
    if (!db || notifications.length === 0) return;
    try {
      const unread = notifications.filter(n => !n.isRead);
      if (unread.length === 0) return;

      const batch = writeBatch(db);
      unread.forEach(n => {
        const docRef = doc(db, 'notifications', n.id);
        batch.update(docRef, { isRead: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'notifications');
    }
  };

  const deleteNotification = async (id: string) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `notifications/${id}`);
    }
  };

  const clearAllNotifications = async () => {
    if (!db || notifications.length === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        const docRef = doc(db, 'notifications', n.id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'notifications');
    }
  };

  return { 
    notifications, 
    loading, 
    addNotification, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications 
  };
}
