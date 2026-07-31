"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const AGENQ_AGENT_ID = "2b69b018-c154-4547-8a36-80e01ce62fa4";
const AGENQ_MOUNT_KEY = `agent-mount-state-${AGENQ_AGENT_ID}`;

const AGENQ_CONFIG = {
  agentId: AGENQ_AGENT_ID,
  projectId: "364626e9-82d3-4d31-b994-439d77a29f31",
  customerCode: "SUPER-USER",
  backendProtocol: "backend-v2",
  apiBaseUrl: "https://general-backend.aws.agenq.com",
  authEndpoint: "/api/agenq/token",
};

export function AgenQAgent() {
  const mounted = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login") return;

    const timer = window.setInterval(() => {
      if (!(window as any).AGENQ?.render || mounted.current) return;
      mounted.current = true;

      // Ensure widget starts CLOSED — clear any leftover "OPEN" state from localStorage
      try {
        localStorage.setItem(AGENQ_MOUNT_KEY, "CLOSED");
      } catch (_) {}

      // Render the SDK with initialState CLOSED so it doesn't auto-expand
      (window as any).AGENQ.render({
        ...AGENQ_CONFIG,
        initialState: "CLOSED",
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

/**
 * Call this to programmatically OPEN the AgenQ widget.
 * Re-calls AGENQ.render() with initialState: "OPEN" which triggers
 * the SDK's internal useEffect to expand the widget.
 */
export function triggerAgenQOpen() {
  const agenq = (window as any).AGENQ;
  if (agenq && typeof agenq.render === "function") {
    // Clear localStorage OPEN state first, then set via render
    try { localStorage.setItem(AGENQ_MOUNT_KEY, "OPEN"); } catch (_) {}
    agenq.render({
      ...AGENQ_CONFIG,
      initialState: "OPEN",
    } as any);
  }
}
