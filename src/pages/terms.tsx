import { Footer, Navbar } from '../components/Layout';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-emerald-500/30">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-24 max-w-4xl">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
          <p className="text-muted-foreground">Last Updated: December 12, 2025</p>
        </div>

        <div className="space-y-12 text-sm md:text-base leading-relaxed">

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 text-xs">1</span>
              Acceptance of Terms
            </h2>
            <p className="text-muted-foreground">
              By accessing or using the Senzor platform ("Service"), you agree to be bound by these Terms of Service.
              If you disagree with any part of the terms, you may not access the Service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 text-xs">2</span>
              Fair Use Policy
            </h2>
            <p className="text-muted-foreground">
              Senzor provides generous free tiers for developers. To maintain the quality of service for everyone, you agree to the following fair use guidelines:
            </p>
            <ul className="grid gap-3 pl-4">
              <li className="flex gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2 shrink-0" />
                <span className="text-muted-foreground"><strong>Telemetry Intervals:</strong> You shall not modify the server agent to report metrics more frequently than once every 60 seconds unless explicitly authorized.</span>
              </li>
              <li className="flex gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2 shrink-0" />
                <span className="text-muted-foreground"><strong>Web Analytics:</strong> You may not use the web analytics script to generate artificial traffic (bot flooding) or track sensitive personal data (PII) such as credit cards or health information.</span>
              </li>
              <li className="flex gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2 shrink-0" />
                <span className="text-muted-foreground"><strong>API Usage:</strong> You agree not to abuse the API with excessive requests beyond standard dashboard usage patterns.</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 text-purple-500 text-xs">3</span>
              Prohibited Conduct
            </h2>
            <p className="text-muted-foreground">
              You agree not to use the Service to:
            </p>
            <div className="bg-card border border-border rounded-lg p-6 space-y-2 text-muted-foreground">
              <p>• Monitor infrastructure involved in illegal activities.</p>
              <p>• Attempt to reverse engineer the agent or backend infrastructure.</p>
              <p>• Resell the Service without a partnership agreement.</p>
              <p>• Interfere with or disrupt the integrity or performance of the Service.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/10 text-yellow-500 text-xs">4</span>
              Data Retention & Privacy
            </h2>
            <p className="text-muted-foreground">
              Senzor retains raw telemetry data for a limited period (typically 24 hours for granular data and 30 days for aggregated analytics).
              We do not sell your data. We use industry-standard encryption for data in transit and at rest.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-destructive/10 text-destructive text-xs">5</span>
              Disclaimer
            </h2>
            <p className="text-muted-foreground">
              The Service is provided "AS IS" and "AS AVAILABLE" without warranties of any kind.
              Senzor is not liable for any downtime, data loss, or business interruption resulting from the use of our monitoring tools.
            </p>
          </section>

        </div>
      </main>

      <Footer />
    </div>
  );
}