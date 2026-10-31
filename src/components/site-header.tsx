"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { LinkedInLink } from "./linkedin-link";
import { WhatsAppLink } from "./whatsapp-link";

export function SiteHeader() {
  const { user, status, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const freeRemaining = status?.freeRemaining ?? null;
  const isSubscribed = status?.active ?? false;

  return (
    <header className="site-header">
      <nav aria-label="Main navigation">
        <Link href="/" className="logo">
          Health<span>Auditor</span>
        </Link>
        <div className="nav-links">
          <Link href="/pricing">Pricing</Link>
          <Link href="/demo">Sample report</Link>
          <LinkedInLink />
          <WhatsAppLink />
          {!loading && (
            <>
              {user ? (
                <div className="header-auth">
                  <Link href="/account" className="header-account-link">
                    <span className="header-email" title={user.email ?? ""}>
                      {user.email}
                    </span>
                    {freeRemaining !== null && !isSubscribed && (
                      <span className="header-badge">{freeRemaining} free left</span>
                    )}
                    {isSubscribed && <span className="header-badge pro">PRO</span>}
                  </Link>
                  <button
                    type="button"
                    className="tactile header-signout"
                    onClick={async () => {
                      await signOut();
                      router.push("/");
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <Link
                  href={`/login${pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""}`}
                  className="tactile header-login"
                >
                  Sign in
                </Link>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
