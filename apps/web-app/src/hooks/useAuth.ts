import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../config/firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: string;
  teamId: string;
  projectIds: string[];
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      try {
        if (firebaseUser) {
          // Firestore에서 사용자 정보 조회
          const userDoc = await getDoc(
            doc(firestore, 'users', firebaseUser.uid)
          );

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: userData.role || 'VIEWER',
              teamId: userData.teamId || '',
              projectIds: userData.projectIds || [],
            });
          } else {
            // 사용자 문서가 없으면 기본 정보만 설정
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'VIEWER',
              teamId: '',
              projectIds: [],
            });
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Auth state change error:', err);
        setError(
          err instanceof Error ? err.message : '인증 오류가 발생했습니다.'
        );
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '로그인에 실패했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '로그아웃에 실패했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN';
  const isEditor = user?.role === 'EDITOR' || user?.role === 'ADMIN';
  const isViewer =
    user?.role === 'VIEWER' ||
    user?.role === 'EDITOR' ||
    user?.role === 'ADMIN';

  return {
    user,
    loading,
    error,
    signIn,
    logout,
    isAuthenticated,
    isAdmin,
    isEditor,
    isViewer,
  };
};
