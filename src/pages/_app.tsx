import type { AppProps } from 'next/app';
import { AuthProvider } from '../lib/auth';
import '../styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <title>SysSentinel | Console</title>
        <meta name="description" content="Infrastructure Monitoring Without the Bloat" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/logo.png" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}