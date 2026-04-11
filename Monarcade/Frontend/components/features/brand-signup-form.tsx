"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export function BrandSignupForm() {
  const { login, isLoading: authLoading } = useAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    try {
      setError("");
      setIsLoading(true);
      localStorage.setItem("monarcade_user_type", "brand");
      window.dispatchEvent(new Event("monarcade-user-type-change"));
      login();
    } catch (err) {
      setError("Failed to initiate signup. Please try again.");
      console.error("Brand signup error:", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full rounded-3xl bg-app-surface px-6 py-7 shadow-app sm:px-8 sm:py-9 lg:px-9 lg:py-10">
      <div>
        <p className="inline-flex rounded-full bg-app-soft/80 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-sm">
          Get Started
        </p>
        <h2 className="mt-4 text-[2.15rem] font-bold tracking-tight text-app sm:text-[2.6rem] lg:text-[3rem]">
          Create Brand Account
        </h2>
        <p className="mt-3 text-lg leading-relaxed text-app-muted sm:text-xl lg:text-[1.45rem]">
          Launch engaging challenges and measure brand impact.
        </p>
      </div>

      {error ? (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSignup}
        disabled={isLoading || authLoading}
        className="mt-7 w-full rounded-xl border-2 border-app/20 bg-app-soft/30 px-6 py-4 text-lg font-semibold text-app transition-all duration-200 hover:border-primary/30 hover:bg-app-soft/60 disabled:cursor-not-allowed disabled:opacity-50 sm:px-7 sm:py-4.5 sm:text-xl xl:px-8 xl:py-5"
      >
        {isLoading || authLoading ? "Setting up account..." : " SIGN UP AS BRAND"}
      </button>

      

      <p className="mt-7 text-center text-xs text-app-muted sm:mt-9 sm:text-sm">
        By signing up, you agree to our{" "}
        <Link href="/terms" className="font-semibold text-primary hover:brightness-110">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-semibold text-primary hover:brightness-110">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
