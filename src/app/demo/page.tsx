import type { Metadata } from "next";
import Link from "next/link";
import { DemoReport } from "@/components/demo-report";
import { buildStaticContext } from "@/lib/audit/context";
import { DEMO_PAGE_HTML } from "@/lib/audit/demo-page";
import { buildReport } from "@/lib/audit/engine";

export const metadata: Metadata = {
  title: "HealthAuditor — sample report",
  description: "A sample HealthAuditor report generated from a deliberately broken demo page.",
};

/**
 * Renders a full report from a bundled fixture. Useful for previewing the UI, for
 * screenshots and for contributors working on rules without auditing a live site.
 */
export default async function DemoPage() {
  const context = buildStaticContext({
    url: "http://demo.example.com/landing",
    html: DEMO_PAGE_HTML,
    headers: { "content-type": "text/html", server: "nginx/1.18.0", "x-powered-by": "PHP/7.4.3" },
    redirectChain: [
      { url: "http://demo.example.com", status: 301, location: "http://demo.example.com/l" },
      { url: "http://demo.example.com/l", status: 302, location: "http://demo.example.com/landing" },
    ],
  });
  context.collectionNotes = ["This is a sample report generated from a bundled demo page — no website was contacted."];
  const report = await buildReport(context);

  return (
    <main className="demo-wrap">
      <div className="demo-banner">
        <b>Sample report.</b> Generated from a deliberately broken demo page so you can see the output format. <Link href="/">Audit a real site →</Link>
      </div>
      <DemoReport report={report} />
    </main>
  );
}
