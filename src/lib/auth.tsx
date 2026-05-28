import { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
} from 'firebase/auth';
import { auth, db, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from './firebase';
import { User } from '../types';
import { handleFirestoreError, OperationType } from './error-handler';

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth || !db) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            // Case 1: Firestore record already exists for this UID
            const existingData = userSnap.data() as User;
            
            // Check if we need to update displayName from Auth (e.g. after first activation)
            if (firebaseUser.displayName && (!existingData.displayName || existingData.displayName === 'Personel' || existingData.displayName === 'User')) {
              await setDoc(userRef, { displayName: firebaseUser.displayName }, { merge: true });
              setCurrentUser({ ...existingData, uid: firebaseUser.uid, displayName: firebaseUser.displayName });
            } else {
              setCurrentUser({ ...existingData, uid: firebaseUser.uid } as User);
            }
          } else {
            // Case 2: No Firestore record for this UID yet (New User or Claiming)
            
            // Check for pre-created profile ("Draft") by email prefix
            const emailPrefix = (firebaseUser.email || '').split('@')[0];
            const sanitizedPrefix = emailPrefix.replace(/[^a-zA-Z0-9]/g, '_');
            
            let preProfileSnap = null;
            if (sanitizedPrefix) {
              try {
                const preProfileRef = doc(db, 'users', sanitizedPrefix);
                preProfileSnap = await getDoc(preProfileRef);
              } catch (e) {
                console.warn(`Could not fetch pre-profile for ${sanitizedPrefix}:`, e);
              }
            }

            if (preProfileSnap && preProfileSnap.exists()) {
              // Claiming: User matches an existing Draft profile
              const preProfileRef = doc(db, 'users', sanitizedPrefix);
              const { tempPassword, ...profileData } = preProfileSnap.data() as any;
              
              const finalDisplayName = firebaseUser.displayName || profileData.displayName || 'Personel';
              const finalEmail = firebaseUser.email || profileData.email || `${emailPrefix}@bpn.go.id`;

              const newUser = {
                ...profileData,
                uid: firebaseUser.uid,
                email: finalEmail,
                displayName: finalDisplayName,
              } as User;

              await setDoc(userRef, {
                ...newUser,
                updatedAt: serverTimestamp(),
              });
              await deleteDoc(preProfileRef);
              setCurrentUser(newUser);
            } else {
              // New User: No draft found, create a standard profile
              const isRequestAdmin = firebaseUser.email === 'admin@bpn.go.id';
              
              const newUser: User = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || (isRequestAdmin ? 'Super Admin' : 'Personel'),
                role: isRequestAdmin ? 'SUPER_ADMIN' : 'PETUGAS_ARSIP',
                isActive: true,
                createdAt: new Date().toISOString(),
              };
              
              await setDoc(userRef, {
                ...newUser,
                createdAt: serverTimestamp(),
              });
              setCurrentUser(newUser);
            }
          }
        } catch (error) {
          console.error(`Auth Logic Error for UID ${firebaseUser.uid}:`, error);
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase not initialized");
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = async () => {
    if (!auth) return;
    return signOut(auth);
  };

  return { currentUser, loading, login, logout };
}
