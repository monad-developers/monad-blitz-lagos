import Link from "next/link";
import { BenefitsSection } from "@/components/features/benefits-section";
import { AuthFooter } from "@/components/layout/auth-footer";
import { SignupForm } from "@/components/features/signup-form";

export default function SignupPage() {
  return (
    <div className="page-typography min-h-screen bg-app text-app flex flex-col">
      {/* Back to home link */}
      <div className="w-full pt-4 sm:pt-6 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-base sm:text-lg text-app-muted hover:text-app transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
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

            {/* Right side - Signup form */}
            <div className="w-full lg:col-span-7 xl:col-span-7">
              <SignupForm />
            </div>

            {/* Mobile benefits section (visible only on mobile) */}
            <div className="lg:hidden col-span-1">
              <BenefitsSection />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <AuthFooter />
    </div>
  );
}
