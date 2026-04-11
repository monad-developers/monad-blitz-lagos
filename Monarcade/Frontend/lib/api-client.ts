"use client";

import { useAuth } from "./auth";
import { useCallback, useMemo } from "react";
import { API_BASE_URL } from "@/lib/monad";

type ApiMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

type ApiErrorPayload = {
  error?:
    | string
    | {
        code?: string;
        message?: string;
        details?: unknown;
      };
  message?: string;
};

const formatApiError = (
  payload: ApiErrorPayload | null,
  status: number,
  statusText: string,
) => {
  const fallback = `API request failed: ${status} ${statusText}`.trim();

  if (!payload) {
    return fallback;
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  if (payload.error && typeof payload.error === "object") {
    const code = payload.error.code ? ` [${payload.error.code}]` : "";
    const message = payload.error.message || fallback;
    return `${message}${code}`;
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  return fallback;
};

const looksLikeHtml = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
};

/**
 * Hook for making authenticated API calls to the backend.
 * Automatically includes the Privy JWT token in the Authorization header.
 */
export function useApiClient() {
  const { getAuthToken } = useAuth();

  const getAuthTokenWithRetry = useCallback(
    async (attempts = 4, delayMs = 350): Promise<string | null> => {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const token = await getAuthToken();
        if (token) {
          return token;
        }

        if (attempt < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      return null;
    },
    [getAuthToken],
  );

  const request = useCallback(
    async <T,>(
      method: ApiMethod,
      url: string,
      options?: {
        body?: unknown;
        headers?: Record<string, string>;
      },
    ): Promise<T> => {
      const token = await getAuthTokenWithRetry();

      if (!token) {
        throw new Error("No auth token available. Please wait a moment and try again.");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...options?.headers,
      };

      const fullUrl = url.startsWith("http") ? url : `${API_BASE_URL}${url}`;

      const fetchOptions: RequestInit & { body?: string } = {
        method,
        headers,
      };

      if (options?.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(fullUrl, fetchOptions);

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let payload: ApiErrorPayload | null = null;

        if (contentType.includes("application/json")) {
          payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
        } else {
          const text = await response.text().catch(() => "");
          if (text.trim()) {
            payload = looksLikeHtml(text)
              ? {
                  message:
                    `Backend returned HTML instead of JSON. Check NEXT_PUBLIC_API_URL (${API_BASE_URL}) and ensure backend is running at that address.`,
                }
              : { message: text };
          }
        }

        throw new Error(formatApiError(payload, response.status, response.statusText));
      }

      const successContentType = response.headers.get("content-type") || "";
      if (!successContentType.includes("application/json")) {
        const text = await response.text().catch(() => "");
        if (looksLikeHtml(text)) {
          throw new Error(
            `Backend returned HTML instead of JSON. Check NEXT_PUBLIC_API_URL (${API_BASE_URL}) and ensure backend is running at that address.`,
          );
        }

        throw new Error("API returned a non-JSON response.");
      }

      return response.json() as Promise<T>;
    },
    [getAuthTokenWithRetry],
  );

  return useMemo(
    () => ({
      get: <T,>(url: string, options?: { headers?: Record<string, string> }) =>
        request<T>("GET", url, options),
      post: <T,>(
        url: string,
        body?: unknown,
        options?: { headers?: Record<string, string> },
      ) => request<T>("POST", url, { body, ...options }),
      put: <T,>(
        url: string,
        body?: unknown,
        options?: { headers?: Record<string, string> },
      ) => request<T>("PUT", url, { body, ...options }),
      delete: <T,>(url: string, options?: { headers?: Record<string, string> }) =>
        request<T>("DELETE", url, options),
      patch: <T,>(
        url: string,
        body?: unknown,
        options?: { headers?: Record<string, string> },
      ) => request<T>("PATCH", url, { body, ...options }),
      request,
    }),
    [request],
  );
}
