import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Navbar, Footer } from "../components/Layout";
import { Button, Card, CardContent } from "../components/Core";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { useAuth } from "../lib/auth";
import { ArrowLeft, Home, LayoutGrid, Terminal } from "lucide-react";

export default function Custom404() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>("");

  // Safely grab the window location to avoid SSR hydration mismatches
  useEffect(() => {
    if (typeof window !== "undefined") {
      const timer = setTimeout(
        () => setCurrentPath(window.location.pathname),
        0,
      );
      return () => clearTimeout(timer);
    }
  }, [router.asPath]);

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-center relative px-4 py-24 overflow-hidden border-b border-border/30">
        <AnimatedBackground />

        {/* Subtle Error Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-destructive/5 rounded-full blur-[150px] pointer-events-none -z-10" />

        <div className="relative z-10 w-full max-w-2xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* 404 Typography */}
          <div className="space-y-4">
            <h1 className="text-8xl md:text-9xl font-extrabold tracking-tighter text-foreground drop-shadow-sm">
              404
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Resource Not Found
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
              The endpoint or dashboard you are looking for does not exist, has
              been moved, or you lack the required access permissions.
            </p>
          </div>

          {/* Developer-Themed Error Log Terminal */}
          <Card className="max-w-lg mx-auto bg-[#0d1117] border-border/60 shadow-2xl text-left overflow-hidden">
            <div className="px-4 py-2.5 bg-[#161b22] border-b border-white/10 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <div className="ml-2 flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                <Terminal className="w-3 h-3" /> System Log
              </div>
            </div>
            <CardContent className="p-5 font-mono text-xs leading-loose text-[#8b949e]">
              <div className="flex items-start">
                <span className="text-[#ff7b72] mr-2 font-bold">[ERROR]</span>
                <span className="text-[#e6edf3]">Route resolution failed</span>
              </div>
              <div className="flex items-start">
                <span className="text-[#79c0ff] mr-2">path:</span>
                <span className="text-[#a5d6ff] truncate">
                  {currentPath || "/unknown"}
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-[#79c0ff] mr-2">status:</span>
                <span className="text-[#f85149]">404 Not Found</span>
              </div>
              <div className="flex items-start mt-2">
                <span className="text-[#3fb950] mr-2 font-bold">[INFO]</span>
                <span className="text-[#e6edf3]">
                  Awaiting safe fallback routing...
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Intelligent CTA Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {loading ? (
              <Button
                size="lg"
                disabled
                className="h-14 px-8 text-lg rounded-full shadow-primary/20 shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center"
              >
                Loading...
              </Button>
            ) : user ? (
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg rounded-full shadow-primary/20 shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center"
                >
                  {" "}
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/">
                <Button
                  size="lg"
                  className="h-14 px-8 text-lg rounded-full shadow-primary/20 shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center"
                >
                  {" "}
                  Return Home
                </Button>
              </Link>
            )}
            <Button
              variant="outline"
              size="lg"
              className="h-14 px-8 text-lg rounded-full border-border bg-card/50 backdrop-blur hover:bg-muted/50 hover:text-foreground"
              onClick={() => router.back()}
            >
              {" "}
              Go Back
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
