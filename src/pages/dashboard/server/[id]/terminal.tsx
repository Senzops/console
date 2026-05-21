import React from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { api, useAuth } from '../../../../lib/auth';
import { Button, Spinner, Badge } from '../../../../components/Core';
import { ArrowLeft, Terminal, ShieldCheck, Cpu } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// SSR disabled for Xterm
const TerminalView = dynamic(
  () => import('../../../../components/TerminalView'),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-muted-foreground"><Spinner className="mr-2 h-4 w-4" /> Loading Shell...</div> }
);

export default function TerminalPage() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuth();

  const { data, error } = useSWR(token && id ? `/vps/${id}/stats` : null, fetcher);

  if (!data && !error) {
    return <><div className="h-full flex items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div></>;
  }

  if (error || !data) {
    return <><div className="p-8 text-destructive">Server not found or access denied.</div></>;
  }

  const { vps } = data;

  return (
    <>
      <div className="h-[calc(100vh-2rem)] flex flex-col p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto w-full">

        {/* Navigation */}
        <div>
          <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-primary -ml-2 h-auto py-0 mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Server
          </Button>
        </div>

        {/* Header Details */}
        <div className="flex items-center justify-between shrink-0 mb-2">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20 shadow-sm">
              <Terminal className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Web Terminal
              </h1>
              <div className="flex gap-2 text-sm text-muted-foreground font-mono items-center mt-1">
                <Cpu className="h-3.5 w-3.5" /> {vps.name}
                <span className="text-border">|</span>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> End-to-End Encrypted
              </div>
            </div>
          </div>

          <div className="hidden md:block">
            <Badge variant="secondary" className="text-sm px-3 py-1 bg-purple-500/10 text-purple-500 border-purple-500/20">
              Interactive Session
            </Badge>
          </div>
        </div>

        {/* Main Terminal Area */}
        <div className="flex-1 min-h-0 relative shadow-2xl rounded-xl ring-1 ring-border/50">
          <TerminalView vpsId={id as string} />
        </div>
      </div>
    </>
  );
}