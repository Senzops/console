import { Navbar } from '../components/Layout';
import { Button, Card, Badge } from '../components/ui/core';
import { Zap, Activity, Lock, Server, Cpu, Globe, Terminal, CheckCircle2, BarChart3, Code, Timer } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '../lib/auth';
import { useRouter } from 'next/router';

export default function Home() {
  const { user, login } = useAuth();
  const router = useRouter();

  const handleCtaClick = () => {
    if (user) {
      router.push('/dashboard');
    } else {
      login();
    }
  };
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
            Monitor your <strong>Servers</strong>, track <strong>Web Analytics</strong>, and ensure <strong>Global Uptime</strong>.
            All from a single, lightweight dashboard designed for modern developers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={handleCtaClick}
              className="h-14 px-8 text-lg rounded-full shadow-emerald-500/20 shadow-lg hover:shadow-emerald-500/30 transition-all flex items-center justify-center">
              Start Monitoring
            </Button>
            <Link href="https://github.com/Senzops" target="_blank">
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-border backdrop-blur bg-card/40 hover:bg-card hover:text-accent">
                View on GitHub
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden pt-32 pb-24 lg:pt-48 lg:pb-32">
        <div className="max-w-3xl mx-auto rounded-xl overflow-hidden border border-border bg-card/80 backdrop-blur-xl shadow-2xl text-left">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="text-xs text-muted-foreground font-mono ml-4 flex items-center gap-2">
              <Terminal className="h-3 w-3" /> bash
            </div>
          </div>
          <div className="p-6 font-mono text-xs sm:text-sm space-y-4 overflow-x-auto">
            <div className="text-blue-500 select-none">
              <pre>
                {`   _____                               
  / ____| ___ _ __  ____ ___  _ __ 
 | (___  / _ \\ '_ \\|_  // _ \\| '__|
  \\___ \\|  __/ | | |/ /| (_) | |   
 |_____/ \\___|_| |_/___|\\___/|_|   `}
              </pre>
            </div>
            <div className="text-muted-foreground">
              <span className="text-emerald-500">root@server:~$</span> curl -sL https://raw.githubusercontent.com/senzops/server-agent/main/install_agent.sh | sudo -E bash -
            </div>
            <div className="text-muted-foreground space-y-1">
              <div>[Senzor] <span className="text-blue-400">i</span> Detecting OS... Linux (Ubuntu 22.04 LTS)</div>
              <div>[Senzor] <span className="text-blue-400">i</span> Pulling image ghcr.io/senzops/server-agent:latest...</div>
              <div>[Senzor] <span className="text-blue-400">i</span> Verifying API Key... <span className="text-emerald-500">OK</span></div>
              <div>[Senzor] <span className="text-emerald-500">✔ Agent installed and running successfully!</span></div>
              <div className="text-muted-foreground/50">Logs: docker logs -f senzor</div>
            </div>
            <div className="flex gap-2 animate-pulse">
              <span className="text-emerald-500">root@server:~$</span>
              <span className="w-2 h-5 bg-muted-foreground/50 block" />
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

      <section className="container mx-auto px-4 py-24">
        <div className="grid md:grid-cols-3 gap-8">

          {/* Server */}
          <div className="group relative p-8 rounded-3xl border border-border bg-card  transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-3xl pointer-events-none" />
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Server className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">Server Telemetry</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Granular CPU, Memory, Disk, and Docker metrics. Our agent runs in a container with minimal footprint ({'<'}50MB RAM).
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Real-time process stats</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Docker container deep-dive</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zero firewall config needed</li>
            </ul>
          </div>

          {/* Web */}
          <div className="group relative p-8 rounded-3xl border border-border bg-card  transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl pointer-events-none" />
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Globe className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">Web Analytics</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Privacy-first traffic analysis. Track unique visitors, bounce rates, and user journeys without invasive cookies.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-500" /> Lightweight (2KB) Script</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-500" /> Real-time Heatmaps</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-blue-500" /> Country & Device breakdown</li>
            </ul>
          </div>

          {/* Uptime */}
          <div className="group relative p-8 rounded-3xl border border-border bg-card  transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent rounded-3xl pointer-events-none" />
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Activity className="h-6 w-6 text-purple-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-foreground">Global Uptime</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Monitor your endpoints from distributed workers. Track latency and status codes with automated checks.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-purple-500" /> Multi-region checks</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-purple-500" /> Latency history graphs</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-purple-500" /> 1-minute check intervals</li>
            </ul>
          </div>

        </div>
      </section>

      {/* --- FEATURE GRID --- */}
      <section className="bg-secondary/20 py-32 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4 text-foreground">Why Developers Switch to Senzor</h2>
            <p className="text-muted-foreground">Traditional monitoring tools are bloated, expensive, and hard to manage. We built the alternative.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Zap}
              title="Lightning Fast"
              desc="Our agent uses Go-like concurrency patterns in Node.js to ensure minimal CPU usage on your host."
            />
            <FeatureCard
              icon={Lock}
              title="Secure by Design"
              desc="Outbound-only connections. We never ask you to open SSH ports or firewall rules."
            />
            <FeatureCard
              icon={BarChart3}
              title="Granular History"
              desc="We store raw telemetry for 24 hours and aggregated trends for 30 days."
            />
            <FeatureCard
              icon={Code}
              title="Developer API"
              desc="Everything you see in the dashboard is available via our REST API."
            />
            <FeatureCard
              icon={Timer}
              title="Health Badges"
              desc="Visual indicators for System Health, classifying uptime as Excellent, Good, or Degraded."
            />
            <FeatureCard
              icon={Terminal}
              title="Open Source"
              desc="Our agents are 100% open source. Audit the code, build it yourself, trust the process."
            />
          </div>
        </div>
      </section>

      {/* --- CTA --- */}
      <section className="py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto bg-gradient-to-b from-card to-background border border-border p-12 rounded-3xl relative overflow-hidden shadow-2xl">
            {/* Decor */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

            <h2 className="text-4xl font-bold mb-6 relative z-10 text-foreground">Ready to visualize your infrastructure?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto relative z-10">
              Join thousands of developers who trust Senzor for their monitoring needs.
              Get started for free today.
            </p>
            <div className="flex justify-center gap-4 relative z-10">
              <Button size="lg"
                onClick={handleCtaClick} className="h-12 px-8 rounded-full shadow-lg hover:shadow-emerald-500/20">Create Free Account</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-4 font-bold text-foreground">
            <div className="relative h-6 w-6 rounded overflow-hidden opacity-80">
              <img src="/logo.png" alt="Logo" className="object-cover h-full w-full" />
            </div>
            Senzor
          </div>
          <p className="text-xs opacity-50">&copy; 2025 Senzor Platforms Inc. Built for the modern web.</p>
        </div>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon: Icon, title, desc }: any) => (
  <div className="p-6 rounded-2xl bg-card border border-border hover:border-emerald-500/30 transition-colors group shadow-sm hover:shadow-md duration-300">
    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-emerald-500/10 transition-colors duration-300">
      <Icon className="h-5 w-5 text-foreground group-hover:text-emerald-500 transition-colors duration-300" />
    </div>
    <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
  </div>
);