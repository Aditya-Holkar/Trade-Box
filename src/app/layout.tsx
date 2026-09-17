import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trade Box",
  description: "A modular financial research terminal.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
