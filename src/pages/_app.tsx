import type { AppProps } from "next/app";
import { AuthProvider } from "../lib/auth";
import "../styles/globals.css";
import Head from "next/head";
import { ThemeProvider } from "@/lib/theme";
import { useEffect, useState } from "react";
import { Senzor } from "@senzops/web";
import { Toaster } from "sonner";
import { buildTitleFromPath } from "@/utils/title";
import { useRouter } from "next/router";
import { DM_Serif_Display, Inter } from "next/font/google";

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [title, setTitle] = useState(() => buildTitleFromPath(router.asPath));

  useEffect(() => {
    // Inject font variables into the document root to fix portal/modal inheritance
    document.documentElement.classList.add(inter.variable, dmSerif.variable);
  }, []);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENZOR_WEB_ID) {
      Senzor.init({
        webId: process.env.NEXT_PUBLIC_SENZOR_WEB_ID,
      });
    }
    if (process.env.NEXT_PUBLIC_SENZOR_RUM_ID) {
      Senzor.initRum({
        apiKey: process.env.NEXT_PUBLIC_SENZOR_RUM_ID,
        sampleRate: 1.0,
        allowedOrigins: ["https://api.senzor.dev"],
      });
    }
  }, []);

  useEffect(() => {
    const handle = (url: string) => {
      setTitle(buildTitleFromPath(url));
    };
    handle(router.asPath);
    router.events.on("routeChangeComplete", handle);
    return () => {
      router.events.off("routeChangeComplete", handle);
    };
  }, [router.events, router.asPath]);

  return (
    <div className="font-sans">
      <AuthProvider>
        <ThemeProvider>
          <Head>
            <title>{title}</title>
            <meta
              name="description"
              content="Infrastructure Monitoring Without the Bloat"
            />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <link rel="manifest" href="/manifest.json" />
            <link rel="icon" href="/icon.png" />
          </Head>
          <Toaster
            position="bottom-right"
            toastOptions={{
              unstyled: true,
              classNames: {
                toast:
                  "w-full p-4 rounded-xl border border-border bg-card/50 backdrop-blur shadow-lg flex items-center gap-3 text-sm font-medium text-foreground transition-all truncate max-w-[250px]",
                content: "flex flex-col flex-1 min-w-0",
                title: "text-foreground font-semibold truncate",
                description: "text-muted-foreground truncate",
                actionButton: "bg-primary text-primary-foreground",
                cancelButton: "bg-muted text-muted-foreground",
                success: "border-emerald-500/20",
                error: "border-destructive/20 text-destructive",
                info: "border-blue-500/20",
                warning: "border-yellow-500/20",
                closeButton:
                  "bg-background border-border text-muted-foreground hover:text-foreground",
              },
            }}
          />
          <Component {...pageProps} />
        </ThemeProvider>
      </AuthProvider>
    </div>
  );
}
