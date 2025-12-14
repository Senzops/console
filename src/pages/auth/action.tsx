import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAuth, applyActionCode, confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Spinner } from '../../components/Core';
import { CheckCircle2, XCircle, Key, Eye, EyeOff, MailCheck, ArrowRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { PasswordField } from '@/components/PasswordField';
import { AuthLayout } from '@/components/AuthLayout';

export default function AuthAction() {
  const router = useRouter();
  const auth = getAuth();

  // Params
  const mode = router.query.mode as string; // resetPassword | verifyEmail
  const oobCode = router.query.oobCode as string;

  // States
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'input'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState(''); // For reset password display

  // --- Handlers ---

  const handleVerifyEmail = async () => {
    try {
      await applyActionCode(auth, oobCode);
      setStatus('success');
    } catch (error: any) {
      setStatus('error');
      setErrorMsg(error.message || 'Invalid or expired verification code.');
    }
  };

  const handleResetPasswordInit = async () => {
    try {
      const email = await verifyPasswordResetCode(auth, oobCode);
      setEmail(email);
      setStatus('input'); // Show input form
    } catch (error: any) {
      setStatus('error');
      setErrorMsg(error.message || 'Invalid or expired reset code.');
    }
  };

  const validatePassword = (p: string) => {
    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})");
    return strongRegex.test(p);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword(newPass)) {
      // Basic check here, UI provides detailed feedback
      setErrorMsg("Password does not meet security requirements.");
      // We don't change status to error, just show local error if needed, 
      // but for simplicity in this structure let's rely on the PasswordField visual cues
      // and block submission.
      return;
    }

    setStatus('loading');
    setErrorMsg(''); // Clear previous errors

    try {
      await confirmPasswordReset(auth, oobCode, newPass);
      setStatus('success');
    } catch (error: any) {
      setStatus('error');
      setErrorMsg(error.message || 'Failed to reset password.');
    }
  };

  useEffect(() => {
    if (!router.isReady || !oobCode) return;

    if (mode === 'verifyEmail') {
      handleVerifyEmail();
    } else if (mode === 'resetPassword') {
      handleResetPasswordInit();
    } else {
      setStatus('error');
      setErrorMsg('Invalid action mode.');
    }
  }, [router.isReady, mode, oobCode]);

  // --- Renders ---

  const renderContent = () => {
    // 1. Loading
    if (status === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Spinner className="h-10 w-10 text-primary" />
          <p className="text-muted-foreground animate-pulse">Processing...</p>
        </div>
      );
    }

    // 2. Error
    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">Action Failed</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{errorMsg}</p>
          </div>
          <Link href="/login">
            <Button variant="outline" className="mt-4">Back to Login</Button>
          </Link>
        </div>
      );
    }

    // 3. Verify Email Success
    if (mode === 'verifyEmail' && status === 'success') {
      return (
        <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <MailCheck className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">Email Verified</h3>
            <p className="text-sm text-muted-foreground">Your email has been successfully verified.</p>
          </div>
          <Link href="/dashboard">
            <Button className="mt-4 w-full">Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      );
    }

    // 4. Reset Password Success
    if (mode === 'resetPassword' && status === 'success') {
      return (
        <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-lg">Password Reset</h3>
            <p className="text-sm text-muted-foreground">Your password has been updated successfully.</p>
          </div>
          <Link href="/login">
            <Button className="mt-4 w-full">Sign In Now</Button>
          </Link>
        </div>
      );
    }

    // 5. Reset Password Input Form
    if (mode === 'resetPassword' && status === 'input') {
      return (
        <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
          <div className="text-center mb-2">
            <div className="mx-auto h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Set New Password</h3>
            <p className="text-xs text-muted-foreground">for {email}</p>
          </div>

          {errorMsg && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <PasswordField
            id="new-pass"
            value={newPass}
            onChange={setNewPass}
            label="New Secure Password"
          />

          <Button type="submit" className="w-full">Reset Password</Button>
        </form>
      );
    }

    return null;
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center justify-center gap-2">
            <div className="relative h-8 w-8 rounded-lg overflow-hidden">
              <img
                src="/logo.svg"
                alt="Logo"
                className="object-cover h-full w-full logo"
              />
            </div>
            <span className="font-bold text-xl">Senzor Auth</span>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}