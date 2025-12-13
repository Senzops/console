import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  User as FirebaseUser,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import axios from 'axios';
import { useRouter } from 'next/router';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

if (!getApps().length) initializeApp(firebaseConfig);
const auth = getAuth();
const googleProvider = new GoogleAuthProvider();

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
});

export type SenzorUser = (FirebaseUser & { isDemo?: boolean }) | { uid: string, email: string, displayName: string, isDemo: boolean };

interface AuthContextType {
  user: SenzorUser | null;
  loading: boolean;
  loginGoogle: () => Promise<void>;
  loginEmail: (e: string, p: string) => Promise<void>;
  signupEmail: (e: string, p: string) => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
  token: string | null;
}

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SenzorUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (user?.isDemo) return;

    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      if (currUser) {
        setUser(currUser);
        const t = await currUser.getIdToken();
        setToken(t);
        api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
        delete api.defaults.headers.common['x-demo-mode'];
      } else {
        if (!user?.isDemo) {
          setUser(null);
          setToken(null);
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.isDemo]);

  const loginGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
    router.push('/dashboard');
  };

  const loginEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    router.push('/dashboard');
  };

  const signupEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
    router.push('/dashboard');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const loginAsDemo = () => {
    setLoading(true);
    const demoUser = {
      uid: 'demo-user',
      email: 'guest@senzor.dev',
      displayName: 'Demo Guest',
      isDemo: true
    };
    setUser(demoUser as any);
    setToken('demo-token');
    delete api.defaults.headers.common['Authorization'];
    api.defaults.headers.common['x-demo-mode'] = 'true';
    setLoading(false);
    router.push('/dashboard');
  };

  const logout = async () => {
    if (user?.isDemo) {
      setUser(null);
      setToken(null);
      delete api.defaults.headers.common['x-demo-mode'];
      router.push('/');
    } else {
      await signOut(auth);
      router.push('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginGoogle, loginEmail, signupEmail, resetPassword, loginAsDemo, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);