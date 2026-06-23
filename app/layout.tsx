import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nova Volleyball Club",
  description: "Nova Volleyball Club — operations & member portal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
