/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext } from "react";
import axios from "axios";
import { api } from "./auth";

/**
 * Dashboard sharing — client foundation.
 *
 * In normal (authenticated) pages there is no ShareProvider, so dashboards fetch
 * from the authenticated `api` instance exactly as before. On the public
 * `/shared/[token]` page we wrap the dashboard in <ShareProvider token=...> and
 * `useShareApi()` transparently rewrites every read to the public, no-auth
 * `/public/shares/:token/...` endpoints. Components therefore work unchanged in
 * both modes — they just call `useShareApi().fetcher` instead of a hard-coded one.
 */

// No-auth axios instance for the public read path.
export const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
});

interface ShareContextValue {
  readOnly: boolean;
  token?: string;
  scopeId?: string;
}

const ShareContext = createContext<ShareContextValue>({ readOnly: false });

export const ShareProvider = ({
  token,
  scopeId,
  children,
}: {
  token: string;
  scopeId: string;
  children: React.ReactNode;
}) => (
  <ShareContext.Provider value={{ readOnly: true, token, scopeId }}>
    {children}
  </ShareContext.Provider>
);

export const useShareMode = () => useContext(ShareContext);

/**
 * Resolves the dashboard's resource id. On authenticated pages this is the route
 * param; on the public share page there is no route id, so it comes from the
 * share context. Lets a dashboard component work in both modes unchanged.
 */
export const useShareScopeId = (routerId?: string): string | undefined => {
  const { scopeId } = useContext(ShareContext);
  return scopeId ?? routerId;
};

/**
 * Returns a `fetcher` (for SWR) and a `get` that target either the authenticated
 * API or the public share endpoints, depending on the current mode. SWR keys
 * stay identical across modes (e.g. `/apm/:id/stats?...`); only the transport
 * and URL prefix differ.
 */
export const useShareApi = () => {
  const { readOnly, token } = useContext(ShareContext);

  if (readOnly && token) {
    const rewrite = (url: string) => `/public/shares/${token}${url}`;
    return {
      readOnly: true,
      get: (url: string, config?: any) => publicApi.get(rewrite(url), config),
      fetcher: (url: string) => publicApi.get(rewrite(url)).then((r) => r.data),
    };
  }

  return {
    readOnly: false,
    get: (url: string, config?: any) => api.get(url, config),
    fetcher: (url: string) => api.get(url).then((r) => r.data),
  };
};

// ---------------------------------------------------------------------------
// Share management API (authenticated — used by the share modal)
// ---------------------------------------------------------------------------

export type ShareScopeType =
  | "apm"
  | "rum"
  | "uptime"
  | "database"
  | "firebase"
  | "task"
  | "web"
  | "vps"
  | "savedview"
  | "monitorboard";

export interface DashboardShareLink {
  id: string;
  scopeType: ShareScopeType;
  scopeId: string;
  // Full public URL — the token is a capability URL and is always retrievable.
  url: string;
  label: string | null;
  defaultRange: string;
  timeRangeMode: "flexible" | "locked";
  expiresAt: string | null;
  status: "active" | "expired" | "revoked";
  accessCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSharePayload {
  scopeType: ShareScopeType;
  scopeId: string;
  label?: string;
  defaultRange?: string;
  // Provide ONE of: a custom ISO `expiresAt` (null = never), or an
  // `expiresInDays` preset (null = never). Omit both for the 30-day default.
  expiresAt?: string | null;
  expiresInDays?: number | null;
}

export const shareApi = {
  list: (scopeType: ShareScopeType, scopeId: string): Promise<DashboardShareLink[]> =>
    api
      .get(`/shares`, { params: { scopeType, scopeId } })
      .then((r) => r.data.shares),

  create: (payload: CreateSharePayload): Promise<{ share: DashboardShareLink }> =>
    api.post(`/shares`, payload).then((r) => r.data),

  update: (
    id: string,
    payload: { label?: string | null; expiresAt?: string | null; expiresInDays?: number | null }
  ): Promise<{ share: DashboardShareLink }> =>
    api.patch(`/shares/${id}`, payload).then((r) => r.data),

  revoke: (id: string): Promise<void> => api.delete(`/shares/${id}`).then(() => undefined),
};
