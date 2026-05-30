import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { api } from '../lib/auth';
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '../components/Core';
import { ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/AuthLayout';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 300;
const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyOtp() {
  const router = useRouter();
  const { user, loading, logout, completeOtpVerification, otpVerified } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [isSending, setIsSending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
    if (otpVerified) {
      router.replace('/dashboard');
    }
  }, [user, loading, router, otpVerified]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];

    if (value.length > 1) {
      const chars = value.slice(0, OTP_LENGTH - index).split('');
      chars.forEach((char, i) => {
        if (index + i < OTP_LENGTH) newDigits[index + i] = char;
      });
      setDigits(newDigits);
      const nextIndex = Math.min(index + chars.length, OTP_LENGTH - 1);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = [...digits];
    pasted.split('').forEach((char, i) => {
      newDigits[i] = char;
    });
    setDigits(newDigits);

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const submitOtp = useCallback(async (code: string) => {
    setIsVerifying(true);
    setError(null);
    try {
      const res = await api.post('/auth/otp/verify', { code });
      if (res.data.verified) {
        completeOtpVerification();
        toast.success('Welcome back!');
        const redirect = typeof router.query.redirect === 'string' ? router.query.redirect : '/dashboard';
        router.replace(redirect);
      }
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.error || 'Verification failed. Please try again.');
      if (data?.attemptsRemaining !== undefined) {
        setAttemptsRemaining(data.attemptsRemaining);
      }
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }, [completeOtpVerification, router]);

  useEffect(() => {
    const code = digits.join('');
    if (code.length === OTP_LENGTH) {
      submitOtp(code);
    }
  }, [digits, submitOtp]);

  const handleResend = async () => {
    setIsSending(true);
    setError(null);
    try {
      const res = await api.post('/auth/otp/send');
      setCountdown(res.data.expiresInSeconds || OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setAttemptsRemaining(null);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      toast.success('New code sent!');
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to resend code.';
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  if (loading || !user) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8 text-primary" />
        </div>
      </AuthLayout>
    );
  }

  const maskedEmail = user.email
    ? `${user.email.slice(0, 2)}${'*'.repeat(Math.max(user.email.indexOf('@') - 2, 2))}${user.email.slice(user.email.indexOf('@'))}`
    : '';

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={handleLogout}
              className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors"
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
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to
              </p>
              <p className="text-sm font-medium">{maskedEmail}</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2 w-full animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {error}
                  {attemptsRemaining !== null && attemptsRemaining > 0 && (
                    <span className="block text-xs mt-1 opacity-75">
                      {attemptsRemaining} attempt{attemptsRemaining !== 1 ? 's' : ''} remaining
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_LENGTH}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={isVerifying}
                  className="w-11 h-13 text-center text-xl font-semibold rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50"
                />
              ))}
            </div>

            {isVerifying && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                <span>Verifying...</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {countdown > 0 ? (
                <span>Code expires in <span className="font-medium text-foreground">{formatTime(countdown)}</span></span>
              ) : (
                <span className="text-destructive">Code expired</span>
              )}
            </div>

            <div className="w-full space-y-3 pt-1">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isSending}
              >
                {isSending ? (
                  <><Spinner className="mr-2 h-4 w-4" /> Sending...</>
                ) : resendCooldown > 0 ? (
                  `Resend code in ${resendCooldown}s`
                ) : (
                  'Resend Code'
                )}
              </Button>

              <button
                onClick={handleLogout}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
              >
                Sign in with a different account
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
