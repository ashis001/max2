"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function AgenQAgent() {
  const mounted = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;

    const timer = window.setInterval(() => {
      if (!(window as any).AGENQ?.render || mounted.current) return;
      mounted.current = true;
      (window as any).AGENQ.render({
        agentId: "2b69b018-c154-4547-8a36-80e01ce62fa4",
        projectId: "364626e9-82d3-4d31-b994-439d77a29f31",
        customerCode: "SUPER-USER",
        backendProtocol: "backend-v2",
        apiBaseUrl: "https://general-backend.aws.agenq.com",
        authEndpoint: "/api/agenq/token",
      } as any);
    }, 150);

    return () => window.clearInterval(timer);
  }, [pathname]);

  if (pathname === "/login") return null;

  return (
    <>
      <div id="agenq-root" />
      <Script
        src="https://cdn.agenqglobal.com/agenq-client-sdk.js"
        strategy="afterInteractive"
      />
    </>
  );
}
