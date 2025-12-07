import axios, { AxiosError } from "axios";

export function extractErrorMessage(error: unknown, GENERIC_MESSAGE: string): string {
  // Not an Axios error: fallback
  if (!axios.isAxiosError(error)) {
    console.error("Non-Axios error:", error);
    return GENERIC_MESSAGE;
  }

  const err = error as AxiosError<any>;
  const status = err.response?.status;
  const data = err.response?.data;

  // For 5xx errors, never show raw backend error (security/UX)
  if (status && status > 500) {
    // console.error("Server error:", data || err.message);
    return GENERIC_MESSAGE;
  }

  // If there's no response data, fall back to Axios message or generic
  if (!data) {
    return err.message || GENERIC_MESSAGE;
  }

  // If backend directly returns a string
  if (typeof data === "string") {
    return data;
  }

  // If backend returns { message: "..." } or { error: "..." }
  if (typeof data.message === "string") {
    // Try to parse JSON in message (like your example)
    const parsed = tryParseJSON(data.message);
    if (Array.isArray(parsed)) {
      // Look for validation-style errors in the array
      const messages = parsed
        .map((item) => item?.message)
        .filter((m: unknown): m is string => typeof m === "string");

      if (messages.length > 0) {
        return messages.join("\n");
      }
    }

    // If it's just a plain string, use it
    return data.message;
  }

  if (typeof data.error === "string") {
    return data.error;
  }

  // If backend sends { errors: [{ message: "..."}] }
  if (Array.isArray(data.errors)) {
    const msgs = data.errors
      .map((e: any) => e?.message)
      .filter((m: unknown): m is string => typeof m === "string");

    if (msgs.length > 0) {
      return msgs.join("\n");
    }
  }

  console.error("Unhandled error shape:", data);
  return GENERIC_MESSAGE;
}

export function tryParseJSON(str: string): any | null {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
