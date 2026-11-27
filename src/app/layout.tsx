import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "IoT Platform", template: "%s · IoT Platform" },
  description: "Connect ESP32 / ESP8266 / Arduino devices and control them from the web.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
