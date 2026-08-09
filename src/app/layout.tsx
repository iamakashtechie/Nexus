import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { Toaster } from "@/components/ui/Toaster";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export const metadata: Metadata = {
  title: "Nexus",
  description: "Your personal knowledge base",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nexus",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`} suppressHydrationWarning>
        <ServiceWorkerRegistrar />
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
