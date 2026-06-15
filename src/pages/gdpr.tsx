import React from "react";
import Head from "next/head";
import { Navbar, Footer } from "../components/Layout";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { ShieldCheck, FileText, Globe, Server } from "lucide-react";
import Link from "next/link";
import { Button } from "../components/Core";

export default function GdprCompliance() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-emerald-500/20 selection:text-emerald-500">
      <Head>
        <title>GDPR Compliance | Senzor</title>
        <meta
          name="description"
          content="Senzor's commitment to the General Data Protection Regulation (GDPR)."
        />
      </Head>

      <Navbar />

      <main className="flex-grow pt-32 pb-24 relative overflow-hidden">
        <AnimatedBackground />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-4 md:px-8 relative z-10">
          <div className="mb-12 border-b border-border/40 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tighter text-foreground mb-4 flex items-center gap-4">
                <ShieldCheck className="h-10 w-10 text-emerald-500" />
                GDPR Compliance
              </h1>
              <p className="text-muted-foreground font-mono text-sm tracking-wide uppercase">
                European Data Protection Standards
              </p>
            </div>
            <a href="mailto:privacy@senzor.dev">
              <Button
                variant="outline"
                className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
              >
                Contact Privacy Team
              </Button>
            </a>
          </div>

          <div className="space-y-10 text-base leading-relaxed text-muted-foreground">
            <section className="space-y-4">
              <p className="text-lg font-medium text-foreground">
                Senzor Platforms Inc. is fully committed to compliance with the
                General Data Protection Regulation (GDPR). We have architected
                our platform, operational protocols, and legal frameworks to
                ensure that the data of European Union (EU) and United Kingdom
                (UK) residents is handled with the highest standards of privacy
                and security.
              </p>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-10">
              <div className="bg-card border border-border/60 p-6 rounded-xl shadow-sm">
                <Globe className="h-6 w-6 text-blue-500 mb-3" />
                <h3 className="text-lg font-bold font-display text-foreground mb-2">
                  Cross-Border Transfers
                </h3>
                <p className="text-sm">
                  We utilize Standard Contractual Clauses (SCCs) approved by the
                  European Commission to ensure adequate protection for data
                  transferred outside of the EEA/UK to our US-based
                  infrastructure.
                </p>
              </div>
              <div className="bg-card border border-border/60 p-6 rounded-xl shadow-sm">
                <Server className="h-6 w-6 text-purple-500 mb-3" />
                <h3 className="text-lg font-bold font-display text-foreground mb-2">
                  Data Minimization
                </h3>
                <p className="text-sm">
                  Our platform strictly enforces per-document Time-To-Live (TTL)
                  indexes. Telemetry data is automatically expunged from our
                  databases at the end of your plan's retention window (3 to 90
                  days), minimizing your compliance footprint.
                </p>
              </div>
            </div>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
                1. Data Processing Agreement (DPA)
              </h2>
              <p>
                Senzor offers a comprehensive Data Processing Agreement (DPA)
                that governs the relationship between you (the Data Controller)
                and Senzor (the Data Processor) under the GDPR.
              </p>
              <p>
                Our DPA includes the necessary Standard Contractual Clauses
                (SCCs) and details our technical and organizational measures
                (TOMs). Enterprise Customers may request a countersigned copy of
                our DPA by contacting our support team.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
                2. Lawful Basis for Processing
              </h2>
              <p>
                When acting as a Data Controller (managing your administrative
                account data), we process personal data based on the following
                lawful bases:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Performance of a Contract:</strong> Processing
                  necessary to provide the Senzor platform and fulfill our Terms
                  of Service.
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> Processing necessary to
                  secure our platform, prevent fraud, and improve our services.
                </li>
                <li>
                  <strong>Compliance with Legal Obligations:</strong> Processing
                  necessary for tax, accounting, and legal requirements.
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
                3. Data Subject Access Requests (DSAR)
              </h2>
              <p>
                The GDPR grants specific rights to individuals regarding their
                personal data. We support your ability to honor these rights.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Right of Access & Portability:</strong> You can export
                  your operational dashboards and metrics directly from the
                  platform.
                </li>
                <li>
                  <strong>Right to Erasure (Right to be Forgotten):</strong> You
                  may delete your account, servers, and entire workspaces from
                  the dashboard. This triggers a cascading, hard deletion of all
                  associated telemetry and metadata across our databases.
                </li>
                <li>
                  <strong>Assistance:</strong> If an end-user submits a DSAR to
                  you regarding telemetry data captured by Senzor, we will
                  provide reasonable technical assistance to help you fulfill
                  the request, though telemetry data is inherently anonymized
                  and ephemeral.
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
                4. Prohibited Data (The Customer&apos;s Obligation)
              </h2>
              <p>
                Senzor is an infrastructure and application observability
                platform, not a secure vault for Personal Data. To maintain
                compliance and limit liability,{" "}
                <strong>
                  Customers are strictly prohibited by our Terms of Service from
                  sending Personally Identifiable Information (PII) into Senzor
                  logs, traces, or custom metrics.
                </strong>
              </p>
              <p>
                You must sanitize, mask, or redact PII (e.g., clear-text email
                addresses, social security numbers, passwords) at the edge
                before it is transmitted to our ingestion APIs.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
                5. Incident Response & Breach Notification
              </h2>
              <p>
                In the event of a personal data breach impacting our systems,
                Senzor will notify affected Customers without undue delay (and
                within the timeframe required by the GDPR) after becoming aware
                of the breach. We will provide necessary information to assist
                you in meeting your own regulatory reporting obligations.
              </p>
            </section>

            <div className="pt-8 border-t border-border/40 flex items-center gap-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
              <div className="text-sm">
                For further legal inquiries, vendor security questionnaires, or
                DPA executions, please contact{" "}
                <a
                  href="mailto:privacy@senzor.dev"
                  className="text-foreground font-medium hover:underline"
                >
                  privacy@senzor.dev
                </a>
                .
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
