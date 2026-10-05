import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PAEI Test — Discover Your Management Style",
  description:
    "A free 20-question assessment based on Dr. Ichak Adizes' PAEI model. Find out whether you lead as a Producer, Administrator, Entrepreneur, or Integrator.",
  openGraph: {
    title: "PAEI Test",
    description:
      "Take the 20-question PAEI assessment and get your four-letter management style code.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
