
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter as FontSans, Playfair_Display, Noto_Sans } from "next/font/google"
import { cn } from "@/lib/utils"
import { PWAInstallPrompt } from "@/components/shared/PWAInstallPrompt"
import { SupportChatbot } from "@/components/support/SupportChatbot"

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
})

const fontBody = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "700"],
})

export const metadata: Metadata = {
  title: 'BizRoom - Simplified Billing',
  description: 'Manage your invoices, customers, and finances with ease.',
  manifest: '/manifest.json',
  themeColor: '#1fb2a6',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BizRoom',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon-192x192.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link href="https://fonts.gstatic.com" rel="preconnect" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontDisplay.variable
        )}
        suppressHydrationWarning
      >
        {children}
        <SupportChatbot />
        <PWAInstallPrompt />
        <Toaster />
      </body>
    </html>
  );
}
