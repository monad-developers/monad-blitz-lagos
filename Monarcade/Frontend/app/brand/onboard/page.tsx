"use client";

import Link from "next/link";

import { BrandOnboardingFlow } from "@/components/dashboard/brand/brand-onboarding-flow";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { pageContainerClass } from "@/lib/layout";

export default function BrandOnboardPage() {
  return (
    <div className="page-typography min-h-screen bg-app text-app">
      <Navbar />

      <main className="w-full pb-12 pt-4 sm:pt-6 lg:pb-16 lg:pt-8">
        <div className={pageContainerClass}>
          <div className="mb-4">
            <Link
              href="/brand/dashboard"
              className="inline-flex items-center gap-2 text-base text-app-muted transition-colors duration-200 hover:text-app sm:text-lg"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Brand Dashboard
            </Link>
          </div>

          <BrandOnboardingFlow />
        </div>
      </main>

      <Footer />
    </div>
  );
}
