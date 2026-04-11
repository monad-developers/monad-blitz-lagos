import Link from "next/link";

export function AuthFooter() {
  return (
    <footer className="w-full border-t border-app/10 bg-app py-6 sm:py-8">
      <div className="mx-auto px-4 w-[92%] sm:w-[88%] lg:w-[80%]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-base text-app-muted sm:text-lg">
            © 2024 <Link href="/" className="transition-colors duration-200 hover:text-app">Monarcade</Link>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
