import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./electron.css";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibeTranscribe",
  description: "Voice to text transcription with keyboard shortcuts",
  icons: {
    icon: [
      { url: '/icon.ico', sizes: 'any' }
    ],
    apple: '/icon.ico',
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
        {/* Add meta tag to ensure proper rendering in Electron */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta httpEquiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline' 'unsafe-eval';" />
        <style dangerouslySetInnerHTML={{ __html: `
          /* Hide Next.js development indicators */
          .nextjs-toast, .nextjs-static-indicator-toast-wrapper, [data-nextjs-toast-wrapper],
          [class*="nextjs-"], div[role="status"][class*="nextjs-"], div[class*="nextjs-toast"],
          div[class*="indicator"], div[class*="toast"], div[class*="overlay"],
          div[class*="dev-indicator"], div[class*="build-error"], div[class*="hot-update"] {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }
          
          /* Ensure transparent background */
          html, body {
            background-color: transparent !important;
          }
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
