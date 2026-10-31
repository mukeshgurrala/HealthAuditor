import type { Metadata } from "next";
import "@fontsource/lexend-mega/900.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/800.css";
import "./globals.css";
import "./neo-brutalist.css";
import "./auth.css";
import { AuthProvider } from "@/components/auth-provider";
import { SiteHeader } from "@/components/site-header";
import Link from "next/link";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { LinkedInLink } from "@/components/linkedin-link";

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
      <body>
        <AuthProvider>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <SiteHeader />
          {children}
          <footer>
            <div className="footer-content">
              <div className="footer-brand">
                <Link href="/" className="logo">
                  Health<span>Auditor</span>
                </Link>
                <small>Better websites, one fix at a time.</small>
              </div>
              <WhatsAppLink />
              <nav aria-label="Footer navigation">
                <Link href="/pricing">Pricing</Link>
                <Link href="/how-it-works">Methodology</Link>
                <Link href="/how-it-works#privacy">Privacy</Link>
                <LinkedInLink />
              </nav>
            </div>
            <div className="footer-bottom">
              <small>© {new Date().getFullYear()} HealthAuditor</small>
              <span>Built for a healthier web. 10 free audits · $5/month after.</span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
