import { NextRequest } from "next/server";

export const authHeaders = (extra: HeadersInit = {}) => ({
  authorization: "Bearer test-token",
  "x-kyc-verified": "true",
  ...extra,
});

export const jsonRequest = (url: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers ?? undefined);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return new NextRequest(url, {
    ...init,
    headers,
  } as any);
};
