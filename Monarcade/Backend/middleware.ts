import { NextRequest, NextResponse } from "next/server";

type RouteRule = {
  pattern: RegExp;
  methods: string[];
};

const routeRules: RouteRule[] = [
  { pattern: /^\/api\/auth\/me$/, methods: ["GET"] },
  { pattern: /^\/api\/auth\/session$/, methods: ["GET"] },
  { pattern: /^\/api\/brand\/profile$/, methods: ["GET", "POST"] },
  { pattern: /^\/api\/upload$/, methods: ["POST"] },
  { pattern: /^\/api\/challenge\/prepare$/, methods: ["POST"] },
  { pattern: /^\/api\/challenge\/register$/, methods: ["POST"] },
  { pattern: /^\/api\/challenge\/create-gasless$/, methods: ["POST"] },
  { pattern: /^\/api\/challenge\/start$/, methods: ["POST"] },
  { pattern: /^\/api\/session\/start$/, methods: ["POST"] },
  { pattern: /^\/api\/session\/submit$/, methods: ["POST"] },
  { pattern: /^\/api\/distribute\/[^/]+$/, methods: ["POST"] },
  { pattern: /^\/api\/challenge\/refund\/[^/]+$/, methods: ["POST"] },
  { pattern: /^\/api\/challenge\/[^/]+$/, methods: ["GET"] },
  { pattern: /^\/api\/leaderboard\/[^/]+$/, methods: ["GET"] },
  { pattern: /^\/api\/challenges$/, methods: ["GET"] },
  { pattern: /^\/api\/challenges\/resolve$/, methods: ["GET"] },
];

const jsonMethodNotAllowed = (allowed: string[]) => {
  return NextResponse.json(
    {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed",
        details: { allowed },
      },
    },
    { status: 405 },
  );
};

const defaultAllowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "https://monarchade-backend.vercel.app",
  "https://monarchade.vercel.app"
]);

const withCorsHeaders = (request: NextRequest, response: NextResponse) => {
  const requestOrigin = request.headers.get("origin");

  if (requestOrigin && defaultAllowedOrigins.has(requestOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", requestOrigin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-kyc-verified, X-Requested-With",
  );
  response.headers.set("Access-Control-Max-Age", "86400");

  return response;
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    return withCorsHeaders(request, new NextResponse(null, { status: 204 }));
  }

  const rule = routeRules.find((entry) => entry.pattern.test(pathname));
  if (!rule) {
    return withCorsHeaders(request, NextResponse.next());
  }

  if (rule.methods.includes(request.method)) {
    return withCorsHeaders(request, NextResponse.next());
  }

  if (request.method === "HEAD" && rule.methods.includes("GET")) {
    return withCorsHeaders(request, NextResponse.next());
  }

  return withCorsHeaders(request, jsonMethodNotAllowed(rule.methods));
}

export const config = {
  matcher: ["/api/:path*"],
};