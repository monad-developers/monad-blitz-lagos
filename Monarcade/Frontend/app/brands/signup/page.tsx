import Link from "next/link";
import { BrandOnboardingPanel } from "@/components/features/brand-onboarding-panel";
import { BrandSignupForm } from "@/components/features/brand-signup-form";
import { AuthFooter } from "@/components/layout/auth-footer";

export default function BrandSignupPage() {
  return (
    <div className="page-typography min-h-screen bg-app text-app flex flex-col">
      <div className="mx-auto w-[92%] pt-4 sm:w-[88%] sm:pt-6 lg:w-[80%]">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base text-app-muted transition-colors duration-200 hover:text-app sm:text-lg"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
      </div>

      <main className="mx-auto flex w-[92%] flex-1 items-center py-6 sm:w-[88%] sm:py-8 lg:w-[80%] lg:py-10">
        <div className="grid w-full grid-cols-1 gap-7 lg:grid-cols-12 lg:gap-8 xl:gap-10">
          <div className="order-2 lg:order-1 lg:col-span-5">
            <BrandOnboardingPanel />
          </div>
          <div className="order-1 lg:order-2 lg:col-span-7">
            <BrandSignupForm />
          </div>
        </div>
      </main>
      <AuthFooter />
    </div>
  );
}
