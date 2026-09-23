import type{Metadata}from"next";import"./globals.css";
export const metadata:Metadata={title:"Website Health Auditor",description:"Find what's hurting your website and get practical fixes."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
