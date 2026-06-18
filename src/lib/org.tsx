import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { api, useAuth } from './auth';

export interface Organization {
  _id: string;
  slug: string;
  name: string;
  createdBy: string;
  ownerId: string;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  _id: string;
  orgId: string;
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permissions: Record<string, string[]>;
  joinedAt: string;
}

export interface OrgInvitation {
  _id: string;
  orgId: string;
  email: string;
  role: string;
  permissions: Record<string, string[]>;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

interface OrgContextType {
  organizations: Organization[];
  activeOrg: Organization | null;
  setActiveOrg: (org: Organization | null) => void;
  isOrgContext: boolean;
  isLoading: boolean;
  isReady: boolean;
  refreshOrgs: () => Promise<void>;
  activeRole: 'owner' | 'admin' | 'member' | 'viewer' | null;
  canManageMembers: boolean;
  canManageBilling: boolean;
}

const OrgContext = createContext<OrgContextType>({} as any);

const ORG_STORAGE_KEY = 'senzor-active-org';

const fetcher = (url: string) => api.get(url).then((res) => res.data);

/**
 * Fetcher that ALWAYS returns personal (non-org) data, regardless of
 * which org is currently active. It sends an empty x-org-id header which
 * the backend treats as "no org context" → ownerId = user.uid.
 *
 * Use this on pages that must always show the user's personal data
 * (e.g. the profile page) even when an org is selected.
 */
export const personalFetcher = (url: string) =>
  api.get(url, { headers: { 'x-org-id': '' } }).then((res) => res.data);

/**
 * Read stored org ID from sessionStorage and set the x-org-id header
 * SYNCHRONOUSLY so all SWR requests that fire on mount already carry it.
 */
function getStoredOrgId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = sessionStorage.getItem(ORG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed._id) {
        // Set header immediately — before any SWR request fires
        api.defaults.headers.common['x-org-id'] = parsed._id;
        return parsed._id;
      }
    }
  } catch {}
  return null;
}

/**
 * Synchronously reports whether an active org is persisted (sessionStorage).
 * Lets loading states predict which way the org page will resolve — the
 * org-detail view (an org is stored) vs the personal organizations-list view
 * (no stored org) — so the skeleton can match the landing layout.
 */
export function hasStoredActiveOrg(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const s = sessionStorage.getItem(ORG_STORAGE_KEY);
    return !!s && !!JSON.parse(s)?._id;
  } catch {
    return false;
  }
}

// Initialize the header synchronously at module load time
const _initialOrgId = getStoredOrgId();

export const OrgProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null);
  const [isReady, setIsReady] = useState(false);
  const initializedRef = useRef(false);

  // Fetch org list for all authenticated users (including demo).
  // Demo users will see any orgs they're a member of (e.g. seeded demo orgs).
  const { data, isLoading, mutate } = useSWR(
    user ? '/org' : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const organizations: Organization[] = data?.organizations || [];

  // Once org list is loaded, validate the stored org and set activeOrg.
  // If stored org is stale (user was removed), clear it.
  // Then mark as ready — downstream SWR hooks can trust the header state.
  useEffect(() => {
    if (!user) {
      // Auth still loading or user logged out — don't touch the synchronously-set
      // header; it ensures SWR requests carry the right context before auth resolves.
      setIsReady(true);
      return;
    }
    if (isLoading) return;

    // Only run initialization once per org list load
    if (initializedRef.current) return;
    initializedRef.current = true;

    const storedId = _initialOrgId || (() => {
      try {
        const s = sessionStorage.getItem(ORG_STORAGE_KEY);
        return s ? JSON.parse(s)._id : null;
      } catch { return null; }
    })();

    if (storedId && organizations.length > 0) {
      const match = organizations.find((o) => o._id === storedId);
      if (match) {
        setActiveOrgState(match);
        api.defaults.headers.common['x-org-id'] = match._id;
        setIsReady(true);
        return;
      }
    }

    // Stored org not found (removed/left) or no orgs — clear stale header
    delete api.defaults.headers.common['x-org-id'];
    try { sessionStorage.removeItem(ORG_STORAGE_KEY); } catch {}
    setActiveOrgState(null);
    setIsReady(true);
  }, [organizations, isLoading, user]);

  // Reset initialization ref when user changes (login/logout)
  useEffect(() => {
    initializedRef.current = false;
  }, [user?.uid]);

  const setActiveOrg = useCallback((org: Organization | null) => {
    setActiveOrgState(org);
    if (org) {
      api.defaults.headers.common['x-org-id'] = org._id;
      try { sessionStorage.setItem(ORG_STORAGE_KEY, JSON.stringify({ _id: org._id })); } catch {}
    } else {
      delete api.defaults.headers.common['x-org-id'];
      try { sessionStorage.removeItem(ORG_STORAGE_KEY); } catch {}
    }

    // Revalidate ALL SWR caches so every hook refetches with the new header
    globalMutate(() => true, undefined, { revalidate: true });
  }, []);

  const refreshOrgs = useCallback(async () => {
    initializedRef.current = false;
    await mutate();
  }, [mutate]);

  const activeRole = activeOrg?.role || null;
  const canManageMembers = activeRole === 'owner' || activeRole === 'admin';
  const canManageBilling = activeRole === 'owner';

  return (
    <OrgContext.Provider value={{
      organizations,
      activeOrg,
      setActiveOrg,
      isOrgContext: !!activeOrg,
      isLoading,
      isReady,
      refreshOrgs,
      activeRole,
      canManageMembers,
      canManageBilling,
    }}>
      {children}
    </OrgContext.Provider>
  );
};

export const useOrg = () => useContext(OrgContext);
