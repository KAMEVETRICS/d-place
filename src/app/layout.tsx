import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { SessionProvider } from "@/client/session";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "D place",
  description: "A Nimiq stall for knowledge, bounties, and NIM payouts.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable}`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
