import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  doc, 
  onSnapshot, 
  query, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { Loan } from '../types';
import { handleFirestoreError, OperationType } from './error-handler';

export function useLoans() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
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
      setLoans([]);
      setLoading(true);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const initLoans = async () => {
      if (!db) {
        setLoading(false);
        return;
      }

      const collectionPath = 'loans';
      const q = query(collection(db, collectionPath), orderBy('loanDate', 'desc'));

      unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data();
          let loanDate = new Date().toISOString();
          if (data.loanDate) {
            loanDate = typeof data.loanDate.toDate === 'function' 
              ? data.loanDate.toDate().toISOString() 
              : data.loanDate;
          }
          return {
            id: doc.id,
            ...data,
            loanDate
          };
        }) as Loan[];
        setLoans(items);
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, collectionPath);
        setLoading(false);
      });
    };

    initLoans();
    return () => unsubscribe?.();
  }, [isAuthenticated]);

  const createLoan = async (archiveId: string, borrowerName: string, purpose: string, photo?: string, notes?: string) => {
    if (!db) throw new Error("Database not initialized");
    
    const collectionPath = 'loans';
    const loanId = `LN${Date.now()}`;
    const receiptNo = `BPN-LOAN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    try {
      const loanData = {
        archiveId,
        borrowerName,
        purpose,
        borrowerPhoto: photo || '',
        receiptNo,
        loanDate: new Date().toISOString(),
        expectedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days default
        status: 'Active',
        notes: notes || '',
        createdBy: auth?.currentUser?.uid || 'anonymous',
        reminderSent: false
      };

      await setDoc(doc(db, collectionPath, loanId), loanData);

      const archiveRef = doc(db, 'archives', archiveId);
      await updateDoc(archiveRef, {
        status: 'Borrowed',
        updatedAt: serverTimestamp()
      });

      // Automated notification trigger
      try {
        await addDoc(collection(db, 'notifications'), {
          title: "Peminjaman Berkas Baru",
          body: `Arsip dipinjam oleh ${borrowerName} untuk keperluan: ${purpose}.`,
          type: 'INFO',
          category: 'LOAN_NEW',
          isRead: false,
          referenceId: loanId,
          createdAt: serverTimestamp()
        });
      } catch (notifErr) {
        console.error("Failed to autolog loan notification:", notifErr);
      }

      return { id: loanId, ...loanData };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, collectionPath);
    }
  };

  const returnLoan = async (loanId: string, archiveId: string, notes?: string) => {
    if (!db) throw new Error("Database not initialized");
    
    try {
      const loanRef = doc(db, 'loans', loanId);
      await updateDoc(loanRef, {
        status: 'Returned',
        actualReturnDate: new Date().toISOString(),
        returnedBy: auth?.currentUser?.uid || 'anonymous',
        notes: notes ? `RETURNED: ${notes}` : 'Returned without additional notes'
      });

      const archiveRef = doc(db, 'archives', archiveId);
      await updateDoc(archiveRef, {
        status: 'Available',
        updatedAt: serverTimestamp()
      });

      // Automated notification trigger
      try {
        const loanDoc = loans.find(l => l.id === loanId);
        const borrowerStr = loanDoc ? ` dari ${loanDoc.borrowerName}` : '';
        await addDoc(collection(db, 'notifications'), {
          title: "Pengembalian Berkas Sukses",
          body: `Arsip telah berhasil dikembalikan${borrowerStr}. Terima kasih.`,
          type: 'SUCCESS',
          category: 'LOAN_RETURN',
          isRead: false,
          referenceId: loanId,
          createdAt: serverTimestamp()
        });
      } catch (notifErr) {
        console.error("Failed to autolog return notification:", notifErr);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `loans/${loanId}`);
    }
  };

  const updateLoan = async (loanId: string, data: Partial<Loan>) => {
    if (!db) throw new Error("Database not initialized");
    const collectionPath = 'loans';
    try {
      const loanRef = doc(db, collectionPath, loanId);
      await updateDoc(loanRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${collectionPath}/${loanId}`);
    }
  };

  const deleteLoan = async (loanId: string, archiveId?: string) => {
    if (!db) throw new Error("Database not initialized");
    const collectionPath = 'loans';
    try {
      // If the loan is active, we might want to reset archive status
      const loanDoc = loans.find(l => l.id === loanId);
      if (loanDoc && loanDoc.status === 'Active' && archiveId) {
        const archiveRef = doc(db, 'archives', archiveId);
        await updateDoc(archiveRef, {
          status: 'Available',
          updatedAt: serverTimestamp()
        });
      }

      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, collectionPath, loanId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionPath}/${loanId}`);
    }
  };

  return { loans, loading, createLoan, returnLoan, updateLoan, deleteLoan };
}
