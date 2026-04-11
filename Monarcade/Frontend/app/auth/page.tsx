"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BenefitsSection } from "@/components/features/benefits-section";
import { SignupForm } from "@/components/features/signup-form";
import { SigninForm } from "@/components/features/signin-form";
import { AuthFooter } from "@/components/layout/auth-footer";

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-app" />}>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "signin" ? "signin" : "signup";

  const switchMode = (newMode: "signup" | "signin") => {
    router.replace(`/auth?mode=${newMode}`);
  };

  return (
    <div className="page-typography min-h-screen bg-app text-app flex flex-col">
      {/* Back to home link */}
      <div className="w-full pt-4 sm:pt-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm sm:text-base text-app-muted hover:text-app transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* Mode toggle (visible only on small screens during signup/signin) */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:hidden">
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => switchMode("signup")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              mode === "signup"
                ? "bg-primary text-white"
                : "bg-app-soft text-app hover:bg-app-surface"
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => switchMode("signin")}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
              mode === "signin"
                ? "bg-primary text-white"
                : "bg-app-soft text-app hover:bg-app-surface"
            }`}
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center w-full px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        {/* Desktop two-column layout */}
        <div className="w-full max-w-6xl">
          <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:gap-12 lg:grid-cols-12">
            {/* Left side - Benefits section (hidden on mobile, visible on desktop) */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-5">
              <BenefitsSection />
            </div>

            {/* Right side - Auth form */}
            <div className="w-full lg:col-span-7 xl:col-span-7">
              {mode === "signup" ? (
                <div>
                  <SignupForm />
                  <div className="mt-6 text-center lg:hidden">
                    <p className="text-app-muted text-sm sm:text-base">
                      Already have an account?{" "}
                      <button
                        onClick={() => switchMode("signin")}
                        className="font-semibold text-primary hover:brightness-110 transition-all duration-200"
                      >
                        Sign in here
                      </button>
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <SigninForm onSwitchToSignup={() => switchMode("signup")} />
                  <div className="mt-6 text-center lg:hidden">
                    <p className="text-app-muted text-sm sm:text-base">
                      New player?{" "}
                      <button
                        onClick={() => switchMode("signup")}
                        className="font-semibold text-primary hover:brightness-110 transition-all duration-200"
                      >
                        Create account
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile benefits section (visible only on mobile, signup mode) */}
            {mode === "signup" && (
              <div className="lg:hidden col-span-1">
                <BenefitsSection />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <AuthFooter />
    </div>
  );
}
