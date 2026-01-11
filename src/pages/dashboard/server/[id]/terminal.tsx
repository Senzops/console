import React from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { api, useAuth } from '../../../../lib/auth';
import { DashboardLayout } from '../../../../components/Layout';
import { Button, Spinner, Badge } from '../../../../components/Core';
import { ArrowLeft, Terminal, ShieldCheck, Cpu } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then(res => res.data);

// SSR disabled for Xterm
const TerminalView = dynamic(
  () => import('../../../../components/TerminalView'),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-muted-foreground"><Spinner className="mr-2 h-4 w-4" /> Initializing Shell Environment...</div> }
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
      <div className="h-[calc(100vh-1rem)] flex flex-col p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto w-full">

        {/* Refined Header */}
        <div className="flex flex-col gap-2 shrink-0">
          <Button variant="ghost" onClick={() => router.back()} className="pl-0 w-fit hover:bg-transparent hover:text-primary -ml-2 h-auto py-0">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Server
          </Button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20">
                <Terminal className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  {vps.name} <span className="text-muted-foreground font-normal opacity-50">/</span> Terminal
                </h1>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[10px] border-purple-500/30 text-purple-500 bg-purple-500/5 px-2 py-0.5">
                SSH-OVER-WEBSOCKET
              </Badge>
            </div>
          </div>
        </div>

        {/* Main Terminal Area */}
        <div className="flex-1 min-h-0 relative">
          <TerminalView vpsId={id as string} />
        </div>

      </div>
    </DashboardLayout>
  );
}