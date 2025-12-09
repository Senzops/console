import { useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { Spinner } from '../components/ui/core';

export default function Demo() {
  const { loginAsDemo, user } = useAuth();

  useEffect(() => {
    if (!user) {
      loginAsDemo();
    }
  }, [user, loginAsDemo]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-foreground space-y-4">
      <Spinner className="h-10 w-10 text-emerald-500" />
      <p className="text-muted-foreground animate-pulse">Initializing Demo Environment...</p>
    </div>
  );
}