import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner } from '../components/Core';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/AuthLayout';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
  const router = useRouter();
  const { user, loading, resendVerification, logout, completeOtpVerification } = useAuth();
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (!loading && user && !user.isDemo && user.emailVerified) {
      completeOtpVerification();
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!user || user.isDemo || user.emailVerified) return;

    const interval = setInterval(async () => {
      try {
        await user.reload?.();
        if (user.emailVerified) {
          toast.success('Email verified!');
          completeOtpVerification();
          router.replace('/dashboard');
        }
      } catch {}
    }, 4000);

    return () => clearInterval(interval);
  }, [user, router]);

  const handleResend = useCallback(async () => {
    setIsSending(true);
    try {
      await resendVerification();
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.success('Verification email sent!');
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [resendVerification]);

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
            <CardTitle className="text-2xl font-bold font-display">Verify Your Email</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center text-center space-y-5 py-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-7 w-7 text-primary" />
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-lg font-display">Check your inbox</h3>
              <p className="text-sm text-muted-foreground">
                We sent a verification link to
              </p>
              <p className="text-sm font-medium">{maskedEmail}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Click the link in the email to verify your account and continue.
              </p>
            </div>

            <div className="w-full space-y-3 pt-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={cooldown > 0 || isSending}
              >
                {isSending ? (
                  <><Spinner className="mr-2 h-4 w-4" /> Sending...</>
                ) : cooldown > 0 ? (
                  `Resend in ${cooldown}s`
                ) : (
                  <><RefreshCw className="mr-2 h-4 w-4" /> Resend Verification Email</>
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
