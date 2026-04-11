"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AuthCard } from "@/components/ui/auth-card";
import { Divider } from "@/components/ui/divider";

export function SignupForm() {
  const { login, isLoading: authLoading } = useAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    try {
      setError("");
      setIsLoading(true);
      localStorage.setItem("monarcade_user_type", "player");
      window.dispatchEvent(new Event("monarcade-user-type-change"));
      login();
    } catch (err) {
      setError("Failed to initiate signup. Please try again.");
      console.error("Signup error:", err);
      setIsLoading(false);
    }
  };

  return (
    <AuthCard title="Create Account" subtitle="Start playing and competing for MON rewards">
      {error ? (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSignup}
        disabled={isLoading || authLoading}
        className="w-full rounded-xl border-2 border-app/20 bg-app-soft/30 px-6 py-4 text-lg font-semibold text-app transition-all duration-200 hover:border-primary/30 hover:bg-app-soft/60 disabled:cursor-not-allowed disabled:opacity-50 sm:px-7 sm:py-4.5 sm:text-xl xl:px-8 xl:py-5"
      >
        {isLoading || authLoading ? "Setting up account..." : "SIGN UP AS PLAYER"}
      </button>

      <div className="my-8 sm:my-10">
        <Divider text="secure & simple" />
      </div>

      <div className="rounded-lg bg-app-soft/30 p-5 sm:p-6">
      
      </div>

      <div className="pt-6 text-center sm:pt-8">
        <p className="text-xs text-app-muted sm:text-sm">
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
    </AuthCard>
  );
}
