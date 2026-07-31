import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Inter for UI/body text, Plus Jakarta Sans for headings and the wordmark.
// Both are variable fonts, self-hosted by next/font — no request to Google at
// runtime. Wired to --font-sans / --font-display in globals.css.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TiftonWala — Groceries & Rides",
  description: "Community grocery runs and rides for Tifton households.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#15803d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${jakarta.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
