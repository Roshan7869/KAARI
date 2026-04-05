import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyB-dd29mlXYledib5SHrXbmpfrdJ5PJ730',
  authDomain: 'kaari-handmade.firebaseapp.com',
  projectId: 'kaari-handmade',
  storageBucket: 'kaari-handmade.firebasestorage.app',
  messagingSenderId: '880813541097',
  appId: '1:880813541097:web:f5528cb3f65d6064fe1278',
  measurementId: 'G-C2J21X3GQG',
};

// Avoid re-initializing on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const firebaseAuth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Optional: request additional scopes
googleProvider.addScope('email');
googleProvider.addScope('profile');
