import type { Metadata } from "next";
import "@fontsource/lexend-mega/900.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/800.css";
import "./globals.css";
import "./neo-brutalist.css";

export const metadata: Metadata = {
  title: "Website Health Auditor",
  description: "Find what's hurting your website and get practical fixes.",
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
