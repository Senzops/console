import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  getAuth,
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  MultiFactorInfo,
  MultiFactorResolver,
  getMultiFactorResolver,
} from 'firebase/auth';
import { QRCodeSVG } from 'qrcode.react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  Spinner,
  Badge,
  Input,
  Label,
  cn,
} from '../Core';
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Copy,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  MonitorSmartphone,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/auth';

const OTP_LENGTH = 6;
const APP_NAME = 'Senzor';

type SetupStep = 'reauth' | 'loading' | 'qr' | 'success';
type RemoveStep = 'confirm' | 'reauth' | 'reauth-mfa';

function isGoogleUser(user: any): boolean {
  return user.providerData?.some?.((p: any) => p.providerId === 'google.com') ?? false;
}

export const MfaSecuritySection = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const { logout } = useAuth();

  const [enrolledFactors, setEnrolledFactors] = useState<MultiFactorInfo[]>([]);

  // --- Setup state ---
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>('loading');
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [qrUri, setQrUri] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // --- Remove state ---
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [removeStep, setRemoveStep] = useState<RemoveStep>('confirm');
  const [isRemoving, setIsRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removeResolver, setRemoveResolver] = useState<MultiFactorResolver | null>(null);
  const [removeDigits, setRemoveDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));

  // --- Session revocation state ---
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  // --- Shared re-auth state ---
  const [reauthPassword, setReauthPassword] = useState('');
  const [showReauthPassword, setShowReauthPassword] = useState(false);
  const [isReauthing, setIsReauthing] = useState(false);

  const setupInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const removeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const refreshFactors = useCallback(() => {
    if (!currentUser) return;
    setEnrolledFactors(multiFactor(currentUser).enrolledFactors);
  }, [currentUser]);

  useEffect(() => { refreshFactors(); }, [refreshFactors]);

  const isMfaEnabled = enrolledFactors.some(
    (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
  );

  // ============================================================================
  // SETUP (ENROLLMENT) FLOW
  // ============================================================================

  const generateTotpSecret = async () => {
    if (!currentUser) return;
    setSetupStep('loading');
    setSetupError(null);

    const session = await multiFactor(currentUser).getSession();
    const secret = await TotpMultiFactorGenerator.generateSecret(session);

    setTotpSecret(secret);
    setQrUri(secret.generateQrCodeUrl(currentUser.email || '', APP_NAME));
    setSecretKey(secret.secretKey);
    setSetupStep('qr');
  };

  const handleStartSetup = async () => {
    if (!currentUser) return;
    setSetupError(null);
    setIsSetupOpen(true);

    try {
      await generateTotpSecret();
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        if (isGoogleUser(currentUser)) {
          try {
            await reauthenticateWithPopup(currentUser, new GoogleAuthProvider());
            await generateTotpSecret();
          } catch {
            setSetupError('Re-authentication failed. Please try again.');
            setIsSetupOpen(false);
          }
        } else {
          setSetupStep('reauth');
        }
      } else {
        setSetupError(err.message || 'Failed to start MFA setup.');
        setIsSetupOpen(false);
      }
    }
  };

  const handleSetupReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.email) return;
    setIsReauthing(true);
    setSetupError(null);

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, reauthPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await generateTotpSecret();
    } catch (err: any) {
      setSetupError(
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
          ? 'Incorrect password.'
          : 'Re-authentication failed. Please try again.'
      );
    } finally {
      setIsReauthing(false);
    }
  };

  const handleVerifyAndEnroll = useCallback(async (code: string) => {
    if (!currentUser || !totpSecret) return;
    setIsVerifying(true);
    setSetupError(null);

    try {
      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, code);
      await multiFactor(currentUser).enroll(assertion, 'Authenticator App');
      setSetupStep('success');
      refreshFactors();
      toast.success('Authenticator app enabled!');
    } catch (err: any) {
      setSetupError(
        err.code === 'auth/invalid-verification-code'
          ? 'Incorrect code. Please check your authenticator app and try again.'
          : err.message || 'Verification failed.'
      );
      setDigits(Array(OTP_LENGTH).fill(''));
      setupInputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  }, [currentUser, totpSecret, refreshFactors]);

  useEffect(() => {
    const code = digits.join('');
    if (code.length === OTP_LENGTH && setupStep === 'qr') {
      handleVerifyAndEnroll(code);
    }
  }, [digits, setupStep, handleVerifyAndEnroll]);

  const handleCloseSetup = () => {
    setIsSetupOpen(false);
    setSetupStep('loading');
    setTotpSecret(null);
    setQrUri('');
    setSecretKey('');
    setShowSecretKey(false);
    setDigits(Array(OTP_LENGTH).fill(''));
    setSetupError(null);
    setReauthPassword('');
    setShowReauthPassword(false);
  };

  // ============================================================================
  // REMOVE (UNENROLLMENT) FLOW
  // ============================================================================

  const performUnenrollment = async () => {
    if (!currentUser) return;
    const totpFactor = enrolledFactors.find(
      (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );
    if (!totpFactor) return;

    await multiFactor(currentUser).unenroll(totpFactor);
    refreshFactors();
    handleCloseRemove();
    toast.success('Authenticator app removed.');
  };

  const handleMfaReauthError = (err: any) => {
    if (err.code === 'auth/multi-factor-auth-required') {
      const resolver = getMultiFactorResolver(auth, err);
      const hasTotpFactor = resolver.hints.some(
        (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
      );
      if (hasTotpFactor) {
        setRemoveResolver(resolver);
        setRemoveDigits(Array(OTP_LENGTH).fill(''));
        setRemoveStep('reauth-mfa');
        return true;
      }
    }
    return false;
  };

  const handleRemoveMfa = async () => {
    if (!currentUser) return;
    setIsRemoving(true);
    setRemoveError(null);

    try {
      await performUnenrollment();
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        if (isGoogleUser(currentUser)) {
          try {
            await reauthenticateWithPopup(currentUser, new GoogleAuthProvider());
            await performUnenrollment();
          } catch (popupErr: any) {
            if (!handleMfaReauthError(popupErr)) {
              setRemoveError('Re-authentication failed. Please try again.');
            }
          }
        } else {
          setRemoveStep('reauth');
          setReauthPassword('');
        }
      } else if (err.code === 'auth/user-token-expired') {
        toast.error('Session expired. Please sign in again.');
        logout();
      } else {
        setRemoveError(err.message || 'Failed to remove authenticator.');
      }
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRemoveReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.email) return;
    setIsReauthing(true);
    setRemoveError(null);

    try {
      const credential = EmailAuthProvider.credential(currentUser.email, reauthPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await performUnenrollment();
    } catch (err: any) {
      if (handleMfaReauthError(err)) {
        // Switched to reauth-mfa step
      } else if (err.code === 'auth/user-token-expired') {
        toast.error('Session expired. Please sign in again.');
        logout();
      } else {
        setRemoveError(
          err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
            ? 'Incorrect password.'
            : err.message || 'Failed to remove authenticator.'
        );
      }
    } finally {
      setIsReauthing(false);
    }
  };

  const resolveRemoveMfaChallenge = useCallback(async (code: string) => {
    if (!removeResolver || !currentUser) return;
    setIsRemoving(true);
    setRemoveError(null);

    const totpHint = removeResolver.hints.find(
      (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
    );
    if (!totpHint) return;

    try {
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(totpHint.uid, code);
      await removeResolver.resolveSignIn(assertion);

      // Re-auth complete, now unenroll
      await performUnenrollment();
    } catch (err: any) {
      if (err.code === 'auth/invalid-verification-code') {
        setRemoveError('Incorrect code. Check your authenticator app.');
      } else if (err.code === 'auth/user-token-expired') {
        toast.error('Session expired. Please sign in again.');
        logout();
      } else {
        setRemoveError(err.message || 'Verification failed.');
      }
      setRemoveDigits(Array(OTP_LENGTH).fill(''));
      removeInputRefs.current[0]?.focus();
    } finally {
      setIsRemoving(false);
    }
  }, [removeResolver, currentUser, logout]);

  useEffect(() => {
    const code = removeDigits.join('');
    if (code.length === OTP_LENGTH && removeStep === 'reauth-mfa') {
      resolveRemoveMfaChallenge(code);
    }
  }, [removeDigits, removeStep, resolveRemoveMfaChallenge]);

  useEffect(() => {
    if (removeStep === 'reauth-mfa') {
      setTimeout(() => removeInputRefs.current[0]?.focus(), 100);
    }
  }, [removeStep]);

  const handleCloseRemove = () => {
    setIsRemoveOpen(false);
    setRemoveStep('confirm');
    setRemoveError(null);
    setReauthPassword('');
    setShowReauthPassword(false);
    setRemoveResolver(null);
    setRemoveDigits(Array(OTP_LENGTH).fill(''));
  };

  // ============================================================================
  // SESSION REVOCATION
  // ============================================================================

  const handleRevokeSessions = async () => {
    setIsRevoking(true);
    try {
      await api.post('/auth/revoke-sessions');
      toast.success('All sessions revoked.');
      setIsRevokeOpen(false);
      await logout();
    } catch {
      toast.error('Failed to revoke sessions. Please try again.');
    } finally {
      setIsRevoking(false);
    }
  };

  // ============================================================================
  // SHARED DIGIT INPUT HANDLER FACTORY
  // ============================================================================

  const createDigitHandlers = (
    digits: string[],
    setDigits: React.Dispatch<React.SetStateAction<string[]>>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  ) => ({
    onChange: (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;
      const newDigits = [...digits];
      if (value.length > 1) {
        const chars = value.slice(0, OTP_LENGTH - index).split('');
        chars.forEach((char, i) => { if (index + i < OTP_LENGTH) newDigits[index + i] = char; });
        setDigits(newDigits);
        refs.current[Math.min(index + chars.length, OTP_LENGTH - 1)]?.focus();
        return;
      }
      newDigits[index] = value;
      setDigits(newDigits);
      if (value && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
    },
    onKeyDown: (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus();
    },
    onPaste: (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (!pasted) return;
      const newDigits = [...digits];
      pasted.split('').forEach((char, i) => { newDigits[i] = char; });
      setDigits(newDigits);
      refs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    },
  });

  const setupDigitHandlers = createDigitHandlers(digits, setDigits, setupInputRefs);
  const removeDigitHandlers = createDigitHandlers(removeDigits, setRemoveDigits, removeInputRefs);

  const copySecretKey = () => {
    navigator.clipboard.writeText(secretKey);
    toast.success('Secret key copied!');
  };

  // ============================================================================
  // REUSABLE UI FRAGMENTS
  // ============================================================================

  const renderReauthForm = (
    onSubmit: (e: React.FormEvent) => Promise<void>,
    error: string | null,
    onCancel: () => void,
  ) => (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-lg">Confirm Your Identity</h3>
          <p className="text-sm text-muted-foreground">
            For security, please re-enter your password to continue.
          </p>
        </div>
      </div>
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="reauth-password">Password</Label>
        <div className="relative">
          <Input id="reauth-password" type={showReauthPassword ? 'text' : 'password'} value={reauthPassword}
            onChange={(e) => setReauthPassword(e.target.value)} disabled={isReauthing} autoFocus required />
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setShowReauthPassword(!showReauthPassword)}>
            {showReauthPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isReauthing}>Cancel</Button>
        <Button type="submit" disabled={isReauthing || !reauthPassword}>
          {isReauthing ? <><Spinner className="mr-2 h-4 w-4" /> Verifying...</> : 'Continue'}
        </Button>
      </div>
    </form>
  );

  const renderDigitInput = (
    inputDigits: string[],
    handlers: ReturnType<typeof createDigitHandlers>,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>,
    disabled: boolean,
  ) => (
    <div className="flex gap-2 justify-center" onPaste={handlers.onPaste}>
      {inputDigits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={OTP_LENGTH}
          value={digit}
          onChange={(e) => handlers.onChange(i, e.target.value)}
          onKeyDown={(e) => handlers.onKeyDown(i, e)}
          disabled={disabled}
          className="w-10 h-12 text-center text-lg font-semibold rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all disabled:opacity-50"
        />
      ))}
    </div>
  );

  if (!currentUser || currentUser.isAnonymous) return null;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      {/* --- Security Card --- */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="py-4 border-b border-border/40 flex flex-row items-center justify-between h-14 shrink-0 bg-muted/20">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
            <Shield className="w-4 h-4 text-primary" /> Security
          </CardTitle>
          {isMfaEnabled ? (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] uppercase tracking-wider font-bold">MFA Active</Badge>
          ) : (
            <Badge variant="outline" className="bg-muted text-muted-foreground border-border/60 text-[10px] uppercase tracking-wider font-bold">Standard</Badge>
          )}
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", isMfaEnabled ? "bg-emerald-500/10" : "bg-muted")}>
                {isMfaEnabled ? <ShieldCheck className="h-5 w-5 text-emerald-500" /> : <ShieldOff className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Authenticator App (TOTP)</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-md">
                  {isMfaEnabled
                    ? 'Your account is protected with an authenticator app. You will be prompted for a code on every sign-in.'
                    : 'Add an authenticator app like Google Authenticator or Authy for stronger security. When enabled, it replaces email verification codes on login.'}
                </p>
              </div>
            </div>
            {isMfaEnabled ? (
              <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive hover:text-white shrink-0 font-semibold" onClick={() => setIsRemoveOpen(true)}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove
              </Button>
            ) : (
              <Button size="sm" className="shrink-0 font-semibold" onClick={handleStartSetup}>
                <Smartphone className="h-3.5 w-3.5 mr-1.5" /> Enable
              </Button>
            )}
          </div>

          <div className="border-t border-border/40 mt-5 pt-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                  <MonitorSmartphone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-md">
                    Sign out from all devices and browsers. You will need to sign in again everywhere, including this device.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 font-semibold"
                onClick={() => setIsRevokeOpen(true)}
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Revoke Sessions Dialog --- */}
      <Dialog
        open={isRevokeOpen}
        onClose={() => setIsRevokeOpen(false)}
        title="Sign Out from All Devices"
      >
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-sm text-amber-700 dark:text-amber-500/90 leading-relaxed">
            <strong className="block text-amber-600 dark:text-amber-500 mb-1 font-bold">
              This will sign you out everywhere
            </strong>
            All active sessions across every device and browser will be invalidated,
            including this one. You will be redirected to the sign-in page.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsRevokeOpen(false)} disabled={isRevoking}>
              Cancel
            </Button>
            <Button onClick={handleRevokeSessions} disabled={isRevoking}>
              {isRevoking ? <><Spinner className="mr-2 w-4 h-4" /> Revoking...</> : 'Sign Out All Devices'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* --- Setup Dialog --- */}
      <Dialog open={isSetupOpen} onClose={handleCloseSetup} title="Set Up Authenticator App">
        {setupStep === 'reauth' && renderReauthForm(handleSetupReauthSubmit, setupError, handleCloseSetup)}

        {setupStep === 'loading' && (
          <div className="flex flex-col items-center justify-center py-10 space-y-4">
            <Spinner className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Generating secret...</p>
          </div>
        )}

        {setupStep === 'qr' && (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground text-center">Scan this QR code with your authenticator app</p>
            <div className="flex justify-center">
              <div className="p-4 bg-white rounded-xl"><QRCodeSVG value={qrUri} size={200} level="M" /></div>
            </div>
            <div className="space-y-2">
              <button onClick={() => setShowSecretKey(!showSecretKey)} className="text-xs text-primary hover:underline w-full text-center">
                {showSecretKey ? 'Hide' : "Can't scan? Enter key manually"}
              </button>
              {showSecretKey && (
                <div className="flex items-center gap-2 bg-muted/50 border border-border/60 rounded-lg p-3">
                  <code className="text-xs font-mono text-foreground flex-1 break-all select-all">{secretKey}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={copySecretKey}><Copy className="h-3.5 w-3.5" /></Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-center text-muted-foreground">Enter the 6-digit code from your app</p>
              {setupError && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{setupError}</span>
                </div>
              )}
              {renderDigitInput(digits, setupDigitHandlers, setupInputRefs, isVerifying)}
              {isVerifying && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /><span>Verifying...</span></div>
              )}
            </div>
          </div>
        )}

        {setupStep === 'success' && (
          <div className="flex flex-col items-center justify-center py-6 space-y-4 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 className="h-6 w-6 text-emerald-500" /></div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">MFA Enabled</h3>
              <p className="text-sm text-muted-foreground">Your account is now protected with two-factor authentication. You will need your authenticator app to sign in.</p>
            </div>
            <Button onClick={handleCloseSetup} className="mt-2">Done</Button>
          </div>
        )}
      </Dialog>

      {/* --- Remove Dialog --- */}
      <Dialog open={isRemoveOpen} onClose={handleCloseRemove} title="Remove Authenticator">
        {removeStep === 'confirm' && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-sm text-amber-700 dark:text-amber-500/90 leading-relaxed">
              <strong className="block text-amber-600 dark:text-amber-500 mb-1 font-bold">Security Downgrade</strong>
              Removing your authenticator app will disable two-factor authentication.
              You will fall back to email verification codes for login security.
            </div>
            {removeError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{removeError}</span>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={handleCloseRemove} disabled={isRemoving}>Keep MFA</Button>
              <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={handleRemoveMfa} disabled={isRemoving}>
                {isRemoving ? <><Spinner className="mr-2 w-4 h-4" /> Removing...</> : 'Yes, Remove MFA'}
              </Button>
            </div>
          </div>
        )}

        {removeStep === 'reauth' && renderReauthForm(handleRemoveReauthSubmit, removeError, handleCloseRemove)}

        {removeStep === 'reauth-mfa' && (
          <div className="flex flex-col items-center text-center space-y-5 py-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">Authenticator Verification</h3>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app to confirm removal.
              </p>
            </div>

            {removeError && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md flex items-start gap-2 w-full animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{removeError}</span>
              </div>
            )}

            {renderDigitInput(removeDigits, removeDigitHandlers, removeInputRefs, isRemoving)}

            {isRemoving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /><span>Removing...</span></div>
            )}

            <button onClick={handleCloseRemove} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        )}
      </Dialog>
    </>
  );
};
