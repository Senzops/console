import React from "react";
import Head from "next/head";
import { Navbar, Footer } from "../components/Layout";
import { AnimatedBackground } from "../components/AnimatedBackground";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
      <Head>
        <title>Terms of Service | Senzor</title>
        <meta
          name="description"
          content="Terms of Service and Refund Policy for Senzor platforms."
        />
      </Head>

      <Navbar />

      <main className="flex-grow pt-32 pb-24 relative overflow-hidden">
        <AnimatedBackground />

        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-4 md:px-8 relative z-10">
          <div className="mb-12 border-b border-border/40 pb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-foreground mb-4">
              Terms of Service
            </h1>
            <p className="text-muted-foreground font-mono text-sm tracking-wide uppercase">
              Last Updated: April 5, 2026
            </p>
          </div>

          <div className="space-y-10 text-base leading-relaxed text-muted-foreground">
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or using the Senzor observability platform, agents,
                APIs, or website (collectively, the "Service"), you agree to be
                bound by these Terms of Service ("Terms"). If you do not agree
                to these Terms, you may not access or use the Service. If you
                are accessing the Service on behalf of a corporate entity, you
                represent that you have the authority to bind that entity to
                these Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                2. Description of Service
              </h2>
              <p>
                Senzor provides a cloud-based observability, telemetry
                ingestion, and analytics platform. The Service allows users to
                collect, process, and visualize application performance metrics,
                logs, real user monitoring data, and infrastructure statistics.
              </p>
              <p>
                We reserve the right to modify, suspend, or discontinue any part
                of the Service at any time, with or without notice, subject to
                our Service Level Agreements (SLAs) for Enterprise customers.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                3. Account Security & API Keys
              </h2>
              <p>
                You are responsible for maintaining the confidentiality of your
                account credentials and API keys. Senzor will not be liable for
                any loss or damage arising from your failure to protect your
                authentication material. You must immediately notify us of any
                unauthorized use of your account or any other breach of
                security.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                4. Data Ingestion & Fair Use
              </h2>
              <p>
                The Service is subject to ingestion limits based on your active
                subscription plan. Data is measured in Gigabytes (GB) across all
                registered services. If you exceed your plan's ingestion limits,
                Senzor reserves the right to throttle, drop, or reject incoming
                telemetry payloads until the billing cycle resets or the plan is
                upgraded.
              </p>
              <p>
                You agree not to use the Service to transmit malicious code,
                engage in denial-of-service attacks, or intentionally overwhelm
                our ingestion infrastructure.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                5. Billing, Payments, and Refund Policy
              </h2>
              <p>
                <strong>Merchant of Record:</strong> Our order process is
                conducted by our online reseller Paddle.com. Paddle.com is the
                Merchant of Record for all our orders. Paddle provides all
                customer service inquiries and handles returns.
              </p>
              <p>
                <strong>Subscriptions & Renewals:</strong> Paid plans are billed
                in advance on a monthly or annual basis and auto-renew
                automatically. You may cancel your subscription at any time via
                your dashboard, which will halt future charges, but your service
                will remain active until the end of the current billing cycle.
              </p>
              <p>
                <strong>Refund Policy:</strong> Due to the computational and
                storage costs associated with processing high-volume telemetry
                data,{" "}
                <strong>
                  Senzor generally does not offer refunds for consumed services
                  or partial months of service.
                </strong>
              </p>
              <p>
                <em>Exceptions:</em> If you are on an annual plan and wish to
                cancel within the first 14 days of your initial purchase, and
                have ingested less than 10% of your monthly data allowance, you
                may request a prorated refund by contacting support@senzor.dev.
                Refunds are granted at our sole discretion.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                6. Data Privacy & Processing
              </h2>
              <p>
                Senzor acts as a <strong>Data Processor</strong> regarding the
                telemetry data you transmit to us. You act as the Data
                Controller. You are strictly prohibited from transmitting
                Personally Identifiable Information (PII), Protected Health
                Information (PHI), or Payment Card Industry (PCI) data to Senzor
                within your application logs or traces.
              </p>
              <p>
                Our obligations regarding the security and privacy of your data
                are outlined in our{" "}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                7. Limitation of Liability & Warranties
              </h2>
              <p>
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS.
                SENZOR EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER
                EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO THE IMPLIED
                WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
                AND NON-INFRINGEMENT.
              </p>
              <p>
                IN NO EVENT SHALL SENZOR BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL OR EXEMPLARY DAMAGES, INCLUDING BUT NOT
                LIMITED TO, DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA OR
                OTHER INTANGIBLE LOSSES (EVEN IF SENZOR HAS BEEN ADVISED OF THE
                POSSIBILITY OF SUCH DAMAGES), RESULTING FROM THE USE OR THE
                INABILITY TO USE THE SERVICE.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                8. Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate your access to the
                Service immediately, without prior notice or liability, for any
                reason whatsoever, including without limitation if you breach
                the Terms. Upon termination, your right to use the Service will
                immediately cease, and your data will be queued for deletion
                according to our data retention lifecycle.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                9. Contact Information
              </h2>
              <p>
                If you have any questions about these Terms, please contact us
                at <strong>legal@senzor.dev</strong>.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
