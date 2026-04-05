import React from "react";
import Head from "next/head";
import { Navbar, Footer } from "../components/Layout";
import { AnimatedBackground } from "../components/AnimatedBackground";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
      <Head>
        <title>Terms of Service | senzor</title>
        <meta
          name="description"
          content="Terms of Service and Refund Policy for senzor."
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
                By accessing or using the senzor observability platform, agents,
                APIs, or website (collectively, the "Service"), you agree to be
                bound by these Terms of Service ("Terms"). If you do not agree
                to these Terms, you may not access or use the Service. These
                terms constitute a legally binding agreement between you and
                senzor.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                2. Description of Service
              </h2>
              <p>
                senzor provides a cloud-based observability, telemetry
                ingestion, and analytics platform. The Service allows users to
                collect, process, and visualize application performance metrics,
                logs, real user monitoring data, and infrastructure statistics.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                3. Account Security & API Keys
              </h2>
              <p>
                You are responsible for maintaining the confidentiality of your
                account credentials and API keys. senzor will not be liable for
                any loss or damage arising from your failure to protect your
                authentication material.
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
                senzor reserves the right to throttle, drop, or reject incoming
                telemetry payloads until the billing cycle resets or the plan is
                upgraded.
              </p>
            </section>

            {/* --- PADDLE COMPLIANCE SECTION --- */}
            <section className="space-y-4 p-6 bg-card border border-border/60 rounded-xl shadow-sm">
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
                <strong>Refund Policy:</strong> Refunds are processed entirely
                by our Merchant of Record, Paddle.com, in strict accordance with
                Paddle's Consumer Terms and Conditions. We honor Paddle's
                standard refund policies{" "}
                <strong>
                  without any additional qualifiers, usage limits, or exceptions
                </strong>
                . If you request a refund through Paddle within their allowable
                window, it will be granted without question.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                6. Data Privacy & Processing
              </h2>
              <p>
                senzor acts as a <strong>Data Processor</strong> regarding the
                telemetry data you transmit to us. You act as the Data
                Controller. You are strictly prohibited from transmitting
                Personally Identifiable Information (PII), Protected Health
                Information (PHI), or Payment Card Industry (PCI) data to senzor
                within your application logs or traces.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                7. Limitation of Liability
              </h2>
              <p>
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS.
                SENZOR EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER
                EXPRESS OR IMPLIED. IN NO EVENT SHALL SENZOR BE LIABLE FOR ANY
                INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR EXEMPLARY
                DAMAGES.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                8. Contact Information
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
