import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AnyDrop — Send anything from your phone to Chrome",
  description:
    "The successor to Microsoft Edge Drop: pair your phone with Chrome via a room code or QR and drop text, links, files and photos between devices. No account, no cable.",
  keywords: ["AnyDrop", "Edge Drop alternative", "Chrome extension", "file transfer", "phone to PC"],
  icons: {
    icon: "/anydrop.svg",
  },
  openGraph: {
    title: "AnyDrop — Drop anything between your phone and Chrome",
    description: "Text, links, files and photos — paired with a 6-character code, gone in 24h.",
    siteName: "AnyDrop",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
