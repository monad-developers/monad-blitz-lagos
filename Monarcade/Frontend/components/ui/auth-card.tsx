import { ReactNode } from "react";

interface AuthCardProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="w-full rounded-3xl bg-app-surface px-6 py-8 shadow-app sm:px-8 sm:py-10 lg:px-10 lg:py-12">
      <div className="mb-8 text-center sm:mb-10 lg:mb-12">
        <h1 className="text-[2.15rem] font-bold tracking-tight text-app sm:text-[2.6rem] lg:text-[3rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-lg text-app-muted sm:mt-4 sm:text-xl lg:text-[1.45rem]">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
