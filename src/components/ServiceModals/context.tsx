/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServiceType =
  | "server"
  | "web"
  | "rum"
  | "apm"
  | "task"
  | "monitor"
  | "database"
  | "view";

export type ModalMode = "register" | "edit";

/** Data pre-populated when opening a modal in edit mode. */
export interface EditData {
  id: string;
  name?: string;
  domain?: string;
  domains?: string;
  url?: string;
  interval?: string;
  framework?: string;
  dbType?: string;
  description?: string;
  /** Called after a successful update so the dashboard page can refresh its SWR data. */
  onSuccess?: () => void | Promise<void>;
}

export interface ServiceModalState {
  /** Which modal is currently open, or null if none. */
  activeModal: ServiceType | null;
  /** Whether we're registering a new service or editing an existing one. */
  mode: ModalMode;
  /** Pre-populated data for edit mode. */
  editData: EditData | null;
}

export interface ServiceModalContextValue extends ServiceModalState {
  /**
   * Open a service modal.
   * @param type   Which service modal to open.
   * @param mode   "register" (default) or "edit".
   * @param data   Pre-populated data for edit mode.
   */
  openModal: (type: ServiceType, mode?: ModalMode, data?: EditData) => void;
  /** Close the currently-open modal and reset all transient state. */
  closeModal: () => void;

  // --- Form state (shared across all modals) ---
  name: string;
  setName: React.Dispatch<React.SetStateAction<string>>;
  domain: string;
  setDomain: React.Dispatch<React.SetStateAction<string>>;
  domains: string;
  setDomains: React.Dispatch<React.SetStateAction<string>>;
  url: string;
  setUrl: React.Dispatch<React.SetStateAction<string>>;
  interval: string;
  setInterval: React.Dispatch<React.SetStateAction<string>>;
  dbType: string;
  setDbType: React.Dispatch<React.SetStateAction<string>>;
  description: string;
  setDescription: React.Dispatch<React.SetStateAction<string>>;
  showUri: boolean;
  setShowUri: React.Dispatch<React.SetStateAction<boolean>>;

  // --- Credential step (register only) ---
  creds: any;
  setCreds: React.Dispatch<React.SetStateAction<any>>;

  // --- Loading / error per service ---
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;

  // --- Snippet selectors ---
  selectedFramework: string;
  setSelectedFramework: React.Dispatch<React.SetStateAction<string>>;
  selectedServerMethod: string;
  setSelectedServerMethod: React.Dispatch<React.SetStateAction<string>>;
  selectedWebMethod: string;
  setSelectedWebMethod: React.Dispatch<React.SetStateAction<string>>;
  selectedRumMethod: string;
  setSelectedRumMethod: React.Dispatch<React.SetStateAction<string>>;

  // --- SWR mutate callbacks (injected by Layout) ---
  mutateFns: Record<string, () => void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ServiceModalContext = createContext<ServiceModalContextValue | null>(null);

export const useServiceModal = (): ServiceModalContextValue => {
  const ctx = useContext(ServiceModalContext);
  if (!ctx) {
    throw new Error(
      "useServiceModal must be used within a ServiceModalProvider",
    );
  }
  return ctx;
};

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface ServiceModalProviderProps {
  children: React.ReactNode;
  /**
   * SWR mutate functions keyed by service type:
   * { server: mutateServers, web: mutateWeb, monitor: mutateMonitors, ... }
   */
  mutateFns: Record<string, () => void>;
}

export const ServiceModalProvider: React.FC<ServiceModalProviderProps> = ({
  children,
  mutateFns,
}) => {
  // Modal identity
  const [activeModal, setActiveModal] = useState<ServiceType | null>(null);
  const [mode, setMode] = useState<ModalMode>("register");
  const [editData, setEditData] = useState<EditData | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [domains, setDomains] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState("15");
  const [dbType, setDbType] = useState("mongodb");
  const [description, setDescription] = useState("");
  const [showUri, setShowUri] = useState(false);

  // Credential step
  const [creds, setCreds] = useState<any>(null);

  // Loading / error (single pair — only one modal open at a time)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Snippet selectors
  const [selectedFramework, setSelectedFramework] = useState("Express");
  const [selectedServerMethod, setSelectedServerMethod] =
    useState("Interactive");
  const [selectedWebMethod, setSelectedWebMethod] = useState("CDN Script");
  const [selectedRumMethod, setSelectedRumMethod] = useState("CDN Script");

  // -------------------------------------------------------------------
  const resetFormState = useCallback(() => {
    setName("");
    setDomain("");
    setDomains("");
    setUrl("");
    setInterval("15");
    setDbType("mongodb");
    setDescription("");
    setShowUri(false);
    setCreds(null);
    setLoading(false);
    setError(null);
    setSelectedFramework("Express");
    setSelectedServerMethod("Interactive");
    setSelectedWebMethod("CDN Script");
    setSelectedRumMethod("CDN Script");
  }, []);

  const openModal = useCallback(
    (type: ServiceType, m: ModalMode = "register", data?: EditData) => {
      // Reset everything first
      resetFormState();

      setActiveModal(type);
      setMode(m);
      setEditData(data ?? null);

      // Pre-populate form fields from editData
      if (m === "edit" && data) {
        if (data.name) setName(data.name);
        if (data.domain) setDomain(data.domain);
        if (data.domains) setDomains(data.domains);
        if (data.url) setUrl(data.url);
        if (data.interval) setInterval(data.interval);
        if (data.dbType) setDbType(data.dbType);
        if (data.framework) setSelectedFramework(data.framework);
        if (data.description) setDescription(data.description);
      }
    },
    [resetFormState],
  );

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setMode("register");
    setEditData(null);
    resetFormState();
  }, [resetFormState]);

  return (
    <ServiceModalContext.Provider
      value={{
        activeModal,
        mode,
        editData,
        openModal,
        closeModal,
        name,
        setName,
        domain,
        setDomain,
        domains,
        setDomains,
        url,
        setUrl,
        interval,
        setInterval,
        dbType,
        setDbType,
        description,
        setDescription,
        showUri,
        setShowUri,
        creds,
        setCreds,
        loading,
        setLoading,
        error,
        setError,
        selectedFramework,
        setSelectedFramework,
        selectedServerMethod,
        setSelectedServerMethod,
        selectedWebMethod,
        setSelectedWebMethod,
        selectedRumMethod,
        setSelectedRumMethod,
        mutateFns,
      }}
    >
      {children}
    </ServiceModalContext.Provider>
  );
};
