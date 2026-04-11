import type { Metadata } from "next";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { PrivyWrapper } from "@/components/providers/privy-provider";
import { AuthSyncComponent } from "@/components/providers/auth-sync";
import "./globals.css";

export const metadata: Metadata = {
  title: "Monarcade",
  description:
    "Monarcade is where brands fund fast mini-challenges and players compete for MON rewards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body
        className="min-h-full flex flex-col font-sans bg-app text-app transition-colors duration-300"
        suppressHydrationWarning
      >
        <PrivyWrapper>
          <ThemeProvider>
            <AuthSyncComponent>{children}</AuthSyncComponent>
          </ThemeProvider>
        </PrivyWrapper>
      </body>
    </html>
  );
}
