import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
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

// --- Automatic Token Refresh & Retry Interceptor ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401/403 and we haven't already retried this request
    if (error.response && [401, 403].includes(error.response.status) && !originalRequest._retry) {
      originalRequest._retry = true; // Prevent infinite loops
      
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Force fetch a fresh token from Firebase
          const newToken = await currentUser.getIdToken(true);
          
          // Update the global Axios instance AND the original request headers
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          
          // Transparently retry the failed request
          return api(originalRequest);
        }
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
// --------------------------------------------------------


export type SenzorUser = (FirebaseUser & { isDemo?: boolean }) | { uid: string, email: string, displayName: string, isDemo: boolean, emailVerified: boolean, getIdToken: () => Promise<string | null> };

interface AuthContextType {
  user: SenzorUser | null;
  loading: boolean;
  loginGoogle: () => Promise<void>;
  loginEmail: (e: string, p: string) => Promise<void>;
  signupEmail: (e: string, p: string, n: string) => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
  token: string | null;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SenzorUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  // Helper function to safely get token
  const getIdToken = async () => {
    if (!user) return null;
    if (user.isDemo) return 'demo-token';
    return await user.getIdToken();
  };

  useEffect(() => {
    if (user?.isDemo) return;

    const unsubscribe = onAuthStateChanged(auth, async (currUser) => {
      if (currUser) {
        const t = await currUser.getIdToken();
        api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
        delete api.defaults.headers.common['x-demo-mode'];

        api.post('/user/sync').catch((err) => {
          console.warn('[Identity Sync] Background sync deferred:', err);
        });

        setUser(currUser);
        setToken(t);
        try { localStorage.setItem('has-session', '1'); } catch {}
      } else {
        if (!user?.isDemo) {
          setUser(null);
          setToken(null);
          delete api.defaults.headers.common['Authorization'];
          try { localStorage.removeItem('has-session'); } catch {}
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.isDemo]);

  // Helper to get dynamic redirect URL (client-side)
  const getActionSettings = (path: string) => ({
    url: `${window.location.origin}${path}`,
    handleCodeInApp: true,
  });

  const loginGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
    router.push('/dashboard');
  };

  const loginEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    router.push('/dashboard');
  };

  const signupEmail = async (email: string, pass: string, name: string) => {
    const creds = await createUserWithEmailAndPassword(auth, email, pass);

    // 1. Update Profile Name
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
      // Force update local state immediately so UI reflects name
      setUser({ ...auth.currentUser, displayName: name });
    }

    // 2. Send Verification Email with Redirect
    await sendEmailVerification(creds.user, getActionSettings('/dashboard'));

    router.push('/dashboard');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email, getActionSettings('/login'));
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser, getActionSettings('/dashboard'));
    }
  };

  const loginAsDemo = () => {
    setLoading(true);
    const demoUser = {
      uid: 'demo-user',
      email: 'guest@senzor.dev',
      displayName: 'Demo Guest',
      isDemo: true,
      emailVerified: true // Demo is always verified
    };
    setUser(demoUser as any);
    setToken('demo-token');
    delete api.defaults.headers.common['Authorization'];
    // Clear any stale org context — demo users operate in personal workspace only
    delete api.defaults.headers.common['x-org-id'];
    try { sessionStorage.removeItem('senzor-active-org'); } catch {}
    api.defaults.headers.common['x-demo-mode'] = 'true';
    setLoading(false);
    router.push('/dashboard');
  };

  const logout = async () => {
    try { localStorage.removeItem('has-session'); } catch {}
    // Clear org context on logout — prevents stale header on next login
    delete api.defaults.headers.common['x-org-id'];
    try { sessionStorage.removeItem('senzor-active-org'); } catch {}
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
    <AuthContext.Provider value={{ user, loading, loginGoogle, loginEmail, signupEmail, resetPassword, resendVerification, loginAsDemo, logout, token, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);