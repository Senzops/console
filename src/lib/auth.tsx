import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  getAdditionalUserInfo,
  signOut
} from 'firebase/auth';
import axios from 'axios';
import { useRouter } from 'next/router';
import { mutate as globalMutate } from 'swr';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

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

// Set by AuthProvider so the interceptor can report a refused request back into
// React state without importing the provider (which would be circular).
let notifyOtpRequired: (() => void) | null = null;

// --- Automatic Token Refresh & Retry Interceptor ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // The API refused because the second factor is outstanding. This is NOT a
    // token problem: refreshing and retrying would burn a round-trip and still
    // fail. Surface it so the app can route to verification instead.
    if (error.response?.status === 403 && error.response?.data?.code === 'OTP_REQUIRED') {
      notifyOtpRequired?.();
      return Promise.reject(error);
    }

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

// ---------------------------------------------------------------------------
// OTP verification cache.
// The server is the authority (GET /auth/session); this is purely an optimistic
// seed so a verified user does not flash the verification screen on every load.
// It is scoped to a uid and time-bounded, so a stale flag cannot carry across
// accounts or outlive the server-side session it mirrors. Trusting it grants
// nothing: every data endpoint is gated independently.
// ---------------------------------------------------------------------------
const OTP_STORAGE_KEY = 'senzor-otp-verified';
const OTP_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const readOtpCache = (uid: string): boolean => {
  try {
    const raw = localStorage.getItem(OTP_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed?.uid !== uid) return false;
    return Date.now() - Number(parsed.at) < OTP_CACHE_MAX_AGE_MS;
  } catch {
    // Pre-migration value was a bare timestamp string. Treat as absent so the
    // server check decides, rather than honouring an unscoped flag.
    return false;
  }
};

const writeOtpCache = (uid: string) => {
  try { localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify({ uid, at: Date.now() })); } catch {}
};

const clearOtpCache = () => {
  try { localStorage.removeItem(OTP_STORAGE_KEY); } catch {}
};

export type SenzorUser = (FirebaseUser & { isDemo?: boolean }) | { uid: string, email: string, displayName: string, isDemo: boolean, emailVerified: boolean, getIdToken: () => Promise<string | null>, reload?: () => Promise<void> };

interface AuthContextType {
  user: SenzorUser | null;
  loading: boolean;
  otpVerified: boolean;
  /** True once the server has answered on this session's verification state. */
  otpResolved: boolean;
  loginGoogle: () => Promise<void>;
  loginEmail: (e: string, p: string) => Promise<void>;
  signupEmail: (e: string, p: string, n: string) => Promise<void>;
  resetPassword: (e: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  loginAsDemo: () => void;
  logout: () => Promise<void>;
  token: string | null;
  getIdToken: () => Promise<string | null>;
  completeOtpVerification: () => Promise<void>;
  refreshOtpSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as any);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<SenzorUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpResolved, setOtpResolved] = useState(false);
  const router = useRouter();

  // Helper function to safely get token
  const getIdToken = async () => {
    if (!user) return null;
    if (user.isDemo) return 'demo-token';
    return await user.getIdToken();
  };

  /**
   * Reconciles local verification state with the server. On failure the
   * optimistic value is left alone: a network blip must not eject a verified
   * user, and it cannot promote an unverified one either, because every data
   * endpoint enforces the gate independently.
   */
  const refreshOtpSession = useCallback(async (uid?: string) => {
    try {
      const res = await api.get('/auth/session');
      const verified = !!res.data?.verified;
      setOtpVerified(verified);
      if (uid) {
        if (verified) writeOtpCache(uid); else clearOtpCache();
      }
    } catch {
      // Leave the optimistic value in place; see above.
    } finally {
      setOtpResolved(true);
    }
  }, []);

  // Any refused request means the second factor lapsed mid-session (revoked,
  // expired, or verified on a different sign-in). Drop straight back to
  // unverified so the route guards take over.
  useEffect(() => {
    notifyOtpRequired = () => {
      setOtpVerified(false);
      setOtpResolved(true);
      clearOtpCache();
    };
    return () => { notifyOtpRequired = null; };
  }, []);

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

        // Seed optimistically, then let the server have the final word.
        setOtpVerified(readOtpCache(currUser.uid));
        refreshOtpSession(currUser.uid);
      } else {
        if (!user?.isDemo) {
          setUser(null);
          setToken(null);
          setOtpVerified(false);
          setOtpResolved(false);
          clearOtpCache();
          delete api.defaults.headers.common['Authorization'];
          try { localStorage.removeItem('has-session'); } catch {}
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.isDemo, refreshOtpSession]);

  // Helper to get dynamic redirect URL (client-side)
  const getActionSettings = (path: string) => ({
    url: `${window.location.origin}${path}`,
    handleCodeInApp: true,
  });

  /**
   * Called by the verification page once the server has accepted a code.
   * The identity upsert and the org list were both refused while the second
   * factor was outstanding, so they are re-run here — otherwise the dashboard
   * opens against an empty workspace.
   */
  const completeOtpVerification = useCallback(async () => {
    setOtpVerified(true);
    setOtpResolved(true);
    if (auth.currentUser) writeOtpCache(auth.currentUser.uid);

    try { await api.post('/user/sync'); } catch {}
    try { await globalMutate(() => true, undefined, { revalidate: true }); } catch {}
  }, []);


  // Sign-in no longer requests the code. The verification page owns that, for
  // two reasons: it is the only component that knows whether a live code
  // already exists, and issuing it here raced the Authorization header, which
  // onAuthStateChanged sets asynchronously — the request went out unauthenticated
  // and survived only on the interceptor's retry.
  const loginGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const isNewUser = getAdditionalUserInfo(result)?.isNewUser;
    trackEvent(isNewUser ? AnalyticsEvent.SignUp : AnalyticsEvent.LogIn, { method: 'google' });
    router.push('/verify-otp');
  };

  const loginEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
    trackEvent(AnalyticsEvent.LogIn, { method: 'email' });

    const currentUser = auth.currentUser;
    if (currentUser && !currentUser.emailVerified) {
      router.push('/verify-email');
      return;
    }

    router.push('/verify-otp');
  };

  const signupEmail = async (email: string, pass: string, name: string) => {
    const creds = await createUserWithEmailAndPassword(auth, email, pass);
    trackEvent(AnalyticsEvent.SignUp, { method: 'email' });

    // 1. Update Profile Name
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: name });
      // Force update local state immediately so UI reflects name
      setUser({ ...auth.currentUser, displayName: name });
    }

    // 2. Send Verification Email with Redirect
    await sendEmailVerification(creds.user, getActionSettings('/login'));

    router.push('/verify-email');
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email, getActionSettings('/login'));
  };

  const resendVerification = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser, getActionSettings('/login'));
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
    // Demo carries no second factor: there is no account to protect and the
    // API restricts it to reads.
    setOtpVerified(true);
    setOtpResolved(true);
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
    clearOtpCache();
    setOtpVerified(false);
    setOtpResolved(false);
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
    <AuthContext.Provider value={{ user, loading, otpVerified, otpResolved, loginGoogle, loginEmail, signupEmail, resetPassword, resendVerification, loginAsDemo, logout, token, getIdToken, completeOtpVerification, refreshOtpSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
