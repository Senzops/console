import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  getAuth,
  getMultiFactorResolver,
  TotpMultiFactorGenerator,
  MultiFactorResolver,
} from 'firebase/auth';
import { useAuth } from '../lib/auth';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Spinner } from '../components/Core';
import { Eye, EyeOff, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/AuthLayout';

const OTP_LENGTH = 6;

export default function Login() {
  const router = useRouter();
  const { loginEmail, loginGoogle, completeOtpVerification } = useAuth();
  const redirect = typeof router.query.redirect === 'string' ? router.query.redirect : null;
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TOTP MFA state
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [totpDigits, setTotpDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isResolvingMfa, setIsResolvingMfa] = useState(false);
  const totpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleMfaError = (err: any) => {
    if (err.code === 'auth/multi-factor-auth-required') {
      const resolver = getMultiFactorResolver(getAuth(), err);
      const hasTotpFactor = resolver.hints.some(
        (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
      );
      if (hasTotpFactor) {
        setMfaResolver(resolver);
        setError(null);
        return true;
      }
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await loginEmail(email, pass);
      // AuthProvider handles redirect to /verify-email or /verify-otp
    } catch (err: any) {
      if (!handleMfaError(err)) {
        const msg = err.code === 'auth/invalid-credential'
          ? 'Invalid email or password.'
          : 'Failed to sign in. Please try again.';
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await loginGoogle();
    } catch (err: any) {
      if (!handleMfaError(err)) {
        if (err.code !== 'auth/popup-closed-by-user') {
          setError('Failed to sign in with Google.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- TOTP digit input handlers ---
  const handleTotpDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...totpDigits];
    if (value.length > 1) {
      const chars = value.slice(0, OTP_LENGTH - index).split('');
      chars.forEach((char, i) => {
        if (index + i < OTP_LENGTH) newDigits[index + i] = char;
      });
      setTotpDigits(newDigits);
      const nextIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
      totpInputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = value;
    setTotpDigits(newDigits);
    if (value && index < OTP_LENGTH - 1) {
      totpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleTotpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !totpDigits[index] && index > 0) {
      totpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleTotpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = [...totpDigits];
    pasted.split('').forEach((char, i) => { newDigits[i] = char; });
    setTotpDigits(newDigits);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    totpInputRefs.current[focusIndex]?.focus();
  };

  const resolveMfa = useCallback(async (code: string) => {
    if (!mfaResolver) return;
    setIsResolvingMfa(true);
    setError(null);

    const totpHint = mfaResolver.hints.find(
      (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );
    if (!totpHint) return;

    try {
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        totpHint.uid,
        code
      );
      await mfaResolver.resolveSignIn(assertion);
      completeOtpVerification();
      toast.success('Welcome back!');
      router.push(redirect || '/dashboard');
    } catch (err: any) {
      setError(
        err.code === 'auth/invalid-verification-code'
          ? 'Incorrect code. Check your authenticator app.'
          : 'Verification failed. Please try again.'
      );
      setTotpDigits(Array(OTP_LENGTH).fill(''));
      totpInputRefs.current[0]?.focus();
    } finally {
      setIsResolvingMfa(false);
    }
  }, [mfaResolver, completeOtpVerification, router, redirect]);

  useEffect(() => {
    const code = totpDigits.join('');
    if (code.length === OTP_LENGTH && mfaResolver) {
      resolveMfa(code);
    }
  }, [totpDigits, mfaResolver, resolveMfa]);

  useEffect(() => {
    if (mfaResolver) {
      setTimeout(() => totpInputRefs.current[0]?.focus(), 100);
    }
  }, [mfaResolver]);

  // --- TOTP Challenge UI ---
  if (mfaResolver) {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md border-border/50 shadow-2xl">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => { setMfaResolver(null); setError(null); setTotpDigits(Array(OTP_LENGTH).fill('')); }}
                className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <CardTitle className="text-2xl font-bold font-display">Two-Factor Authentication</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center space-y-5 py-2">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2 w-full animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-2 justify-center" onPaste={handleTotpPaste}>
                {totpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { totpInputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={OTP_LENGTH}
                    value={digit}
                    onChange={(e) => handleTotpDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleTotpKeyDown(i, e)}
                    disabled={isResolvingMfa}
                    className="w-11 h-13 text-center text-xl font-semibold rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50"
                  />
                ))}
              </div>

              {isResolvingMfa && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="h-4 w-4" />
                  <span>Verifying...</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-2">
                Open your authenticator app (Google Authenticator, Authy, etc.) and enter the current code for Senzor.
              </p>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  // --- Standard Login UI ---
  return (
    <AuthLayout>
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </Link>
            <CardTitle className="text-2xl font-bold font-display">Sign In</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Enter your email below to access your dashboard</p>
        </CardHeader>
        <CardContent className="space-y-4">

          <Button variant="outline" className="w-full relative" onClick={handleGoogleLogin} disabled={isLoading}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or continue with</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password"><span className="text-xs text-primary hover:underline cursor-pointer">Forgot password?</span></Link>
              </div>
              <div className="relative">
                <Input id="password" type={showPass ? "text" : "password"} required value={pass} onChange={(e) => setPass(e.target.value)} disabled={isLoading} />
                <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Spinner className="mr-2 h-4 w-4" /> Signing in...</> : 'Sign In'}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account? <Link href="/signup" className="underline underline-offset-4 hover:text-primary">Sign up</Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
