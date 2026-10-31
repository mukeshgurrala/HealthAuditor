import type { Metadata } from "next";
import { AccountView } from "./account-view";

export const metadata: Metadata = {
  title: "Account — HealthAuditor",
  description: "Manage your HealthAuditor audits, subscription and billing.",
};

export default function AccountPage() {
  return (
    <main className="account-page">
      <AccountView />
    </main>
  );
}
