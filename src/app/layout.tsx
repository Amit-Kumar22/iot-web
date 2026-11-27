import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "HiProTech IoT", template: "%s · HiProTech IoT" },
  description: "Connect ESP32 / ESP8266 / Arduino devices and control them from anywhere with HiProTech IoT.",
};

export const viewport: Viewport = {
  themeColor: "#F28735",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
