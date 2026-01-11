import React from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic'; // Import Dynamic
import useSWR from 'swr';
import { api, useAuth } from '../../../../lib/auth';
import { DashboardLayout } from '../../../../components/Layout';
import { Button, Spinner, Badge } from '../../../../components/Core';
import { ArrowLeft, Terminal, ShieldCheck, Cpu } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// Fix "self not defined" by disabling SSR for xterm
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
    return <DashboardLayout><div className="h-full flex items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div></DashboardLayout>;
  }

  if (error || !data) {
    return <DashboardLayout><div className="p-8 text-destructive">Server not found.</div></DashboardLayout>;
  }

  const { vps } = data;

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)] flex flex-col p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto w-full">

        {/* Refined Header (Matches Nginx/Traefik style) */}
        <div className="flex items-center gap-4 mb-2 shrink-0">
          <Button variant="ghost" onClick={() => router.back()} className="pl-0 hover:bg-transparent hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Terminal className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {vps.name} <span className="text-muted-foreground font-normal text-lg">/ Terminal</span>
              </h1>
              <div className="flex gap-2 text-sm text-muted-foreground font-mono items-center">
                <ShieldCheck className="h-3 w-3 text-emerald-500" /> Secure Tunnel Active
                <span className="text-border">|</span>
                <Cpu className="h-3 w-3" /> {vps.metadata?.os || 'Linux'}
              </div>
            </div>
          </div>

          <div className="ml-auto hidden md:block">
            <Badge variant="outline" className="font-mono text-xs border-purple-500/20 text-purple-500 bg-purple-500/5">
              root access granted
            </Badge>
          </div>
        </div>

        {/* Main Terminal Area */}
        <div className="flex-1 min-h-0 relative">
          <TerminalView vpsId={id as string} />
        </div>

        {/* Footer Hint */}
        <div className="text-[10px] text-muted-foreground text-center shrink-0">
          Use <span className="font-mono bg-muted px-1 rounded text-foreground">Ctrl+Shift+C</span> to copy and <span className="font-mono bg-muted px-1 rounded text-foreground">Ctrl+Shift+V</span> to paste.
        </div>

      </div>
    </DashboardLayout>
  );
}