"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AuthCard } from "@/components/ui/auth-card";
import { Divider } from "@/components/ui/divider";

export function BrandSigninForm() {
  const { login, isLoading: authLoading } = useAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignin = async () => {
    try {
      setError("");
      setIsLoading(true);
      localStorage.setItem("monarcade_user_type", "brand");
      window.dispatchEvent(new Event("monarcade-user-type-change"));
      login();
    } catch (err) {
      setError("Failed to initiate login. Please try again.");
      console.error("Brand signin error:", err);
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back, brand team"
      subtitle="Sign in to manage your campaigns and challenge rewards"
    >
      {error ? (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSignin}
        disabled={isLoading || authLoading}
        className="w-full rounded-xl border-2 border-app/20 bg-app-soft/30 px-6 py-4 text-lg font-semibold text-app transition-all duration-200 hover:border-primary/30 hover:bg-app-soft/60 disabled:cursor-not-allowed disabled:opacity-50 sm:px-7 sm:py-4.5 sm:text-xl xl:px-8 xl:py-5"
      >
        {isLoading || authLoading ? "Signing in..." : " SIGN IN AS BRAND"}
      </button>

      <div className="my-8 sm:my-10">
        <Divider text="brand protection" />
      </div>

      <div className="rounded-lg bg-app-soft/30 p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-app-muted sm:text-base">
          Sign in with your brand credentials via Google to manage campaigns and rewards.
        </p>
      </div>

      <div className="pt-6 text-center sm:pt-8">
        <p className="text-sm text-app-muted sm:text-base">
          Don&apos;t have a brand account?{" "}
          <Link
            href="/brands/signup"
            className="font-semibold text-primary transition-all duration-200 hover:brightness-110"
          >
            Create one here
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
