import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "TIMEORA Admin", template: "%s | TIMEORA Admin" },
  description: "TIMEORA store administration",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
