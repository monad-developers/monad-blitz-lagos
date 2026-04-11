"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { AuthCard } from "@/components/ui/auth-card";
import { Divider } from "@/components/ui/divider";

interface SigninFormProps {
  onSwitchToSignup?: () => void;
}

export function SigninForm({ onSwitchToSignup }: SigninFormProps) {
  const { login, isLoading: authLoading } = useAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignin = async () => {
    try {
      setError("");
      setIsLoading(true);
      localStorage.setItem("monarcade_user_type", "player");
      window.dispatchEvent(new Event("monarcade-user-type-change"));
      login();
    } catch (err) {
      setError("Failed to initiate login. Please try again.");
      console.error("Signin error:", err);
      setIsLoading(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your player account">
      {error ? (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSignin}
        disabled={isLoading || authLoading}
        className="w-full rounded-xl border-2 border-app/20 bg-app-soft/30 px-6 py-4 text-base font-semibold text-app transition-all duration-200 hover:border-primary/30 hover:bg-app-soft/60 disabled:cursor-not-allowed disabled:opacity-50 sm:px-7 sm:py-4.5 sm:text-lg xl:px-8 xl:py-5"
      >
        {isLoading || authLoading ? "Signing in..." : " SIGN IN AS PLAYER"}
      </button>

      <div className="my-8 sm:my-10">
        <Divider text="security first" />
      </div>

      <div className="rounded-lg bg-app-soft/30 p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-app-muted sm:text-base">
          Sign in securely via Google. Your wallet is automatically created and managed.
        </p>
      </div>

      <div className="pt-6 text-center sm:pt-8">
        <p className="text-sm text-app-muted sm:text-base">
          Don&apos;t have an account?{" "}
          {onSwitchToSignup ? (
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="font-semibold text-primary transition-all duration-200 hover:brightness-110"
            >
              Sign up here
            </button>
          ) : (
            <Link
              href="/auth?mode=signup"
              className="font-semibold text-primary transition-all duration-200 hover:brightness-110"
            >
              Sign up here
            </Link>
          )}
        </p>
      </div>
    </AuthCard>
  );
}
