"use client";

import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * Component that manages auth-based redirects and route protection.
 * Should wrap the main content in the root layout.
 */
export function AuthSyncComponent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, userType, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const isBrandProtectedRoute = pathname === "/brand" || pathname.startsWith("/brand/");
    const isPlayerProtectedRoute =
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/") ||
      pathname === "/player" ||
      pathname.startsWith("/player/");

    // If authenticated, redirect from auth pages to the appropriate dashboard
    if (isAuthenticated && user) {
      if (
        pathname === "/auth" ||
        pathname === "/signup" ||
        pathname.startsWith("/brands/signin") ||
        pathname.startsWith("/brands/signup")
      ) {
        if (userType === "brand") {
          if (pathname !== "/brand/dashboard") {
            router.replace("/brand/dashboard");
          }
        } else {
          if (pathname !== "/player/dashboard") {
            router.replace("/player/dashboard");
          }
        }
      }

      return;
    }

    // If auth is temporarily unavailable (e.g. upstream 429), avoid redirect thrashing.
    if (user) {
      return;
    }

    // If not authenticated, redirect from protected pages to auth.
    if (!isAuthenticated && (isPlayerProtectedRoute || isBrandProtectedRoute)) {
      const redirectTo = userType === "brand" ? "/brands/signin" : "/auth?mode=signin";
      if (pathname !== redirectTo) {
        router.replace(redirectTo);
      }
    }
  }, [isAuthenticated, user, userType, isLoading, pathname, router]);

  return <>{children}</>;
}
