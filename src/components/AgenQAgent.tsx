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
 * Programmatically open the AgenQ widget by clicking its own launcher button.
 * The AgenQ SDK renders a fixed-position launcher with agenq-id attributes.
 * Clicking that button is identical to the user clicking the agent image.
 */
export function triggerAgenQOpen() {
  // The AgenQ SDK renders its launcher as a fixed-position element with agenq-id attribute.
  // Find it and click it — same as the user clicking the agent image manually.

  // 1. Look for fixed/absolute positioned elements with agenq-id (the floating launcher)
  const agenqEls = Array.from(document.querySelectorAll<HTMLElement>("[agenq-id]"));

  // Try fixed-position elements first (the floating launcher button)
  for (const el of agenqEls) {
    const style = window.getComputedStyle(el);
    if (style.position === "fixed" || style.position === "absolute") {
      el.click();
      return;
    }
  }

  // 2. Try any element with agenq-id (broader fallback)
  if (agenqEls.length > 0) {
    agenqEls[0].click();
    return;
  }

  // 3. Try buttons or clickable elements inside #agenq-root
  const root = document.getElementById("agenq-root");
  if (root) {
    const btn = root.querySelector<HTMLElement>("button, [role='button'], img, div[tabindex]");
    if (btn) { btn.click(); return; }
    if (root.firstElementChild) {
      (root.firstElementChild as HTMLElement).click();
    }
  }
}

