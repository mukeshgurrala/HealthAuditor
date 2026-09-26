import Script from "next/script";
import type{Metadata}from"next";import"./globals.css";
export const metadata:Metadata={title:"Website Health Auditor",description:"Find what's hurting your website and get practical fixes."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><head><Script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7842443584750701" crossOrigin="anonymous" strategy="beforeInteractive" /></head><body>{children}</body></html>}
