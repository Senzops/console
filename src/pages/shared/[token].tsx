/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { Spinner } from "@/components/Core";
import { publicApi, ShareProvider } from "@/lib/share";
import { ServiceModalProvider } from "@/components/ServiceModals/context";
import ApmView from "@/components/ApmView";
import { Unlink, Clock, ArrowRight, Eye } from "lucide-react";

interface ShareMeta {
  scopeType: string;
  scopeId: string;
  name: string;
  label: string | null;
  defaultRange: string;
  timeRangeMode: "flexible" | "locked";
  expiresAt: string | null;
}

type LoadState =
  | { status: "loading" }
  | { status: "ready"; meta: ShareMeta }
  | { status: "error"; code: string; message: string };

// Renders the correct dashboard body for a given scope, read-only.
const SharedDashboardBody = ({ meta }: { meta: ShareMeta }) => {
  switch (meta.scopeType) {
    case "apm":
      return <ApmView serviceId={meta.scopeId} />;
    default:
      return (
        <div className="max-w-md mx-auto text-center py-24 px-6">
          <p className="text-muted-foreground">
            This dashboard type can’t be displayed here yet.
          </p>
        </div>
      );
  }
};

const ErrorState = ({ message }: { message: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4 px-6 text-center">
    <div className="h-12 w-12 rounded-full bg-secondary/60 flex items-center justify-center">
      <Unlink className="h-6 w-6 text-muted-foreground" />
    </div>
    <h1 className="text-xl font-semibold">Link unavailable</h1>
    <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    <Link
      href="/"
      className="text-sm text-emerald-500 hover:underline flex items-center gap-1 mt-2"
    >
      Go to Senzor <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  </div>
);

export default function SharedDashboardPage() {
  const router = useRouter();
  const { token } = router.query;
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!router.isReady || typeof token !== "string") return;

    let cancelled = false;
    publicApi
      .get(`/public/shares/${token}`)
      .then((res) => {
        if (!cancelled) setState({ status: "ready", meta: res.data });
      })
      .catch((err) => {
        if (cancelled) return;
        const data = err?.response?.data;
        setState({
          status: "error",
          code: data?.code || "NOT_FOUND",
          message:
            data?.error ||
            "This shared dashboard could not be found. It may have been revoked or the link is incorrect.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [router.isReady, token]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <Spinner className="h-8 w-8 text-emerald-500" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading shared dashboard…
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <>
        <Head>
          <meta name="robots" content="noindex, nofollow" />
          <title>Shared dashboard · Senzor</title>
        </Head>
        <ErrorState message={state.message} />
      </>
    );
  }

  const { meta } = state;

  return (
    <>
      <Head>
        {/* Public link pages must never be indexed by search engines. */}
        <meta name="robots" content="noindex, nofollow" />
        <title>{`${meta.name} · Shared dashboard`}</title>
      </Head>

      <div className="bg-background text-foreground">
        {/* --- Dashboard body in read-only mode (no top chrome — the dashboard's
            own header carries the title/time range).
            ShareProvider routes all reads to the public share endpoints.
            ServiceModalProvider satisfies the dashboard's modal hook (no-op here;
            all mutation controls are hidden in read-only mode). */}
        <main>
          <ShareProvider token={token as string}>
            <ServiceModalProvider mutateFns={{}}>
              <SharedDashboardBody meta={meta} />
            </ServiceModalProvider>
          </ShareProvider>
        </main>

        {/* --- Informative footer (detached, at the end of the dashboard).
            Clean and balanced: brand + share status on one row, then a divider
            and copyright line — mirrors the main footer's tokens. --- */}
        <footer className="border-t border-border bg-card/40 mt-12">
          <div className="max-w-7xl mx-auto px-6 md:px-8 py-10">
            {/* Brand + share status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
              <Link
                href="/"
                className="flex items-center gap-2 font-bold text-xl text-foreground hover:opacity-80 transition-opacity w-fit"
                title="Go to Senzor"
              >
                <div className="relative h-8 w-8 rounded-lg overflow-hidden bg-card shadow-sm">
                  <img src="/logo.svg" alt="Senzor Logo" className="h-full w-full object-cover logo" />
                </div>
                <span>Senzor</span>
              </Link>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                  Read-only
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  {meta.expiresAt
                    ? `Expires ${new Date(meta.expiresAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}`
                    : "Never expires"}
                </span>
              </div>
            </div>

            {/* Divider + copyright line */}
            <div className="pt-8 border-t border-border/60 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground/60">
              <p>
                &copy; {new Date().getFullYear()} Senzor Platforms Inc. All rights reserved.
              </p>
              <Link
                href="/"
                className="flex items-center gap-1 hover:text-foreground transition-colors"
              >
                Powered by <span className="font-semibold text-foreground">Senzor</span>
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
