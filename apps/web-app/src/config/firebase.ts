import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'your-api-key',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'almus-todo-app.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'almus-todo-app',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'almus-todo-app.appspot.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.VITE_FIREBASE_APP_ID || 'your-app-id',
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스 초기화
export const storage = getStorage(app);
export const firestore = getFirestore(app);
export const auth = getAuth(app);

export default app; 