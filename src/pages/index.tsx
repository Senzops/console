import { Navbar } from '../components/Layout';
import { Button, Card, Badge } from '../components/ui/core';
import { Shield, Zap, Activity, Lock, Server, Cpu, Globe, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 lg:pt-48 lg:pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm border-emerald-500/30 text-emerald-500 bg-emerald-500/5 backdrop-blur">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            v1.0 is Live
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
            Infrastructure Monitoring <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-500">
              Without the Bloat.
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            SysSentinel provides a lightweight, secure telemetry agent that installs in seconds.
            Monitor CPU, Docker, and Network performance with zero configuration.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/dashboard">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-emerald-500/20 shadow-lg hover:shadow-emerald-500/30 transition-all">
                Start Monitoring Free
              </Button>
            </Link>
            <div className="text-sm text-muted-foreground">
              <span className="font-mono bg-muted px-2 py-1 rounded border mr-2">$ curl -sL sys-sentinel...</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Preview */}
      <section className="container mx-auto px-4 mb-32">
        <div className="rounded-xl border border-border bg-card/50 backdrop-blur shadow-2xl overflow-hidden max-w-5xl mx-auto">
          <div className="border-b bg-muted/50 p-4 flex gap-2 items-center">
            <div className="h-3 w-3 rounded-full bg-red-500/50" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/50" />
            <div className="h-3 w-3 rounded-full bg-green-500/50" />
          </div>
          <div className="p-8 grid md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Real-time CPU</div>
              <div className="text-3xl font-mono font-bold text-emerald-400">12.4%</div>
              <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[12%]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Memory Load</div>
              <div className="text-3xl font-mono font-bold text-blue-400">4.2 GB</div>
              <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[45%]" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Docker Containers</div>
              <div className="text-3xl font-mono font-bold text-purple-400">8 Active</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-2 w-2 rounded-sm bg-purple-500" />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-secondary/20 py-32 border-y">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">Why Developers Choose SysSentinel</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Zap}
              title="One-Line Install"
              desc="Copy one command. Paste it. Done. Our Dockerized agent handles all dependencies automatically."
            />
            <FeatureCard
              icon={Lock}
              title="Zero-Trust Security"
              desc="We use an outbound-only connection model. You never need to open firewall ports or expose IPs."
            />
            <FeatureCard
              icon={Activity}
              title="Docker Native"
              desc="Don't just monitor the host. See inside your containers with granular CPU and RAM metrics per service."
            />
            <FeatureCard
              icon={Globe}
              title="Global Latency"
              desc="Track your server's connectivity health with integrated latency monitoring to global DNS providers."
            />
            <FeatureCard
              icon={Server}
              title="Resource Efficiency"
              desc="Our agent is written in highly optimized TypeScript, consuming <1% CPU and ~50MB RAM."
            />
            <FeatureCard
              icon={Cpu}
              title="Historical Data"
              desc="Go back in time. View 24-hour performance history to debug crashes and memory leaks."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4 font-bold text-foreground">
            <ShieldCheck className="h-5 w-5 text-emerald-500" /> SysSentinel
          </div>
          <p>&copy; 2024 SysSentinel. Built for modern DevOps.</p>
        </div>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon: Icon, title, desc }: any) => (
  <div className="p-8 rounded-2xl bg-card border border-border hover:border-emerald-500/50 transition-colors group">
    <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center mb-6 group-hover:bg-emerald-500/10 transition-colors">
      <Icon className="h-6 w-6 text-foreground group-hover:text-emerald-500 transition-colors" />
    </div>
    <h3 className="text-xl font-bold mb-3">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{desc}</p>
  </div>
);