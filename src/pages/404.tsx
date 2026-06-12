import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Navbar, Footer } from "../components/Layout";
import { Button, cn } from "../components/Core";
import { NetworkBackground } from "../components/NetworkBackground";
import { Mascot } from "../components/Mascot";
import { useAuth } from "../lib/auth";

export default function Custom404() {
  const router = useRouter();
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-center relative px-4 py-32 overflow-hidden border-b border-border/30 h-screen">
        <NetworkBackground />

        <div className="relative z-10 w-full max-w-2xl text-center space-y-8">
          <div className="space-y-4">
            <Mascot mood="searching" size="xl" interactive className="mx-auto" />
            <h1 className="text-7xl md:text-8xl font-bold font-display tracking-tighter text-foreground">
              404
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-foreground">
              Page not found
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved. Check the URL or navigate back to a known location.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href={loading ? "#" : user ? "/dashboard" : "/"}
              className={cn(loading ? "pointer-events-none" : "")}
            >
              <Button
                size="lg"
                className="h-12 px-8 text-base rounded-full shadow-primary/20 shadow-lg hover:shadow-primary/30 transition-all"
              >
                Return Home
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base rounded-full border-border bg-card/50 backdrop-blur hover:bg-muted/50 hover:text-foreground"
              onClick={() => router.back()}
            >
              Go Back
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
