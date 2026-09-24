"use client";

import { useRouter } from "next/navigation";
import type { AuditReport } from "@/lib/audit/types";
import { AuditReportView } from "./audit-report";

/** Client wrapper so the server-rendered demo page can use the interactive report view. */
export function DemoReport({ report }: { report: AuditReport }) {
  const router = useRouter();
  return <AuditReportView report={report} onReset={() => router.push("/")} />;
}
