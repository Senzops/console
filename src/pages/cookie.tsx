import React from "react";
import Head from "next/head";
import { Navbar, Footer } from "../components/Layout";
import { AnimatedBackground } from "../components/AnimatedBackground";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 selection:text-primary">
      <Head>
        <title>Cookie Policy | Senzor</title>
        <meta
          name="description"
          content="Detailed information on how Senzor uses cookies and local storage."
        />
      </Head>

      <Navbar />

      <main className="flex-grow pt-32 pb-24 relative overflow-hidden">
        <AnimatedBackground />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-4 md:px-8 relative z-10">
          <div className="mb-12 border-b border-border/40 pb-8">
            <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tighter text-foreground mb-4">
              Cookie Policy
            </h1>
            <p className="text-muted-foreground font-mono text-sm tracking-wide uppercase">
              Effective Date: April 5, 2026
            </p>
          </div>

          <div className="space-y-10 text-base leading-relaxed text-muted-foreground">
            <section className="space-y-4">
              <p className="text-lg font-medium text-foreground">
                This Cookie Policy explains how Senzor Platforms Inc. uses
                cookies, local storage, and similar tracking technologies when
                you visit our website (senzor.dev) or use our application
                dashboard. It also clarifies how our Web Analytics and RUM SDKs
                function on our Customers' websites.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
                1. What Are Cookies?
              </h2>
              <p>
                Cookies are small text files placed on your device to store data
                that can be recalled by a web server in the domain that placed
                the cookie. We use cookies and local storage mechanisms to
                ensure the security of our application, maintain user sessions,
                and remember your dashboard preferences.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
                2. How We Use Cookies on Senzor.dev
              </h2>
              <p>
                We deploy tracking technologies strictly for essential
                operational and functional purposes:
              </p>

              <div className="space-y-6 mt-4">
                <div className="bg-card border border-border/60 p-5 rounded-xl shadow-sm">
                  <h3 className="text-lg font-bold font-display text-foreground mb-2">
                    Strictly Necessary (Authentication)
                  </h3>
                  <p className="text-sm">
                    We utilize Google Firebase Authentication. Firebase relies
                    on secure HTTP-only cookies and IndexedDB to persist your
                    login session securely across tabs and prevent Cross-Site
                    Request Forgery (CSRF) attacks. The application cannot
                    function without these.
                  </p>
                </div>

                <div className="bg-card border border-border/60 p-5 rounded-xl shadow-sm">
                  <h3 className="text-lg font-bold font-display text-foreground mb-2">
                    Functional (Dashboard Preferences)
                  </h3>
                  <p className="text-sm">
                    We use your browser's <code>localStorage</code> to remember
                    your UI preferences, such as your active theme
                    (Dark/Light/Nord), default dashboard view (Grid/List), and
                    chart color palettes. This data never leaves your device.
                  </p>
                </div>

                <div className="bg-card border border-border/60 p-5 rounded-xl shadow-sm">
                  <h3 className="text-lg font-bold font-display text-foreground mb-2">
                    Strictly Necessary (Billing & Checkout)
                  </h3>
                  <p className="text-sm">
                    When you access the pricing page or upgrade your plan, our
                    Merchant of Record, Paddle.com, deploys essential cookies to
                    manage the secure checkout flow, calculate local taxes, and
                    process payment securely.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
                3. Senzor Web Agent (Customer Deployments)
              </h2>
              <div className="bg-blue-500/5 border border-blue-500/20 p-6 rounded-xl">
                <h3 className="text-lg font-bold font-display text-blue-500 mb-3">
                  Our Analytics are Cookie-less
                </h3>
                <p className="text-foreground/80 mb-3">
                  When our Customers install the Senzor Web Analytics or Real
                  User Monitoring (RUM) SDK on their own websites,{" "}
                  <strong>the Senzor SDK does not use cookies.</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2 text-sm text-foreground/70">
                  <li>
                    We use randomly generated, anonymous UUIDs stored in the
                    browser's <code>sessionStorage</code> and{" "}
                    <code>localStorage</code> to calculate session duration and
                    unique visitor counts.
                  </li>
                  <li>
                    This data is mathematically hashed and isolated per
                    Customer.
                  </li>
                  <li>
                    Because we do not use cookies to track users across domains,
                    Customers utilizing Senzor Analytics often do not require a
                    cookie consent banner for our specific script under
                    GDPR/PECR (though Customers should verify with their own
                    legal counsel).
                  </li>
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
                4. Managing Your Preferences
              </h2>
              <p>
                Most web browsers allow you to control cookies through their
                settings preferences. However, if you limit the ability of
                websites to set Strictly Necessary cookies, you may worsen your
                overall user experience and lose access to the Senzor dashboard,
                as we cannot securely authenticate your session.
              </p>
              <p>
                To learn more about how to control cookie settings, please visit
                the help pages of your respective browser (Chrome, Firefox,
                Safari, Edge).
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-bold font-display text-foreground tracking-tight">
                5. Contact Us
              </h2>
              <p>
                If you have questions about our use of cookies or local storage,
                please contact our privacy team at:
              </p>
              <p className="font-mono font-medium text-foreground">
                privacy@senzor.dev
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
