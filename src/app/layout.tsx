import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/theme-provider";
import { AppConfigProvider } from "@/components/app-config-provider";
import { AdManager } from "@/components/ads/ad-manager";
import { InstallButton } from "@/components/pwa/install-button";
import { AnnouncementBanner, MaintenanceModeGuard } from "@/components/layout/system-banner";
import "../styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Family - Privacy-First Offline Family Tree Builder",
  description: "Build, edit, and explore your family tree completely offline. Privacy-first design: no registration, no signup, no servers. Your data stays in your browser.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "My Family",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
          <AppConfigProvider>
            <AnnouncementBanner />
            <MaintenanceModeGuard>
              {children}
              <div className="mx-auto w-full max-w-5xl px-4 pb-24">
                <AdManager placement="bottom" />
              </div>
              <div className="mx-auto w-full max-w-5xl px-4 pb-6">
                <InstallButton />
              </div>
            </MaintenanceModeGuard>
          </AppConfigProvider>
        </ThemeProvider>
        <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
