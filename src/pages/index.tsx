import { Navbar } from '../components/Layout';
import { Button, Card, Badge } from '../components/ui/core';
import { Zap, Activity, Lock, Server, Cpu, Globe } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 lg:pt-48 lg:pb-32">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm border-emerald-500/30 text-emerald-500 bg-emerald-500/5 backdrop-blur inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            v1.0 is Live
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
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
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-emerald-500/20 shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center justify-center">
                Start Monitoring Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-secondary/20 py-32 border-y">
        <div className="container mx-auto px-4">
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
            <div className="relative h-6 w-6 rounded overflow-hidden">
              <img src="/logo.png" alt="Logo" className="object-cover h-full w-full" />
            </div>
            SysSentinel
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
    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">{title}</h3>
    <p className="text-muted-foreground leading-relaxed">{desc}</p>
  </div>
);