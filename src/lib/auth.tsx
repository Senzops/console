import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, User as FirebaseUser, onAuthStateChanged, signOut } from 'firebase/auth';
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

// --- API Instance ---
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
});

// Extended User Type for Demo
export type SenzorUser = (FirebaseUser & { isDemo?: boolean }) | { uid: string, email: string, displayName: string, isDemo: boolean };

interface AuthContextType {
  user: SenzorUser | null;
  loading: boolean;
  login: () => Promise<void>;
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

  // 1. Firebase Listener
  useEffect(() => {
    // If we are already in demo mode, don't listen to firebase
    if (user?.isDemo) return;

    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      if (currUser) {
        setUser(currUser);
        const t = await currUser.getIdToken();
        setToken(t);
        // Standard Auth Header
        api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
        delete api.defaults.headers.common['x-demo-mode'];
      } else {
        // Only reset if we aren't explicitly in demo mode (handled by loginAsDemo)
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

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // Auto-redirect to dashboard after successful login
      router.push('/dashboard');
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  // 2. Demo Login Logic
  const loginAsDemo = () => {
    setLoading(true);
    const demoUser = {
      uid: 'demo-user',
      email: 'guest@senzor.dev',
      displayName: 'Demo Guest',
      isDemo: true
    };

    setUser(demoUser);
    setToken('demo-token');

    // Inject Demo Header
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
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginAsDemo, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);