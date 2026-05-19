import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Spinner } from '../components/Core';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { AuthLayout } from '@/components/AuthLayout';

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await resetPassword(email);
      setIsSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/login" className="p-2 -ml-2 rounded-full hover:bg-secondary/50 transition-colors">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </Link>
            <CardTitle className="text-2xl font-bold font-display">Reset Password</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">Enter your email to receive a reset link</p>
        </CardHeader>
        <CardContent>
          {isSent ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg font-display">Check your inbox</h3>
                <p className="text-sm text-muted-foreground">We have sent a password reset link to <br /><strong>{email}</strong></p>
              </div>
              <Button variant="outline" className="w-full mt-4" onClick={() => setIsSent(false)}>Try another email</Button>
            </div>
          ) : (
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <><Spinner className="mr-2 h-4 w-4" /> Sending...</> : 'Send Reset Link'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}