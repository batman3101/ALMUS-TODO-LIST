import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore as db } from '../config/firebase';

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
          try {
            // Firestore에서 사용자 정보 조회 시도
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
                teamId: userData.teamId || 'default-team',
                projectIds: userData.projectIds || [],
              });
            } else {
              // 사용자 문서가 없으면 기본 정보만 설정
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                role: 'ADMIN',
                teamId: 'default-team',
                projectIds: ['default-project'],
              });
            }
          } catch (firestoreError) {
            // Firestore 연결 실패 시 기본 정보만 설정
            console.warn('Firestore connection failed, using default user data:', firestoreError);
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'ADMIN',
              teamId: 'default-team',
              projectIds: ['default-project'],
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
      if (import.meta.env.DEV) {
        console.log('🔐 로그인 시도:', { 
          email, 
          authInstance: !!auth,
          authConfig: auth.config,
          currentUser: auth.currentUser
        });
      }
      
      // Firebase Auth 인스턴스 확인
      if (!auth) {
        throw new Error('Firebase Auth가 초기화되지 않았습니다.');
      }
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (import.meta.env.DEV) {
        console.log('Sign in successful:', result.user.uid);
      }
      return result;
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('Sign in error details:', err);
      }
      
      // Firebase 오류 메시지를 한국어로 변환
      let errorMessage = '로그인에 실패했습니다.';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = '등록되지 않은 이메일입니다.';
          break;
        case 'auth/wrong-password':
          errorMessage = '잘못된 비밀번호입니다.';
          break;
        case 'auth/invalid-email':
          errorMessage = '올바른 이메일 형식이 아닙니다.';
          break;
        case 'auth/too-many-requests':
          errorMessage = '너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.';
          break;
        case 'auth/network-request-failed':
          errorMessage = '네트워크 연결을 확인해주세요.';
          break;
        case 'auth/invalid-credential':
          errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
          break;
        case 'auth/user-disabled':
          errorMessage = '비활성화된 계정입니다.';
          break;
        default:
          errorMessage = err.message || '로그인에 실패했습니다.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setError(null);
      console.log('회원가입 시도:', email);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('회원가입 성공:', user);
      
      // Firestore에 사용자 정보 저장
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '사용자',
        teamId: 'default-team', // 기본 팀 ID
        role: 'member',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('사용자 문서 생성 완료');
      return userCredential;
    } catch (err: any) {
      console.error('회원가입 실패:', err);
      
      let errorMessage = '회원가입에 실패했습니다.';
      
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = '이미 사용 중인 이메일입니다.';
          break;
        case 'auth/weak-password':
          errorMessage = '비밀번호가 너무 약합니다. 6자 이상 입력해주세요.';
          break;
        case 'auth/invalid-email':
          errorMessage = '올바른 이메일 형식이 아닙니다.';
          break;
        default:
          errorMessage = err.message || '회원가입에 실패했습니다.';
      }
      
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
    signUp,
    logout,
    isAuthenticated,
    isAdmin,
    isEditor,
    isViewer,
  };
};
