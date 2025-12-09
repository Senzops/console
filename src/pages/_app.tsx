import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/auth';
import '../styles/globals.css';
import Head from 'next/head';
import { ThemeProvider } from '@/lib/theme';
import { useEffect } from 'react';
import { Senzor } from '@senzops/web';

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
        <Component {...pageProps} />
      </ThemeProvider>
    </AuthProvider>
  );
}