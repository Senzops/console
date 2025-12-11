import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/auth';
import '../styles/globals.css';
import Head from 'next/head';
import { ThemeProvider } from '@/lib/theme';
import { useEffect } from 'react';
import { Senzor } from '@senzops/web';
import { Toaster } from 'sonner';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENZOR_WEB_ID) {
      Senzor.init({
        webId: process.env.NEXT_PUBLIC_SENZOR_WEB_ID,
      })
    };
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <Head>
          <title>Senzor | Console</title>
          <meta name="description" content="Infrastructure Monitoring Without the Bloat" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/icon.png" />
        </Head>
        <Toaster
          position="bottom-right"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: 'w-full p-4 rounded-xl border border-border bg-card/50 backdrop-blur shadow-lg flex items-center gap-3 text-sm font-medium text-foreground transition-all truncate max-w-[250px]',
              title: 'text-foreground font-semibold truncate',
              description: 'text-muted-foreground truncate',
              actionButton: 'bg-primary text-primary-foreground',
              cancelButton: 'bg-muted text-muted-foreground',
              success: 'border-emerald-500/20',
              error: 'border-destructive/20 text-destructive',
              info: 'border-blue-500/20',
              warning: 'border-yellow-500/20',
              closeButton: 'bg-background border-border text-muted-foreground hover:text-foreground'
            },
          }}
        />
        <Component {...pageProps} />
      </ThemeProvider>
    </AuthProvider>
  );
}