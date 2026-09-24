"use client";

import type { AuditReport } from "@/lib/audit/types";
import { AuditReportView } from "./audit-report";

/** Client wrapper so the server-rendered demo page can use the interactive report view. */
export function DemoReport({ report }: { report: AuditReport }) {
  return <AuditReportView report={report} onReset={() => window.location.assign("/")} />;
}
