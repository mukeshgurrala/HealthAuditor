export type CategoryScores = { performance:number|null; accessibility:number|null; bestPractices:number|null; seo:number|null; overall:number };
export type Metrics = { fcp:string; lcp:string; cls:string; tbt:string; speedIndex:string };
export type Severity = "critical"|"medium"|"low";
export type PriorityIssue = { title:string; severity:Severity; explanation:string; fix:string; value?:string|null };
export type AIAnalysis = { summary:string; priorityIssues:PriorityIssue[]; positives:string[] };
export type AuditResult = { success:true; url:string; scores:CategoryScores; metrics:Metrics; analysis:AIAnalysis };
export type LighthouseFinding = { id:string; title:string; description:string; score:number; displayValue?:string; category?:string };
