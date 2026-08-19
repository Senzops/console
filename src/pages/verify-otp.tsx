import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuth, api } from '../lib/auth';
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner, Dialog } from '../components/Core';
import { ShieldCheck, ArrowLeft, AlertCircle, MailCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/AuthLayout';

// ============================================================================
// Login verification.
// ----------------------------------------------------------------------------
// This page OWNS code delivery. Sign-in used to request the code, which meant
// every other route into the page — the dashboard guard redirecting a returning
// session, a reload, a deep link — landed here with nothing in the user's inbox
// and no way forward except the Resend button.
//
// Every deadline is an absolute timestamp from the server, derived against a
// ticking clock rather than a decrementing counter, so the countdowns stay
// truthful across reloads, tab suspension and clock drift.
// ============================================================================

const OTP_LENGTH = 6;

/** Server codes that mean "the code you have is dead, ask for another". */
const TERMINAL_CODES = new Set(['EXPIRED', 'TOO_MANY_ATTEMPTS', 'NO_ACTIVE_CODE', 'ALREADY_USED']);

interface CodeState {
  expiresAt: string;
  canResendAt: string;
  attemptsRemaining: number;
}

const secondsUntil = (iso: string | null, now: number) =>
  iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000)) : 0;

const formatClock = (totalSeconds: number) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const errorMessageOf = (err: any, fallback: string) =>
  err?.response?.data?.error || fallback;

export default function VerifyOtp() {
  const router = useRouter();
  const { user, loading, logout, completeOtpVerification, otpVerified, otpResolved } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [code, setCode] = useState<CodeState | null>(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsNewCode, setNeedsNewCode] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  /** Ensures the mount-time request survives a StrictMode double-invoke. */
  const bootstrappedRef = useRef(false);
  /** The last code posted, so a re-render can never spend a second attempt on it. */
  const submittedRef = useRef<string | null>(null);

  // One clock for every countdown on the page.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expiresInSeconds = secondsUntil(code?.expiresAt ?? null, now);
  const resendInSeconds = secondsUntil(code?.canResendAt ?? null, now);
  const isExpired = !!code && expiresInSeconds === 0;
  const inputsDisabled = isVerifying || isBootstrapping || needsNewCode || isExpired || !code;

  const applyCodeState = useCallback((data: any) => {
    setCode({
      expiresAt: data.expiresAt,
      canResendAt: data.canResendAt,
      attemptsRemaining: data.attemptsRemaining,
    });
    setNeedsNewCode(false);
  }, []);

  const resetInput = useCallback((focus = true) => {
    setDigits(Array(OTP_LENGTH).fill(''));
    submittedRef.current = null;
    if (focus) requestAnimationFrame(() => inputRefs.current[0]?.focus());
  }, []);

  /**
   * Requests a code. `silent` is the mount-time path: a reused code is not
   * worth a toast, and a rate-limit response there is informational, not a
   * failed user action.
   */
  const requestCode = useCallback(async (silent: boolean) => {
    setIsSending(true);
    setError(null);
    try {
      const res = await api.post('/auth/otp/send');
      applyCodeState(res.data);
      resetInput(!silent);
      if (!silent) {
        toast.success(res.data.reused ? 'Your code is still valid.' : 'New code sent.');
      }
    } catch (err: any) {
      const message = errorMessageOf(err, 'Could not send a verification code.');
      setError(message);
      if (!silent) toast.error(message);
    } finally {
      setIsSending(false);
    }
  }, [applyCodeState, resetInput]);

  // Route guards. The verification state is only trusted once the server has
  // answered, so an optimistic local flag can never bounce a user off this page.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.isDemo && !user.emailVerified) {
      router.replace('/verify-email');
      return;
    }
    if (otpResolved && otpVerified) {
      const redirect = typeof router.query.redirect === 'string' ? router.query.redirect : '/dashboard';
      router.replace(redirect);
    }
  }, [user, loading, otpResolved, otpVerified, router]);

  // Mount: ask the server what it already knows, and request a code only if
  // there isn't a live one. This is the fix for landing here with an empty inbox.
  useEffect(() => {
    if (loading || !user || user.isDemo) return;
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    (async () => {
      try {
        const res = await api.get('/auth/otp/status');
        setMaskedEmail(res.data.maskedEmail || '');

        if (res.data.verified) {
          setIsBootstrapping(false);
          return; // the guard above handles the redirect
        }

        if (res.data.code) {
          applyCodeState(res.data.code);
          setIsBootstrapping(false);
          requestAnimationFrame(() => inputRefs.current[0]?.focus());
        } else {
          setIsBootstrapping(false);
          await requestCode(true);
          requestAnimationFrame(() => inputRefs.current[0]?.focus());
        }
      } catch (err: any) {
        setIsBootstrapping(false);
        setError(errorMessageOf(err, 'Could not load verification status.'));
      }
    })();
  }, [loading, user, applyCodeState, requestCode]);

  const submitOtp = useCallback(async (value: string) => {
    setIsVerifying(true);
    setError(null);
    try {
      const res = await api.post('/auth/otp/verify', { code: value });
      if (res.data.verified) {
        await completeOtpVerification();
        toast.success('Welcome back!');
        const redirect = typeof router.query.redirect === 'string' ? router.query.redirect : '/dashboard';
        router.replace(redirect);
      }
    } catch (err: any) {
      const data = err?.response?.data;
      setError(errorMessageOf(err, 'Verification failed. Please try again.'));

      if (typeof data?.attemptsRemaining === 'number') {
        setCode((prev) => (prev ? { ...prev, attemptsRemaining: data.attemptsRemaining } : prev));
      }

      // A dead code cannot be retried — swap the UI over to requesting a new one
      // instead of leaving the user typing into an input that can never succeed.
      if (TERMINAL_CODES.has(data?.code)) setNeedsNewCode(true);

      resetInput(!TERMINAL_CODES.has(data?.code));
    } finally {
      setIsVerifying(false);
    }
  }, [completeOtpVerification, resetInput, router]);

  // Auto-submit on the sixth digit. Guarded on the exact value posted, so a
  // re-render, a StrictMode double-invoke, or a changing callback identity
  // cannot spend a second attempt on a code already in flight.
  useEffect(() => {
    const value = digits.join('');
    if (value.length !== OTP_LENGTH) return;
    if (isVerifying || inputsDisabled) return;
    if (submittedRef.current === value) return;
    submittedRef.current = value;
    submitOtp(value);
  }, [digits, isVerifying, inputsDisabled, submitOtp]);

  const fillFrom = useCallback((index: number, raw: string) => {
    const chars = raw.replace(/\D/g, '').split('');
    if (chars.length === 0) return;

    setDigits((prev) => {
      const next = [...prev];
      chars.forEach((char, i) => {
        if (index + i < OTP_LENGTH) next[index + i] = char;
      });
      return next;
    });

    const landing = Math.min(index + chars.length, OTP_LENGTH - 1);
    requestAnimationFrame(() => inputRefs.current[landing]?.focus());
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value === '') {
      setDigits((prev) => {
        const next = [...prev];
        next[index] = '';
        return next;
      });
      submittedRef.current = null;
      return;
    }
    fillFrom(index, value);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        handleChange(index, '');
        return;
      }
      if (index > 0) {
        e.preventDefault();
        handleChange(index - 1, '');
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    fillFrom(index, e.clipboardData.getData('text'));
  };

  const handleSignOut = async () => {
    setConfirmSignOut(false);
    await logout();
    router.replace('/login');
  };

  const canResend = !isSending && !isBootstrapping && (needsNewCode || resendInSeconds === 0);

  const resendLabel = useMemo(() => {
    if (isSending) return 'Sending...';
    if (needsNewCode || !code) return 'Send a new code';
    if (resendInSeconds > 0) return `Resend in ${resendInSeconds}s`;
    return 'Resend code';
  }, [isSending, needsNewCode, code, resendInSeconds]);

  if (loading || !user) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              aria-label="Sign out and return to login"
              className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <CardTitle className="text-2xl font-bold font-display">Verify Your Identity</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center space-y-5 py-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>

            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to</p>
              <p className="text-sm font-medium">{maskedEmail || user.email}</p>
            </div>

            {isBootstrapping ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-6" aria-live="polite">
                <Spinner className="h-4 w-4" />
                <span>Sending your code...</span>
              </div>
            ) : (
              <>
                <div
                  role="alert"
                  aria-live="assertive"
                  className={error ? 'w-full' : 'sr-only'}
                >
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2 text-left animate-in fade-in slide-in-from-top-1">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        {error}
                        {!needsNewCode && code && code.attemptsRemaining > 0 && (
                          <span className="block text-xs mt-1 opacity-75">
                            {code.attemptsRemaining} attempt{code.attemptsRemaining !== 1 ? 's' : ''} remaining
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <form
                  className="w-full flex flex-col items-center gap-5"
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    const value = digits.join('');
                    if (value.length === OTP_LENGTH && !inputsDisabled && submittedRef.current !== value) {
                      submittedRef.current = value;
                      submitOtp(value);
                    }
                  }}
                >
                  <fieldset disabled={inputsDisabled} className="border-0 p-0 m-0">
                    <legend className="sr-only">Six digit verification code</legend>
                    <div className="flex gap-2 justify-center">
                      {digits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { inputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete={i === 0 ? 'one-time-code' : 'off'}
                          aria-label={`Digit ${i + 1} of ${OTP_LENGTH}`}
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleChange(i, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(i, e)}
                          onPaste={(e) => handlePaste(e, i)}
                          onFocus={(e) => e.target.select()}
                          className="w-11 h-12 text-center text-xl font-semibold rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      ))}
                    </div>
                  </fieldset>

                  <div className="text-xs text-muted-foreground min-h-[1rem]" aria-live="polite">
                    {isVerifying ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Spinner className="h-3.5 w-3.5" /> Verifying...
                      </span>
                    ) : needsNewCode ? (
                      <span className="text-destructive">This code can no longer be used.</span>
                    ) : isExpired ? (
                      <span className="text-destructive">Code expired</span>
                    ) : code ? (
                      <span>
                        Code expires in{' '}
                        <span className="font-medium text-foreground">{formatClock(expiresInSeconds)}</span>
                      </span>
                    ) : null}
                  </div>
                </form>

                <div className="w-full space-y-3 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => requestCode(false)}
                    disabled={!canResend}
                  >
                    {isSending ? (
                      <Spinner className="mr-2 h-4 w-4" />
                    ) : needsNewCode || !code ? (
                      <MailCheck className="mr-2 h-4 w-4" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    {resendLabel}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setConfirmSignOut(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center focus:outline-none focus:ring-2 focus:ring-ring rounded"
                  >
                    Sign in with a different account
                  </button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmSignOut} onClose={() => setConfirmSignOut(false)} title="Sign out?">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You will be returned to the login screen and will need to sign in again to continue.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmSignOut(false)}>Stay signed in</Button>
            <Button variant="destructive" onClick={handleSignOut}>Sign out</Button>
          </div>
        </div>
      </Dialog>
    </AuthLayout>
  );
}
