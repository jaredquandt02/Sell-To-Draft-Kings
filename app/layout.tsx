import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gladiator League",
  description: "A fantasy football elimination league.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
