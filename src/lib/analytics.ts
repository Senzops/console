// ============================================================================
// Product analytics — typed, SSR-safe wrapper around the Senzor Web SDK.
// ----------------------------------------------------------------------------
// The SDK itself is initialised once in `pages/_app.tsx` (Senzor.init). This
// module is the single, typed entry point for emitting *product* events so call
// sites stay clean and event names stay consistent across the app.
//
// `trackEvent` is safe to call from anywhere: it no-ops during SSR and before
// the SDK is initialised, and never throws — analytics must never break a user
// flow. Event names use Title Case so they read well in the Events dashboard.
// ============================================================================

import { Senzor } from '@senzops/web';

/** Canonical product event names — the single source of truth. */
export const AnalyticsEvent = {
  SignUp: 'Sign Up',
  LogIn: 'Log In',
  ServiceCreated: 'Service Created',
  FunnelCreated: 'Funnel Created',
  ShareLinkCreated: 'Share Link Created',
  CheckoutStarted: 'Checkout Started',
  SubscriptionActivated: 'Subscription Activated',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

/** Event properties must be scalars (matches the SDK / backend contract). */
export type AnalyticsProps = Record<string, string | number | boolean>;

/**
 * Emit a product analytics event. No-ops on the server, before init, or on any
 * failure — it is intentionally fire-and-forget and never throws.
 */
export function trackEvent(name: AnalyticsEventName, props?: AnalyticsProps): void {
  if (typeof window === 'undefined') return;
  try {
    Senzor.track(name, props);
  } catch {
    /* analytics is best-effort and must never interrupt the app */
  }
}
