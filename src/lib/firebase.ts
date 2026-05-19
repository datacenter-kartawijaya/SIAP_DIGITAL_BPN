import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

const firebaseApp = getApps().length === 0 ? initializeApp(config) : getApp();
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp, (config as any).firestoreDatabaseId || '(default)');

// Keep getFirebase for backward compatibility during transition if needed
export async function getFirebase() {
  return { auth, db };
}


