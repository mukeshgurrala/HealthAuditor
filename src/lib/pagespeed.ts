import type {CategoryScores,LighthouseFinding,Metrics} from "./types";
type Audit={title?:string;description?:string;score?:number|null;scoreDisplayMode?:string;displayValue?:string};
type PSI={lighthouseResult?:{categories?:Record<string,{score?:number|null;auditRefs?:{id:string}[]}>;audits?:Record<string,Audit>}};
const to100=(n:number|null|undefined)=>typeof n==="number"?Math.round(n*100):null;
const clean=(s="")=>s.replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/`/g,"").split(". Learn")[0].trim();
export async function runPageSpeed(url:string){
 const key=process.env.PAGESPEED_API_KEY; if(!key) throw new Error("PageSpeed API is not configured. Add PAGESPEED_API_KEY to .env.local.");
 const endpoint=new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed"); endpoint.searchParams.set("url",url);endpoint.searchParams.set("strategy","mobile");endpoint.searchParams.set("key",key);["performance","accessibility","best-practices","seo"].forEach(c=>endpoint.searchParams.append("category",c));
 const response=await fetch(endpoint,{signal:AbortSignal.timeout(75_000),cache:"no-store"});
 if(response.status===429) throw new Error("The PageSpeed rate limit was reached. Please wait a minute and try again.");
 if(!response.ok) throw new Error("We couldn't analyze this website. Check that the URL is public and try again.");
 const data=await response.json() as PSI; const lh=data.lighthouseResult;if(!lh) throw new Error("Lighthouse could not produce a report for this website.");
 const categories=lh.categories??{},audits=lh.audits??{};
 const scores:CategoryScores={performance:to100(categories.performance?.score),accessibility:to100(categories.accessibility?.score),bestPractices:to100(categories["best-practices"]?.score),seo:to100(categories.seo?.score),overall:0};
 const entries:Array<[number|null,number]>=[[scores.performance,.3],[scores.accessibility,.2],[scores.bestPractices,.2],[scores.seo,.3]];const available=entries.filter((x):x is [number,number]=>x[0]!==null);if(!available.length)throw new Error("The audit returned no usable category scores.");scores.overall=Math.round(available.reduce((n,[v,w])=>n+v*w,0)/available.reduce((n,[,w])=>n+w,0));
 const dv=(id:string)=>audits[id]?.displayValue||"Not reported";const metrics:Metrics={fcp:dv("first-contentful-paint"),lcp:dv("largest-contentful-paint"),cls:dv("cumulative-layout-shift"),tbt:dv("total-blocking-time"),speedIndex:dv("speed-index")};
 const categoryByAudit=new Map<string,string>();Object.entries(categories).forEach(([cat,val])=>val.auditRefs?.forEach(ref=>categoryByAudit.set(ref.id,cat)));
 const findings:LighthouseFinding[]=Object.entries(audits).filter(([,a])=>typeof a.score==="number"&&a.score<.9&&!!a.title&&["binary","numeric","metricSavings"].includes(a.scoreDisplayMode||"")).map(([id,a])=>({id,title:a.title!,description:clean(a.description),score:a.score!,displayValue:a.displayValue,category:categoryByAudit.get(id)})).sort((a,b)=>a.score-b.score).slice(0,12);
 const positives=Object.values(audits).filter(a=>a.score===1&&a.title&&["binary","numeric"].includes(a.scoreDisplayMode||"")).slice(0,8).map(a=>a.title!);return{scores,metrics,findings,positives};
}
